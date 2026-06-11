import { useEffect, useState } from 'react';

export const useCountdown = (ms: number, intervalMs = 1000): number => {
  const [remaining, setRemaining] = useState(() => Math.max(0, ms));
  useEffect(() => {
    setRemaining(Math.max(0, ms));
    if (ms <= 0) return;
    const start = Date.now();
    const target = start + ms;
    const id = window.setInterval(() => {
      const left = target - Date.now();
      if (left <= 0) {
        setRemaining(0);
        window.clearInterval(id);
      } else {
        setRemaining(left);
      }
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [ms, intervalMs]);
  return remaining;
};

export const useClockTicker = (intervalMs = 1000, onTick?: () => void): number => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick(t => t + 1);
      if (onTick) onTick();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, onTick]);
  return tick;
};
