import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

interface CounterProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}

/** Smoothly counts from its previous value to the next one. */
export default function Counter({ value, decimals = 0, duration = 1.1, className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);

  useEffect(() => {
    const from = prev.current;
    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = v.toFixed(decimals);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, decimals, duration]);

  return (
    <span ref={ref} className={className}>
      {value.toFixed(decimals)}
    </span>
  );
}
