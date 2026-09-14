type Handler = (payload: unknown) => void;

const listeners = new Map<string, Set<Handler>>();

export function onPluginEvent(event: string, fn: Handler): () => void {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
  };
}

export function emitPluginEvent(event: string, payload?: unknown): void {
  const set = listeners.get(event);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(payload);
    } catch (err) {
      console.warn("[plugin]", event, err);
    }
  }
}
