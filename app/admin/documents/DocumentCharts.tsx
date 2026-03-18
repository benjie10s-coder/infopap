// app/admin/documents/DocumentCharts.tsx — Charts for document analytics
"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PieLabelRenderProps, PieLabel } from "recharts";

interface TypeStat {
  type: string;
  total: number;
  paid: number;
  unpaid: number;
  guest: number;
  authenticated: number;
  totalRevenue: number;
}

const COLORS = ["#1f8ea3", "#22c55e", "#14b8a6", "#a855f7", "#f97316", "#d97706"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-ink border border-white/20 px-3 py-2 shadow-soft text-xs">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <p key={entry.name} className="text-white font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
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

export default function DocumentCharts({ typeStats }: { typeStats: TypeStat[] }) {
  if (!typeStats.length) return null;

  const totalData = typeStats
    .filter((t) => t.total > 0)
    .map((t) => ({ name: t.type, value: t.total }));

  const paidVsUnpaid = typeStats.map((t) => ({
    type: t.type,
    paid: t.paid,
    unpaid: t.unpaid,
  }));

  const guestVsAuth = typeStats.map((t) => ({
    type: t.type,
    guest: t.guest,
    authenticated: t.authenticated,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Type distribution */}
      {totalData.length > 0 && (
        <ChartCard title="Document Type Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={totalData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={((props: PieLabelRenderProps) =>
                  `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                ) as PieLabel}
              >
                {totalData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Paid vs Unpaid per type */}
      <ChartCard title="Paid vs Unpaid by Type">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={paidVsUnpaid}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="type" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
            <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
            <Bar dataKey="paid" name="Paid" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="unpaid" name="Unpaid" fill="#eab308" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Guest vs Authenticated per type */}
      <ChartCard title="Guest vs Authenticated by Type">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={guestVsAuth}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="type" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
            <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
            <Bar dataKey="authenticated" name="Authenticated" fill="#1f8ea3" radius={[4, 4, 0, 0]} />
            <Bar dataKey="guest" name="Guest" fill="#f2672e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
