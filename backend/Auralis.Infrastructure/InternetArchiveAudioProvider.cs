using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Text.Json;
using Auralis.Application;
using Auralis.Domain;
using Microsoft.Extensions.Caching.Memory;

namespace Auralis.Infrastructure;

/// <summary>
/// Searches the Internet Archive's declared open-audio collection and resolves
/// only MP3 files whose item metadata declares a permissive Creative Commons
/// license. The rights statement is supplied by the uploader, not independently
/// certified by the Archive or AURALIS.
/// </summary>
public sealed class InternetArchiveAudioProvider(HttpClient http, IMemoryCache cache) : IOpenAudioProvider
{
    private static readonly HashSet<string> AllowedLicenses = new(StringComparer.OrdinalIgnoreCase)
    {
        "http://creativecommons.org/publicdomain/zero/1.0/",
        "https://creativecommons.org/publicdomain/zero/1.0/",
        "http://creativecommons.org/licenses/by/3.0/",
        "https://creativecommons.org/licenses/by/3.0/",
        "http://creativecommons.org/licenses/by/4.0/",
        "https://creativecommons.org/licenses/by/4.0/",
        "http://creativecommons.org/licenses/by-sa/3.0/",
        "https://creativecommons.org/licenses/by-sa/3.0/",
        "http://creativecommons.org/licenses/by-sa/4.0/",
        "https://creativecommons.org/licenses/by-sa/4.0/"
    };
    private static readonly SemaphoreSlim Requests = new(4, 4);
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<IReadOnlyList<Track>> SearchAsync(string query, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length > 120) return [];
        var phrase = EscapeLucene(query.Trim());
        var search = await GetJsonAsync("advancedsearch.php?q=" + Uri.EscapeDataString(
            $"mediatype:audio AND (title:\"{phrase}\" OR creator:\"{phrase}\")") +
            "&fl[]=identifier&fl[]=title&fl[]=creator&rows=8&output=json", ct);
        var docs = search.GetProperty("response").GetProperty("docs").EnumerateArray().ToArray();
        var ids = docs.Select(d => Text(d, "identifier"))
            .Where(IsSafeIdentifier).Distinct(StringComparer.Ordinal).Take(8).ToArray();
        var metadata = await Task.WhenAll(ids.Select(id => GetMetadataAsync(id, ct)));
        return metadata.Where(m => m.HasValue).SelectMany(m => TracksFrom(m!.Value)).Take(48).ToArray();
    }

    public async Task<Artist?> GetArtistAsync(string id, CancellationToken ct)
    {
        const string prefix = "ia:artist:";
        if (!id.StartsWith(prefix, StringComparison.Ordinal)) return null;
        string creator;
        try
        {
            var encoded = id[prefix.Length..].Replace('-', '+').Replace('_', '/');
            encoded = encoded.PadRight((encoded.Length + 3) / 4 * 4, '=');
            creator = Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
        }
        catch (FormatException) { return null; }
        if (string.IsNullOrWhiteSpace(creator) || creator.Length > 200) return null;
        var phrase = EscapeLucene(creator);
        var search = await GetJsonAsync("advancedsearch.php?q=" + Uri.EscapeDataString(
            $"mediatype:audio AND creator:\"{phrase}\"") +
            "&fl[]=identifier&rows=8&output=json", ct);
        var ids = search.GetProperty("response").GetProperty("docs").EnumerateArray()
            .Select(d => Text(d, "identifier")).Where(IsSafeIdentifier).Distinct().Take(8).ToArray();
        var metadata = await Task.WhenAll(ids.Select(x => GetMetadataAsync(x, ct)));
        var tracks = metadata.Where(m => m.HasValue).SelectMany(m => TracksFrom(m!.Value))
            .Where(t => string.Equals(t.Artist, creator, StringComparison.OrdinalIgnoreCase)).Take(48).ToArray();
        if (tracks.Length == 0) return null;
        var artwork = tracks[0].Artwork;
        return new(id, creator, artwork, "Open-audio catalog entries; rights are declared by their uploaders.", tracks, [], []);
    }

    public async Task<PlaybackResolution> ResolveAsync(string trackId, CancellationToken ct)
    {
        if (!TryParseTrackId(trackId, out var identifier, out var fileHash))
            return Failed(trackId, "invalid-track-id", false);
        try
        {
            var metadata = await GetMetadataAsync(identifier, ct);
            if (!metadata.HasValue) return Failed(trackId, "not-found-or-unlicensed", false);
            var root = metadata.Value;
            var license = Text(root.GetProperty("metadata"), "licenseurl");
            if (!AllowedLicenses.Contains(license)) return Failed(trackId, "license-not-eligible", false);
            var file = root.GetProperty("files").EnumerateArray()
                .Where(IsPlayableMp3)
                .FirstOrDefault(f => HashFileName(Text(f, "name")) == fileHash);
            if (file.ValueKind == JsonValueKind.Undefined) return Failed(trackId, "file-unavailable", true);
            var name = Text(file, "name");
            var url = "https://archive.org/download/" + Uri.EscapeDataString(identifier) + "/" + Uri.EscapeDataString(name);
            return new(trackId, "Internet Archive", "playable", url, "audio/mpeg", "mp3", null, null, false,
                license, "https://archive.org/details/" + Uri.EscapeDataString(identifier));
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return Failed(trackId, "provider-timeout", true);
        }
        catch (HttpRequestException)
        {
            return Failed(trackId, "provider-network-error", true);
        }
        catch (JsonException)
        {
            return Failed(trackId, "invalid-provider-response", true);
        }
    }

    private static PlaybackResolution Failed(string id, string category, bool retry) =>
        new(id, "Internet Archive", "unavailable", null, null, null, null, category, retry);

    private static bool TryParseTrackId(string id, out string identifier, out string fileHash)
    {
        identifier = ""; fileHash = "";
        if (!id.StartsWith("ia:", StringComparison.Ordinal)) return false;
        var split = id.IndexOf(':', 3);
        if (split < 4 || split != id.LastIndexOf(':')) return false;
        identifier = id[3..split]; fileHash = id[(split + 1)..];
        return IsSafeIdentifier(identifier) && fileHash.Length == 16 && fileHash.All(Uri.IsHexDigit);
    }

    private static bool IsSafeIdentifier(string id) => id.Length is > 0 and <= 120 && id.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_');
    private static bool IsPlayableMp3(JsonElement file) => Text(file, "name").EndsWith(".mp3", StringComparison.OrdinalIgnoreCase) && Text(file, "source") is "original" or "derivative";
    private static string HashFileName(string file) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(file)))[..16].ToLowerInvariant();
    private static string EscapeLucene(string s) => s.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal);
    private static string Text(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value)
            ? value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : value.ToString()
            : "";

    private IEnumerable<Track> TracksFrom(JsonElement root)
    {
        var metadata = root.GetProperty("metadata");
        var identifier = Text(metadata, "identifier");
        var license = Text(metadata, "licenseurl");
        if (!IsSafeIdentifier(identifier) || !AllowedLicenses.Contains(license)) return [];
        var title = Text(metadata, "title");
        var creator = "";
        if (metadata.TryGetProperty("creator", out var creatorValue))
            creator = creatorValue.ValueKind == JsonValueKind.Array
                ? string.Join(", ", creatorValue.EnumerateArray().Select(x => x.ToString()))
                : creatorValue.ToString();
        if (string.IsNullOrWhiteSpace(creator)) creator = "Unknown artist";
        var artistId = "ia:artist:" + Convert.ToBase64String(Encoding.UTF8.GetBytes(creator)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        var artwork = "https://archive.org/services/img/" + Uri.EscapeDataString(identifier);
        var sourcePage = "https://archive.org/details/" + Uri.EscapeDataString(identifier);
        return root.GetProperty("files").EnumerateArray().Where(IsPlayableMp3).Select(file =>
        {
            var fileName = Text(file, "name");
            var display = Path.GetFileNameWithoutExtension(fileName).Replace('_', ' ').Replace('-', ' ').Trim();
            foreach (var prefix in new[] { creator, title }.Where(x => !string.IsNullOrWhiteSpace(x)))
            {
                if (display.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    display = display[prefix.Length..].Trim(' ', '-', '–');
            }
            display = Regex.Replace(display, "^\\d{1,3}\\s*[-.)]?\\s*", "");
            if (string.IsNullOrWhiteSpace(display)) display = title;
            var id = "ia:" + identifier + ":" + HashFileName(fileName);
            return new Track(id, display, creator, artistId, title, "", artwork, Duration(Text(file, "length")), "Open audio", "Internet Archive",
                new Playback("audio", null, null, "audio/mpeg", "resolvable", null, "mp3", license, sourcePage));
        });
    }

    private static int Duration(string value)
    {
        var fields = value.Split(':');
        if (fields.Length == 2 && int.TryParse(fields[0], NumberStyles.None, CultureInfo.InvariantCulture, out var minutes)
            && int.TryParse(fields[1], NumberStyles.None, CultureInfo.InvariantCulture, out var sec) && sec is >= 0 and < 60)
            return Math.Max(0, minutes * 60 + sec);
        if (fields.Length == 3 && int.TryParse(fields[0], NumberStyles.None, CultureInfo.InvariantCulture, out var hours)
            && int.TryParse(fields[1], NumberStyles.None, CultureInfo.InvariantCulture, out var minutePart)
            && int.TryParse(fields[2], NumberStyles.None, CultureInfo.InvariantCulture, out var secondPart)
            && minutePart is >= 0 and < 60 && secondPart is >= 0 and < 60)
            return Math.Max(0, hours * 3600 + minutePart * 60 + secondPart);
        if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var numericSeconds)) return Math.Max(0, (int)numericSeconds);
        if (TimeSpan.TryParse(value, CultureInfo.InvariantCulture, out var time)) return Math.Max(0, (int)time.TotalSeconds);
        return 0;
    }

    private async Task<JsonElement?> GetMetadataAsync(string identifier, CancellationToken ct)
    {
        if (!IsSafeIdentifier(identifier)) return null;
        if (cache.TryGetValue<JsonElement>("ia:metadata:" + identifier, out var cached)) return cached;
        var value = await GetJsonAsync("metadata/" + Uri.EscapeDataString(identifier), ct);
        if (!value.TryGetProperty("metadata", out _ ) || !value.TryGetProperty("files", out _)) return null;
        cache.Set("ia:metadata:" + identifier, value, TimeSpan.FromMinutes(15));
        return value;
    }

    private async Task<JsonElement> GetJsonAsync(string path, CancellationToken ct)
    {
        for (var attempt = 0; ; attempt++)
        {
            await Requests.WaitAsync(ct);
            try
            {
                using var response = await http.GetAsync(path, HttpCompletionOption.ResponseHeadersRead, ct);
                if ((response.StatusCode == HttpStatusCode.TooManyRequests || (int)response.StatusCode >= 500) && attempt == 0)
                {
                    var delay = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromMilliseconds(400);
                    await Task.Delay(TimeSpan.FromMilliseconds(Math.Clamp(delay.TotalMilliseconds, 100, 1200)), ct);
                    continue;
                }
                response.EnsureSuccessStatusCode();
                using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
                return document.RootElement.Clone();
            }
            finally { Requests.Release(); }
        }
    }
}
