// components/admin/StatCard.tsx — Reusable KPI stat card for admin dashboard
"use client";

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
}

export function StatCard({ label, value, sublabel, accent, icon, trend }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/30 uppercase tracking-wider truncate">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${accent || "text-white"}`}>{value}</p>
          {sublabel && (
            <p className="text-xs text-white/30 mt-1 truncate">{sublabel}</p>
          )}
        </div>
        {icon && (
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white/30 shrink-0 ml-3">
            {icon}
          </span>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <span className={`text-xs font-medium ${trend.value > 0 ? "text-green-400" : trend.value < 0 ? "text-red-400" : "text-white/30"}`}>
            {trend.value > 0 ? "+" : ""}{trend.value}%
          </span>
          <span className="text-xs text-white/20 ml-1">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
