import { useState } from "react";
import { useGuardContract } from "../hooks/useGuardContract";

export default function GuardConfig() {
  const guard = useGuardContract();

  const [minWalletScore, setMinWalletScore] = useState(75);
  const [minAssetScore, setMinAssetScore] = useState(70);
  const [enforceMode, setEnforceMode] = useState(false);
  const [useOracle, setUseOracle] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  if (guard.loading) {
    return <div className="text-safe-text">Checking guard status...</div>;
  }

  const handleSave = async () => {
    try {
      await guard.configureGuard(minWalletScore, minAssetScore, enforceMode, useOracle);
    } catch (err) {
      console.error("Configure failed:", err);
    }
  };

  const handleInstall = async () => {
    try {
      await guard.installGuard(minWalletScore, minAssetScore, enforceMode, useOracle);
      setShowInstallModal(false);
    } catch (err) {
      console.error("Install failed:", err);
    }
  };

  const handleRemove = async () => {
    try {
      await guard.removeGuard();
      setShowRemoveModal(false);
    } catch (err) {
      console.error("Remove failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="bg-safe-card border border-safe-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Guard Status</h2>
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${
              guard.isBasisGuard ? "bg-safe-green" : "bg-safe-text"
            }`}
          />
          <span>
            {guard.isBasisGuard
              ? "Basis Guard Active"
              : guard.isInstalled
                ? "Different Guard Active"
                : "No Guard Installed"}
          </span>
        </div>
        {guard.isInstalled && !guard.isBasisGuard && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-700 rounded text-sm text-yellow-400">
            A different guard is currently active on this Safe. Replacing it may affect existing protections.
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="bg-safe-card border border-safe-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Configuration</h2>
        <div className="space-y-6">
          {/* Min Wallet Score */}
          <div>
            <label className="flex justify-between text-sm text-safe-text mb-2">
              <span>Min Wallet Risk Score</span>
              <span className="font-mono text-safe-white">{minWalletScore}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={minWalletScore}
              onChange={(e) => setMinWalletScore(Number(e.target.value))}
              className="w-full accent-safe-green"
            />
          </div>

          {/* Min Asset Score */}
          <div>
            <label className="flex justify-between text-sm text-safe-text mb-2">
              <span>Min Asset SII Score</span>
              <span className="font-mono text-safe-white">{minAssetScore}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={minAssetScore}
              onChange={(e) => setMinAssetScore(Number(e.target.value))}
              className="w-full accent-safe-green"
            />
          </div>

          {/* Enforce / Warn Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Mode</div>
              <div className="text-xs text-safe-text">
                {enforceMode ? "Blocks transactions below threshold" : "Warns but allows transactions"}
              </div>
            </div>
            <button
              onClick={() => setEnforceMode(!enforceMode)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                enforceMode
                  ? "bg-red-600 text-white"
                  : "bg-safe-green/20 text-safe-green"
              }`}
            >
              {enforceMode ? "Enforce" : "Warn"}
            </button>
          </div>

          {/* Oracle Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Data Source</div>
              <div className="text-xs text-safe-text">
                {useOracle ? "On-chain oracle" : "API relay"}
              </div>
            </div>
            <button
              onClick={() => setUseOracle(!useOracle)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                useOracle
                  ? "bg-safe-green/20 text-safe-green"
                  : "bg-safe-border text-safe-text"
              }`}
            >
              {useOracle ? "Oracle" : "API"}
            </button>
          </div>
        </div>

        {/* Save */}
        {guard.isBasisGuard && (
          <button
            onClick={handleSave}
            className="mt-6 w-full bg-safe-green text-safe-dark font-semibold py-3 rounded hover:bg-safe-green/90 transition-colors"
          >
            Save Configuration
          </button>
        )}
      </div>

      {/* Install / Remove */}
      <div className="bg-safe-card border border-safe-border rounded-lg p-6">
        {!guard.isInstalled && (
          <button
            onClick={() => setShowInstallModal(true)}
            className="w-full bg-safe-green text-safe-dark font-semibold py-3 rounded hover:bg-safe-green/90 transition-colors"
          >
            Install Basis Guard
          </button>
        )}
        {guard.isBasisGuard && (
          <button
            onClick={() => setShowRemoveModal(true)}
            className="w-full bg-red-600/20 text-red-400 border border-red-600 font-semibold py-3 rounded hover:bg-red-600/30 transition-colors"
          >
            Remove Guard
          </button>
        )}
      </div>

      {/* Install Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-safe-card border border-safe-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">Install Basis Guard</h3>
            <p className="text-safe-text text-sm mb-4">
              This will set the Basis Guard as the transaction guard for this Safe.
              The guard checks stablecoin risk scores before every transaction. It
              is fail-open by default and can be removed at any time via{" "}
              <code className="text-safe-green">setGuard(address(0))</code>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleInstall}
                className="flex-1 bg-safe-green text-safe-dark font-semibold py-2 rounded"
              >
                Confirm Install
              </button>
              <button
                onClick={() => setShowInstallModal(false)}
                className="flex-1 bg-safe-border text-safe-text font-semibold py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-safe-card border border-safe-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">Remove Guard</h3>
            <p className="text-safe-text text-sm mb-4">
              This will remove the Basis Guard from this Safe. Transactions will
              no longer be checked against risk scores.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRemove}
                className="flex-1 bg-red-600 text-white font-semibold py-2 rounded"
              >
                Confirm Remove
              </button>
              <button
                onClick={() => setShowRemoveModal(false)}
                className="flex-1 bg-safe-border text-safe-text font-semibold py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
