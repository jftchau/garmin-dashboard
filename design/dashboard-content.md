# Dashboard content

What should be on the kiosk, derived from how Strava structures an athlete's
Progress view and then re-cut for a 7″ panel read from 2.25 m by two people at
once.

## What Strava actually shows

Strava's **You → Progress** tab is five things:

| Surface | What it is | Worth stealing? |
| --- | --- | --- |
| **Progress summary chart** | Totals for distance / time / elevation / count, over 1w, 1m, 3m, YTD | Already have it, as several slides |
| **Goal** | Weekly, monthly or annual target by distance, time or elevation, with progress | **Yes — the biggest gap** |
| **Streak** | Consecutive weeks with at least one activity of 60s+, Monday–Sunday | **Yes** |
| **Training log** | One circle per activity, coloured by type, sized by effort | **Yes** |
| **Relative Effort** | Weekly cumulative effort score against your usual range | **Yes, in spirit** |

The thing to notice is that four of those five are *single numbers with a
reference point*: 64% of goal, 7 weeks, this week vs your usual range. Strava
leads with a number and a comparison, and puts the chart underneath as evidence.
That is also, by coincidence, the only thing that works at 2.25 m.

The current kiosk inverted it: eighteen slides, of which seven had no number
larger than 20px and existed purely as a chart shape.

## Tiers

Tag every slide. The tier drives both the design and the rotation.

**Tier A — glanceable.** One number ≥ 128px, with a comparison. Readable from
the sofa, no walking. These carry the dashboard.

**Tier B — number plus shape.** A headline number that states what the chart
means, with the chart as evidence beneath it. Readable as "good week / bad
week" from the sofa; the detail rewards walking over.

**Tier C — detail.** Genuinely dense content that only works up close. Worth
keeping, but it should never be more than about one slide in four, or the
dashboard is blank most of the time.

## Proposed running order

Rotation interleaves so that **a Tier-A slide follows every Tier-B or C slide**.
From the sofa you then see something readable at least every other slide,
roughly every 12 seconds.

| # | Slide | Tier | Headline number | Status |
| --- | --- | --- | --- | --- |
| 1 | This week | A | Distance, per runner, `stat-xl` | Exists, re-typed |
| 2 | **Weekly goal** | A | % of goal, `hero`, with GoalBar | **New** |
| 3 | Latest run | A | Distance + pace of the most recent run | Rework of "Latest runs" |
| 4 | **Streak** | A | Weeks in a row, `hero` | **New** |
| 5 | Week volume · Jeffrey | B | Week total vs 12-week average | Exists, needs headline |
| 6 | Month to date | A | Distance, per runner | **New** |
| 7 | Week volume · Eugenia | B | As #5 | Exists, needs headline |
| 8 | Year to date | A | Distance, per runner | Exists, re-typed |
| 9 | **Training log** | B | Runs this month, dots beneath | **New** (replaces heatmap) |
| 10 | Personal records · short | A | One PR per distance | Exists, re-typed |
| 11 | **Weekly load** | B | This week's load vs usual range | **New** (Relative Effort analogue) |
| 12 | Personal records · long | A | As #10 | Exists, re-typed |
| 13 | Mileage trend | B | This week vs best week in the window | Exists, needs headline |
| 14 | Readiness | A | Today's number, per runner | Exists, re-typed |
| 15 | Training mix | C | Hours running vs strength vs other | Exists, needs headline |
| 16 | Resting HR | B | Current, with 30-day arrow | Split from "Heart · 30 days" |
| 17 | Run frequency | C | Runs per week | Exists, merge A+B |
| 18 | Fitness (VO₂max) | B | Current, with arrow | Split from "Fitness & sleep" |
| 19 | Running form | C | Cadence / stride / contact / oscillation | Exists, re-typed |
| 20 | Sleep | B | Last night, with 30-day average | Split from "Fitness & sleep" |
| 21 | Conditions | C | Temperature and its effect on pace | Exists |
| 22 | HR zones | C | Minutes per zone, this week | Exists, needs headline |

**Built (27 Nov 2026, PR 3):** every row except #11 *Weekly load*, which
still needs a "usual range" for HR-zone load and is left for later. #16 / #18
/ #20 are single-metric slides; the HRV trend was dropped (last night's HRV is
on Readiness). "Last 3 months" was kept as an extra tier-A slide before HR
zones, so the rotation is 23 slides.

Twenty-two slides at 14s is a 5-minute cycle. If that feels long, cut Tier C to
the four that earn it and drop to 18.

## The four new slides

### Weekly goal — the single biggest addition

Strava's most effective motivator, and it needs nothing from Garmin that is not
already in the database. A target distance per runner per week, a bar that
fills, and a number.

```
  JEFFREY                         EUGENIA
  ████████████████░░░░░░          ███████████████████████
  64%                             102%
  32 of 50 km                     51 of 50 km  ✓
```

The percentage is `hero`. The "32 of 50 km" line is `caption` — walk-closer
tier, because the percentage already carries the meaning. Over 100% the bar
caps and takes a check.

Needs: a `goal_distance_km` column on `users`, set with `PATCH /api/users/<id>`
(the kiosk has no settings UI, as with names).

### Streak

Consecutive weeks with at least one run, Monday to Sunday, per Strava's own
definition. A single number at `hero`, with the week's dots beneath.

Pure win at this distance: one number, two digits, no chart, and it is the kind
of thing a wall display is *for* — you see the number drop and you go for a run.

### Training log

One dot per activity, placed on a week grid, sized by distance and coloured by
runner. Strava's signature view, and it reads at distance where the current
calendar heatmap does not: a dot's *size* survives small angular sizes far
better than a cell's *shade*, and the current heatmap's lightest steps were
below 3:1 anyway.

Replaces the calendar heatmap rather than joining it.

### Weekly load

Strava's Relative Effort, approximated from what Garmin gives: time in each HR
zone, weighted. The point is not the absolute number but the band — "this week
is above your usual range" is a sentence a wall display can deliver in one
number and one bar.

## Slides to change, and why

**"Fitness & sleep · 30 days" should be three slides.** Today it is two line
charts with no number on the screen at all, and the y-axis labels are
*clipped* — `49.2` renders as `9.2`, `47.9` as `7.9` — because `YAxis width` is
too small for the decimals. Split into Fitness, Sleep and Resting HR, each with
its current value at `stat-lg` and the trend as a sparkline.

**"Training mix" needs a sentence, not two stacked bar charts.** Headline: hours
run this week vs hours cross-trained. The ten-week stacks go underneath as
evidence.

**"Latest runs" should show one run, not five.** Five rows per runner forces
30px type. The most recent run at `stat-xl`, with the previous four as a
walk-closer list, says more from the sofa.

**"Run frequency" A and B should merge.** Two slides that each show one number
can be one head-to-head slide, which frees a rotation slot.

**HR zones needs a headline.** Today its largest element is 20px. "68% easy this
week" at `stat-lg`, with the zone bars beneath.

## What to drop

Nothing, outright — but **Conditions** and **Running form** are the two slides
whose content is irreducibly dense, and if the rotation needs shortening they
are the ones to make occasional rather than every-cycle.

## One thing to check in the data layer

Strava weeks run **Monday to Sunday**, and streaks depend on it. Worth
confirming the backend's week boundary matches before building the streak and
goal slides on top of it — a streak that resets on the wrong day is worse than
no streak.
