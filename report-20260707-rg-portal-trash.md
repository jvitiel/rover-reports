# RG Portal Draft Page — Trash

## S0 — Fail-fast target check

```
wp post get 294 --fields=ID,post_title,post_name,post_status
ID            294
post_title    RG Cares Portal
post_name     rg-portal
post_status   draft
```

All three match: ID=294, slug=`rg-portal`, title="RG Cares Portal". Proceed. [VERIFIED]

## S1 — Trash

```
wp post update 294 --post_status=trash
→ Success: Updated post 294.
```

Reversible (trash, not `--force` permanent delete). [VERIFIED]

## S2 — Verify

### S2a — Post status

```
wp post get 294 --field=post_status → trash
```

[VERIFIED]

### S2b — Public URL

```
curl -sSI https://www.fourlegsgoodnynj.org/rg-portal → HTTP/2 404
```

[VERIFIED]

### S2c — Boundary: live /rg-cares/ page untouched

```
wp post get 10 --fields=ID,post_status,post_name
ID            10
post_status   publish
post_name     rg-cares
```

```
curl -sSI https://www.fourlegsgoodnynj.org/rg-cares/ → HTTP/2 200
```

Page 10 is publish, slug `rg-cares`, serving 200. Unchanged. [VERIFIED]
