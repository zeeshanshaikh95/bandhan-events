import { useEffect, useState } from "react";

/**
 * Delays a rapidly changing value (a search box) so the server is queried only
 * once typing pauses — keeps global search off the network on every keystroke.
 */
export default function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
