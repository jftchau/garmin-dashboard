// Position indicator for the slide carousel.
//
// This replaced a tab bar: with ~14 slides the labels shrank to the point of
// being unreadable from across the room, which defeats the purpose of the wall
// display. A segmented bar costs one thin strip of vertical budget, reads as
// "where am I in the rotation" at a glance, and the filling segment doubles as
// the dwell-time countdown. Segments stay clickable for desktop use.
export default function SlideNav({ slides, index, onSelect, rotating, rotateMs, cycle }) {
  // The 3px progress rule under the header (design: SlideFrame). Still one
  // segment per slide so it stays clickable on a desktop; on the Pi it reads
  // as a single rule filling over the dwell time.
  return (
    <div className="h-[3px] shrink-0 flex items-stretch gap-1 mx-10">
      {slides.map((s, i) => {
        const isActive = i === index;
        const isPast = i < index;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(i)}
            title={s.navLabel}
            aria-label={s.navLabel}
            aria-current={isActive ? "true" : undefined}
            className={`h-full flex-1 rounded-full overflow-hidden ${isPast ? "bg-unlit" : "bg-white/[0.08]"}`}
          >
            {isActive &&
              (rotating ? (
                <span
                  key={cycle}
                  className="block h-full bg-chalk origin-left"
                  style={{ animation: `tab-progress ${rotateMs}ms linear forwards` }}
                />
              ) : (
                <span className="block h-full bg-chalk" />
              ))}
          </button>
        );
      })}
    </div>
  );
}
