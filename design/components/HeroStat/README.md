The one-number unit every slide is built from: label, value, unit, and an optional caption, in a glass card.

| Size | px | arcmin at 2.25 m | Use |
| --- | --- | --- | --- |
| `hero` | 208 | 34.5 | one per slide |
| `stat-xl` | 160 | 26.5 | one per runner, head-to-head |
| `stat-lg` | 128 | 21.2 | up to four per slide |
| `stat-md` | 104 | 17.3 | last resort; prefer splitting the slide |

All four are Outfit 600, tracking −0.045em, line height 0.86, tabular numerals.

**The value is always `text-1`, whoever it belongs to.** The runner's colour goes into the room's light, the card's corner glow and their dot, never the digits: on glass, orange text reaches only about 5.6:1.

**The unit sits beside the value**, top-aligned, 10px away, at 56px in `text-2`. Not in the label: the label is recognised, not read, so a unit hidden there is lost.

**Tabular numerals, always**, so a value that changes on refresh never shifts sideways. The CSS `font` shorthand resets `font-variant-numeric`; set it again after any `font:` declaration.

**Pace on a head-to-head card:** "4:52 /km" at 160px overflows the 396px card interior by about 13px. Show "4:52" and put "/km" in the caption.
