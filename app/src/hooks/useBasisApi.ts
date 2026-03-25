import { useState, useEffect, useCallback } from "react";
import { BASIS_API_URL } from "../config";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApiFetch<T>(endpoint: string, enabled = true): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASIS_API_URL}${endpoint}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export interface StablecoinScore {
  coin: string;
  symbol: string;
  score: number;
  grade: string;
  peg_score: number;
  liquidity_score: number;
  mint_burn_score: number;
  distribution_score: number;
  structural_score: number;
}

export interface WalletRisk {
  address: string;
  risk_score: number | null;
  grade: string | null;
  total_value_usd: number;
  scored_value_usd: number;
  unscored_value_usd: number;
  coverage_pct: number;
  coverage_quality: string;
  hhi: number;
  concentration_grade: string;
  holdings: WalletHolding[];
}

export interface WalletHolding {
  symbol: string;
  address: string;
  balance: number;
  value_usd: number;
  pct_of_wallet: number;
  is_scored: boolean;
  sii_score: number | null;
  grade: string | null;
}

export interface HistoryEntry {
  date: string;
  risk_score: number;
  grade: string;
}

export interface ApiHealth {
  status: string;
  last_scoring_cycle: string;
  version: string;
}

export function useScores() {
  return useApiFetch<{ scores: StablecoinScore[] }>("/api/scores");
}

export function useWalletRisk(address: string) {
  return useApiFetch<WalletRisk>(
    `/api/wallets/${address}`,
    !!address && address !== "0x"
  );
}

export function useWalletHistory(address: string) {
  return useApiFetch<{ history: HistoryEntry[] }>(
    `/api/wallets/${address}/history`,
    !!address && address !== "0x"
  );
}

export function useHealth() {
  return useApiFetch<ApiHealth>("/api/health");
}
