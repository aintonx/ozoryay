"use client";

import { useEffect, useState } from "react";
import { Emerge } from "./Emerge";
import { LAYOUT } from "@/lib/sky/layout";
import { plural, spaceThousands } from "@/lib/text/plural";
import { useSeparationCounter, type SeparationCounter } from "@/lib/time/useSeparationDays";

interface OverlayProps {
  initial: SeparationCounter;
  separationStart: string;
  herTimezone: string;
  distanceKm: number;
  /** Раскрыто письмо или горит прожектор — весь текст уходит в тень. */
  dimmed: boolean;
  lettersTotal: number;
  lettersOpened: number;
}

const T_TIMER = 900;
const T_DISTANCE = 1500;
const T_FOOT = 2400;

/** Оценка радиуса луны на экране — та же формула, что в рендерере. */
function moonRadius(w: number, h: number) {
  return Math.max(18, Math.min(w * 0.068, h * 0.055, 34));
}

export default function Overlay({
  initial,
  separationStart,
  herTimezone,
  distanceKm,
  dimmed,
  lettersTotal,
  lettersOpened,
}: OverlayProps) {
  const { days, hours } = useSeparationCounter(initial, separationStart, herTimezone);
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
  const moonCx = LAYOUT.moon.x * vp.w;
  const moonCy = LAYOUT.moon.y * vp.h;
  const r = ready ? moonRadius(vp.w, vp.h) : 0;
  const gap = r * 1.5 + 8;
  const margin = 18;

  // Таймер слева от луны, прижат к ней справа. «Км» справа, прижата слева.
  const timerRight = Math.max(80, vp.w - (moonCx - gap));
  const distLeft = Math.max(0, moonCx + gap);

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
              maxWidth: `${moonCx - gap - margin}px`,
            }}
          >
            <span className="font-mono text-[clamp(14px,3.8vw,18px)] font-extralight tabular-nums leading-none">
              <span className="text-star/90">{days}</span>{" "}
              <span className="text-star/45">{plural(days, "день", "дня", "дней")}</span>
            </span>
            <span className="font-mono text-[clamp(12px,3.2vw,15px)] font-extralight tabular-nums leading-none">
              <span className="text-star/80">{hours}</span>{" "}
              <span className="text-star/45">{plural(hours, "час", "часа", "часов")}</span>
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

      {/* Подписи внизу — на левой оси. */}
      <div className="absolute bottom-[clamp(20px,4vh,38px)] left-1/2 w-full max-w-[34rem] -translate-x-1/2 space-y-[9px] px-7">
        <Emerge
          delay={T_FOOT}
          className="font-mono text-[11px] font-extralight tracking-[0.16em] text-star/22 tabular-nums"
        >
          {lettersTotal} {plural(lettersTotal, "звезда", "звезды", "звёзд")}{" "}
          {plural(lettersTotal, "говорит", "говорят", "говорят")} · открыто {lettersOpened}
        </Emerge>
        <Emerge
          delay={T_FOOT + 700}
          className="font-mono text-[11px] font-extralight tracking-[0.2em] text-star/30"
        >
          Озоряй. Я жду.
        </Emerge>
      </div>
    </div>
  );
}
