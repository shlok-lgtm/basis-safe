import { useWalletRiskData } from "../hooks/useWalletRisk";
import { scoreColor, scoreToGrade } from "../config";

export default function Holdings() {
  const { wallet } = useWalletRiskData();

  if (wallet.loading) {
    return <div className="text-safe-text">Loading holdings...</div>;
  }

  if (wallet.error) {
    return <div className="text-red-400">Error: {wallet.error}</div>;
  }

  const data = wallet.data;
  if (!data) return null;

  return (
    <div className="bg-safe-card border border-safe-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-safe-border">
        <h2 className="text-lg font-semibold">Holdings Breakdown</h2>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-safe-text text-sm border-b border-safe-border">
            <th className="text-left p-3">Asset</th>
            <th className="text-right p-3">Balance</th>
            <th className="text-right p-3">% of Treasury</th>
            <th className="text-right p-3">SII Score</th>
            <th className="text-center p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.holdings.map((h) => {
            const color = h.sii_score != null ? scoreColor(h.sii_score) : "#A1A3A7";
            const grade = h.sii_score != null ? (h.grade ?? scoreToGrade(h.sii_score)) : "--";
            return (
              <tr
                key={h.symbol}
                className="border-b border-safe-border hover:bg-safe-dark/50 transition-colors"
              >
                <td className="p-3">
                  <span className="font-semibold">{h.symbol}</span>
                </td>
                <td className="text-right p-3 font-mono">
                  ${h.value_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="text-right p-3">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 bg-safe-border rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-safe-green"
                        style={{ width: `${Math.min(h.pct_of_wallet, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono w-12 text-right">
                      {h.pct_of_wallet.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="text-right p-3">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-mono" style={{ color }}>
                      {h.sii_score != null ? Math.round(h.sii_score) : "--"}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: color + "20", color }}
                    >
                      {grade}
                    </span>
                  </div>
                </td>
                <td className="text-center p-3">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      h.is_scored
                        ? "bg-safe-green/20 text-safe-green"
                        : "bg-safe-text/20 text-safe-text"
                    }`}
                  >
                    {h.is_scored ? "Scored" : "Unscored"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
