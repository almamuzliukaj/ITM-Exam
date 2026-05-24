import { useCallback, useEffect, useState } from "react";
import { getStoredUser, me } from "../lib/auth";

export function useCurrentUser() {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(() => !getStoredUser());
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setLoading(!getStoredUser());
      setError("");
      const result = await me();
      setUser(result);
    } catch (err) {
      setError(err?.message || "Failed to load user profile.");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading, error, refresh };
}
