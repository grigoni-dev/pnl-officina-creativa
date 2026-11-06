---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: []
---

# Surface: Home page

Scope: `/` (src/pages/index.astro). Visitor mode: **Persuade**.

Audience and action: young people aged 18–35 come first. The primary action is **Diventa socio · 5 €** (a one-time fee, permanent membership), and the first viewport shows it in its working form (name and email) leading into the signup flow. Sponsors and public bodies are the second audience: the archive of past events is the proof, and they get a dedicated "Sponsor & enti" section and contact.

Constraints:
- The photos and logo don't exist in the repo yet. Use stock stand-ins printed as riso halftones and list every one.
- No invented events, numbers or sponsors. Use client slots.
- Avoid an institutional, disco or corporate feel.

Membership portal: this surface links to `/tesseramento` and `/verifica` but doesn't build them.

## Direction contract

THESIS: The site is the association's fanzine, printed on a risograph. It refuses the category default (a dark full-bleed crowd photo, white headline, countdown and pink pill) in favour of daylight: two transparent inks on yellow stock, misregistration, and halftone photos.

OWN-WORLD: The paper is yellow uncoated stock (#FFE14D) and is the drenched ground. There are two plates only, Medium Blue (#3255A4) for text, photos and controls, and Fluorescent Pink (#FF48B0) for display offsets and marks, with their overprint as the only third tone. Photos are blue halftone duotones. Archivo runs across its width axis: expanded black for display, normal for text. There are no rounded corners, no shadows and no gradients. Rules are a 3px plate line, and the grain is paper tooth.

STORY: The visitor sees who PNL is (young people, Oderzo, events), wants to be part of it, and joins for €5 in under a minute. Sponsors see years of real events as a fixed-scale series.

FIRST VIEWPORT: Masthead nav with the wordmark on the left, four links and a "Diventa socio · 5 €" plate. An expanded black H1 of about 118px sits across the left two-thirds, with a pink plate offset 7/5px under it. Below it are the lede and a colophon line. On the right is a tall blue halftone event photo. Overlapping its lower-left corner is the tessera card, rotated −3°, with a monumental pink "5 €", name and email fields, and a "Diventa socio" button.

FORM: Riso fanzine, candidate 4 of 7 on my ordered list. seed:9d1206d89cb2e2bc. Signature interaction: the second plate sits out of register at rest and snaps into register on hover or focus. Typing your name prints it live on the tessera.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Real logo, event photos and the event list (client slots).
- Payment provider accounts (Stripe or PayPal).
- Hosting.
