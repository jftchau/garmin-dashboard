# Legibility — the maths behind the scale

Every size in this kit comes from one calculation. It is written out here so the
scale can be re-derived when the distance or the panel changes, rather than
argued about.

## The panel

| | |
| --- | --- |
| Resolution | 1024 × 600 |
| Diagonal | 7″ → 1187px diagonal |
| **Pixel pitch** | **0.1498 mm** |
| Physical size | 153 × 90 mm |
| Effective PPI | 170 |
| Viewing distance | **2.25 m** |

A 7″ panel at 2.25 m is 12.6 diagonals away. That is the same visual proposition
as a 55″ television watched from 11 metres.

## The formula

Legibility depends on **angular** size, not pixel size. The standard measure is
the cap height of a character in arcminutes:

```
θ(arcmin) = 2 · atan( h / (2·D) ) · (180/π) · 60
```

where `h` is cap height and `D` is viewing distance, in the same units.

For this panel, with a cap-height ratio of 0.72 (v1's working figure; Outfit,
the v2 face, measures 0.705 for capitals and 0.725 for digits, close enough that
the table below holds):

```
h_mm        = font_px · 0.72 · 0.1498
θ(arcmin)   = font_px · 0.165      ← at 2.25 m
font_px     = θ / 0.165
```

**ISO 9241-303** puts the minimum cap height for electronically displayed text
at **16′** and the comfortable range at **20–22′**.

For calibration: ordinary laptop body text (16px at 60 cm on a 110-PPI screen)
is about **15′** — just under the ISO minimum. Phone body text is around 40′.

## What the old dashboard measured

| Element | px | arcmin @ 2.25 m | |
| --- | --- | --- | --- |
| `hero` stat | 80 | 13.2′ | below minimum |
| `xl` stat | 72 | 11.9′ | below minimum |
| `lg` stat | 60 | 9.9′ | |
| `md` stat | 48 | 7.9′ | |
| RunRow distance | 30 | 4.9′ | |
| Slide title | 24 | 4.0′ | |
| Chart axis tick | 17 | 2.8′ | |
| Panel title, stat label | 16 | 2.6′ | |
| Form band annotation | 14 | 2.3′ | |

The largest text anywhere on the dashboard was at 13.2′ — below the ISO
*minimum*, let alone the comfortable range. The CLAUDE.md readability floor of
"nothing below ~14px" was written for a much closer screen and had drifted out
of contact with where the screen actually sits.

Measured across all eighteen slides, **seven had a maximum text size of 17–20px**:
Training mix, Mileage trend, Heart trends, Fitness trends, HR zones, and both
Week volume slides. Those slides had nothing readable on them at all.

## What the distance requires

| Distance | 16′ minimum | 20′ comfortable | 22′ optimal |
| --- | --- | --- | --- |
| 1.00 m | 43px | 54px | 59px |
| 1.35 m | 58px | 73px | 80px |
| 1.80 m | 78px | 97px | 107px |
| **2.25 m** | **97px** | **121px** | **133px** |
| 2.50 m | 108px | 135px | 148px |
| 3.00 m | 129px | 162px | 178px |

## The budget

549px of content height, at 1.15 line-height:

| Distance | Lines at the minimum | Lines at comfortable |
| --- | --- | --- |
| 1.35 m | 8.0 | 6.4 |
| 1.80 m | 6.0 | 4.8 |
| **2.25 m** | **4.8** | **3.9** |
| 3.00 m | 3.6 | 2.9 |

Four to five lines. This is the constraint that generates the whole design:
one number, one unit, one label, one comparison — and then the slide is full.

## If the panel changed

Same 1024×600, same 2.25 m, 20′ comfortable target:

| Panel | Body size | Lines in 549px |
| --- | --- | --- |
| 7″ (current) | 121px | 3.9 |
| 10.1″ | 84px | 5.6 |
| 13.3″ | 64px | 7.3 |
| 15.6″ | 54px | 8.6 |
| 21.5″ | 40px | 11.8 |
| 24″ | 35px | 13.2 |

Resolution does not appear in this table, because it does not matter.
**Physical size is the only lever.** A 1024×600 panel at 13″ shows nearly twice
the information of the same panel at 7″, at the same legibility, from the same
chair.

## Re-deriving the scale

If the distance or the panel changes, recompute `0.165` and rescale:

```
pitch_mm      = (diagonal_inches × 25.4) / hypot(1024, 600)
arcmin_per_px = 2 · atan(0.72 · pitch_mm / (2 · D_mm)) · (180/π) · 60
```

Then set `hero` at ~34′, `stat-xl` at ~26′, `stat-lg` at ~21′ and `stat-md` at
~17′, measured on the digit height of the face actually in use (Outfit: 0.725),
and let the walk-closer tier fall where it falls. Re-check that the widest
head-to-head number still fits its card (396px inside) after any change.

## Colour, at small angular sizes

Contrast matters more as angular size falls: the same ratio is harder work at
13′ than at 40′. So every colour that carries text clears **7:1** against what
is *actually behind it* (on glass, over the haze: about `#36` at the brightest),
measured on the slide rather than on a flat swatch. That is why the v2 greys sit
higher than v1's, and why the runner colours are never used as text: on glass,
orange text reaches only about 5.6:1.

Separation between the two runner hues, as CIEDE2000, with the Machado 2009
colour-blindness simulation (severity 1.0):

| Pair | Normal | Deuteranopia | Protanopia |
| --- | --- | --- | --- |
| Marigold / olive (pre-v1) | 28 | **8** | **3** |
| Orange `#ff7a2f` / cyan `#22d3ee` (v1) | 53 | 49 | 45 |
| Orange `#ff9147` / blue `#7aa7ff` (v2) | 48 | 56 | 52 |
| **Copper `#ff8342` / seafoam `#00caae` (v2b, 2026-11-28)** | **56** | **28** | **21** |

(Version 1 of this page printed 118 / 124 / 124 for orange/cyan. Those were
CIE76 figures mixed into a CIEDE2000 table; the corrected values are above.)

Runner hue against a white lit mark, worst colour-blind case: v1's cyan
collapsed to 16, which is why v1 required dashed reference markers. v2's
Jeffrey reaches 30 and Eugenia 27, above the 20 this kit asks for.

v2b (copper / seafoam) was chosen knowingly below the 40 line for colour-blind
viewers; see the trade-off note in README.md. Eugenia's seafoam also drops to
15–17 against a white lit mark under colour blindness.

A lit runner mark against its unlit track must clear 3:1. v2 measured Jeffrey
4.82:1, Eugenia 3.32:1; v2b estimates ~3.7:1 and ~4.3:1. The first blue tried (`#5c8dff`) reached only 2.67:1, so it was
lifted to `#7aa7ff`.
