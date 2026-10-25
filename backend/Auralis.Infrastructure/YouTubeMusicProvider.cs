using System.Net;
using System.Text;
using System.Text.Json;
using System.Xml;
using Auralis.Domain;
using Auralis.Application;
using Microsoft.Extensions.Caching.Memory;
namespace Auralis.Infrastructure;
// YouTube channels/playlists are honestly represented; the Data API does not expose a music album catalog.
public class YouTubeMusicProvider(HttpClient http, IMemoryCache cache, DemoMusicProvider demo, string apiKey) : IMusicProvider {
 public string Status=>"YouTube Data API metadata discovery; playable audio is limited to authorized direct audio sources";
 private async Task<JsonElement> Fetch(string endpoint, CancellationToken ct) {
 if(cache.TryGetValue<JsonElement>(endpoint,out var cached)) return cached;
 using var response=await http.GetAsync("https://www.googleapis.com/youtube/v3/"+endpoint+"&key="+Uri.EscapeDataString(apiKey),ct);
 if(!response.IsSuccessStatusCode) throw new MusicProviderException(response.StatusCode==HttpStatusCode.Forbidden?"YouTube quota or API key restriction. Check the backend key and quota.":"The music metadata provider is temporarily unavailable.");
 using var doc=JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));var data=doc.RootElement.Clone();cache.Set(endpoint,data,TimeSpan.FromMinutes(15));return data;
 }
 private static string S(JsonElement e,string key)=>e.TryGetProperty(key,out var x)?x.GetString()??"":"";
 private static string Art(JsonElement snippet) { if(!snippet.TryGetProperty("thumbnails",out var thumbs))return "";foreach(var size in new[]{"high","medium","default"})if(thumbs.TryGetProperty(size,out var t))return S(t,"url");return "";}
 private static Track TrackFrom(JsonElement item) {var s=item.GetProperty("snippet");var id=item.GetProperty("id").ValueKind==JsonValueKind.String?S(item,"id"):S(item.GetProperty("id"),"videoId"); var duration=item.TryGetProperty("contentDetails",out var details)?(int)XmlConvert.ToTimeSpan(S(details,"duration")).TotalSeconds:0;return new("yt:"+id,WebUtility.HtmlDecode(S(s,"title")),WebUtility.HtmlDecode(S(s,"channelTitle")),"yt:"+S(s,"channelId"),"","",Art(s),duration,"Music","YouTube",new("youtube",null,id,null,"metadata-only"));}
 private static string Raw(string id) {if(!id.StartsWith("yt:")||id.Length>150)throw new ArgumentException("Invalid YouTube identifier.");return Uri.EscapeDataString(id[3..]);}
 public async Task<SearchResult> SearchAsync(string query,string type,string? cursor,CancellationToken ct) {
 if(type=="all") {
  string?[] cursors=[null,null,null];
  if(!string.IsNullOrEmpty(cursor))try{cursors=JsonSerializer.Deserialize<string?[]>(Encoding.UTF8.GetString(Convert.FromBase64String(cursor)))??cursors;}catch(FormatException){}catch(JsonException){}
  var results=await Task.WhenAll(SearchTyped(query,"video",cursors.ElementAtOrDefault(0),ct),SearchTyped(query,"channel",cursors.ElementAtOrDefault(1),ct),SearchTyped(query,"playlist",cursors.ElementAtOrDefault(2),ct));
  var next=results.Any(x=>!string.IsNullOrEmpty(x.NextCursor))?Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(results.Select(x=>x.NextCursor)))):null;
  return new(results[0].Tracks,results[1].Artists,[],results[2].Playlists,next);
 }
 if(type=="albums")return await demo.SearchAsync(query,type,cursor,ct);
 var ytType=type=="artists"?"channel":type=="playlists"?"playlist":"video";
 return await SearchTyped(query,ytType,cursor,ct);
 }
 private async Task<SearchResult> SearchTyped(string query,string ytType,string? cursor,CancellationToken ct) {
 var endpoint="search?part=snippet&maxResults=24&type="+ytType+"&q="+Uri.EscapeDataString(query)+(ytType=="video"?"&videoCategoryId=10&videoEmbeddable=true":"")+(string.IsNullOrEmpty(cursor)?"":"&pageToken="+Uri.EscapeDataString(cursor));
 var data=await Fetch(endpoint,ct);var items=data.GetProperty("items").EnumerateArray().ToArray();
 var tracks=ytType=="video"?items.Select(TrackFrom).Where(t=>!string.IsNullOrWhiteSpace(t.Playback.VideoId)).ToArray():[];
 var artists=ytType=="channel"?items.Select(i=>{var s=i.GetProperty("snippet");var id=S(i.GetProperty("id"),"channelId");return string