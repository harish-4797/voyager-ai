import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Hotel, Utensils, Bus, Ticket, Package } from "lucide-react";
import { motion } from "framer-motion";
import { CountUp, EASE } from "@/components/motion/primitives";

const CATEGORIES = [
  { key: "hotels", label: "Accommodation", icon: Hotel, color: "#FF6A2B" },
  { key: "food", label: "Food & Dining", icon: Utensils, color: "#FFB627" },
  { key: "transport", label: "Transport", icon: Bus, color: "#127F8C" },
  { key: "attractions", label: "Attractions", icon: Ticket, color: "#F0476A" },
  { key: "misc", label: "Miscellaneous", icon: Package, color: "#3B3F55" },
];

export default function BudgetBreakdown({ budget, userBudget }) {
  if (!budget) return null;

  const chartData = CATEGORIES.map((c) => ({
    name: c.label,
    value: budget[c.key] || 0,
    color: c.color,
  })).filter((d) => d.value > 0);

  const total = budget.total || 0;
  const remaining = userBudget - total;
  const pct = Math.round((total / userBudget) * 100);

  return (
    <div className="surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-ink">Budget breakdown</h3>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${remaining >= 0 ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-600"}`}
        >
          {pct}% used
        </span>
      </div>

      <div className="relative mx-auto h-48 w-48">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={3}
              cornerRadius={6}
              dataKey="value"
              stroke="none"
              animationDuration={1200}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => `₹${Number(v)?.toLocaleString("en-IN")}`}
              contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-2xl font-bold text-ink">
            <CountUp to={total} prefix="₹" duration={1.4} />
          </p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Estimated</p>
        </div>
      </div>

      <p className={`mt-3 text-center text-xs font-semibold ${remaining >= 0 ? "text-emerald-600" : "text-red-600"}`}>
        {remaining >= 0
          ? `₹${remaining.toLocaleString("en-IN")} under your budget`
          : `₹${Math.abs(remaining).toLocaleString("en-IN")} over your budget`}
      </p>

      <div className="mt-6 space-y-4">
        {CATEGORIES.map((cat, i) => {
          const val = budget[cat.key] || 0;
          if (val === 0) return null;
          const share = total > 0 ? (val / total) * 100 : 0;
          return (
            <div key={cat.key}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${cat.color}1A` }}>
                    <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                  </div>
                  <span className="text-sm font-medium text-ink/80">{cat.label}</span>
                </div>
                <span className="text-sm font-semibold text-ink">₹{val.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: cat.color }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${share}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.1 * i, ease: EASE }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
