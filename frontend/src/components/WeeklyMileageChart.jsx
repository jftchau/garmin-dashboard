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
} from "recharts";

const axisTick = { fill: "var(--color-muted)", fontSize: 11, fontFamily: "var(--font-mono)" };
const tooltipStyle = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-line)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

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
}) {
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
      formatter={(value) => [`${value} km`, "Distance"]}
    />
  );

  if (bar) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
          {xAxis}
          {yAxis}
          {tooltip}
          <Bar dataKey={dataKeyY} fill="var(--color-volt)" radius={[2, 2, 0, 0]} />
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
        <Line
          type="monotone"
          dataKey={dataKeyY}
          stroke="var(--color-volt)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "var(--color-volt)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
