"use client";

import { useEffect, useState } from "react";
import { projectorMetrics } from "@/lib/sky/layout";

interface ProjectorProps {
  onFire: () => void;
  /** Пока идёт прокат, подпись гаснет и повторный клик игнорируется. */
  playing: boolean;
}

/**
 * Управление прожектором: подпись над ним и невидимая зона нажатия по
 * силуэту. Никаких «(жми)» — пульсации подписи и смены курсора достаточно.
 */
export default function Projector({ onFire, playing }: ProjectorProps) {
  const [vp, setVp] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  if (vp.w === 0) return null;

  const m = projectorMetrics(vp.w, vp.h);
  const hit = Math.max(52, m.size * 1.5);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          if (e.detail > 0) e.currentTarget.blur();
          if (!playing) onFire();
        }}
        aria-label="Зажечь воспоминание"
        className="star-hit fixed z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
        style={{ left: m.x, top: m.base - m.size * 0.45, width: hit, height: hit }}
      />

      {/* Подпись над прожектором. Гаснет на время проката.
          Прожектор стоит в левой трети — подпись не центрируем по нему, иначе
          она уезжает за край, а разворачиваем от линзы вправо. */}
      <div
        className="pointer-events-none fixed z-30 transition-opacity duration-700"
        style={{
          left: Math.max(16, m.x - m.size * 0.4),
          top: m.headY - m.size * 0.95,
          opacity: playing ? 0 : 1,
        }}
      >
        <span className="projector-label font-mono text-[10px] font-extralight tracking-[0.28em] whitespace-nowrap text-amber/45">
          зажги воспоминание
        </span>
      </div>
    </>
  );
}
