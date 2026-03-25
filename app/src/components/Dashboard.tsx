import { useWalletRiskData } from "../hooks/useWalletRisk";
import { useGuardContract } from "../hooks/useGuardContract";
import { useHealth } from "../hooks/useBasisApi";
import { scoreColor, scoreToGrade } from "../config";

export default function Dashboard() {
  const { wallet } = useWalletRiskData();
  const guard = useGuardContract();
  const health = useHealth();

  if (wallet.loading) {
    return <div className="text-safe-text">Loading treasury data...</div>;
  }

  if (wallet.error) {
    return <div className="text-red-400">Error: {wallet.error}</div>;
  }

  const data = wallet.data;
  if (!data) return null;

  const score = data.risk_score;
  const grade = data.grade ?? scoreToGrade(score ?? 0);
  const color = score != null ? scoreColor(score) : "#A1A3A7";

  const guardStatus = guard.loading
    ? "Checking..."
    : guard.isBasisGuard
      ? "Active"
      : guard.isInstalled
        ? "Other Guard Active"
        : "Not Installed";

  return (
    <div className="space-y-6">
      {/* Score + Grade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-safe-card border border-safe-border rounded-lg p-6 flex flex-col items-center">
          <div
            className="text-6xl font-bold"
            style={{ color }}
          >
            {score != null ? Math.round(score) : "--"}
          </div>
          <div
            className="text-2xl font-semibold mt-2 px-3 py-1 rounded"
            style={{ backgroundColor: color + "20", color }}
          >
            {grade ?? "--"}
          </div>
          <div className="text-safe-text text-sm mt-2">Wallet Risk Score</div>
        </div>

        {/* Coverage */}
        <div className="bg-safe-card border border-safe-border rounded-lg p-6">
          <h3 className="text-safe-text text-sm mb-3">Coverage Quality</h3>
          <div className="text-3xl font-bold text-safe-white">
            {data.coverage_quality}
          </div>
          <div className="text-safe-text text-sm mt-2">
            {data.coverage_pct.toFixed(1)}% scored
          </div>
          <div className="mt-3 w-full bg-safe-border rounded-full h-2">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${data.coverage_pct}%`,
                backgroundColor: data.coverage_pct >= 80 ? "#12FF80" : "#FFB800",
              }}
            />
          </div>
        </div>

        {/* Concentration */}
        <div className="bg-safe-card border border-safe-border rounded-lg p-6">
          <h3 className="text-safe-text text-sm mb-3">Concentration</h3>
          <div className="text-3xl font-bold text-safe-white">
            {data.concentration_grade}
          </div>
          <div className="text-safe-text text-sm mt-2">
            HHI: {Math.round(data.hhi)}
          </div>
          <div className="text-safe-text text-sm">
            Total: ${(data.total_value_usd / 1e6).toFixed(2)}M
          </div>
        </div>
      </div>

      {/* Guard Status */}
      <div className="bg-safe-card border border-safe-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-safe-text text-sm mb-1">Guard Status</h3>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  guard.isBasisGuard ? "bg-safe-green" : "bg-safe-text"
                }`}
              />
              <span className="text-lg font-semibold">{guardStatus}</span>
            </div>
          </div>
          {health.data && (
            <div className="text-right text-safe-text text-xs">
              <div>API: {health.data.status}</div>
              <div>v{health.data.version}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
