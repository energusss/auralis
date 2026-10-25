"""Black-box journey against a disposable CI API backed by PostgreSQL.
No credentials or tokens are printed. Use only with a disposable database.
"""
import json
import os
import urllib.error
import urllib.request
import uuid

BASE = os.environ.get("AURALIS_SMOKE_URL", "http://127.0.0.1:5080/api")

def request(path, method="GET", body=None, token=None, expected=200):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=60)
    except urllib.error.HTTPError as error:
        assert error.code == expected, f"{method} {path}: expected {expected}, got {error.code}"
        return None
    assert response.status == expected, f"{method} {path}: {response.status}"
    content = response.read()
    return json.loads(content) if content else None

suffix = uuid.uuid4().hex
account = {"email": f"smoke-{suffix}@example.com", "password": "ci-disposable-password-123", "displayName": "CI listener"}
session = request("/auth/register", "POST", account)
token = session["accessToken"]
tracks = request("/music/search?q=Kevin&type=songs")["tracks"][:2]
assert len(tracks) == 2
request("/library", expected=401)
playlist = request("/playlists", "POST", {"name": "PostgreSQL smoke"}, token, 201)
path = "/playlists/" + playlist["id"]
for track in tracks:
    request(path + "/tracks", "POST", track, token)
request(path + "/order", "PUT", {"trackIds": [t["id"] for t in reversed(tracks)]}, token)
assert request(path, token=token)["tracks"][0]["id"] == tracks[1]["id"]
request("/library/favorites/" + tracks[0]["id"], "PUT", tracks[0], token, 204)
event = {"track": tracks[0], "seconds": 30, "eventId": str(uuid.uuid4())}
request("/history", "POST", event, token, 204)
request("/history", "POST", event, token, 204)
assert request("/statistics", token=token)["totalSeconds"] == 30
request("/settings", "PUT", {"language": "en", "theme": "dark", "accent": "#8b5cf6"}, token)
other = request("/auth/register", "POST", {**account, "email": "other-" + account["email"]})
request(path, token=other["accessToken"], expected=404)
request("/auth/logout", "POST", {"refreshToken": session["refreshToken"]}, token, 204)
request("/auth/refresh", "POST", {"refreshToken": session["refreshToken"]}, expected=401)
renewed = request("/auth/login", "POST", {"email": account["email"], "password": account["password"]})
lib = request("/library", token=renewed["accessToken"])
assert len(lib["favorites"]) == 1 and len(lib["playlists"]) == 1 and len(lib["history"]) == 1
assert request("/settings", token=renewed["accessToken"])["language"] == "en"
print("PostgreSQL migrations and HTTP journey passed: accounts, ownership, favorites, playlists, order, history, settings and logout/login persistence.")

# This is an external-source integration check, not a mock: search the real
# Archive catalog, resolve its declared CC source, then request MP3 byte ranges.
open_audio = request("/music/open-audio/search?q=Directionless%20EP")
night_owl = next((track for track in open_audio["tracks"] if "Night Owl" in track["title"]), None)
assert night_owl and night_owl["provider"] == "Internet Archive", "Expected the real Directionless EP catalog item"
assert night_owl["playback"]["availability"] == "resolvable" and not night_owl["playback"].get("url")
resolved = request("/music/playback/resolve", "POST", {"trackIds": [night_owl["id"]]})[0]
assert resolved["availability"] == "playable" and resolved["mediaType"] == "audio/mpeg"
assert "creativecommons.org/licenses/by/3.0" in resolved["licenseUrl"]
stream_request = urllib.request.Request(resolved["url"], headers={"Range": "bytes=0-4095"})
with urllib.request.urlopen(stream_request, timeout=60) as stream:
    sample = stream.read(4096)
    assert stream.status == 206, f"Expected byte-range MP3 response, got {stream.status}"
    assert sample.startswith(b"ID3") or (len(sample) > 1 and sample[0] == 0xFF and sample[1] & 0xE0 == 0xE0), "Resolved source did not return MP3 frames"
print("Live provider integration passed: genuine Night Owl metadata, declared CC BY source, MP3 range bytes fetched.")
