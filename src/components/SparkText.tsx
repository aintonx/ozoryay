"use client";

import { useEffect, useState } from "react";
import { Words } from "./Emerge";

interface SparkTextProps {
  /** Позиция звезды в долях вьюпорта. */
  x: number;
  y: number;
  text: string;
  note?: string;
  voice?: "her" | "him";
  reducedMotion: boolean;
}

/**
 * Текст вспышки — прямо в световом пятне зажжённой звезды.
 *
 * Ни рамки, ни карточки: только слова, проступающие по одному. Её реплики
 * идут тёплым светом, мои — холоднее, чтобы два голоса различались, не
 * подписывая их именами.
 */
export default function SparkText({
  x,
  y,
  text,
  note,
  voice,
  reducedMotion,
}: SparkTextProps) {
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

  const margin = 22;
  const gap = 34;
  const width = Math.min(360, vp.w - margin * 2);
  const px = x * vp.w;
  const py = y * vp.h;
  const left = Math.max(margin, Math.min(px - width / 2, vp.w - margin - width));
  // Текст никогда не накрывает саму звезду: сверху неба ложится под ней,
  // ниже середины — над ней.
  const below = y < 0.5;

  return (
    <div
      key={text}
      className="pointer-events-none fixed z-40"
      style={
        below
          ? { left, top: py + gap, width }
          : { left, bottom: vp.h - py + gap, width }
      }
    >
      <p
        className={`font-letter text-center text-[clamp(17px,4.3vw,23px)] leading-[1.45] font-light [text-wrap:balance] ${
          voice === "her" ? "text-amber-hot/92" : "text-star/88"
        }`}
      >
        {reducedMotion ? text : <Words text={text} delay={220} step={58} />}
      </p>
      {note && (
        <p
          className="font-system emerge mt-[0.7em] text-center text-[10.5px] tracking-[0.03em] text-star/38"
          style={{ animationDelay: "900ms" }}
        >
          {note}
        </p>
      )}
    </div>
  );
}
