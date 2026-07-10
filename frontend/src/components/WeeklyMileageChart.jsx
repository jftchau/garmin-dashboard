import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const axisTick = { fill: "var(--color-muted)", fontSize: 11, fontFamily: "var(--font-mono)" };
const tooltipStyle = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-line)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};
const legendStyle = { fontSize: 11, fontFamily: "var(--font-mono)" };

export default function WeeklyMileageChart({
  data,
  dataKeyX = "week_start",
  dataKeyY = "distance_km",
  height = 220,
  bar = false,
  tickFormatter,
  // Show every category label by default when rendering bars (e.g. the 7 days
  // of a week); let recharts thin them out otherwise.
  interval,
  // Head-to-head: array of { dataKey, color, name } to render one bar/line per
  // runner (grouped bars / overlaid lines + legend). Falls back to the single
  // volt series keyed by dataKeyY when omitted.
  series,
}) {
  const multi = Array.isArray(series) && series.length > 0;
  const specs = multi
    ? series
    : [{ dataKey: dataKeyY, color: "var(--color-volt)", name: "Distance" }];

  const xAxis = (
    <XAxis
      dataKey={dataKeyX}
      tick={axisTick}
      tickFormatter={tickFormatter}
      interval={interval ?? (bar ? 0 : "preserveStartEnd")}
      axisLine={{ stroke: "var(--color-line)" }}
      tickLine={false}
    />
  );
  const yAxis = <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />;
  const tooltip = (
    <Tooltip
      contentStyle={tooltipStyle}
      labelStyle={{ color: "var(--color-muted)" }}
      labelFormatter={tickFormatter}
      formatter={(value, name) => [value != null ? `${value} km` : "—", name]}
    />
  );
  const legend = multi ? <Legend wrapperStyle={legendStyle} iconSize={10} /> : null;

  if (bar) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
          {xAxis}
          {yAxis}
          {tooltip}
          {legend}
          {specs.map((s) => (
            <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        {xAxis}
        {yAxis}
        {tooltip}
        {legend}
        {specs.map((s) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.5}
            dot={multi ? false : { r: 3, fill: s.color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
