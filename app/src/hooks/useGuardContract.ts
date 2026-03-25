import { useState, useEffect, useCallback } from "react";
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk";
import { ethers } from "ethers";
import { GUARD_CONTRACT_ADDRESS, GUARD_STORAGE_SLOT } from "../config";
import guardAbi from "../abi/BasisSafeGuard.json";

export interface GuardState {
  isInstalled: boolean;
  isBasisGuard: boolean;
  currentGuardAddress: string;
  config: {
    minWalletRiskScore: number;
    minAssetSiiScore: number;
    enforceMode: boolean;
    useOracle: boolean;
    initialized: boolean;
  } | null;
  loading: boolean;
}

export function useGuardContract() {
  const { sdk, safe } = useSafeAppsSDK();
  const [state, setState] = useState<GuardState>({
    isInstalled: false,
    isBasisGuard: false,
    currentGuardAddress: ethers.ZeroAddress,
    config: null,
    loading: true,
  });

  const checkGuard = useCallback(async () => {
    try {
      const result = await sdk.eth.getStorageAt([
        safe.safeAddress,
        GUARD_STORAGE_SLOT as unknown as number,
      ]);
      const guardAddr = ethers.getAddress(
        "0x" + result.slice(-40)
      );
      const isInstalled = guardAddr !== ethers.ZeroAddress;
      const isBasisGuard =
        isInstalled &&
        guardAddr.toLowerCase() === GUARD_CONTRACT_ADDRESS.toLowerCase();

      setState((prev) => ({
        ...prev,
        isInstalled,
        isBasisGuard,
        currentGuardAddress: guardAddr,
        loading: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [sdk, safe.safeAddress]);

  useEffect(() => {
    checkGuard();
  }, [checkGuard]);

  const installGuard = useCallback(
    async (
      minWalletScore = 75,
      minAssetScore = 70,
      enforceMode = false,
      useOracle = false
    ) => {
      const iface = new ethers.Interface(guardAbi);

      const setGuardData = new ethers.Interface([
        "function setGuard(address guard)",
      ]).encodeFunctionData("setGuard", [GUARD_CONTRACT_ADDRESS]);

      const configureData = iface.encodeFunctionData("configure", [
        minWalletScore,
        minAssetScore,
        enforceMode,
        useOracle,
      ]);

      await sdk.txs.send({
        txs: [
          { to: safe.safeAddress, value: "0", data: setGuardData },
          { to: GUARD_CONTRACT_ADDRESS, value: "0", data: configureData },
        ],
      });
    },
    [sdk, safe.safeAddress]
  );

  const configureGuard = useCallback(
    async (
      minWalletScore: number,
      minAssetScore: number,
      enforceMode: boolean,
      useOracle: boolean
    ) => {
      const iface = new ethers.Interface(guardAbi);
      const data = iface.encodeFunctionData("configure", [
        minWalletScore,
        minAssetScore,
        enforceMode,
        useOracle,
      ]);

      await sdk.txs.send({
        txs: [{ to: GUARD_CONTRACT_ADDRESS, value: "0", data }],
      });
    },
    [sdk]
  );

  const removeGuard = useCallback(async () => {
    const data = new ethers.Interface([
      "function setGuard(address guard)",
    ]).encodeFunctionData("setGuard", [ethers.ZeroAddress]);

    await sdk.txs.send({
      txs: [{ to: safe.safeAddress, value: "0", data }],
    });
  }, [sdk, safe.safeAddress]);

  return { ...state, installGuard, configureGuard, removeGuard, refresh: checkGuard };
}
