A complete head-to-head slide at 1024×600: the room, its two light sources, the glass cards and the grain.

The three bands are fixed:

| Band | Height | Holds |
| --- | --- | --- |
| Header | 48px | page counter (`meta`, tabular), slide title (`title`), status (`meta`, `text-3`) |
| Progress rule | 3px | fills over the dwell time |
| Content | 549px | 18px top, 28px bottom, 40px gutters, cards 20px apart |

**The room.** `ground`, lit by radial gradients that fade out at 70%: on head-to-head, Jeffrey's `runner-a-haze` from the top-left and Eugenia's `runner-b-haze` from the bottom-right. Each card glows from its outer corner in its runner's colour. On a one-runner slide the whole room takes that runner's light; on a neutral slide, `light-haze`.

**The glass.** `glass-fill`, a 1px `glass-edge`, the `glass-inset` highlight plus `glass-drop`, `radius-card` 28px. Backdrop blur is optional and not used here: over a haze this smooth it barely shows, and it costs GPU on the Pi.

**Grain** at 4% soft-light over everything, so the gradients do not band on a 6-bit panel.

- Flexbox, never fixed heights. The slide is `flex-1 min-h-0 flex flex-col`.
- Verify `document.body.scrollHeight <= 600` after any change, on every slide, for both runners.
