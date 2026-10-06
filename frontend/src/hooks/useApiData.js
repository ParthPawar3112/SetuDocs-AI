// Small fetch-state hook for the SetuDocs screens: { data, isLoading, error,
// reload, setData }. `error` holds a readable message so every screen can show
// the same error state with a Retry button.
import { useCallback, useEffect, useRef, useState } from "react";

export function describeError(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (!error?.response) return "Could not reach the server. Check your connection and try again.";
  return fallback;
}

export function useApiData(fetcher, fallbackMessage = "Could not load this data.") {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mounted = useRef(true);

  // reload({ silent: true }) refreshes without swapping the page for skeletons,
  // which is what you want after an action like "mark done".
  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    setError("");
    try {
      const response = await fetcherRef.current();
      if (mounted.current) setData(response.data);
    } catch (requestError) {
      if (mounted.current) setError(describeError(requestError, fallbackMessage));
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [fallbackMessage]);

  useEffect(() => {
    mounted.current = true;
    reload();
    return () => {
      mounted.current = false;
    };
  }, [reload]);

  return { data, isLoading, error, reload, setData };
}
