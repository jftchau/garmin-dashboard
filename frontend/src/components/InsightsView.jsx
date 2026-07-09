import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  fetchVo2maxTrend,
  fetchWeeklyInsights,
  fetchWellnessTrend,
  fetchCurrentStatus,
} from "../api.js";
import { formatSleep, prettyStatus } from "../utils.js";

const WHO_GOAL = 150;

const axisTick = { fill: "var(--color-muted)", fontSize: 11, fontFamily: "var(--font-mono)" };
const tooltipStyle = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-line)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

export default function InsightsView() {
  const [vo2, setVo2] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [wellness, setWellness] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchVo2maxTrend().then(setVo2);
    fetchWeeklyInsights().then(setWeekly);
    fetchWellnessTrend(90).then(setWellness);
    fetchCurrentStatus().then(setStatus);
  }, []);

  const currentVo2 = vo2 ? vo2.current : null;
  const weeksOnTarget = weekly ? weekly.filter((w) => w.intensity_total >= WHO_GOAL).length : 0;
  const sleepData = wellness
    ? wellness.map((d) => ({ ...d, sleep_hours: d.sleep_seconds ? d.sleep_seconds / 3600 : null }))
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-baseline gap-3">
        <h2 className="heading-display text-xl text-volt">Insights</h2>
        <span className="text-muted text-sm font-mono">trends from your run &amp; wellness history</span>
      </div>

      {status && <StatusRow s={status} />}

      <Panel
        title="VO₂max"
        subtitle="per-run estimates · current from watch (Max Metrics)"
        right={
          currentVo2 != null && (
            <span className="stat-mono text-volt text-xl">
              {Math.round(currentVo2)}
              <span className="text-muted text-xs ml-1">current</span>
            </span>
          )
        }
      >
        {vo2 ? <Vo2Chart data={vo2.trend} /> : <Loading />}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Resting heart rate" subtitle="bpm · lower is fitter">
          {wellness ? <RestingHrChart data={wellness} /> : <Loading />}
        </Panel>
        <Panel title="HRV (weekly avg)" subtitle="ms · higher & stable is better">
          {wellness ? <HrvChart data={wellness} /> : <Loading />}
        </Panel>
      </div>

      <Panel title="Sleep" subtitle="hours per night">
        {wellness ? <SleepChart data={sleepData} /> : <Loading />}
      </Panel>

      <Panel
        title="Weekly intensity minutes"
        subtitle={`WHO goal ${WHO_GOAL}/wk (moderate + 2× vigorous)`}
        right={weekly && <span className="text-muted text-xs font-mono">{weeksOnTarget}/{weekly.length} weeks on target</span>}
      >
        {weekly ? <IntensityChart data={weekly} /> : <Loading />}
      </Panel>

      <Panel title="Weekly training load" subtitle="mechanical work from running power (kJ)">
        {weekly ? <LoadChart data={weekly} /> : <Loading />}
      </Panel>
    </div>
  );
}

function StatusRow({ s }) {
  const cards = [
    { label: "Resting HR", value: s.resting_hr != null ? `${s.resting_hr}` : "—", unit: "bpm" },
    { label: "HRV last night", value: s.hrv_last_night != null ? `${s.hrv_last_night}` : "—", unit: "ms", note: s.hrv_status ? prettyStatus(s.hrv_status) : null },
    { label: "Sleep", value: s.sleep_score != null ? `${s.sleep_score}` : "—", note: s.sleep_seconds ? formatSleep(s.sleep_seconds) : null },
    { label: "Body Battery", value: s.body_battery_high != null ? `${s.body_battery_high}` : "—", note: s.body_battery_low != null ? `low ${s.body_battery_low}` : null },
    { label: "Stress", value: s.stress_avg != null ? `${s.stress_avg}` : "—" },
    { label: "Status", value: s.training_status ? prettyStatus(s.training_status) : "—", small: true },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-surface border border-line rounded-lg p-3">
          <div className="text-muted text-[10px] uppercase tracking-wide font-mono">{c.label}</div>
          <div className={`stat-mono text-volt ${c.small ? "text-sm mt-1" : "text-2xl"}`}>
            {c.value}
            {c.unit && <span className="text-muted text-xs ml-1">{c.unit}</span>}
          </div>
          {c.note && <div className="text-muted text-[10px] font-mono mt-0.5">{c.note}</div>}
        </div>
      ))}
    </div>
  );
}

function Vo2Chart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} minTickGap={40} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} domain={["dataMin - 1", "dataMax + 1"]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} formatter={(v) => [v, "per-run est."]} />
        <Line type="monotone" dataKey="vo2max" stroke="var(--color-volt)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function RestingHrChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} minTickGap={40} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} formatter={(v) => [`${v} bpm`, "Resting HR"]} />
        <Line type="monotone" dataKey="resting_hr" stroke="var(--color-zone1)" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function HrvChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} minTickGap={40} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} domain={["dataMin - 4", "dataMax + 4"]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} formatter={(v) => [`${v} ms`, "HRV weekly avg"]} />
        <Line type="monotone" dataKey="hrv_weekly_avg" stroke="var(--color-zone2)" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SleepChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} minTickGap={40} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} cursor={{ fill: "var(--color-surface-2)", opacity: 0.4 }} formatter={(v) => [`${v.toFixed(1)} h`, "Sleep"]} />
        <ReferenceLine y={8} stroke="var(--color-muted)" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Bar dataKey="sleep_hours" fill="var(--color-zone1)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function IntensityTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <div className="text-muted">{label}</div>
      <div className="text-chalk">{d.intensity_total} min total</div>
      <div className="text-muted">moderate {d.moderate_min} · vigorous {d.vigorous_min}</div>
    </div>
  );
}

function IntensityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="week_start" tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} minTickGap={40} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<IntensityTooltip />} cursor={{ fill: "var(--color-surface-2)", opacity: 0.4 }} />
        <ReferenceLine y={WHO_GOAL} stroke="var(--color-volt)" strokeDasharray="4 4" strokeOpacity={0.7} />
        <Bar dataKey="intensity_total" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.intensity_total >= WHO_GOAL ? "var(--color-zone2)" : "var(--color-muted)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function LoadChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="week_start" tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} minTickGap={40} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} cursor={{ fill: "var(--color-surface-2)", opacity: 0.4 }} formatter={(v) => [`${v.toLocaleString()} kJ`, "Load"]} />
        <Bar dataKey="load_kj" fill="var(--color-volt)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Panel({ title, subtitle, right, children }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="heading-display text-sm uppercase tracking-wide text-muted">{title}</h3>
          {subtitle && <p className="text-muted text-[11px] font-mono mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Loading() {
  return <p className="text-muted font-mono">Loading…</p>;
}
