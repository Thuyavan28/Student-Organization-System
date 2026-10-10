import { useEffect, useRef, useState } from 'react';

// Thin 4px gradient bar at the top of the viewport, driven by a loading boolean.
// Appears after 120ms to avoid flicker on fast responses. Stays for 320ms after loading ends.
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
        raf.current = requestAnimationFrame(() => {
          setWidth(25);
          setTimeout(() => setWidth(55), 200);
          setTimeout(() => setWidth(75), 600);
          setTimeout(() => setWidth(88), 1200);
        });
      }, 120);
    } else {
      clearTimeout(enterTimer.current);
      cancelAnimationFrame(raf.current);
      if (visible) {
        setWidth(100);
        exitTimer.current = setTimeout(() => {
          setVisible(false);
          setWidth(0);
        }, 320);
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
      className={`fixed top-0 left-0 z-[9999] h-[4px] transition-all duration-300 ease-out ${loading ? 'progress-bar-shimmer' : 'bg-cf-fg'}`}
      style={{ width: `${width}%` }}
    />
  );
}

