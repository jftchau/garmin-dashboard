// Position indicator for the slide carousel.
//
// This replaced a tab bar: with ~14 slides the labels shrank to the point of
// being unreadable from across the room, which defeats the purpose of the wall
// display. A segmented bar costs one thin strip of vertical budget, reads as
// "where am I in the rotation" at a glance, and the filling segment doubles as
// the dwell-time countdown. Segments stay clickable for desktop use.
export default function SlideNav({ slides, index, onSelect, rotating, rotateMs, cycle }) {
  return (
    <div className="flex items-center gap-1 px-5 sm:px-6 short:px-4 pb-3 short:pb-2">
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
            className={`h-1.5 short:h-1 flex-1 rounded-full overflow-hidden transition-colors ${
              isPast ? "bg-volt-dim/50" : "bg-line"
            }`}
          >
            {isActive &&
              (rotating ? (
                <span
                  key={cycle}
                  className="block h-full bg-volt origin-left"
                  style={{ animation: `tab-progress ${rotateMs}ms linear forwards` }}
                />
              ) : (
                <span className="block h-full bg-volt" />
              ))}
          </button>
        );
      })}
    </div>
  );
}
