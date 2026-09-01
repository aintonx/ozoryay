"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface SpaceArrivalProps {
  children: ReactNode;
  className?: string;
}

/** Сколько идёт прилёт: из далёкой точки — на своё место. */
const ARRIVE_MS = 720;

/**
 * Карточка входа в «Зону» просто прилетает — растёт из далёкой точки на
 * своё место, а не разворачивается из спецэффекта. Раньше на этом месте
 * стояла чёрная дыра с диском аккреции и частицами (`BlackHoleReveal` в
 * истории гита) — выглядело дёшево и лишним. Здесь ровно один жест: издалека
 * — и на месте.
 *
 * `prefers-reduced-motion` укорачивает движение до одного мягкого проявления
 * без увеличения.
 */
export default function SpaceArrival({ children, className = "" }: SpaceArrivalProps) {
  const reducedMotion = useReducedMotion();
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setArrived(true), 20);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className={className}
      style={{
        transform: reducedMotion ? "scale(1)" : arrived ? "scale(1)" : "scale(0.32)",
        opacity: arrived ? 1 : 0,
        filter: reducedMotion ? "blur(0)" : arrived ? "blur(0)" : "blur(3px)",
        transition: reducedMotion
          ? `opacity ${ARRIVE_MS}ms var(--ease-emerge)`
          : `transform ${ARRIVE_MS}ms var(--ease-emerge), opacity ${ARRIVE_MS}ms var(--ease-emerge), filter ${ARRIVE_MS}ms var(--ease-emerge)`,
      }}
    >
      {children}
    </div>
  );
}
