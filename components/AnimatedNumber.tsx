"use client";

import { useEffect, useState, useRef } from "react";

interface Props {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  style?: React.CSSProperties;
  className?: string;
}

export default function AnimatedNumber({
  value,
  duration = 800,
  format,
  style,
  className,
}: Props) {
  const [display, setDisplay] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    startValueRef.current = display;
    startTimeRef.current = null;

    let rafId: number;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      const next = startValueRef.current + (value - startValueRef.current) * eased;
      setDisplay(next);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const rendered = format
    ? format(Math.round(display))
    : Math.round(display).toLocaleString();

  return (
    <span style={{ fontVariantNumeric: "tabular-nums", ...style }} className={className}>
      {rendered}
    </span>
  );
}
