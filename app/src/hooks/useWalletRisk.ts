import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk";
import { useWalletRisk as useWalletRiskApi, useWalletHistory } from "./useBasisApi";

export function useWalletRiskData() {
  const { safe } = useSafeAppsSDK();
  const wallet = useWalletRiskApi(safe.safeAddress);
  const history = useWalletHistory(safe.safeAddress);

  return {
    wallet,
    history,
    safeAddress: safe.safeAddress,
  };
}
