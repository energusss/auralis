# Backend API contract
Base URL http://localhost:5080/api. JSON camelCase. Error JSON `{title,detail,status}`. JWT Bearer. CORS localhost:5173.

Track: `{id,title,artist,artistId,album,albumId,artwork,duration,genre,provider,playback:{kind:'audio'|'youtube',url?,videoId?}}`.
Artist: `{id,name,artwork,description,tracks:Track[],albums:Album[],related:ArtistSummary[]}`. Album `{id,title,artist,artistId,artwork,year,tracks:Track[]}`.
GET /music/search?q=&type=all|songs|artists|albums|playlists|videos&cursor= -> `{tracks,artists,albums,playlists,nextCursor}`. Artist summary `{id,name,artwork}`. Album summary `{id,title,artist,artistId,artwork,year}`.
GET /music/home -> `{featured:Track[],trending:Track[],newReleases:AlbumSummary[],artists:ArtistSummary[],recommendations:Track[],providerStatus:string}`.
GET /music/tracks/{id}; /music/artists/{id}; /music/albums/{id}; /music/playlists/{id}; /music/recommendations.

POST /auth/register `{email,password,displayName}`; POST /auth/login `{email,password}`; POST /auth/google `{credential}` -> `{accessToken,refreshToken,user:{id,email,displayName}}`. Google credential must be a Google Identity Services ID token. The API validates signature, issuer, configured audience, expiration and `email_verified` before looking up the stable Google `sub`. A verified matching email may be linked to an existing account; unverified email claims are rejected.
POST /auth/refresh `{refreshToken}` -> same. POST /auth/logout `{refreshToken}`. GET /auth/me -> user.
GET /library -> `{favorites:Track[],savedArtists:ArtistSummary[],savedAlbums:AlbumSummary[],playlists:Playlist[],history:History[]}`.
PUT /library/favorites/{trackId} Track body; DELETE same. PUT /library/artists/{id} ArtistSummary; DELETE same. PUT /library/albums/{id} AlbumSummary; DELETE same.
Playlist `{id,name,description,artwork,tracks:Track[],createdAt,updatedAt}`.
GET /playlists; POST /playlists `{name,description?,artwork?}`; GET /playlists/{id}; PUT /playlists/{id} `{name,description?,artwork?}`; DELETE /playlists/{id}; POST /playlists/{id}/duplicate.
POST /playlists/{id}/tracks Track body (deduplicated); DELETE /playlists/{id}/tracks/{trackId}; PUT /playlists/{id}/order `{trackIds:string[]}` (exact permutation).
POST /history `{track:Track,seconds:number,eventId:string}` actual audible listening seconds, max 300 per event, idempotent UUID.
GET /history?skip=0&take=50 -> History[] `{id,track,seconds,playedAt}`. DELETE /history.
GET /statistics -> `{totalSeconds,totalEvents,topTracks:[{track,events,seconds}],topArtists:[{artist,events,seconds}],genres:[{genre,seconds}],daily:[{date,seconds}]}`.
GET /settings -> `{language:'pl'|'en',theme:'dark'|'light'|'system',accent:string}`; PUT same.
GET /search-history -> string[]; POST /search-history `{query}`; DELETE /search-history.
Guest data stays frontend local storage; music endpoints anonymous. No fake catalogs: included demo is real Kevin MacLeod CC BY music, configured YouTube metadata uses official API and visible iframe playback.
