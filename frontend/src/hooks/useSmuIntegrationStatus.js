import { useCallback, useEffect, useState } from "react";
import { getSmuContract } from "../lib/smuApi";

export function useSmuIntegrationStatus() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setContract(await getSmuContract());
    } catch (requestError) {
      setContract(null);
      setError(requestError?.response?.data?.message || "SMU integration status is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    contract,
    loading,
    error,
    isConfigured: Boolean(contract?.isConfigured),
    sourceLabel: contract?.isConfigured ? "SMU managed" : "Manual fallback",
    refresh,
  };
}
