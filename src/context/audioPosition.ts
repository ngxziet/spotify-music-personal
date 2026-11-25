export function createAudioPosition() {
  let position = 0;
  let snapshot = 0;
  const listeners = new Set<() => void>();

  return {
    read: () => position,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    update(seconds: number, exact = false) {
      if (!Number.isFinite(seconds)) return;
      position = seconds;
      if (!exact && document.hidden) return;

      const next = exact ? seconds : Math.floor(seconds * 2) / 2;
      if (snapshot === next) return;
      snapshot = next;
      listeners.forEach((listener) => listener());
    },
  };
}
