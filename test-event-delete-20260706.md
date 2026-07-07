# Test Event Delete — 2026-07-07

## Pre-Delete Confirms

```
Post 297: type=shelter_event | title=Test Event | status=publish
Post 470: type=shelter_event | title=Evento de Prueba | status=publish | lang=es
pll_get_post(297,'es') = 470
pll_get_post(470,'en') = 297
```

Both confirmed: correct type, correct titles (EN "Test Event" / ES "Evento de Prueba"), bidirectional Polylang link 297↔470. [VERIFIED]

## Delete

```
Delete 297: SUCCESS (ID=297)
Delete 470: SUCCESS (ID=470)
```

Both force-deleted (trash-bypass). [VERIFIED]

## Verify

```
Post 297 after delete: GONE (null)
Post 470 after delete: GONE (null)
shelter_event count BEFORE: 24
shelter_event count AFTER: 22
diff: 2
```

Both return null (gone). Count dropped by exactly 2. No other posts affected. [VERIFIED]
