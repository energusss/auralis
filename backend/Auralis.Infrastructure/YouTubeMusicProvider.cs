using System.Net;
using System.Text.Json;
using System.Xml;
using Auralis.Domain;
using Auralis.Application;
using Microsoft.Extensions.Caching.Memory;
namespace Auralis.Infrastructure;
// YouTube channels/playlists are honestly represented; the Data API does not expose a music album catalog.
public class YouTubeMusicProvider(HttpClient http, IMemoryCache cache, DemoMusicProvider demo, string apiKey) : IMusicProvider {
 public string Status=>"YouTube Data API metadata + official visible YouTube player; albums remain curated CC collections";
 private async Task<JsonElement> Fetch(string endpoint, CancellationToken ct) {
 if(cache.TryGetValue<JsonElement>(endpoint,out var cached)) return cached;
 using var response=await http.GetAsync("https://www.googleapis.com/youtube/v3/"+endpoint+"&key="+Uri.EscapeDataString(apiKey),ct);
 if(!response.IsSuccessStatusCode) throw new MusicProviderException(response.StatusCode==HttpStatusCode.Forbidden?"YouTube quota or API key restriction. Check the backend key and quota.":"The music metadata provider is temporarily unavailable.");
 using var doc=JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));var data=doc.RootElement.Clone();cache.Set(endpoint,data,TimeSpan.FromMinutes(15));return data;
 }
 private static string S(JsonElement e,string key)=>e.TryGetProperty(key,out var x)?x.GetString()??"":"";
 private static string Art(JsonElement snippet) { if(!snippet.TryGetProperty("thumbnails",out var thumbs))return "";foreach(var size in new[]{"high","medium","default"})if(thumbs.TryGetProperty(size,out var t))return S(t,"url");return "";}
 private static Track TrackFrom(JsonElement item) {var s=item.GetProperty("snippet");var id=item.GetProperty("id").ValueKind==JsonValueKind.String?S(item,"id"):S(item.GetProperty("id"),"videoId"); var duration=item.TryGetProperty("contentDetails",out var details)?(int)XmlConvert.ToTimeSpan(S(details,"duration")).TotalSeconds:0;return new("yt:"+id,WebUtility.HtmlDecode(S(s,"title")),WebUtility.HtmlDecode(S(s,"channelTitle")),"yt:"+S(s,"channelId"),"","",Art(s),duration,"Music","YouTube",new("youtube",null,id));}
 private static string Raw(string id) {if(!id.StartsWith("yt:")||id.Length>150)throw new ArgumentException("Invalid YouTube identifier.");return Uri.EscapeDataString(id[3..]);}
 public async Task<SearchResult> SearchAsync(string query,string type,string? cursor,CancellationToken ct) {
 if(type=="albums")return await demo.SearchAsync(query,type,cursor,ct);
 var ytType=type=="artists"?"channel":type=="playlists"?"playlist":"video";
 var endpoint="search?part=snippet&maxResults=24&type="+ytType+"&q="+Uri.EscapeDataString(query)+(ytType=="video"?"&videoCategoryId=10&videoEmbeddable=true":"")+(string.IsNullOrEmpty(cursor)?"":"&pageToken="+Uri.EscapeDataString(cursor));
 var data=await Fetch(endpoint,ct);var items=data.GetProperty("items").EnumerateArray().ToArray();
 var tracks=ytType=="video"?items.Select(TrackFrom).ToArray():[];
 var artists=ytType=="channel"?items.Select(i=>{var s=i.GetProperty("snippet");return new ArtistSummary("yt:"+S(i.GetProperty("id"),"channelId"),WebUtility.HtmlDecode(S(s,"title")),Art(s));}).ToArray():[];
 var playlists=ytType=="playlist"?items.Select(i=>{var s=i.GetProperty("snippet");return new MusicPlaylist("yt:"+S(i.GetProperty("id"),"playlistId"),WebUtility.HtmlDecode(S(s,"title")),Art(s),[]);}).ToArray():[];
 return new(tracks,artists,[],playlists,S(data,"nextPageToken") is {Length:>0} n?n:null);
 }
 public async Task<Track?> GetTrackAsync(string id,CancellationToken ct) {if(!id.StartsWith("yt:"))return await demo.GetTrackAsync(id,ct); var data=await Fetch("videos?part=snippet,contentDetails&id="+Raw(id),ct);return data.GetProperty("items").EnumerateArray().Select(TrackFrom).FirstOrDefault();}
 public async Task<Artist?> GetArtistAsync(string id,CancellationToken ct) {
 if(!id.StartsWith("yt:"))return await demo.GetArtistAsync(id,ct);var data=await Fetch("channels?part=snippet&id="+Raw(id),ct);var item=data.GetProperty("items").EnumerateArray().FirstOrDefault();if(item.ValueKind==JsonValueKind.Undefined)return null;var s=item.GetProperty("snippet");
 var videos=await Fetch("search?part=snippet&maxResults=24&type=video&videoEmbeddable=true&order=viewCount&channelId="+Raw(id),ct);
 return new(id,WebUtility.HtmlDecode(S(s,"title")),Art(s),S(s,"description"),videos.GetProperty("items").EnumerateArray().Select(TrackFrom).ToArray(),[],[]);
 }
 public Task<Album?> GetAlbumAsync(string id,CancellationToken ct)=>demo.GetAlbumAsync(id,ct);
 public async Task<MusicPlaylist?> GetPlaylistAsync(string id,CancellationToken ct) {
 if(!id.StartsWith("yt:"))return await demo.GetPlaylistAsync(id,ct);var meta=await Fetch("playlists?part=snippet&id="+Raw(id),ct);var item=meta.GetProperty("items").EnumerateArray().FirstOrDefault();if(item.ValueKind==JsonValueKind.Undefined)return null;
 var data=await Fetch("playlistItems?part=snippet&maxResults=50&playlistId="+Raw(id),ct);var ts=new List<Track>();foreach(var v in data.GetProperty("items").EnumerateArray()){var sn=v.GetProperty("snippet");var video=S(sn.GetProperty("resourceId"),"videoId");if(string.IsNullOrEmpty(video)||S(sn,"title") is "Deleted video" or "Private video")continue;ts.Add(new("yt:"+video,S(sn,"title"),S(sn,"videoOwnerChannelTitle"),"yt:"+S(sn,"videoOwnerChannelId"),"","",Art(sn),0,"Music","YouTube",new("youtube",null,video)));}
 var s=item.GetProperty("snippet");return new(id,S(s,"title"),Art(s),ts);
 }
 public async Task<IReadOnlyList<Track>> GetRecommendationsAsync(IEnumerable<Track> seeds,CancellationToken ct){var seed=seeds.FirstOrDefault();return seed is null?(await GetHomeAsync(ct)).Featured:(await SearchAsync(seed.Artist,"songs",null,ct)).Tracks;}
 public async Task<HomeResult> GetHomeAsync(CancellationToken ct) {var data=await Fetch("videos?part=snippet,contentDetails&chart=mostPopular&videoCategoryId=10&regionCode=PL&maxResults=24",ct);var tracks=data.GetProperty("items").EnumerateArray().Select(TrackFrom).ToArray();return new(tracks.Take(3).ToArray(),tracks,[],tracks.Select(t=>new ArtistSummary(t.ArtistId,t.Artist,t.Artwork)).DistinctBy(a=>a.Id).Take(12).ToArray(),tracks,Status);}
}
public class MusicProviderException(string message):Exception(message);
