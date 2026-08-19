import { useCallback, useEffect, useState } from 'react';

/** Freno locale: il backend non ha rate limiting su login / cambio password / reset. */
export function useCooldown(durationSeconds: number) {
  const [until, setUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (until == null) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setUntil(null);
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [until]);

  const start = useCallback(() => {
    setUntil(Date.now() + durationSeconds * 1000);
  }, [durationSeconds]);

  return {
    isCoolingDown: secondsLeft > 0,
    secondsLeft,
    start,
  };
}
