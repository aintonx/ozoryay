"use client";

import { useEffect, useState } from "react";
import { Emerge } from "./Emerge";
import { LAYOUT } from "@/lib/sky/layout";
import { plural, spaceThousands } from "@/lib/text/plural";
import type { SeparationCounter } from "@/lib/time/useSeparationDays";

interface OverlayProps {
  /** Считается один раз в Night — здесь только показываем. */
  counter: SeparationCounter;
  distanceKm: number;
  /** Раскрыто письмо или горит прожектор — весь текст уходит в тень. */
  dimmed: boolean;
}

const T_TIMER = 900;
const T_DISTANCE = 1500;

/** Ведущий ноль: время должно быть приборным, 04:07:09, а не 4:7:9. */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function Overlay({ counter, distanceKm, dimmed }: OverlayProps) {
  const { days, hours, minutes, seconds } = counter;
  const clock = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
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

  const ready = vp.w > 0;
  // Надписи стоят по краям от центра экрана, а не от луны: луна теперь живёт
  // по-настоящему — восходит, садится, а иногда её вовсе нет под горизонтом.
  // Привязывать к ней вёрстку значит однажды остаться с пустотой посередине.
  const centerX = vp.w / 2;
  const moonCy = LAYOUT.moon.y * vp.h;
  const gap = Math.max(34, vp.w * 0.1);
  const margin = 18;

  const timerRight = Math.max(80, vp.w - (centerX - gap));
  const distLeft = Math.max(0, centerX + gap);

  return (
    // Слой не перехватывает указатель: клики уходят сквозь него к звёздам.
    <div
      className="pointer-events-none fixed inset-0 z-10 select-none transition-opacity"
      style={{
        opacity: dimmed ? 0.12 : 1,
        // Уходит быстрее, чем возвращается.
        transitionDuration: dimmed ? "300ms" : "700ms",
        transitionTimingFunction: "var(--ease-emerge)",
      }}
    >
      {ready && (
        <>
          {/* Таймер — слева от луны, выключка вправо. */}
          <Emerge
            delay={T_TIMER}
            className="absolute flex flex-col items-end gap-[2px] text-right"
            style={{
              right: timerRight,
              top: moonCy,
              transform: "translateY(-50%)",
              maxWidth: `${centerX - gap - margin}px`,
            }}
          >
            <span className="font-mono text-[clamp(14px,3.8vw,18px)] font-extralight tabular-nums leading-none">
              <span className="text-star/90">{days}</span>{" "}
              <span className="text-star/45">{plural(days, "день", "дня", "дней")}</span>
            </span>
            <span className="font-mono text-star/70 text-[clamp(12px,3.2vw,15px)] font-extralight tabular-nums leading-none">
              {clock}
            </span>
            <span className="font-text text-star/40 text-[clamp(11px,2.9vw,13px)] leading-tight">
              без тебя
            </span>
          </Emerge>

          {/* Расстояние — справа от луны, выключка влево. */}
          <Emerge
            delay={T_DISTANCE}
            className="absolute flex flex-col items-start gap-[2px] text-left"
            style={{
              left: distLeft,
              top: moonCy,
              transform: "translateY(-50%)",
              maxWidth: `${vp.w - distLeft - margin}px`,
            }}
          >
            <span className="font-mono text-star/85 text-[clamp(14px,3.8vw,18px)] font-extralight tabular-nums leading-none">
              {spaceThousands(distanceKm)} км
            </span>
            <span className="font-text text-star/40 text-[clamp(11px,2.9vw,13px)] leading-tight">
              от твоей нежности
            </span>
          </Emerge>
        </>
      )}

    </div>
  );
}
