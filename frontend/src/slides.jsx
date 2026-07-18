import WeekTotalsSlide from "./components/slides/WeekTotalsSlide.jsx";
import WeekVolumeSlide from "./components/slides/WeekVolumeSlide.jsx";
import HRZonesSlide from "./components/slides/HRZonesSlide.jsx";
import TrainingMixSlide from "./components/slides/TrainingMixSlide.jsx";
import { MileageTrendSlide, MileageSummarySlide } from "./components/slides/MileageSlides.jsx";
import FrequencySlide from "./components/slides/FrequencySlide.jsx";
import RecordsSlide from "./components/slides/RecordsSlide.jsx";
import { HeartTrendsSlide, FitnessTrendsSlide, StatusSlide } from "./components/slides/BodySlides.jsx";
import { runnerName } from "./utils.js";

/**
 * The carousel's running order.
 *
 * This replaced five dense tabs. The display sits far enough away that packing
 * four panels onto a screen made everything unreadable, so the rule now is: one
 * idea per slide, rendered as large as the 1024x600 budget allows, and rotate
 * through more of them instead. Some slides are per-runner (`runner`) where a
 * head-to-head would halve the available size.
 *
 * `title` may be a function of `users` so per-runner slides can name the runner.
 * `navLabel` is the short form used for the position indicator's tooltip.
 */
export const SLIDES = [
  {
    id: "week-totals",
    title: "This week",
    navLabel: "This week",
    Component: WeekTotalsSlide,
  },
  {
    id: "week-volume-a",
    title: (users) => `${runnerName(users, 0)} · training week`,
    navLabel: "Week volume A",
    Component: WeekVolumeSlide,
    props: { runner: 0 },
  },
  {
    id: "week-volume-b",
    title: (users) => `${runnerName(users, 1)} · training week`,
    navLabel: "Week volume B",
    Component: WeekVolumeSlide,
    props: { runner: 1 },
    // Hide rather than render an empty slide when only one runner is configured.
    requiresRunner: 1,
  },
  {
    id: "training-mix",
    title: "Training mix",
    navLabel: "Training mix",
    Component: TrainingMixSlide,
  },
  {
    id: "hr-zones",
    title: "Heart rate zones · this week",
    navLabel: "HR zones",
    Component: HRZonesSlide,
  },
  {
    id: "mileage-trend",
    title: "Weekly mileage",
    navLabel: "Mileage trend",
    Component: MileageTrendSlide,
  },
  {
    id: "mileage-summary",
    title: "Mileage summary",
    navLabel: "Mileage summary",
    Component: MileageSummarySlide,
  },
  {
    id: "frequency-a",
    title: (users) => `${runnerName(users, 0)} · run frequency`,
    navLabel: "Frequency A",
    Component: FrequencySlide,
    props: { runner: 0 },
  },
  {
    id: "frequency-b",
    title: (users) => `${runnerName(users, 1)} · run frequency`,
    navLabel: "Frequency B",
    Component: FrequencySlide,
    props: { runner: 1 },
    requiresRunner: 1,
  },
  {
    id: "records-short",
    title: "Personal records · short",
    navLabel: "Records 1K–10K",
    Component: RecordsSlide,
    props: { distances: ["1K", "5K", "10K"] },
  },
  {
    id: "records-long",
    title: "Personal records · long",
    navLabel: "Records half & full",
    Component: RecordsSlide,
    props: { distances: ["HALF", "MARATHON"] },
  },
  {
    id: "status",
    title: "Today's readiness",
    navLabel: "Readiness",
    Component: StatusSlide,
  },
  {
    id: "heart-trends",
    title: "Heart · 90 days",
    navLabel: "Heart trends",
    Component: HeartTrendsSlide,
  },
  {
    id: "fitness-trends",
    title: "Fitness & sleep · 90 days",
    navLabel: "Fitness trends",
    Component: FitnessTrendsSlide,
  },
];

// Drop slides that need a runner slot this install doesn't have, so a one-runner
// setup doesn't rotate through blank screens.
export function visibleSlides(users) {
  const count = (users || []).length;
  return SLIDES.filter((s) => s.requiresRunner == null || count > s.requiresRunner);
}

export const slideTitle = (slide, users) =>
  typeof slide.title === "function" ? slide.title(users) : slide.title;
