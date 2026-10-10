import { useEffect, useRef, useState } from 'react';

// Thin 3px black bar at the top of the viewport, driven by a loading boolean.
// Appears after 150ms to avoid flicker on fast responses. Stays for 300ms after loading ends.
export default function TopProgressBar({ loading }) {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const enterTimer = useRef(null);
  const exitTimer = useRef(null);
  const raf = useRef(null);

  useEffect(() => {
    if (loading) {
      clearTimeout(exitTimer.current);
      enterTimer.current = setTimeout(() => {
        setVisible(true);
        setWidth(0);
        // Ramp from 0 to 80% quickly, then slow down to simulate deterministic progress.
        raf.current = requestAnimationFrame(() => {
          setWidth(30);
          setTimeout(() => setWidth(60), 300);
          setTimeout(() => setWidth(80), 800);
        });
      }, 150);
    } else {
      clearTimeout(enterTimer.current);
      cancelAnimationFrame(raf.current);
      if (visible) {
        setWidth(100);
        exitTimer.current = setTimeout(() => {
          setVisible(false);
          setWidth(0);
        }, 350);
      }
    }
    return () => {
      clearTimeout(enterTimer.current);
      clearTimeout(exitTimer.current);
      cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      aria-hidden="true"
      className="fixed top-0 left-0 z-50 h-[3px] bg-cf-fg transition-all duration-300 ease-out"
      style={{ width: `${width}%` }}
    />
  );
}
