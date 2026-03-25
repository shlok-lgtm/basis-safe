import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useWalletRiskData } from "../hooks/useWalletRisk";

const COLORS = [
  "#12FF80",
  "#FFB800",
  "#FF5F72",
  "#5B8DEF",
  "#B4A0FF",
  "#FF9F43",
  "#00D2D3",
  "#EE5A24",
  "#7BED9F",
  "#DFE6E9",
];

export default function Concentration() {
  const { wallet } = useWalletRiskData();

  if (wallet.loading) {
    return <div className="text-safe-text">Loading concentration data...</div>;
  }

  if (wallet.error) {
    return <div className="text-red-400">Error: {wallet.error}</div>;
  }

  const data = wallet.data;
  if (!data) return null;

  const chartData = data.holdings.map((h) => ({
    name: h.symbol,
    value: h.value_usd,
    pct: h.pct_of_wallet,
  }));

  const hhiNormalized = Math.min((data.hhi / 10000) * 100, 100);
  const hhiLabel =
    hhiNormalized < 15 ? "Diversified" : hhiNormalized < 25 ? "Moderate" : "Concentrated";
  const hhiColor =
    hhiNormalized < 15 ? "#12FF80" : hhiNormalized < 25 ? "#FFB800" : "#FF5F72";

  const dominantAsset = data.holdings.find((h) => h.pct_of_wallet > 50);

  return (
    <div className="space-y-4">
      {dominantAsset && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
          <span className="text-yellow-400 font-semibold">
            Dominant Asset Warning:
          </span>{" "}
          {dominantAsset.symbol} represents {dominantAsset.pct_of_wallet.toFixed(1)}% of
          the treasury.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut Chart */}
        <div className="bg-safe-card border border-safe-border rounded-lg p-6">
          <h3 className="text-safe-text text-sm mb-4">Allocation</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                paddingAngle={2}
              >
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1C1C1C",
                  border: "1px solid #303030",
                  borderRadius: 8,
                  color: "#fff",
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                  "Value",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {chartData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1 text-xs">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                {entry.name} ({entry.pct.toFixed(1)}%)
              </div>
            ))}
          </div>
        </div>

        {/* HHI Gauge */}
        <div className="bg-safe-card border border-safe-border rounded-lg p-6">
          <h3 className="text-safe-text text-sm mb-4">
            Herfindahl-Hirschman Index
          </h3>
          <div className="text-5xl font-bold" style={{ color: hhiColor }}>
            {Math.round(data.hhi)}
          </div>
          <div className="text-lg font-semibold mt-1" style={{ color: hhiColor }}>
            {hhiLabel}
          </div>
          <div className="mt-4 w-full bg-safe-border rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${hhiNormalized}%`,
                backgroundColor: hhiColor,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-safe-text mt-1">
            <span>0 (perfect)</span>
            <span>10,000 (single asset)</span>
          </div>

          {hhiNormalized > 25 && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded text-sm text-red-300">
              Consider rebalancing to reduce concentration risk.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
