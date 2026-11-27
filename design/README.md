# Pi Run Dashboard — Design Kit

The design system for the two-runner Garmin kiosk: a 1024×600, 7″ Raspberry Pi
panel on a wall, read from **2.25 m away**, with no touch, keyboard or mouse.

**Version 2 (27 Nov 2026): dark glass.** Version 1 took Strava's grammar onto a
flat dark ground. Version 2 keeps that grammar (one number per slide, numbers as
the subject, charts that support a number) and moves the look to a moodboard of
glass dashboards: a dark navy room, soft coloured light, translucent cards, and
colour used sparingly. Nothing of Strava's property is used: no logo, no
wordmark, no "Powered by Strava". The data is Garmin's.

**In this repo.** This folder is the design system's source; it is not yet
applied to `frontend/`. `tokens.json` holds every value (`tokens.css` is the same
decisions as CSS custom properties), `legibility.md` the maths, and
`dashboard-content.md` the proposed slides. `components/*/preview.html` show
each component (they use the token fallbacks, so open them through a local
server with Outfit available). `fonts/outfit/` is the self-hosted font with its
licence (OFL.txt) and an `@font-face` file. `labs/` are the working pages the
decisions came from; serve this folder over http (for example
`python -m http.server` from `design/`) rather than opening them as files, or
web fonts will not load.

Every decision below was tried in a working lab and measured on the slide
itself, not estimated. What has **not** been done yet is checking it on the
physical Pi panel; each section says where that matters.

---

## The finding this kit is built on

The old dashboard was styled for a screen you sit about 1.3 m from, then put
2.25 m away. On a panel whose pixels are 0.1498 mm, the biggest number it showed
(80px) was 13 arcminutes tall, below the ISO 9241-303 minimum of 16. Seven of
eighteen slides had nothing readable at all.

| Distance | 16′ (minimum) | 20′ (comfortable) | Lines of text in 549px |
| --- | --- | --- | --- |
| 1.35 m | 58px | 73px | 8.0 |
| 1.80 m | 78px | 97px | 6.0 |
| **2.25 m** | **97px** | **121px** | **4.8** |
| 3.00 m | 129px | 162px | 3.6 |

**At 2.25 m the panel holds four or five lines.** That budget generates the
whole system. The maths is in **Legibility**.

---

## Principles

**1. One number is the slide.** A slide answers one question with one number,
set at `hero` or `stat-xl`. If a slide has two things to say, it is two slides.

**2. Readable, or honestly secondary.** Every element belongs to one of three
tiers, on purpose:

- **Read from the sofa** (104–208px): the numbers.
- **Recognised from the sofa** (44–56px): units, runner names, labels, titles.
  You learn the shape of "EUGENIA" once and recognise it after that.
- **Walk closer** (24–40px): captions, axis ticks, status. Real content for
  someone standing at the screen; never the point of the slide.

**3. Colour is light, not paint.** A runner's colour lives in the *light* of the
room (haze from that runner's corner, glow inside their card) and in *marks*
(bars, rings, progress, their dot). Names and numbers stay neutral `text-1`.
On glass, orange as text reaches only about 5.6:1, under the 7:1 this distance
needs; as light and marks it costs nothing.

**4. One lit mark per chart.** The mark that means "now" or "this one" is lit
(the runner's colour, or `text-1` on a neutral slide). Every other mark is
`mark-unlit`. Two lit marks compete; ten make noise.

**5. The budget is 549px and it does not stretch.** No scrolling, ever. Verify
at 1024×600, on every slide, for both runners.

---

## The room: ground, light and glass

A slide is a **room**: the `ground` colour, lit by one or two large, soft light
sources from the corners, with glass cards standing in it.

- **Ground** `#090b10`: near-black with a navy tint, so light has something to
  glow into.
- **Light sources** are radial gradients fading to transparent at 70%
  (`haze-fade`). On a neutral slide they are `light-haze`; on a runner's slide
  they take that runner's colour.
- **Glass cards**: `glass-fill` (white at 5%), a 1px `glass-edge` hairline, a
  `glass-inset` top highlight, the `glass-drop` shadow, `radius-card` 28px, and a
  corner glow inside the card in the slide's light colour.
- **Grain**: a soft-light noise layer at `grain` 4% over everything. Dark
  gradients band on a 6-bit panel; grain dithers them away.
- **Backdrop blur is optional.** Over a haze this smooth it is barely visible,
  and it costs GPU on the Pi. Measure on the panel before keeping it.

Where the light goes:

| Slide | Light | Card glow |
| --- | --- | --- |
| Head-to-head | Jeffrey's haze top-left, Eugenia's bottom-right | Each card from its outer corner, in its runner's colour |
| One runner | The whole room in that runner's light | Their colour |
| Neutral (both, or nobody) | `light-haze` from two corners | `light-glow` |

---

## Colour

**Text, three steps.** Glass and haze lift the background behind text from about
`#14` to `#36`, so the greys were raised until they pass where they actually sit:

| Token | Value | Measured on glass | For |
| --- | --- | --- | --- |
| `text-1` | `#f3f4f6` | ≥ 12.9:1 | numbers, titles, names |
| `text-2` | `#c9ccd4` | ≥ 7.3:1 | units, labels, captions |
| `text-3` | `#8f95a3` | ≥ 4.5:1 | walk-closer status only |

**Runners, two hues.** `runner-a` `#ff9147` is Jeffrey; `runner-b` `#7aa7ff` is
Eugenia. Neither is ever used for anything else.

| Check (CIEDE2000, Machado 2009 colour-blindness simulation) | Normal | Deuteranopia | Protanopia | Need |
| --- | --- | --- | --- | --- |
| Jeffrey vs Eugenia | 48 | 56 | 52 | ≥ 40 |
| Runner vs a white lit mark, worst case | Jeffrey 30, Eugenia 27 | | | ≥ 20 |

| Lit mark against its unlit track | Contrast | Need |
| --- | --- | --- |
| Jeffrey | 4.82:1 | ≥ 3:1 |
| Eugenia | 3.32:1 | ≥ 3:1 |

Eugenia's blue was lifted from `#5c8dff` to `#7aa7ff` because the darker blue
reached only 2.67:1 as a lit bar on its track.

**Marks.** `mark-unlit` (white at 16%) for every mark that is not "now": 1.67:1
against the card, enough to see shape, quiet enough not to compete.

**Ramps.** `intensity-a-1…5` and `intensity-b-1…5` step each runner's colour
from 40% to 100% toward the ground, for the rare chart that genuinely needs
graded values. The lowest steps are below 3:1: presence, never values. Carried
over from v1's rule and recalculated for the new hues, but not yet checked on
glass.

**Neutrals and alert, carried from v1.** `cross` and `cross-dim` (warm greys,
strength and other cross-training) and `alert` (`#ff2d55`, chip only, with a
glyph and a word). With the new pair, `cross` sits 32 dE from Eugenia's blue but
only 19–24 from Jeffrey's orange, so on his slides tell them apart by lightness
or position. Alert is 12 dE from orange under deuteranopia, which is why it is
never a data series. Neither has been re-checked on glass yet.

**Reference markers** (goals, targets) were dashed in v1 because the old cyan
collapsed into white under colour blindness. With the blue now 27 dE from white
in the worst case, a solid marker would be distinguishable; dashed stays the
convention because it says "target, not data".

---

## Type

**One family: Outfit**, a round geometric sans (SIL Open Font License),
self-hosted as one variable file (`fonts/outfit/Outfit-Variable-latin.woff2`, 32 KB,
weights 100–900, Latin). It is listed in `tokens.json`, so it loads with no
network. A kiosk that boots without internet must never fall back to another
face: every layout is fitted to Outfit's widths. Use `font-display: block`.

Outfit was chosen from fourteen candidates, then a top three, measured on the
real head-to-head slide (weight 600, card interior 396px):

| | Outfit | Red Hat Display | Figtree |
| --- | --- | --- | --- |
| Room left for "88.8 km" | **+7px** | +5px | −2px |
| Decimal point from 2.25 m (so 32.4 never reads 324) | **6.2′** | 4.6′ | 5.3′ |
| How alike the look-alike digit pairs look from the sofa (lower is better) | 75% | **74%** | 79% |

Outfit's weakest pair is 3 against 5. Every number uses
`font-variant-numeric: tabular-nums` so changing values never shift sideways.
Note that the CSS `font` shorthand resets that property: set it again after any
`font:` declaration.

**Weight 600 for numbers.** Lighter weights are slightly easier to tell apart
from the sofa (500 scores about 3 points better at every size); 600 was chosen
for presence. Labels are 700 uppercase with 0.08em tracking; small text 500.
Number tracking is −0.045em. Label weight and both trackings are working values
that look right on the test slides but were not separately tested.

**The scale**, measured on Outfit (digit 72.5% of the font size, capital 70.5%,
x-height 48.5%):

| Tier | Style | px | From 2.25 m | Use |
| --- | --- | --- | --- | --- |
| Read | `hero` | 208 | 34.5′ | the one number on a solo slide |
| Read | `stat-xl` | 160 | 26.5′ | head-to-head |
| Read | `stat-lg` | 128 | 21.2′ | up to four numbers |
| Read | `stat-md` | 104 | 17.3′ | last resort |
| Recognise | `unit` | 56 | 6.2′ x-height | beside its number |
| Recognise | `label` | 52 | 8.4′ capitals | runner and stat names |
| Recognise | `title` | 44 | 4.9′ x-height | slide title |
| Walk closer | `caption` | 40 | 4.4′ | context |
| Walk closer | `axis` | 28 | 3.1′ | chart ticks |
| Walk closer | `meta` | 24 | 2.6′ | status, page counter |

All three test slides (head-to-head, a single big number, four stats) fit this
scale. Two layout rules came out of fitting it:

- **The unit stays at 56px.** At 64px the head-to-head numbers overflow.
- **Pace on a head-to-head slide puts "/km" in the caption.** "4:52 /km" at
  160px overflows the card by about 13px; "4:52" alone fits easily.

---

## Layout

```
┌──────────────────────────────────────────────────┐  1024 × 600
│ 01/22  This week                    Synced 2h ago │  header 48px
├──────────────────────────────────────────────────┤  rule 3px
│ ╭───────────────────╮  ╭───────────────────╮      │
│ │ ● JEFFREY         │  │ ● EUGENIA         │      │  content 549px
│ │ 71.1 km           │  │ 36.9 km           │      │  (18 top, 28 bottom)
│ │ ████████░░░░      │  │ ██████░░░░░░      │      │
│ │ 64% of 50  5 runs │  │ 47% of 40  3 runs │      │
│ ╰───────────────────╯  ╰───────────────────╯      │
└──────────────────────────────────────────────────┘
```

- **Gutter 40px**, card gap 20px, card padding 28/32px (four-stat cards 22/28).
  A head-to-head card is 462px wide and 396px inside.
- **Header 48px**: page counter (`meta`, tabular), title (`title`), status
  (`meta`, `text-3`). A 3px progress rule fills over the dwell time.
- **Flexbox, never fixed heights.** The slide is `flex-1 min-h-0 flex flex-col`.

---

## What belongs on the dashboard

**Dashboard content** maps Strava's Progress surfaces onto this kiosk and
proposes the running order. Goal, streak and the training-log dots are the
highest-value additions, and all three are one-number slides.

---

## Components

| Component | What it is for |
| --- | --- |
| **TypeRuler** | The whole scale at true size with its arcminute values. Open it on the Pi and sit where you sit. |
| **SlideFrame** | A complete head-to-head slide at 1024×600: the room, the light, the glass. |
| **HeroStat** | The one-number unit at its four sizes, in a glass card. |
| **GoalBar** | Weekly goal progress: the lit mark and its unlit track. |
| **TrainingLogDots** | One dot per activity, sized by distance; the one lit dot is today. |
| **Cover** | The system's face. |

---

## Using this kit in the repo

Tokens here are the source; `frontend/src/index.css` is the consumer. Each colour
token becomes a `--color-*` entry in Tailwind v4's `@theme`, each type style a
utility class, and `fonts/` is copied into the app with `OFL.txt` beside it.

- **Tailwind v4 fails silently.** A class naming a colour that is not in `@theme`
  generates no CSS and no error. After the palette change, search for classes
  using removed v1 tokens (`ink`, `chalk`, `muted`, `surface`, `olive`, the old
  `intensity-1…5`).
- **Recharts cannot read CSS.** Axis `fontSize` and chart heights are numeric
  props; the `axis` style is 28px, and margins and `YAxis width` must grow to
  match or labels clip (they already clip today: "49.2" renders as "9.2").
- **Still to verify on the Pi:** colours and grain on the real panel, whether
  backdrop blur is worth its cost, and reading distance for the walk-closer tier.
