# Preamble Tone Style-Line DEPLOYED

**Date:** 2026-06-18 21:19 ET  
**Commit:** `94793ec`  
**Production modified:** YES. 1 file, +4 insertions. [VERIFIED]  
**Status:** DEPLOYED

---

## Change

One style-line added to the SHELTER POLICIES "Rules:" list in each of four prompts. No other changes.

---

## Exact-Delta Check (4 prompts, 4 insertions, zero other changes)

Full diff output:

```
4706a4707
> - Keep the preamble warm and natural, the way you'd talk to a friend — avoid clinical
>   or transactional words like 'inventory,' 'stock,' or 'units' (say 'the cats currently
>   in our care' rather than 'our current inventory'). Warmth is in the phrasing, not the
>   substance: still deliver the honest match-quality message plainly when matches are
>   weak — don't soften it into false reassurance.

4773a4775
> - Mantén el preámbulo cálido y natural, como le hablarías a un amigo — evita palabras
>   clínicas o transaccionales como 'inventario' o 'existencias' (di 'los gatos que
>   tenemos ahora con nosotros' en vez de 'nuestro inventario actual')...

4844a4847
> - Keep the preamble warm and natural... (say 'the dogs currently in our care'...)

4914a4918
> - Mantén el preámbulo cálido y natural... (di 'los perros que tenemos ahora con
>   nosotros'...)
```

| Prompt | Line | Species noun | Insertion count | Other changes |
|---|---|---|---|---|
| Cat EN (`systemMessageEn`) | 4707 | "the cats currently in our care" | 1 | 0 |
| Cat ES (`systemMessageEs`) | 4775 | "los gatos que tenemos ahora con nosotros" | 1 | 0 |
| Dog EN (`systemMessageDogEn`) | 4847 | "the dogs currently in our care" | 1 | 0 |
| Dog ES (`systemMessageDogEs`) | 4918 | "los perros que tenemos ahora con nosotros" | 1 | 0 |

**Total diff: exactly 4 added lines, zero modifications, zero deletions.** [VERIFIED — `diff` output quoted above]

---

## Live Re-Run: Dog Mismatch

**Query:** `{"species":"dog","sex":["male","female"],"ageGroup":["young","adult","senior"],"narrative":"A hypoallergenic show poodle that is already fully trained"}`

**low_confidence:** true ✅

**Preamble (verbatim):**

> "The dogs currently in our care don't include a show poodle, and none of them arrived fully trained — so these are the closest matches we have rather than a precise fit. We'd love for you to call us at (845) 414-9700 to talk through what you're looking for; we may be able to point you toward something that lands closer to home."

**Warmth check:** ✅ "The dogs currently in our care" (not "our current inventory"). "We'd love for you to call us" (not "contact the facility"). Zero instances of "inventory," "stock," or "units." Reads like a friend, not a database. [VERIFIED]

**Honesty check:** ✅ "don't include a show poodle" — plainly stated, no softening. "none of them arrived fully trained" — honest. "closest matches we have rather than a precise fit" — clear quality disclaimer. Not softened into false reassurance. [VERIFIED]

**Both conditions hold simultaneously.** [VERIFIED]

---

## Live Re-Run: Cat Low-Confidence

**Query:** `{"sex":["male","female"],"ageGroup":["young","adult","senior"],"narrative":"I am looking for a purebred Siamese cat, preferably seal point"}`

**low_confidence:** true ✅

**Preamble (verbatim):**

> "We don't currently have any Siamese cats in our care — the three cats available right now are all domestic shorthairs, so none of them are the seal point Siamese you had in mind. These are the closest matches we can offer at the moment; if you'd like to be notified when a Siamese comes in, give us a call at (845) 414-9700 and we'd be happy to keep you in mind."

**Warmth check:** ✅ "in our care," "we'd be happy to keep you in mind." Zero clinical terms. [VERIFIED]

**Honesty check:** ✅ "don't currently have any Siamese cats" — plain. "none of them are the seal point Siamese you had in mind" — no false reassurance. [VERIFIED]

**Cat sanity:** 3 matches returned (Abe, Edna, Jeans). FIV/FeLV present in profiles (`FIV: negative` confirmed in audit). Cat FAQ loaded (species:'cat' in hard_filters). [VERIFIED]

---

## Rollback

```bash
cd /home/shelter/shelter-apps && git revert 94793ec
cd server && npm run build && sudo -n systemctl restart shelter-app
```
