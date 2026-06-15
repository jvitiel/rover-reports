# SM Field Value Sets for Adult Generic Bio Template

**Date:** 2026-06-15 03:35 UTC  
**Type:** Read-only diagnosis  
**Source:** Live API query against all 149 adoptable animals  

---

## PART 1 — COLOR (39 distinct values)

```
 23  Black
 10  White
  9  Brown
  8  Black with white
  8  Brown and White
  8  Black and White
  6  Tabby Grey & White
  6  Tabby: Orange and White
  5  Tuxedo: Black and White
  5  Tabby
  5  Grey
  4  Buff and White
  4  Brown and Black
  4  Tan and White
  4  Calico
  3  Grey and White
  3  tabby brown
  3  Tan
  3  Tricolour
  3  tabby - brown and white
  2  White and Brown
  2  Tabby - grey
  2  White and Black
  2  Tabico
  2  Ginger
  2  Orange tabby
  1  Black and Brown
  1  Cream
  1  Orange / Red & White
  1  Dilute Calico
  1  Chocolate
  1  White with black
  1  Various
  1  Black and Grey
  1  tabby - ginger
  1  Dilute Tabico
  1  Tabby black & grey
  1  Brindle
  1  Dilute Tortie
```

[VERIFIED — live API, 149 animals, 39 distinct values]

**Key observations for Spanish translation map:**
- Case inconsistency: `tabby brown` vs `Tabby`, `tabby - brown and white` vs `Tabby Grey & White`
- Compound patterns: `X and Y`, `X with Y`, `X & Y`, `X: X and Y`, `X / X & Y`
- Special terms needing translation: Tabby, Tuxedo, Calico, Tabico, Dilute, Tortie, Brindle, Tricolour, Buff, Ginger
- `Various` (1 animal) — edge case
- Simple solids: Black, White, Brown, Grey, Tan, Cream, Chocolate, Ginger

## PART 2 — SIZE (3 distinct values)

```
142  medium
  6  small
  1  large
```

[VERIFIED — all lowercase]

## PART 3 — SEX (2 distinct values)

```
 80  Male
 69  Female
```

[VERIFIED — no Unknown, blank, or other values in the current population]

## PART 4 — AGE STRING FORMAT

### All 6 distinct patterns (every value ends with a trailing period):

```
 63  N years N months.     (e.g. "3 years 5 months.")
 52  N weeks.              (e.g. "11 weeks.")
 17  N year N months.      (e.g. "1 year 4 months.")
  8  N months.             (e.g. "6 months.")
  7  N years N month.      (e.g. "2 years 1 month.")
  2  N year N month.       (e.g. "1 year 1 month.")
```

**149/149 end with a trailing period.** [VERIFIED]

### Notable values for normalization:

| Pattern | Example | Count | Handling note |
|---------|---------|-------|--------------|
| 0 months | `2 years 0 months.` | 4 | Drop the "0 months" → "2 years" |
| 0 months + 1 year | `1 year 0 months.` | 2 | → "1 year" |
| Under 1 year (months) | `6 months.`, `7 months.`, `8 months.`, `10 months.` | 8 | Show as months only |
| Under 1 year (weeks) | `8 weeks.` through `24 weeks.` | 52 | Youth animals — unlikely Track C targets but handle |
| Singular/plural | `1 year` vs `2 years`, `1 month` vs `5 months` | varies | SM already handles English singular/plural |
| Senior | `16 years 3 months.`, `16 years 1 month.` | 2 | Oldest animals |

### 15 representative samples spanning the range:

```
"8 weeks."           — youngest (youth)
"12 weeks."          — youth boundary
"24 weeks."          — oldest weeks-format
"6 months."          — under-1-year, months format
"10 months."         — under-1-year
"1 year 0 months."   — exactly 1 year (drop "0 months")
"1 year 4 months."   — young adult
"2 years 1 month."   — singular month
"3 years 5 months."  — mid-adult
"4 years 6 months."  — adult
"6 years 0 months."  — drop "0 months"
"8 years 11 months." — older adult
"10 years 7 months." — senior
"12 years 10 months."— senior
"16 years 3 months." — oldest in population
```

## PART 5 — BREED (36 distinct values, 10 representative samples)

```
 86  Domestic Short Hair
 13  Terrier/Mixed Breed
 10  American              ← rabbit breed
  3  Terrier
  2  Husky
  2  Domestic Long Hair
  2  Hotot                 ← rabbit breed
  2  Domestic Medium Hair
  2  Pit Bull Terrier
  1  Chinchilla            ← species-as-breed
  1  Guinea Pig            ← species-as-breed
  1  Ferret                ← species-as-breed
  1  Labrador Retriever/Mixed Breed
  1  German Shepherd Dog/Mixed Breed
  1  Boxer/Mixed Breed
  1  Maltese/Poodle
  1  Yorkshire Terrier Yorkie
  1  Bichon Frise
  1  Spaniel/Dachshund
  ...and 17 more single-count breeds
```

[VERIFIED — free-text English, leave as-is in Spanish template]

**Key observations:**
- Breed is free-text English from ShelterManager — not translated
- Compound breeds use `/` separator (e.g. "Labrador Retriever/Mixed Breed")
- Small animals sometimes use species name as breed (Chinchilla, Guinea Pig, Ferret)
- Rabbit breeds: American, Hotot, Lop Eared, Lion Head, Florida White, Dwarf

---

## Summary for Template Building

| Field | Distinct values | Translation needed | Notes |
|-------|----------------|-------------------|-------|
| color | 39 | YES — full map needed | Case-inconsistent, compound patterns |
| size | 3 | YES — small/medium/large | All lowercase |
| sex | 2 | YES — Male/Female → macho/hembra or pronoun inflection | No unknowns |
| age | 74 strings, 6 patterns | YES — pattern-based | All end with `.`, handle "0 months", singular/plural |
| breed | 36 | NO — leave as-is | Free-text English proper nouns |

All fields are 100% populated across 149 adoptable animals. [VERIFIED]

---

*Report generated by Rover. Read-only — no changes made.*
