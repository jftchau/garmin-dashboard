import WeekTotalsSlide from "./components/slides/WeekTotalsSlide.jsx";
import WeekVolumeSlide from "./components/slides/WeekVolumeSlide.jsx";
import HRZonesSlide from "./components/slides/HRZonesSlide.jsx";
import TrainingMixSlide from "./components/slides/TrainingMixSlide.jsx";
import { MileageTrendSlide, MileageSummarySlide } from "./components/slides/MileageSlides.jsx";
import FrequencySlide from "./components/slides/FrequencySlide.jsx";
import GoalSlide from "./components/slides/GoalSlide.jsx";
import StreakSlide from "./components/slides/StreakSlide.jsx";
import MonthToDateSlide from "./components/slides/MonthToDateSlide.jsx";
import TrainingLogSlide from "./components/slides/TrainingLogSlide.jsx";
import RecordsSlide from "./components/slides/RecordsSlide.jsx";
import { RestingHrSlide, Vo2maxSlide, SleepSlide, StatusSlide } from "./components/slides/BodySlides.jsx";
import YearToDateSlide from "./components/slides/YearToDateSlide.jsx";
import ConditionsSlide from "./components/slides/ConditionsSlide.jsx";
import RunningFormSlide from "./components/slides/RunningFormSlide.jsx";
import RecentRunsSlide from "./components/slides/RecentRunsSlide.jsx";
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
 * `requires(users)` hides a slide whose data isn't set up (the weekly goal,
 * until a runner has one).
 *
 * Order (design/dashboard-content.md): every slide is tier A (one number,
 * readable from the sofa), B (number + chart) or C (detail). An A follows
 * every B or C, so something is readable at least every other slide.
 *
 * Runner identity lives on the slides themselves (a lit card, or a runner's
 * dot beside their number), so the header carries no legend.
 * `light` ("both" | "a" | "b" | "neutral") overrides whose light fills the
 * room; by default a per-runner slide takes that runner's, others both.
 */
export const SLIDES = [
  { id: "week-totals", title: "This week", navLabel: "This week", Component: WeekTotalsSlide }, // A
  {
    id: "goal",
    title: "Weekly goal",
    navLabel: "Weekly goal",
    Component: GoalSlide,
    requires: (users) => (users || []).some((u) => u.goal_distance_km),
  }, // A
  { id: "recent-runs", title: "Latest runs", navLabel: "Latest runs", Component: RecentRunsSlide }, // A
  { id: "streak", title: "Weekly streak", navLabel: "Streak", Component: StreakSlide }, // A
  {
    id: "week-volume-a",
    title: (users) => `${runnerName(users, 0)} · training week`,
    navLabel: "Week volume A",
    Component: WeekVolumeSlide,
    props: { runner: 0 },
  }, // B
  { id: "month-to-date", title: "This month", navLabel: "Month to date", Component: MonthToDateSlide }, // A
  {
    id: "week-volume-b",
    title: (users) => `${runnerName(users, 1)} · training week`,
    navLabel: "Week volume B",
    Component: WeekVolumeSlide,
    props: { runner: 1 },
    // Hide rather than render an empty slide when only one runner is configured.
    requiresRunner: 1,
  }, // B
  { id: "year-to-date", title: "Year to date", navLabel: "YTD race", Component: YearToDateSlide }, // A
  {
    id: "training-log-a",
    title: (users) => `${runnerName(users, 0)} · training log`,
    navLabel: "Training log A",
    Component: TrainingLogSlide,
    props: { runner: 0 },
  }, // B
  {
    id: "records-short",
    title: "Records · short",
    navLabel: "Records 1K–10K",
    Component: RecordsSlide,
    props: { distances: ["1K", "5K", "10K"] },
  }, // A
  {
    id: "training-log-b",
    title: (users) => `${runnerName(users, 1)} · training log`,
    navLabel: "Training log B",
    Component: TrainingLogSlide,
    props: { runner: 1 },
    requiresRunner: 1,
  }, // B
  {
    id: "records-long",
    title: "Records · long",
    navLabel: "Records half & full",
    Component: RecordsSlide,
    props: { distances: ["HALF", "MARATHON"] },
  }, // A
  { id: "mileage-trend", title: "Weekly mileage", navLabel: "Mileage trend", Component: MileageTrendSlide }, // B
  { id: "status", title: "Today's readiness", navLabel: "Readiness", Component: StatusSlide }, // A
  { id: "training-mix", title: "Training mix", navLabel: "Training mix", Component: TrainingMixSlide }, // C
  { id: "resting-hr", title: "Resting HR · 30 days", navLabel: "Resting HR", Component: RestingHrSlide }, // B
  { id: "frequency", title: "Run frequency · 12 months", navLabel: "Run frequency", Component: FrequencySlide }, // C
  { id: "vo2max", title: "VO₂max · 30 days", navLabel: "VO2max", Component: Vo2maxSlide }, // B
  { id: "running-form", title: "Running form", navLabel: "Running form", Component: RunningFormSlide }, // C
  { id: "sleep", title: "Sleep · 30 days", navLabel: "Sleep", Component: SleepSlide }, // B
  { id: "conditions", title: "Running conditions", navLabel: "Conditions / heat", Component: ConditionsSlide }, // C
  { id: "mileage-summary", title: "Last 3 months", navLabel: "Mileage summary", Component: MileageSummarySlide }, // A
  { id: "hr-zones", title: "HR zones · this week", navLabel: "HR zones", Component: HRZonesSlide }, // C
];

// Drop slides that need a runner slot this install doesn't have, so a one-runner
// setup doesn't rotate through blank screens.
export function visibleSlides(users) {
  const count = (users || []).length;
  return SLIDES.filter(
    (s) => (s.requiresRunner == null || count > s.requiresRunner) && (!s.requires || s.requires(users))
  );
}

export const slideTitle = (slide, users) =>
  typeof slide.title === "function" ? slide.title(users) : slide.title;
