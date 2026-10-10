import { useCallback, useRef, useState } from 'react';

// Shows a loading indicator only if loading lasts longer than `delayMs`, and keeps it visible for
// at least `minShowMs` once shown, to prevent a flicker for fast responses.
export function useDelayedLoading(loading, { delayMs = 150, minShowMs = 300 } = {}) {
  const [visible, setVisible] = useState(false);
  const delayTimer = useRef(null);
  const minTimer = useRef(null);
  const shownAt = useRef(null);

  const prev = useRef(loading);
  if (prev.current === loading) {
    return visible;
  }
  prev.current = loading;

  if (loading) {
    clearTimeout(delayTimer.current);
    delayTimer.current = setTimeout(() => {
      setVisible(true);
      shownAt.current = Date.now();
    }, delayMs);
  } else {
    clearTimeout(delayTimer.current);
    if (!visible) return false;
    const elapsed = Date.now() - (shownAt.current ?? 0);
    const remaining = minShowMs - elapsed;
    if (remaining <= 0) {
      setVisible(false);
    } else {
      minTimer.current = setTimeout(() => setVisible(false), remaining);
    }
  }
  return visible;
}

// Simplified version: returns a stable boolean that is true only after `delayMs`.
export function useDelayedBoolean(value, delayMs = 150) {
  const [delayed, setDelayed] = useState(false);
  const timer = useRef(null);
  const prev = useRef(value);

  if (prev.current !== value) {
    prev.current = value;
    clearTimeout(timer.current);
    if (value) {
      timer.current = setTimeout(() => setDelayed(true), delayMs);
    } else {
      setDelayed(false);
    }
  }

  return delayed;
}
