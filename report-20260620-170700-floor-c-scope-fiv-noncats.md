# Floor C Scope: FIV/FeLV for Non-Cat Species

**Source:** Live pool via `fetchAnimals()`, server.ts input assembly (line 4694-4697). [VERIFIED]

---

## Answers

**1. Do dog/small-animal prompts receive structured FIV/FeLV?**

**NO.** The input assembly is gated on `speciesLower === 'cat'` (server.ts:4694). Dogs and small animals do NOT receive `FIV:` or `FeLV:` lines in their Phase-2 input. [VERIFIED]

**2. Are there any FIV+/FeLV+ dogs or small animals in the pool?**

**NO.** Zero non-cat animals have `fivStatus` or `felvStatus` of "positive." All non-cat values are `untested` or `unknown`. [VERIFIED]

**Conclusion:** Floor C (FIV/FeLV must-disclose) applies to **cat prompts only**. The dog and small-animal prompts don't receive the fields, and no dogs or small animals are positive. This is biologically expected — FIV and FeLV are feline-specific viruses. Floor C scope is correctly limited to the 2 cat system prompts (EN + ES) and the post-generation code floor.
