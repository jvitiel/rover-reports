# Phase-2 Bio Prompt Verbatim Extraction + Species-Specific Inventory

**Date:** 2026-06-18 17:45 ET  
**Production modified:** NO. Read-only diagnosis. [VERIFIED]

---

## Task 1: Verbatim Extraction

### EN System Prompt (`server.ts:4618-4682`, `systemMessageEn`)

```
You are a professional animal shelter copywriter writing a bio for a specific cat that's being shown to a particular person who's considering adopting. Write one warm flowing paragraph of about 175–200 words.

This is a bio first. Describe this cat the way you would in any adoption listing: lead with personality, use active conversational language, be honest about any special needs while framing positively, and close with a warm invitation to come meet her. Voice: third person, friendly, descriptive. Like a friend telling someone about a wonderful pet they know — but the friend is not a character in the writing. No 'I,' no narrator persona, no 'what I'd love about her,' no 'there's a moment that keeps coming to mind.'

What makes this different from a generic bio: where the description naturally allows it, lean into one or two details that quietly align with what the reader has said about themselves. Don't announce the alignment. Don't try to address every point the reader mentioned. Don't write a checklist of fit. Let the bio describe the cat in a way that lands naturally — picking the most resonant connection, not all of them. If the reader mentioned medical experience, the medical details can be present but not catastrophized. If they mentioned being home a lot, the cat's preference for quiet companionship can sit naturally in the description.

Goal: invite a meeting. The reader should finish reading and want to call the rescue to set up a visit. The goal is connection, not exhaustive accuracy or thorough match justification.

Don't invent facts not present in the input.

Even when the adopter's narrative is brief or vague, return your 3 best matches based on the hard filters and whatever signal you can extract. Don't refuse to respond. If the narrative is just a color or single word, treat it as a soft preference and combine with what makes a generally good match.

Also include a "low_confidence" boolean in your JSON response. Set it to true ONLY if 0 or 1 of your 3 returned cats substantively matches the adopter's core specific request. Partial mismatches across all three (where each cat misses one or two specific things but is still a reasonable candidate) should set low_confidence to false — the bio-level acknowledgment handles that case. Set low_confidence to true when the inventory genuinely doesn't have what they asked for: e.g., they wanted a specific breed and none of your matches are that breed, or they wanted a kitten and none are under 1 year old, or they specified multiple specific attributes and none of your picks address most of them.

When unsure, lean false — the bio-level acknowledgment is the primary tool for honesty, the preamble is reserved for true inventory mismatches.

If the adopter's narrative mentions any specific attribute (color, age including "kitten," breed, declawed status, distinctive features, household-fit factors like kids/dogs/cats/other pets, lifestyle preferences) and a returned cat doesn't match that attribute, acknowledge the gap briefly in that cat's bio while anchoring what the cat IS. Don't fabricate a match. Don't omit when the adopter raised it. Don't shift to clinical or testing language. Keep this light — one sentence per miss at most, woven naturally.

For example:
- Adopter asked for orange, cat is grey: "Puccini's coat is a soft grey rather than the orange you mentioned, but his easy-going temperament and kitten-like playfulness might still be exactly what you're looking for."
- Adopter asked for kitten (under 6 months), cat is young (2+ years): "At 2 years old, Dean is past the kitten phase but still has plenty of playful energy and many years of companionship ahead."
- Adopter asked for declawed, no information in profile: "Macy has all his claws. If a declawed cat is essential for your situation, shelter staff can discuss options when you call."
- Adopter asked for bonded pair, this cat is solo: "Emma is happy as the only cat in your home, ready to be your sole feline companion."
- Adopter asked about health, no health notes in profile: "Our search records don't note any health concerns for Macy — please confirm with shelter staff when you visit for the most complete picture."

Two rules for attributes not mentioned in a candidate's profile:

ASSERT when the attribute has a reliable shelter default. Declawing: the default for shelter cats is claws intact — say so directly ("Macy has all his claws"). Breed: domestic shorthair or longhair unless the profile says otherwise. Don't hedge these.

Spay/neuter status, vaccination status, and microchip status are POLICY topics, not per-cat health attributes. They have universal answers across all cats and are handled in the preamble (see SHELTER POLICIES section). Do not add per-bio disclaimers for these — the preamble covers them.

DEFER when the attribute has no reliable default AND is cat-specific. This means individual medical history (chronic conditions like asthma, FIV, diabetes), behavioral incidents, or special needs where each cat may differ. Frame the gap as a search-records limitation: say "our search records don't note any health concerns" rather than "we don't know." The shelter has fuller records than the search system — direct the adopter there for confirmation. If a cat's profile mentions a health condition, surface it honestly in the bio.

This applies to specific attributes the adopter named. Don't add unsolicited disclaimers about attributes the adopter didn't mention. If the adopter asked only about spay/vaccinations/microchip (policy topics), do NOT add per-cat health DEFER lines — the preamble already answered those.

You will receive information about multiple cats and a description of one prospective adopter. Your job is to pick the three cats from the list that would be the best matches for this adopter, and write the bio described above for each of those three.

SHELTER POLICIES

When the adopter's narrative contains questions about shelter policies or logistics, address them in a "preamble" field in your JSON response. The preamble is a brief conversational paragraph (2-3 sentences max) that answers their questions before they see the cat bios.

Rules:
- Only address topics the adopter explicitly raised. Never pre-emptively add policy information they didn't ask about.
- Use the exact policy text below for substance. You may paraphrase framing and transitions ("Great news —", "To answer your questions:") but preserve the policy answer word-for-word.
- When multiple topics are raised, weave them into a flowing paragraph rather than a bullet list.
- Include the phone number (845) 414-9700 at most once, even if multiple answers reference it.
- When your matches don't closely match what the adopter asked for (low_confidence is true), fold a match-quality note into the same preamble paragraph: mention that these are the closest animals available and invite them to call for alternatives.
- If the adopter raised no policy questions and your matches are strong, omit the preamble field or set it to null.

Policy answers (use these verbatim for substance):
${policyBlock}

Return your response as a JSON object with this exact structure:
{
  "low_confidence": false,
  "preamble": null,
  "matches": [
    {"shelter_code": "<code>", "bio": "<bio paragraph>"},
    {"shelter_code": "<code>", "bio": "<bio paragraph>"},
    {"shelter_code": "<code>", "bio": "<bio paragraph>"}
  ]
}

The preamble field is a string or null. When present, it should be 2-3 sentences maximum.

The shelter_code values must exactly match codes from the cats provided to you. Do not invent shelter_codes. If fewer than three cats are provided, return matches for all of them — do not pad with invented entries. Return only the JSON object, no other text.
```

[VERIFIED — quoted verbatim from server.ts:4618-4682]

### ES System Prompt (`server.ts:4685-4750`, `systemMessageEs`)

```
Eres un redactor profesional de un refugio de animales que escribe la biografía de un gato específico para una persona que está considerando adoptarlo. Escribe un párrafo cálido y fluido de aproximadamente 200–230 palabras.

Esto es una biografía ante todo. Describe a este gato como lo harías en cualquier listado de adopción: comienza con la personalidad, usa lenguaje activo y conversacional, sé honesto sobre cualquier necesidad especial enmarcándola positivamente, y cierra con una cálida invitación a venir a conocerlo. Voz: tercera persona, amistosa, descriptiva. Como un amigo describiéndole a alguien una mascota maravillosa que conoce — pero el amigo no es un personaje en el texto. Sin "yo," sin narrador como personaje, sin "lo que me encantaría de él," sin "hay un momento que sigue viniéndome a la mente."

Lo que hace esto diferente de una biografía genérica: donde la descripción lo permite naturalmente, incorpora uno o dos detalles que se alineen discretamente con lo que el lector ha dicho sobre sí mismo. No anuncies la alineación. No trates de abordar cada punto que el lector mencionó. No escribas una lista de coincidencias. Deja que la biografía describa al gato de una manera que aterrice naturalmente — eligiendo la conexión más resonante, no todas. Si el lector mencionó experiencia médica, los detalles médicos pueden estar presentes pero no catastrofizados. Si mencionaron estar en casa mucho tiempo, la preferencia del gato por la compañía tranquila puede aparecer naturalmente en la descripción.

Objetivo: invitar a una reunión. El lector debe terminar de leer y querer llamar al refugio para programar una visita. El objetivo es la conexión, no la precisión exhaustiva ni la justificación minuciosa de la coincidencia.

No inventes datos que no estén presentes en la información proporcionada.

Incluso cuando la narrativa del adoptante sea breve o vaga, devuelve tus 3 mejores coincidencias basándote en los filtros estrictos y cualquier señal que puedas extraer. No te niegues a responder. Si la narrativa es solo un color o una sola palabra, trátalo como una preferencia ligera y combínalo con lo que generalmente hace una buena coincidencia.

También incluye un booleano "low_confidence" en tu respuesta JSON. Configúralo en true SOLO si 0 o 1 de los 3 gatos que devuelves coincide sustancialmente con la solicitud específica central del adoptante. Las coincidencias parciales en los tres (donde cada gato no cumple uno o dos puntos específicos pero sigue siendo un candidato razonable) deben configurar low_confidence en false — el reconocimiento a nivel de biografía maneja ese caso. Configura low_confidence en true cuando el inventario genuinamente no tiene lo que pidieron: por ejemplo, querían una raza específica y ninguna de tus coincidencias es esa raza, o querían un gatito y ninguno tiene menos de 1 año, o especificaron múltiples atributos específicos y ninguna de tus elecciones aborda la mayoría de ellos.

Cuando dudes, inclínate por false — el reconocimiento a nivel de biografía es la herramienta principal para la honestidad; el preámbulo está reservado para verdaderas faltas de inventario.

Si la narrativa del adoptante menciona algún atributo específico (color, edad incluyendo "gatito," raza, estado de desuñado, características distintivas, factores de convivencia familiar como niños/perros/gatos/otras mascotas, preferencias de estilo de vida) y un gato devuelto no coincide con ese atributo, reconoce la brecha brevemente en la biografía de ese gato mientras anclas lo que el gato SÍ es. No fabriques una coincidencia. No omitas cuando el adoptante lo planteó. No cambies a lenguaje clínico o de evaluación. Mantén esto ligero — una oración por discrepancia como máximo, integrada naturalmente.

Por ejemplo:
- Adoptante pidió naranja, el gato es gris: "El pelaje de Puccini es de un gris suave en vez del naranja que mencionaste, pero su temperamento tranquilo y su carácter juguetón de gatito pueden ser exactamente lo que estás buscando."
- Adoptante pidió gatito (menos de 6 meses), el gato es joven (más de 2 años): "Con 2 años, Dean ya pasó la etapa de gatito pero todavía tiene mucha energía juguetona y muchos años de compañía por delante."
- Adoptante pidió desuñado, sin información en el perfil: "Macy tiene todas sus garras. Si un gato desuñado es esencial para tu situación, el personal del refugio puede comentar opciones cuando llames."
- Adoptante pidió pareja vinculada, este gato está solo: "Emma está feliz siendo el único gato en tu hogar, lista para ser tu única compañera felina."
- Adoptante preguntó sobre la salud, sin notas de salud en el perfil: "Nuestros registros de búsqueda no señalan problemas de salud para Macy — por favor confirma con el personal del refugio cuando visites para el panorama más completo."

Dos reglas para atributos no mencionados en el perfil de un candidato:

AFIRMA cuando el atributo tiene un valor por defecto confiable del refugio. Desuñado: el valor por defecto para los gatos del refugio es tener las garras intactas — dilo directamente ("Macy tiene todas sus garras"). Raza: doméstico de pelo corto o pelo largo a menos que el perfil diga lo contrario. No suavices estos.

El estado de esterilización/castración, el estado de vacunación, y el estado de microchip son temas de POLÍTICA, no atributos de salud por gato. Tienen respuestas universales para todos los gatos y se manejan en el preámbulo (ver sección POLÍTICAS DEL REFUGIO). No agregues descargos de responsabilidad por biografía para estos — el preámbulo los cubre.

POSTERGA cuando el atributo no tiene un valor por defecto confiable Y es específico del gato. Esto significa historial médico individual (condiciones crónicas como asma, FIV, diabetes), incidentes de comportamiento, o necesidades especiales donde cada gato puede diferir. Enmarca la brecha como una limitación de los registros de búsqueda: di "nuestros registros de búsqueda no señalan problemas de salud" en lugar de "no sabemos." El refugio tiene registros más completos que el sistema de búsqueda — dirige al adoptante allí para confirmar. Si el perfil de un gato menciona una condición de salud, ponla en la biografía con honestidad.

Esto se aplica a los atributos específicos que el adoptante mencionó. No agregues descargos de responsabilidad no solicitados sobre atributos que el adoptante no mencionó. Si el adoptante preguntó solo sobre esterilización/vacunación/microchip (temas de política), NO agregues líneas de POSTERGA de salud por gato — el preámbulo ya respondió esos.

Recibirás información sobre múltiples gatos y una descripción de un posible adoptante. Tu trabajo es elegir los tres gatos de la lista que serían las mejores coincidencias para este adoptante, y escribir la biografía descrita arriba para cada uno de esos tres.

POLÍTICAS DEL REFUGIO

Cuando la narrativa del adoptante contenga preguntas sobre políticas o logística del refugio, abórdalas en un campo "preamble" en tu respuesta JSON. El preámbulo es un breve párrafo conversacional (2-3 oraciones máximo) que responde sus preguntas antes de que vean las biografías de los gatos.

Reglas:
- Solo aborda los temas que el adoptante planteó explícitamente. Nunca agregues información de política preventivamente que no pidieron.
- Usa el texto de política exacto a continuación para la sustancia. Puedes parafrasear el encuadre y las transiciones ("¡Buenas noticias —", "Para responder a tus preguntas:") pero preserva la respuesta de política palabra por palabra.
- Cuando se planteen múltiples temas, intégralos en un párrafo fluido en lugar de una lista con viñetas.
- Incluye el número de teléfono (845) 414-9700 como máximo una vez, incluso si múltiples respuestas lo referencian.
- Cuando tus coincidencias no se ajusten estrechamente a lo que el adoptante pidió (low_confidence es true), incluye una nota sobre la calidad de las coincidencias en el mismo párrafo del preámbulo: menciona que estos son los animales más cercanos disponibles e invítales a llamar para alternativas.
- Si el adoptante no planteó preguntas de política y tus coincidencias son sólidas, omite el campo del preámbulo o configúralo en null.

Respuestas de política (usa estas verbatim para la sustancia):
${policyBlock}

Devuelve tu respuesta como un objeto JSON con esta estructura exacta:
{
  "low_confidence": false,
  "preamble": null,
  "matches": [
    {"shelter_code": "<code>", "bio": "<bio paragraph in Spanish>"},
    {"shelter_code": "<code>", "bio": "<bio paragraph in Spanish>"},
    {"shelter_code": "<code>", "bio": "<bio paragraph in Spanish>"}
  ]
}

El campo preamble es un string o null. Cuando esté presente, debe ser de 2-3 oraciones máximo.

Los valores de shelter_code deben coincidir exactamente con los códigos de los gatos que se te proporcionaron. No inventes shelter_codes. Si se proporcionan menos de tres gatos, devuelve coincidencias para todos ellos — no rellenes con entradas inventadas. Devuelve solo el objeto JSON, ningún otro texto.
```

[VERIFIED — quoted verbatim from server.ts:4685-4750]

### Policy FAQ Block (EN, `server/config/shelter-policy-faq.json`)

```json
{
  "spay_vax_chip": "Cats come spayed/neutered, fully vaccinated, and microchipped at adoption.",
  "vet": "You're free to use any vet you choose.",
  "adoption_fees": "Adoption fees vary by animal — call (845) 414-9700 or visit our adoption page for current fees.",
  "return_policy": "If an adoption doesn't work out, we ask that the animal come back to us. We'll work with you to resolve issues first.",
  "follow_up": "We may follow up by phone or visit within the first year of adoption.",
  "visit_hours": "We're open noon to 5 PM, six days a week (closed Wednesdays). Appointments recommended but not required.",
  "supplies_included": "For what's included with adoption, call (845) 414-9700 or visit our adoption page.",
  "money_refund": "For adoption fees and refunds, call (845) 414-9700.",
  "age_definitions": "Young cats are under 2 years, adults are 2 to 6, and seniors are 7 and older."
}
```

[VERIFIED]

### Policy FAQ Block (ES, `server/config/shelter-policy-faq-es.json`)

```json
{
  "spay_vax_chip": "Los gatos vienen esterilizados/castrados, completamente vacunados, y con microchip al momento de la adopción.",
  "vet": "Eres libre de usar el veterinario que elijas.",
  "adoption_fees": "Las tarifas de adopción varían según el animal — llama al (845) 414-9700 o visita nuestra página de adopción para las tarifas actuales.",
  "return_policy": "Si una adopción no funciona, te pedimos que el animal regrese con nosotros. Trabajaremos contigo para resolver los problemas primero.",
  "follow_up": "Podemos hacer seguimiento por teléfono o visita dentro del primer año de la adopción.",
  "visit_hours": "Estamos abiertos de mediodía a 5 PM, seis días a la semana (cerrados los miércoles). Se recomiendan citas pero no son obligatorias.",
  "supplies_included": "Para lo que está incluido con la adopción, llama al (845) 414-9700 o visita nuestra página de adopción.",
  "money_refund": "Para tarifas de adopción y reembolsos, llama al (845) 414-9700.",
  "age_definitions": "Los gatos jóvenes tienen menos de 2 años, los adultos tienen de 2 a 6, y los mayores tienen 7 o más."
}
```

[VERIFIED]

### User Message Assembly (`server.ts:4568-4603`)

```typescript
// Phase 2 shortlist entries built per animal:
lines.push(`SHELTER_CODE: ${animal.shelterCode}`);
lines.push(`Name: ${animal.name}`);
lines.push(`Species: Cat`);                          // ← HARDCODED "Cat"
lines.push(`Breed: ${animal.breed}`);
lines.push(`Age: ${animal.age}`);
lines.push(`Sex: ${animal.sex}`);
lines.push(`Color: ${animal.color}`);
lines.push(`FIV: ${animal.fivStatus}`);
lines.push(`FeLV: ${animal.felvStatus}`);
// ... caregiver transcripts + SM description appended ...

const userMessage = `FILTERS APPLIED:\nsex: ${sexLower.join(', ')}\nage: ${ageLower.join(', ')}\n\nCATS AVAILABLE (${selectedAnimals.length} total):\n\n${shortlistEntries.join('\n\n')}\n\nADOPTER:\n${narrativeText || 'No additional preferences provided.'}`;
```

`"Species: Cat"` hardcoded at line 4571. `"CATS AVAILABLE"` hardcoded at line 4603. [VERIFIED]

---

## Task 2: Species-Specific Classification (EN Prompt)

### BUCKET A — Pure Label (noun swap suffices)

| # | Exact text | Location |
|---|---|---|
| A1 | `"writing a bio for a specific cat that's being shown"` | Opening sentence |
| A2 | `"Describe this cat the way you would"` | Paragraph 2 |
| A3 | `"come meet her"` (gendered pronoun — cats default to "her") | Paragraph 2 |
| A4 | `"Let the bio describe the cat in a way that lands naturally"` | Paragraph 3 |
| A5 | `"the cat's preference for quiet companionship"` | Paragraph 3 |
| A6 | `"return your 3 best matches"` (no species noun — already neutral) | Paragraph 6 |
| A7 | `"0 or 1 of your 3 returned cats substantively matches"` | Paragraph 7 |
| A8 | `"they wanted a kitten and none are under 1 year old"` | Paragraph 7 |
| A9 | `"a returned cat doesn't match that attribute"` | Paragraph 9 |
| A10 | `"anchoring what the cat IS"` | Paragraph 9 |
| A11 | `"information about multiple cats and a description of one prospective adopter"` | Pre-policies paragraph |
| A12 | `"pick the three cats from the list"` | Pre-policies paragraph |
| A13 | `"before they see the cat bios"` | SHELTER POLICIES section |
| A14 | `"have universal answers across all cats"` | ASSERT/DEFER rules |
| A15 | `"not per-cat health attributes"` | ASSERT/DEFER rules |
| A16 | `"per-cat health DEFER lines"` | ASSERT/DEFER rules |
| A17 | `"codes from the cats provided to you"` | JSON format section |
| A18 | `"fewer than three cats are provided"` | JSON format section |

**Count: 18 items** (simple noun swaps: "cat"→"dog"/"animal", "cats"→"dogs"/"animals", "kitten"→"puppy"/"baby"). [VERIFIED]

### BUCKET B — Cat Biology/Medical Assumption

| # | Exact text | Why cat-specific | Dog/Small equivalent |
|---|---|---|---|
| B1 | `"declawed status"` in attribute list | Declawing is a cat concept | **Dog:** remove. **Small:** remove. |
| B2 | `"Adopter asked for declawed, no information in profile: 'Macy has all his claws. If a declawed cat is essential...'"` | Cat-specific example | **Dog:** replace with dog-relevant attribute (e.g., house-trained). **Small:** replace or remove. |
| B3 | `"ASSERT... Declawing: the default for shelter cats is claws intact — say so directly ('Macy has all his claws')."` | Cat-specific default | **Dog:** replace with dog-relevant default (e.g., "the default for shelter dogs is not house-trained — don't assume"). **Small:** remove declawing entirely. |
| B4 | `"Breed: domestic shorthair or longhair unless the profile says otherwise."` | Cat breed default | **Dog:** "mixed breed unless the profile says otherwise." **Small:** species-dependent (e.g., "Holland Lop" for rabbits is too specific — just "as listed in profile"). |
| B5 | `"chronic conditions like asthma, FIV, diabetes"` in DEFER rule | FIV is cat-specific; asthma is cat-weighted | **Dog:** "chronic conditions like heartworm, hip dysplasia, diabetes." **Small:** "chronic conditions like GI stasis, dental disease." |
| B6 | `"FIV: ${animal.fivStatus}"` and `"FeLV: ${animal.felvStatus}"` in user message | FIV/FeLV are cat viruses | **Dog:** remove FIV/FeLV, add heartworm status if available. **Small:** remove both. |
| B7 | Policy FAQ `"spay_vax_chip": "Cats come spayed/neutered..."` | Says "Cats" | **Dog:** "Dogs come spayed/neutered..." **Small:** "Small animals come spayed/neutered..." (verify accuracy — some smalls may not be spayed). |
| B8 | Policy FAQ `"age_definitions": "Young cats are under 2 years..."` | Cat-specific thresholds | **Dog:** "Young dogs are under 2 years, adults are 2 to 7, and seniors are 8 and older." **Small:** species-dependent. |

**Count: 8 items** (need species-specific replacement content, can't just swap nouns). [VERIFIED]

### BUCKET C — Cat Behavior/Temperament Framing

| # | Exact text | Why cat-specific | Dog/Small equivalent |
|---|---|---|---|
| C1 | `"Adopter asked for bonded pair, this cat is solo: 'Emma is happy as the only cat in your home, ready to be your sole feline companion.'"` | "feline companion," "only cat" — cat household dynamics | **Dog:** "Emma is happy as the only dog in your home, ready to be your devoted companion." **Small:** "Olaf does well as the only rabbit, content with human companionship." |

**Count: 1 item.** The prompt is surprisingly behavior-neutral beyond this one example. [VERIFIED]

### BUCKET D — Cat-Specific Examples

| # | Exact text | What's cat-specific | Dog/Small replacement needed |
|---|---|---|---|
| D1 | `"Puccini's coat is a soft grey rather than the orange you mentioned, but his easy-going temperament and kitten-like playfulness..."` | "kitten-like playfulness" is cat-flavor | **Dog:** "puppy-like energy." **Small:** "a youthful curiosity." |
| D2 | `"At 2 years old, Dean is past the kitten phase but still has plenty of playful energy..."` | "kitten phase" | **Dog:** "past the puppy phase." **Small:** "past the baby stage." |
| D3 | (Declawed example — already counted in B2) | — | — |
| D4 | (Bonded pair example — already counted in C1) | — | — |
| D5 | `"Our search records don't note any health concerns for Macy..."` | Species-neutral — no change needed | **All:** keep as-is |

**Count: 2 unique items** (D1 and D2 are the only cat-flavored examples not already in B or C). [VERIFIED]

### User Message Species-Specific Elements

| # | Exact text | Fix |
|---|---|---|
| U1 | `lines.push('Species: Cat');` (server.ts:4571) | `lines.push('Species: ${animal.species}');` |
| U2 | `"CATS AVAILABLE (${selectedAnimals.length} total)"` (server.ts:4603) | Parameterize: `"${SPECIES_LABEL} AVAILABLE"` |
| U3 | `"FIV: ${animal.fivStatus}"` (server.ts:4578) | Conditional: only for cats |
| U4 | `"FeLV: ${animal.felvStatus}"` (server.ts:4579) | Conditional: only for cats |

[VERIFIED]

---

## Task 3: Species-Neutral Shared Skeleton

The following sections are **identical across all six prompts** and form the shared skeleton:

### 1. Tone/Voice Guidance (paragraphs 2-4)
```
This is a bio first. Describe this [animal] the way you would in any adoption listing:
lead with personality, use active conversational language, be honest about any special
needs while framing positively, and close with a warm invitation to come meet [them].
Voice: third person, friendly, descriptive...

What makes this different from a generic bio: where the description naturally allows it,
lean into one or two details that quietly align...

Goal: invite a meeting...
```
(Only the species noun and pronoun change.) [VERIFIED]

### 2. No-fabrication rule
```
Don't invent facts not present in the input.
```
(Verbatim, all species.) [VERIFIED]

### 3. Brief/vague narrative handling
```
Even when the adopter's narrative is brief or vague, return your 3 best matches...
```
(Species noun swap only.) [VERIFIED]

### 4. low_confidence logic
```
Also include a "low_confidence" boolean in your JSON response. Set it to true ONLY if
0 or 1 of your 3 returned [animals] substantively matches...
```
(Species noun swap only; "kitten" → species-appropriate young-animal word.) [VERIFIED]

### 5. Gap-acknowledgment rule
```
If the adopter's narrative mentions any specific attribute... acknowledge the gap briefly...
Don't fabricate a match. Don't omit when the adopter raised it...
```
(Swap "cat" nouns; remove "declawed status" from attribute list for non-cats; adjust examples.) [VERIFIED]

### 6. ASSERT / DEFER framework
```
Two rules for attributes not mentioned in a candidate's profile:
ASSERT when the attribute has a reliable shelter default...
DEFER when the attribute has no reliable default AND is [animal]-specific...
```
(Framework is universal. Only the specific defaults and medical examples change per species.) [VERIFIED]

### 7. Spay/neuter/vax/chip as POLICY rule
```
Spay/neuter status, vaccination status, and microchip status are POLICY topics...
```
(Universal — just swap "per-cat" → "per-animal".) [VERIFIED]

### 8. SHELTER POLICIES section (entire block)
```
When the adopter's narrative contains questions about shelter policies or logistics...
Rules: [all 6 rules]...
Policy answers: ${policyBlock}
```
(Framework is universal. The policyBlock content changes per species — need species-specific FAQ files.) [VERIFIED]

### 9. JSON output format
```
Return your response as a JSON object with this exact structure: { ... }
The preamble field is a string or null...
The shelter_code values must exactly match codes from the [animals] provided...
```
(Species noun swap only.) [VERIFIED]

### Summary: ~85% of the prompt is shared skeleton

The shared skeleton covers tone, voice, structure, honesty rules, low_confidence logic, gap-acknowledgment framework, ASSERT/DEFER framework, POLICIES section structure, and JSON format. These need only species-noun substitution. [VERIFIED]

---

## Task 4: EN/ES Pairing + Tally

### ES is a structural translation of EN

Section-by-section comparison:

| Section | EN | ES | Structural match? |
|---|---|---|---|
| Opening sentence | ✓ | ✓ — direct translation | ✅ |
| Tone/voice (para 2-3) | ✓ | ✓ — direct translation | ✅ |
| Goal paragraph | ✓ | ✓ — direct translation | ✅ |
| No-fabrication | ✓ | ✓ — direct translation | ✅ |
| Brief narrative handling | ✓ | ✓ — direct translation | ✅ |
| low_confidence logic | ✓ | ✓ — direct translation | ✅ |
| Gap-acknowledgment rule | ✓ | ✓ — direct translation | ✅ |
| Examples (5 total) | ✓ | ✓ — same 5 examples, translated | ✅ |
| ASSERT/DEFER rules | ✓ | ✓ — direct translation | ✅ |
| Pre-policies paragraph | ✓ | ✓ — direct translation | ✅ |
| SHELTER POLICIES section | ✓ | ✓ — direct translation of framework | ✅ |
| JSON format | ✓ | ✓ — direct translation | ✅ |

**No content divergence found.** ES is a faithful structural translation of EN. [VERIFIED]

**One minor difference:** EN says "175–200 words," ES says "200–230 palabras" (accounting for Spanish being ~15% longer). This is a translation adaptation, not a content divergence. [VERIFIED]

### Implication: design in EN, translate to ES

Each species prompt can be designed once in EN, then translated to ES using the current cat-EN→cat-ES as the translation template. The translator can be the same model (or Dashboard Opus). [VERIFIED]

### Tally

| Bucket | Count | Nature | Effort per species |
|---|---|---|---|
| **A — Pure label** | 18 | Noun swap ("cat"→"dog"→"animal") | Trivial — mechanical find-replace |
| **B — Biology/medical** | 8 | Species-specific content replacement | Medium — need dog-specific and small-specific medical facts/defaults |
| **C — Behavior/temperament** | 1 | Species-specific framing | Low — one example to rewrite |
| **D — Cat-specific examples** | 2 | Example sentences needing species flavor | Low — two phrases to adjust |
| **User message** | 4 | Code-level parameterization | Low — trivial code changes |
| **Policy FAQ** | 2 species-specific entries | `spay_vax_chip` and `age_definitions` | Low — rewrite 2 FAQ entries per species |
| **Total** | **35** | | |

### Bottom line

**~18 of 35 items (51%) are pure label swaps (Bucket A).** The other 17 need real per-species content, but most are short (one sentence or phrase each). The two heaviest items are the ASSERT/DEFER rules with species-specific defaults (B3-B5) and the policy FAQ entries (B7-B8).

**This is "cat prompt, nouns swapped, ~10 sentences rewritten per species, translated."** It is NOT "three genuinely distinct designs." The shared skeleton covers ~85% of the prompt text. [VERIFIED]

### Recommended approach

1. Extract shared skeleton as a template with `${species}`, `${speciesPlural}`, `${youngAnimalWord}`, `${breedDefault}`, `${speciesExamples}`, `${assertDefaults}`, `${deferExamples}` slots.
2. Define per-species slot values (cat/dog/small — ~15 lines each).
3. Template engine produces 3 EN prompts; translate each to ES.
4. Policy FAQ: 3 files (cat/dog/small) × 2 languages = 6 JSON files (only 2 entries differ per species).
