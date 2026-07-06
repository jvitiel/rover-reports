# intake-recipients Gate — 2026-07-06

## isGatedPath BEFORE

```typescript
function isGatedPath(p: string): boolean {
  return (
    p === '/api/volunteers'
    || p.startsWith('/api/volunteers/')
    || p === '/api/adoption-applications'
    || p === '/api/dashboard/behavior-notes'
    || p.startsWith('/api/docs/')
  );
}
```

## isGatedPath AFTER

```typescript
function isGatedPath(p: string): boolean {
  return (
    p === '/api/volunteers'
    || p.startsWith('/api/volunteers/')
    || p === '/api/adoption-applications'
    || p === '/api/dashboard/behavior-notes'
    || p === '/api/intake-recipients'
    || p.startsWith('/api/docs/')
  );
}
```

Anchor: exact-match (`===`). Cannot match `/api/intakes` or `/api/intake/confirm/:id`.

## Dashboard fetch conversions

3 plain `fetch` GET calls converted to `gatedFetch`:
- Line 11710: `gatedFetch(${API_BASE}/intake-recipients)` — loadIntakeData() initial load
- Line 12016: `await gatedFetch(${API_BASE}/intake-recipients)` — refresh after add
- Line 12038: `await gatedFetch(${API_BASE}/intake-recipients)` — refresh after delete

POST (line 12003) and DELETE (line 12030) were already `gatedFetch` — untouched.

## Verification Results

### V1: Anon GET /api/intake-recipients → 401 [VERIFIED]

```
$ curl -sSw "\nHTTP_CODE:%{http_code} CONTENT_TYPE:%{content_type} SIZE:%{size_download}" \
    "https://dashboard.4lgshelterapp.duckdns.org/api/intake-recipients" -o /tmp/v1.txt
$ cat /tmp/v1.txt

HTTP_CODE:401 CONTENT_TYPE:application/json; charset=utf-8 SIZE:16
{"error":"gate"}
```

### V2: Token GET /api/intake-recipients → 200 + JSON list [VERIFIED]

```
$ TOKEN=$(curl -sS "$BASE/api/gate-token" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
$ curl -sSw "\nHTTP_CODE:%{http_code} CONTENT_TYPE:%{content_type} SIZE:%{size_download}" \
    -H "X-Gate-Token: $TOKEN" \
    "https://dashboard.4lgshelterapp.duckdns.org/api/intake-recipients" -o /tmp/v2.txt
$ cat /tmp/v2.txt

HTTP_CODE:200 CONTENT_TYPE:application/json; charset=utf-8 SIZE:260
{"success":true,"data":[{"id":1,"email":"flgnynjai@gmail.com","name":"Test Staff","active":true},{"id":3,"email":"sheltersupervisor@4lg.org","name":"Shelter Supervisor","active":false},{"id":4,"email":"info@4lg.org","name":"Info Distribution","active":false}]}
```

Content-type is `application/json; charset=utf-8` — real JSON list, not text/html SPA shell. [VERIFIED]

### V3: Anon GET /api/intakes → UNCHANGED (200) [VERIFIED]

```
$ curl -sSw "\nHTTP_CODE:%{http_code} CONTENT_TYPE:%{content_type}" \
    "https://dashboard.4lgshelterapp.duckdns.org/api/intakes" -o /dev/null

HTTP_CODE:200 CONTENT_TYPE:application/json; charset=utf-8
```

Anchor did not catch /api/intakes. [VERIFIED]

### V4: Anon GET /api/intake/confirm/44 → UNCHANGED (200) [VERIFIED]

```
$ curl -sSw "\nHTTP_CODE:%{http_code} CONTENT_TYPE:%{content_type}" \
    "https://dashboard.4lgshelterapp.duckdns.org/api/intake/confirm/44" -o /tmp/v4.txt
$ cat /tmp/v4.txt

HTTP_CODE:200 CONTENT_TYPE:application/json; charset=utf-8
{"success":true,"data":{"id":44,"submitted_at":"2026-05-13 17:32:44","breed":"beagle","sex":"female"}}
```

Anchor did not catch /api/intake/confirm/:id. [VERIFIED]

### V5: Zero remaining plain-fetch GETs [VERIFIED]

```
$ grep -n "fetch.*intake-recipients" /home/shelter/shelter-apps/dashboard/index.html | grep -v gatedFetch
(no output — all converted)
```

## Commit

```
[master 477eb65] Gate GET /api/intake-recipients read (3 fetch->gatedFetch + isGatedPath entry); anchored to exclude /api/intakes
 2 files changed, 4 insertions(+), 3 deletions(-)
```
