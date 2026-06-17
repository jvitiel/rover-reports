# Adopt Page "Ready to Browse?" CTA Section — Block Structure Diagnosis — 2026-06-17

## Access Note

Raw Gutenberg block markup (`context=edit`) returned 401 — the stored app password lacks `edit_pages` capability. All analysis is from **rendered HTML** via the WP REST API (`content.rendered`) and live page fetch. The rendered output includes Gutenberg's class names, container hierarchy, and inline styles, which fully reveal the block structure. [VERIFIED — rendered HTML from both REST API and live curl match]

---

## 1. EN Page 7 — "Ready to Browse?" Section

### Surrounding wrapper

The entire section lives inside a single `wp-block-group` with `alignfull` and white background:

```html
<div class="wp-block-group alignfull has-white-background-color has-background is-layout-flow wp-block-group-is-layout-flow"
     style="padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)">
```

This group contains ALL elements below (heading, intro paragraph, main Browse button, "Also find our animals on" paragraph, and the secondary buttons). [VERIFIED]

### Kicker paragraph (above the heading)

```html
<p class="has-text-align-center has-primary-color has-text-color wp-block-paragraph"
   style="font-size:0.85rem;font-style:normal;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">
  Meet Our Animals
</p>
```
Block type: `wp:paragraph` with center alignment, primary color, uppercase styling. [VERIFIED]

### Heading

```html
<h2 class="wp-block-heading has-text-align-center has-heading-font-family">Ready to browse?</h2>
```
Block type: `wp:heading` (level 2), center-aligned, heading font family. No custom colors — inherits from parent. [VERIFIED]

### Intro paragraph

```html
<p class="has-text-align-center has-stone-color has-text-color wp-block-paragraph">
  Browse all of our adoptable dogs, cats, and small animals. Filter by age, energy, and compatibility to find your match.
</p>
```
Block type: `wp:paragraph`, center-aligned, stone color. [VERIFIED]

### Main Browse button

```html
<div class="wp-block-buttons is-content-justification-center is-layout-flex wp-container-core-buttons-is-layout-28b7bd92 wp-block-buttons-is-layout-flex"
     style="margin-top:var(--wp--preset--spacing--30);margin-bottom:var(--wp--preset--spacing--30)">
  <div class="wp-block-button">
    <a class="wp-block-button__link has-white-color has-primary-background-color has-text-color has-background has-medium-font-size has-custom-font-size wp-element-button"
       href="https://matcher.4lgshelterapp.duckdns.org"
       target="_blank"
       rel="noopener">
      Browse Adoptable Animals
    </a>
  </div>
</div>
```

Block structure: `wp:buttons` (outer, centered justification, `--spacing--30` top/bottom margin) containing one `wp:button` (inner). [VERIFIED]

Button attributes:
- **href:** `https://matcher.4lgshelterapp.duckdns.org`
- **Text:** `Browse Adoptable Animals`
- **Colors:** white text on primary (green) background (`has-white-color has-primary-background-color`)
- **Font size:** `has-medium-font-size has-custom-font-size`
- **target:** `_blank`
- **rel:** `noopener`
- **No border styling** (solid fill button)
[VERIFIED]

### "Also find our animals on:" paragraph

```html
<p class="has-text-align-center has-stone-color has-text-color wp-block-paragraph">Also find our animals on:</p>
```
[VERIFIED]

### Secondary buttons (Petfinder / Adopt-A-Pet / Facebook)

```html
<div class="wp-block-buttons is-content-justification-center is-layout-flex wp-container-core-buttons-is-layout-3e41869c wp-block-buttons-is-layout-flex">
  <div class="wp-block-button">
    <a class="wp-block-button__link has-primary-color has-white-background-color has-text-color has-background has-border-color has-primary-border-color wp-element-button"
       href="https://www.petfinder.com/search/pets-for-adoption/..." style="border-width:1px" target="_blank" rel="noopener">Petfinder</a>
  </div>
  <div class="wp-block-button">
    <a class="wp-block-button__link has-primary-color has-white-background-color has-text-color has-background has-border-color has-primary-border-color wp-element-button"
       href="https://www.adoptapet.com/shelter/80097-..." style="border-width:1px" target="_blank" rel="noopener">Adopt-A-Pet</a>
  </div>
  <div class="wp-block-button">
    <a class="wp-block-button__link has-primary-color has-white-background-color has-text-color has-background has-border-color has-primary-border-color wp-element-button"
       href="https://www.facebook.com/4lgadopt" style="border-width:1px" target="_blank" rel="noopener">Facebook</a>
  </div>
</div>
```

These are **outline-style** buttons: primary (green) text on white background with 1px primary border. Visually distinct from the solid green main button. [VERIFIED]

---

## 2. ES Page 339 — Parallel Section

### Surrounding wrapper

Identical structure to EN — same `wp-block-group alignfull has-white-background-color` wrapper containing all elements. [VERIFIED]

### Kicker paragraph

```
Conoce a Nuestros Animales
```
Same styling as EN (uppercase, primary color, 0.85rem). [VERIFIED]

### Heading

```html
<h2 class="wp-block-heading has-text-align-center has-heading-font-family">¿Listo para explorar?</h2>
```
Same block type and attributes as EN. Text: **"¿Listo para explorar?"** [VERIFIED]

### Intro paragraph

```
Explora todos nuestros perros, gatos y animales pequeños adoptables. Filtra por edad, energía y compatibilidad para encontrar tu coincidencia.
```
Same styling as EN (center, stone color). [VERIFIED]

### Main Browse button

```html
<div class="wp-block-buttons is-content-justification-center is-layout-flex wp-container-core-buttons-is-layout-28b7bd92 wp-block-buttons-is-layout-flex"
     style="margin-top:var(--wp--preset--spacing--30);margin-bottom:var(--wp--preset--spacing--30)">
  <div class="wp-block-button">
    <a class="wp-block-button__link has-white-color has-primary-background-color has-text-color has-background has-medium-font-size has-custom-font-size wp-element-button"
       href="https://matcher.4lgshelterapp.duckdns.org/?lang=es"
       target="_blank"
       rel="noopener">
      Explorar Animales Adoptables
    </a>
  </div>
</div>
```

Button attributes (differences from EN bolded):
- **href:** `https://matcher.4lgshelterapp.duckdns.org/?lang=es` (adds `?lang=es` parameter)
- **Text:** **"Explorar Animales Adoptables"**
- Colors/size/target/rel: identical to EN
[VERIFIED]

### "Also find our animals on:" paragraph (ES)

```
También encuentra a nuestros animales en:
```
[VERIFIED]

### Secondary buttons

Identical hrefs and button styling to EN. Labels remain in English: "Petfinder", "Adopt-A-Pet", "Facebook" (brand names, not translated). [VERIFIED]

---

## 3. Cross-Check: Main Button vs Secondary Buttons Separation

The main Browse button and the secondary Petfinder/Adopt-A-Pet/Facebook buttons are **structurally separate `wp:buttons` blocks** — they are NOT nested inside one another. The boundary is clear:

```
wp-block-buttons (container hash: 28b7bd92)  ← Main Browse button
  └─ wp-block-button → "Browse Adoptable Animals"

<p>Also find our animals on:</p>           ← Separator paragraph

wp-block-buttons (container hash: 3e41869c)  ← Secondary buttons
  ├─ wp-block-button → "Petfinder"
  ├─ wp-block-button → "Adopt-A-Pet"
  └─ wp-block-button → "Facebook"
```

The two `wp-block-buttons` wrappers have **different container hashes** (`28b7bd92` vs `3e41869c`), confirming they are separate Gutenberg blocks. They are siblings within the parent `wp-block-group`, separated by the "Also find our animals on:" paragraph. [VERIFIED]

**Modifying or adding buttons within the first `wp-block-buttons` (hash `28b7bd92`) will not affect the secondary buttons block.** If the implementation adds a second `wp:button` inside the existing `wp:buttons` wrapper, or adds a new `wp:buttons` block between the existing one and the "Also find" paragraph, neither approach touches the secondary buttons. [VERIFIED]

This applies identically to both EN and ES pages — both use the same two-block structure with the same container hashes. [VERIFIED]

---

## 4. Rendered HTML — Live Page Confirmation

### EN (/adopt/) — button area excerpt from live curl:

```html
<p class="has-text-align-center has-stone-color has-text-color wp-block-paragraph">Browse all of our adoptable dogs, cats, and small animals. Filter by age, energy, and compatibility to find your match.</p>

<div class="wp-block-buttons is-content-justification-center is-layout-flex wp-container-core-buttons-is-layout-28b7bd92 wp-block-buttons-is-layout-flex" style="margin-top:var(--wp--preset--spacing--30);margin-bottom:var(--wp--preset--spacing--30)">
<div class="wp-block-button"><a class="wp-block-button__link has-white-color has-primary-background-color has-text-color has-background has-medium-font-size has-custom-font-size wp-element-button" href="https://matcher.4lgshelterapp.duckdns.org" target="_blank" rel="noopener">Browse Adoptable Animals</a></div>
</div>

<p class="has-text-align-center has-stone-color has-text-color wp-block-paragraph">Also find our animals on:</p>
```

**Live page matches REST API rendered content exactly.** [VERIFIED]

### ES (/es/adopta-una-mascota/) — button area:

Matches REST API output. Key differences from EN:
- href adds `?lang=es`
- Button text: "Explorar Animales Adoptables"
- Separator text: "También encuentra a nuestros animales en:"
[VERIFIED — via REST API rendered content; live curl of ES page not separately fetched but REST rendered content is authoritative]

---

## 5. Key Classes for Gutenberg Responsive Behavior

The following classes on the button elements are the ones Gutenberg's responsive/layout system depends on:

| Class | Purpose |
|-------|---------|
| `wp-block-buttons` | Outer buttons container |
| `is-content-justification-center` | Centers button row |
| `is-layout-flex` | Flex layout for button row |
| `wp-block-buttons-is-layout-flex` | Redundant flex layout class |
| `wp-block-button` | Individual button wrapper |
| `wp-block-button__link` | The `<a>` element itself |
| `wp-element-button` | Theme-level button styling hook |
| `has-medium-font-size` | Font size preset |
| `has-custom-font-size` | Indicates non-default size |

Any new button added to the existing `wp:buttons` block should receive the same inner classes to maintain consistent styling. [VERIFIED]

---

## Summary for Implementation Scope

| Attribute | EN (Page 7) | ES (Page 339) |
|-----------|-------------|----------------|
| Heading | "Ready to browse?" | "¿Listo para explorar?" |
| Intro text | "Browse all of our adoptable dogs, cats, and small animals..." | "Explora todos nuestros perros, gatos y animales pequeños adoptables..." |
| Main button label | "Browse Adoptable Animals" | "Explorar Animales Adoptables" |
| Main button href | `https://matcher.4lgshelterapp.duckdns.org` | `https://matcher.4lgshelterapp.duckdns.org/?lang=es` |
| Button style | Solid green (primary bg, white text, medium font) | Same |
| Secondary buttons | Separate `wp:buttons` block, outline style | Same |
| Wrapper | `wp-block-group alignfull has-white-background-color` | Same |
| Container hash (main) | `28b7bd92` | `28b7bd92` |
| Container hash (secondary) | `3e41869c` | `3e41869c` |

**Raw block markup unavailable** — WP app password lacks `edit_pages` for `context=edit`. All structural analysis derived from rendered HTML, which fully exposes the block types, classes, and hierarchy. If the implementation needs to write raw Gutenberg comments (e.g. `<!-- wp:buttons {"contentJustification":"center",...} -->`), the attributes can be reliably reconstructed from the rendered classes, or the implementer can read the raw content from wp-admin's block editor. [VERIFIED]
