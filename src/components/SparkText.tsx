"use client";

import { useEffect, useState } from "react";
import { Words } from "./Emerge";

interface SparkTextProps {
  /** Позиция звезды в долях вьюпорта. */
  x: number;
  y: number;
  text: string;
  /** Зачин над строкой. У писем он вводит фразу, у реплик его нет. */
  lead?: string;
  /** Кто сказал. */
  author?: string;
  /** Когда сказал. У писем даты нет. */
  date?: string;
  voice?: "her" | "him";
  reducedMotion: boolean;
}

/**
 * Текст вспышки — прямо в световом пятне зажжённой звезды.
 *
 * Ни рамки, ни карточки: только слова, проступающие по одному, и под ними
 * подпись — кто и когда. Её реплики идут тёплым светом, мои — холоднее,
 * чтобы два голоса различались ещё до того, как прочитано имя.
 */
export default function SparkText({
  x,
  y,
  text,
  lead,
  author,
  date,
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
  // Текст никогда не накрывает саму звезду: в верхней половине неба ложится
  // под ней, в нижней — над ней.
  const below = y < 0.5;

  return (
    <div
      key={text}
      className="pointer-events-none fixed z-30"
      style={below ? { left, top: py + gap, width } : { left, bottom: vp.h - py + gap, width }}
    >
      {lead && (
        <p className="font-system caption emerge mb-[0.7em] text-center text-[11px] tracking-[0.04em] text-star/50">
          {lead}
        </p>
      )}

      <p
        className={`font-letter caption text-center text-[clamp(17px,4.3vw,23px)] leading-[1.45] font-light [text-wrap:balance] ${
          voice === "her" ? "text-amber-hot/92" : "text-star/92"
        }`}
      >
        {reducedMotion ? text : <Words text={text} delay={220} step={58} />}
      </p>

      {(author || date) && (
        <p
          className="font-system emerge caption mt-[0.75em] flex items-center justify-center gap-[0.55em] text-[10.5px] tracking-[0.04em] text-star/45"
          style={{ animationDelay: "900ms" }}
        >
          {author && (
            <span className={voice === "her" ? "text-amber/85" : "text-star/70"}>{author}</span>
          )}
          {author && date && <span className="text-star/25">·</span>}
          {date && <span>{date}</span>}
        </p>
      )}
    </div>
  );
}
