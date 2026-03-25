import { useState, useEffect } from "react";
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk";
import { ethers } from "ethers";
import { GUARD_CONTRACT_ADDRESS } from "../config";
import guardAbi from "../abi/BasisSafeGuard.json";

interface GuardEvent {
  type: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  score?: number;
  threshold?: number;
  reason?: string;
}

export default function EventLog() {
  const { safe } = useSafeAppsSDK();
  const [events, setEvents] = useState<GuardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      if (GUARD_CONTRACT_ADDRESS === ethers.ZeroAddress) {
        setLoading(false);
        return;
      }

      try {
        const provider = new ethers.JsonRpcProvider(
          `https://eth-mainnet.g.alchemy.com/v2/demo`
        );
        const iface = new ethers.Interface(guardAbi);

        const filter = {
          address: GUARD_CONTRACT_ADDRESS,
          fromBlock: -10000,
          toBlock: "latest",
          topics: [null, ethers.zeroPadValue(safe.safeAddress, 32)],
        };

        const logs = await provider.getLogs(filter);
        const parsed: GuardEvent[] = [];

        for (const log of logs) {
          try {
            const decoded = iface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            if (!decoded) continue;

            parsed.push({
              type: decoded.name,
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              timestamp: Date.now(),
              score: decoded.args.currentScore
                ? Number(decoded.args.currentScore)
                : undefined,
              threshold: decoded.args.minRequired
                ? Number(decoded.args.minRequired)
                : undefined,
              reason: decoded.args.reason,
            });
          } catch {
            // skip unparseable logs
          }
        }

        setEvents(parsed.reverse());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch events");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [safe.safeAddress]);

  const typeColor: Record<string, string> = {
    TransactionBlocked: "text-red-400 bg-red-900/20",
    TransactionWarned: "text-yellow-400 bg-yellow-900/20",
    ApiFallbackUsed: "text-blue-400 bg-blue-900/20",
    ConfigUpdated: "text-safe-green bg-safe-green/10",
    StaleDataWarning: "text-orange-400 bg-orange-900/20",
  };

  if (loading) {
    return <div className="text-safe-text">Loading events...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>;
  }

  return (
    <div className="bg-safe-card border border-safe-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-safe-border">
        <h2 className="text-lg font-semibold">Guard Event Log</h2>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center text-safe-text">
          No guard events found.{" "}
          {GUARD_CONTRACT_ADDRESS === ethers.ZeroAddress &&
            "Guard contract address not configured."}
        </div>
      ) : (
        <div className="divide-y divide-safe-border">
          {events.map((evt, idx) => (
            <div key={idx} className="p-4 hover:bg-safe-dark/50 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    typeColor[evt.type] ?? "text-safe-text bg-safe-border"
                  }`}
                >
                  {evt.type}
                </span>
                <span className="text-xs text-safe-text font-mono">
                  Block #{evt.blockNumber}
                </span>
              </div>
              <div className="text-xs text-safe-text mt-1">
                <a
                  href={`https://etherscan.io/tx/${evt.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-safe-green hover:underline font-mono"
                >
                  {evt.txHash.slice(0, 10)}...{evt.txHash.slice(-8)}
                </a>
              </div>
              {evt.score !== undefined && (
                <div className="text-xs text-safe-text mt-1">
                  Score: {evt.score} | Threshold: {evt.threshold}
                  {evt.reason && ` | ${evt.reason}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
