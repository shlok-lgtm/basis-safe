import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useWalletRiskData } from "../hooks/useWalletRisk";

type Range = "7d" | "30d" | "90d" | "all";

export default function HistoryChart() {
  const { history } = useWalletRiskData();
  const [range, setRange] = useState<Range>("30d");

  if (history.loading) {
    return <div className="text-safe-text">Loading history...</div>;
  }

  if (history.error) {
    return <div className="text-red-400">Error: {history.error}</div>;
  }

  const allData = history.data?.history ?? [];

  const now = Date.now();
  const rangeDays: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90, all: Infinity };
  const cutoff = rangeDays[range] === Infinity ? 0 : now - rangeDays[range] * 86400000;

  const chartData = allData.filter(
    (d) => new Date(d.date).getTime() >= cutoff
  );

  return (
    <div className="bg-safe-card border border-safe-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Risk Score History</h2>
        <div className="flex gap-1">
          {(["7d", "30d", "90d", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs rounded ${
                range === r
                  ? "bg-safe-green text-safe-dark font-semibold"
                  : "bg-safe-border text-safe-text"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-safe-text text-center py-12">
          No history data available for this range.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
            <XAxis
              dataKey="date"
              stroke="#A1A3A7"
              tick={{ fontSize: 11 }}
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis domain={[0, 100]} stroke="#A1A3A7" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1C1C1C",
                border: "1px solid #303030",
                borderRadius: 8,
                color: "#fff",
              }}
              formatter={(value: number) => [value.toFixed(1), "Risk Score"]}
              labelFormatter={(label: string) =>
                new Date(label).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              }
            />
            <ReferenceLine y={80} stroke="#12FF80" strokeDasharray="5 5" label="" />
            <ReferenceLine y={60} stroke="#FFB800" strokeDasharray="5 5" label="" />
            <Line
              type="monotone"
              dataKey="risk_score"
              stroke="#12FF80"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#12FF80" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex gap-4 mt-3 text-xs text-safe-text justify-center">
        <span className="flex items-center gap-1">
          <span className="w-4 h-0 border-t border-dashed border-safe-green inline-block" />
          Good (80+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0 border-t border-dashed border-yellow-500 inline-block" />
          Warning (60)
        </span>
      </div>
    </div>
  );
}
