// app/admin/OverviewCharts.tsx — Recharts-based analytics charts for admin overview
"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PieLabelRenderProps, PieLabel } from "recharts";

interface AnalyticsData {
  revenueByDay?: { date: string; revenue: number }[];
  documentsByDay?: { date: string; count: number }[];
  paymentsByDay?: { date: string; completed: number; failed: number }[];
  documentsByType?: { type: string; count: number }[];
  guestVsAuth?: { label: string; count: number }[];
}

const CHART_COLORS = {
  lagoon: "#1f8ea3",
  ember: "#f2672e",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  purple: "#a855f7",
  blue: "#3b82f6",
  teal: "#14b8a6",
  orange: "#f97316",
  amber: "#d97706",
};

const PIE_COLORS = [
  CHART_COLORS.lagoon,
  CHART_COLORS.green,
  CHART_COLORS.teal,
  CHART_COLORS.purple,
  CHART_COLORS.orange,
  CHART_COLORS.amber,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-ink border border-white/20 px-3 py-2 shadow-soft text-xs">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <p key={entry.name} className="text-white font-medium" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6">
      <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function OverviewCharts({
  analytics,
}: {
  analytics: Record<string, unknown> | null;
}) {
  if (!analytics) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <p className="text-sm text-white/20 text-center">
          Analytics data loading...
        </p>
      </div>
    );
  }

  const data = analytics as unknown as AnalyticsData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue trend */}
        {data.revenueByDay && data.revenueByDay.length > 0 && (
          <ChartCard title="Revenue Trend (30 days)">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.revenueByDay}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue (KES)"
                  stroke={CHART_COLORS.green}
                  fill="url(#revenueGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Documents per day */}
        {data.documentsByDay && data.documentsByDay.length > 0 && (
          <ChartCard title="Documents Created (30 days)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.documentsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Documents" fill={CHART_COLORS.lagoon} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Payments: completed vs failed */}
        {data.paymentsByDay && data.paymentsByDay.length > 0 && (
          <ChartCard title="Payments (30 days)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.paymentsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
                <Bar dataKey="completed" name="Completed" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Document type breakdown */}
        {data.documentsByType && data.documentsByType.length > 0 && (
          <ChartCard title="Document Types">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.documentsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="type"
                  label={((props: PieLabelRenderProps) => `${props.name ?? ''} ${(((props.percent ?? 0)) * 100).toFixed(0)}%`) as PieLabel}
                >
                  {data.documentsByType.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Guest vs Authenticated */}
      {data.guestVsAuth && data.guestVsAuth.length > 0 && (
        <ChartCard title="Guest vs Authenticated Users">
          <div className="flex items-center gap-8">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.guestVsAuth}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="label"
                  >
                    <Cell fill={CHART_COLORS.lagoon} />
                    <Cell fill={CHART_COLORS.ember} />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {data.guestVsAuth.map((item, i) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: i === 0 ? CHART_COLORS.lagoon : CHART_COLORS.ember }}
                  />
                  <span className="text-white/60">{item.label}:</span>
                  <span className="text-white font-medium">{item.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      )}
    </div>
  );
}
