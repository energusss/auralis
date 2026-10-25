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
        response = urllib.request.urlopen(req, timeout=20)
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
