The weekly goal: a percentage at `stat-xl`, one lit bar on an unlit track, and the raw figures in the walk-closer tier.

The percentage is the component. "32 of 50 km" is a 40px `caption`: if you can read only one thing from the sofa, 64 is more useful than 32 of 50.

**One lit mark.** The fill is the runner's colour with its `mark-halo`; the track is `mark-unlit`. Lit against unlit measures 4.82:1 for Jeffrey and 3.32:1 for Eugenia, both above 3:1.

**Over 100% the fill caps** at the end of the track, and a dashed `text-1` marker holds the 100% position. Dashed because it means "target, not data". (v1 also needed it dashed because the old cyan collapsed into white for colour-blind viewers; the v2 blue does not.)

Needs a `goal_distance_km` column on `users`. The kiosk has no settings UI, so it is set the same way names are: `PATCH /api/users/<id>`.
