import { useState } from "react";
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk";
import Dashboard from "./components/Dashboard";
import Holdings from "./components/Holdings";
import Concentration from "./components/Concentration";
import GuardConfig from "./components/GuardConfig";
import HistoryChart from "./components/HistoryChart";
import EventLog from "./components/EventLog";

type Tab =
  | "dashboard"
  | "holdings"
  | "concentration"
  | "guard"
  | "history"
  | "events";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "holdings", label: "Holdings" },
  { id: "concentration", label: "Concentration" },
  { id: "guard", label: "Guard Config" },
  { id: "history", label: "History" },
  { id: "events", label: "Event Log" },
];

export default function App() {
  const { safe } = useSafeAppsSDK();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  return (
    <div className="min-h-screen bg-safe-dark p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-safe-white">
          Basis Treasury Guard
        </h1>
        <p className="text-sm text-safe-text mt-1">
          Risk intelligence for{" "}
          <span className="font-mono text-safe-green">
            {safe.safeAddress.slice(0, 6)}...{safe.safeAddress.slice(-4)}
          </span>
        </p>
      </header>

      <nav className="flex gap-1 mb-6 border-b border-safe-border pb-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-safe-card text-safe-green border-b-2 border-safe-green"
                : "text-safe-text hover:text-safe-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "holdings" && <Holdings />}
        {activeTab === "concentration" && <Concentration />}
        {activeTab === "guard" && <GuardConfig />}
        {activeTab === "history" && <HistoryChart />}
        {activeTab === "events" && <EventLog />}
      </main>
    </div>
  );
}
