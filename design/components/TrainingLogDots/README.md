One dot per activity on a Monday-start week grid, area proportional to distance, beside the month's count at `hero`.

**One lit dot: the latest run**, in the runner's colour with its halo. Every other run is `mark-unlit`, so the eye goes to "now" first and reads the rest as texture. This applies the v2 rule "one lit mark per chart"; it has not been reviewed on the Pi yet.

Dot diameter runs from 22px (a short run) to 64px (the longest in the window); area, not diameter, tracks distance: diameter = `base * sqrt(km / max_km)`. At 2.25 m a dot's size survives where a cell's shade does not, which is why this replaces the calendar heatmap.

**Cross-training is a 22px ring** in `text-3`: told apart from runs by shape, not hue, so it never competes with the one lit dot. Rest days are a faint 10px dot, so a sparse week still reads as a calendar.

**Weeks start Monday**, matching the streak slide. Confirm the backend agrees before building on it.
