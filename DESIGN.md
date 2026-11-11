---
name: PNL Officina Creativa
description: The association's fanzine, printed on a risograph. Two inks on yellow stock, misregistered.
colors:
  paper: "#ffe14d"
  blue: "#3255a4"
  pink: "#ff48b0"
  overprint: "#321871"
typography:
  display:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(2.3rem, 1rem + 6vw, 6.5rem)"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 1.5rem + 3vw, 4.2rem)"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 125"
  title:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 1.3rem + 1.4vw, 2.4rem)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 125"
  lede:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem)"
    fontWeight: 500
    lineHeight: 1.35
    fontVariation: "'wdth' 100"
  body:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)"
    fontWeight: 450
    lineHeight: 1.5
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(0.875rem, 0.84rem + 0.15vw, 0.95rem)"
    fontWeight: 700
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 100"
  button:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)"
    fontWeight: 800
    lineHeight: 1.1
    fontVariation: "'wdth' 112"
rounded:
  none: "0px"
spacing:
  rule: "3px"
  gutter: "clamp(20px, 4vw, 56px)"
  column-gap: "clamp(16px, 2vw, 32px)"
  section: "clamp(72px, 10vw, 144px)"
  container-max: "1440px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.4em"
    height: "52px"
  button-on-pink:
    backgroundColor: "{colors.overprint}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.4em"
    height: "52px"
  button-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.blue}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.4em"
    height: "52px"
  button-paper-hover:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
  field-input:
    backgroundColor: "transparent"
    textColor: "{colors.blue}"
    rounded: "{rounded.none}"
    padding: "10px 0 8px"
    height: "48px"
  nav-masthead:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.blue}"
    height: "76px"
  flood-blue:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    padding: "clamp(64px, 9vw, 128px) 0"
  flood-pink:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.overprint}"
    padding: "{spacing.section} 0"
  price-plate:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.overprint}"
    typography: "{typography.display}"
    rounded: "{rounded.none}"
---

# Design System: PNL Officina Creativa

## Overview

**Creative North Star: "The Riso Fanzine"**

The site is printed, not rendered. Everything sits on one sheet of yellow uncoated stock and is laid down by two transparent inks, Medium Blue and Fluorescent Pink. Where they cross, the overprint is the only third tone, and it is produced by multiplication: blue (#3255a4) multiplied by pink (#ff48b0) gives exactly the overprint (#321871). The build carries this literally. Plates multiply in CSS (`mix-blend-mode: multiply`), photographs are run through a real amplitude halftone and inked by SVG filters (`#ink-blue`, `#ink-pink` in the base layout), and a faint fractal-noise paper tooth is multiplied over the whole viewport at 0.32 opacity.

The signature is misregistration. The second plate sits a few points off at rest: display type, buttons, the price plate and photographs all carry it. It snaps into register on hover or focus, so interaction feels like a press pulling the plates into alignment. Density is a zine's: large expanded-black display, 3px plate rules between stories, and full-bleed floods of a single ink for whole sections. The page is in daylight, never dark, and never glossy.

The locale is Italian (`lang="it"`, `og:locale it_IT`). Copy, labels and stamps are written in Italian.

**Key Characteristics:**
- One drenched ground (yellow paper) and two inks; the overprint is the only third tone.
- Misregistration at rest, in register on hover or focus.
- Photographs as two-plate amplitude halftones, never full colour.
- Archivo on its width axis: 125% expanded black for display, 100% for text.
- Square corners, 3px plate rules, no soft shadows, no visible gradients.

## Colors

A riso palette: one stock and two transparent inks, plus the tone their overlap prints.

### Primary
- **Medium Blue Ink** (`blue`): The workhorse plate. Carries all body text, rules, field strokes, focus outlines, the face of the primary button, the blue halftone of every photograph, and full-bleed blue floods (the Oderzo section and footer), where paper becomes the text color.

### Secondary
- **Fluorescent Pink Ink** (`pink`): The second plate. Prints the out-of-register offset under display type and buttons, the deepest shadows of photographs, the price plate on the tessera, stamp borders, selection, and the pink flood (the membership section). Never body text on paper.

### Tertiary
- **Overprint Violet** (`overprint`): Blue multiplied by pink. It is text on the pink flood, the face of buttons on pink, text on the price plate and stamps, alternate entries in a list, and the focused field stroke. It is the only legitimate third tone.

### Neutral
- **Yellow Stock** (`paper`): The ground of every page and the text color on blue floods. Also the face of the paper button and the fill of cards that sit on paper (tessera, stamps). The `theme-color` meta matches it.

### Named Rules
**The Two Inks Rule.** Every mark is paper, blue, pink, or their overprint. Tints are allowed only as an ink at reduced coverage (the focused field fills with pink at 14% via `color-mix`). Greys, blacks and whites never appear as visible color; the `#000`/grey values inside the halftone screen are mechanism, inked away by the SVG filters.

**The Multiply Rule.** Where two inks meet, they multiply. Plates stacked over one another use `mix-blend-mode: multiply` (button face, halftone pink plate, the blue station numerals on the pink flood) so the overlap prints as overprint rather than one ink hiding the other.

**The Flood Pairing Rule.** On the blue flood, paper is the text and selection is paper on blue. On the pink flood, overprint is the text, rules and focus outline, and selection is pink on overprint. Focus outlines switch to the flood's text color.

## Typography

**Display Font:** Archivo Variable, width axis (with Archivo, system-ui, sans-serif)
**Body Font:** Archivo Variable at normal width

**Character:** One family stretched across its width axis. Display runs expanded (wdth 125) and black (900), tight (-0.04em, 0.88 line height), like a headline set in wood type for a cover. Text runs at normal width and weight 450 for calm reading under the noise.

### Hierarchy
- **Display** (900, wdth 125, step 4, line height 0.88): The page H1 only. On the home page it is printed on two plates and gets a one-time print-pass animation on load.
- **Headline** (900, wdth 125, step 3): Section titles, usually printed on two plates.
- **Title** (900, wdth 125, step 2, line height 0.95): Sub-items (list entries, stations, side columns).
- **Lede** (500, step 1, line height 1.35, max 34ch to 44ch): The opening paragraph under a display title.
- **Small** (step -2, weight from its context): The stamp on stand-ins, the "Officina Creativa" line of the mark, the legal and credit lines in the footer, panel badges.
- **Body** (450, step 0, line height 1.5, max 62ch): Running text.
- **Label** (700, step -1, 0.06em tracking, uppercase): Field labels, metadata lines under plates, the colophon line under the lede, the tessera header.
- **Button** (800, wdth 112, step 0, line height 1.1): Every button.

Monumental display (the "Oderzo" word at up to 19rem, the footer "PNL" mark at up to 15rem, the "5 €" price at up to 8.4rem) reuses the display style at local sizes inside a flood or a plate.

### Named Rules
**The Width Axis Rule.** Hierarchy is carried by width and weight together: display and titles at wdth 125/900, buttons and plate titles in between (wdth 112 to 115, 800), text at wdth 100. Do not add a second family.

**The Two Plates Type Rule.** Display text that is printed on two plates keeps the blue face on top (multiplied) and an identical pink copy underneath, offset by 0.06em by 0.04em. The pink copy is `aria-hidden` and not selectable.

## Layout

A 12-column grid (`repeat(12, minmax(0, 1fr))`) inside a 1440px container with a fluid gutter, column gap `column-gap`. Sections are separated by a 3px blue rule across the full width, or by changing to a flood, and breathe with `section` padding (blue flood slightly tighter, 64px to 128px).

Compositions are asymmetric and overlap like paste-up: the hero sets the display title across columns 1 to 8 and a tall print in 9 to 12, with the tessera card overlapping the print's lower-left corner. Lists read as a zine contents page: rows divided by plate rules, title left and text right. The archive is a fixed-scale series of 4:5 plates, five across.

Breakpoints at 1080px and 760px. At 1080px the nav collapses, the grid stacks and the archive becomes a horizontal scroll-snap strip (40% per plate, 72% under 760px). Under 760px everything is one column, buttons go full width, and a fixed bottom "Diventa socio" action bar appears. It steps aside while a signup form or the footer is on screen. The masthead is sticky (76px plus the 3px rule, as `--mast-row` and `--mast-h`: anything that needs to clear it uses `--mast-h`).

## Elevation & Depth

There are no shadows. Depth is printed: a second ink plate offset from the first, multiplied where it overlaps. Stacking is literal: cards sit on the paper with a 3px blue border, and the tessera and stamps are rotated a few degrees as if pasted onto the sheet. The paper tooth (fractal noise, multiplied, 0.32 opacity, fixed over the viewport) is the only texture.

### Shadow Vocabulary
- None. The offset under a button or display line is an ink plate (pink, blue or overprint at full ink, 6px by 5px on buttons, 7px by 5px on photographs), not a shadow, and it closes on hover or focus.

### Named Rules
**The Misregistration Rule.** The offset is always a second ink, always a few points, and always snaps to zero on hover or focus (`.reg-host` and its descendants, buttons, the tessera price). Transitions use `ease-out` (cubic-bezier(0.16, 1, 0.3, 1)) at 420ms to 600ms. Reduced motion collapses all of this to an instant change.

## Shapes

Square everything: no border radius anywhere, including fields (explicitly `border-radius: 0`). Lines are the 3px plate rule, used for section dividers, list rows, card borders, field underlines and focus outlines (4px outline offset). The only non-orthogonal gesture is rotation of pasted-on paper: the tessera card (-2.5deg, -1.5deg on mobile) and stamps (-4deg, -2deg inline).

## Components

### Buttons
Two plates, pressed together on contact.
- **Shape:** Square (0px), minimum height 52px (46px in the masthead).
- **Primary:** Blue face multiplied over a pink plate offset 6px by 5px; paper text.
- **On pink flood:** Overprint face over a blue plate.
- **Paper:** Paper face over a blue plate, blue text. On hover or focus the face drops out and the button reads paper on blue.
- **Hover / Focus:** The under plate slides into register (420ms ease-out). Active presses down 2px.

### Inline links
- Bold (700), a 2px currentColor underline drawn as a background that wipes out to the right on hover (320ms). Masthead links do the reverse: a 3px underline that wipes in.

### Inputs / Fields
- **Style:** No box. A 3px blue underline, transparent fill, 48px minimum height, 600 weight at step 1. The label sits above in the label style.
- **Focus:** Underline turns overprint and the field fills with pink at 14%.
- **Error:** On `:user-invalid` the underline turns dashed.

### Navigation
- Sticky paper masthead with a 3px blue bottom rule. On the left is the "PNL" wordmark on two plates with an uppercase sub-line. Four links (700) on the right, then a primary button. Under 1080px the links hide; under 760px a 52px menu button opens a full-screen paper menu of expanded-black links divided by plate rules.

### Prints (signature)
Photographs printed as two-plate riso. The blue plate is a greyscale image screened with a dot cell (5px, 4px in the hero) and thresholded with `contrast(14)` into a real amplitude halftone, then inked through `#ink-blue`, which maps black to blue and white to paper. The pink plate prints only the deepest quarter of the tones on a 6px cell through `#ink-pink`, multiplied, offset 7px by 5px, and snaps into register on hover or focus of its host. On the blue flood a print may run on the blue plate alone.

### Tessera card
A membership card pasted onto the hero: paper fill, 3px blue border, rotated. A label header ruled off, the visitor's name printed live on two plates as they type, a pink price plate with overprint numerals offset 5px by 4px, the name and email fields, a primary button, and payment line.

### Archive plate
A 4:5 print, then a ruled title (800, wdth 115, step 1) and an uppercase metadata line. The whole plate is focusable and brings its print into register on focus.

### Stamp
A rotated rubber-stamp mark (2px pink border, overprint uppercase text on paper) that flags stand-in assets ("Foto provvisoria", "Indirizzo provvisorio"). It marks provenance and goes away when the real asset arrives. It is not decoration.

## Do's and Don'ts

### Do:
- **Do** print every visible mark in paper, blue, pink or overprint, and multiply plates where they overlap.
- **Do** give display type, primary buttons and photographs a second plate out of register at rest, and close it on hover or focus.
- **Do** run photographs through the two-plate halftone print; keep the dot screen real (tone sets dot size).
- **Do** separate stories with the 3px plate rule or by switching to a blue or pink flood, and swap text, selection and focus colors to the flood's pairing.
- **Do** keep text at normal width and weight 450, with a body measure of at most 62ch.
- **Do** write all interface copy in Italian.

### Don't:
- **Don't** round corners, add soft or grey shadows, or use visible gradients. The only offset is an ink plate.
- **Don't** introduce a fourth color, black, white or grey text, or full-colour photographs.
- **Don't** set body or small text in pink on paper; pink carries offsets, plates, marks and floods.
- **Don't** add a second typeface; vary the Archivo width axis instead.
- **Don't** leave misregistration on during interaction, and don't animate it when reduced motion is requested.

## Event albums (added 6 Nov 2026)

- Past events are **albums, one per event**, never a mixed gallery. Source: one folder per album in `src/album/<slug>/` holding the photos plus `album.json`; `src/data/album.ts` reads them.
- **Album cover** (`AlbumCard.astro`): the cover photo printed as riso (4:5, 3px blue frame) on two offset paper sheets that fan out on hover, the photo count on a blue tag, then title, date and place. The same card is used on the home strip (latest 3) and on `/eventi`.
- **Album page** (`/eventi/[album]`): display title, facts (Quando / Dove / Foto), then a contact sheet of square crops **in true colour**. The riso treatment is for covers only: inside an album people look for themselves, so photos stay unprinted.
- **Viewer**: native `<dialog>` drenched in blue, photo contained, a bottom bar with counter and 52px square paper-outlined buttons (prev, next, download, close). Arrow keys, swipe and Esc work. Without JS a thumbnail links to the full-size file.

## Photographs are clean (changed 7 Nov 2026)

- The client asked for every image without overlays. The two-plate riso halftone on photos is **removed everywhere**: hero, album covers, event posters, album pages. `Print.astro` now renders the photo as-is, `object-fit: cover`, on a blue backing while it loads.
- The paper grain moved from a fixed overlay on top of the page into the `body` background, so it sits under the content and never over a photo. Coloured floods (pink, blue sections) have no grain.
- The riso language stays in type and controls: misregistered display headings (`Reg`), the two-plate buttons, the pink highlight on "fare schifo".
