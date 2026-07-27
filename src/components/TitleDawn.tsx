"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { glowXFromBearing, groundYAt } from "@/lib/sky/layout";
import { IconChevronUp } from "./ui/Icons";
import { useReducedMotion } from "@/lib/useReducedMotion";

const FULL_MS = 10200; // подъём + 5с + уход, с запасом на снятие
const REDUCED_MS = 5600;
/** Сколько занимает досрочный уход. Столько же уходит солнце на канвасе. */
const SET_MS = 420;
/** Когда предложить смахнуть: строка уже поднялась и её успели прочитать. */
const HINT_AT_MS = 2600;

const TEXT = "Ты озоряешь мою жизнь, принцесса";

interface TitleDawnProps {
  /** Азимут на её город: рассвет случается ровно с её стороны. */
  bearingDeg: number;
  /** Свет пошёл на убыль: солнцу пора уходить. */
  onLeave: () => void;
  /** Всё ушло — экран свободен, можно выпускать виджеты. */
  onDone: () => void;
}

/**
 * Слова, которые выносит на себе восход.
 *
 * Само солнце рисует канвас (см. `sky/dawn.ts`) — здесь только строка,
 * едущая по той же кривой. Она восходит из-за холмов, держится пять секунд
 * и уходит обратно за горизонт.
 *
 * Ждать не обязательно: любое касание убирает вступление, и убирает целиком.
 * Строка и солнце уходят за одно движение, и только после того, как экран
 * освободился, приезжают виджеты — иначе они наезжают на ещё горящий свет
 * и спорят с ним за одно и то же место.
 *
 * Маска — clip-path по силуэту земли (та же функция groundYAt, что рисует
 * холмы), поэтому строка пропадает точно по контуру холмов.
 */
export default function TitleDawn({ bearingDeg, onLeave, onDone }: TitleDawnProps) {
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const [hint, setHint] = useState(false);
  const started = useRef(false);

  // Обработчики держим в рефах, а не в зависимостях эффекта.
  //
  // Родитель пересобирается каждую секунду — тикает счётчик разлуки, — и с
  // обычной зависимостью таймер вступления сбрасывался бы на каждом тике
  // и не срабатывал никогда: сайт навсегда оставался бы в заставке.
  const cb = useRef({ onLeave, onDone });
  useEffect(() => {
    cb.current = { onLeave, onDone };
  });

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setHint(true), HINT_AT_MS),
      window.setTimeout(
        () => {
          // Естественный конец: свет уже сошёл сам, ждать нечего.
          if (started.current) return;
          started.current = true;
          cb.current.onLeave();
          cb.current.onDone();
          setGone(true);
        },
        reduced ? REDUCED_MS : FULL_MS,
      ),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reduced]);

  const dismiss = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setHint(false);
    setLeaving(true);
    cb.current.onLeave();
    window.setTimeout(() => {
      cb.current.onDone();
      setGone(true);
    }, SET_MS);
  }, []);

  // Небо — всё, что выше силуэта земли. Строка клипается этой областью.
  const skyClip = useMemo(() => {
    const N = 48;
    const pts: string[] = ["0% 0%", "100% 0%"];
    for (let i = N; i >= 0; i--) {
      const x = i / N;
      pts.push(`${(x * 100).toFixed(2)}% ${(groundYAt(x) * 100).toFixed(2)}%`);
    }
    return `polygon(${pts.join(",")})`;
  }, []);

  if (gone) return null;

  // Строка стоит над куполом солнца, а солнце восходит с её стороны.
  const sunY = groundYAt(glowXFromBearing(bearingDeg));
  const motion = reduced ? "" : leaving ? "title-set" : "title-dawn";

  return (
    <div
      className="fixed inset-0 z-30 overflow-hidden select-none"
      style={{ pointerEvents: leaving ? "none" : "auto" }}
      onPointerDown={dismiss}
      aria-hidden="true"
    >
      <div style={{ clipPath: skyClip, WebkitClipPath: skyClip }} className="absolute inset-0">
        <div
          className="absolute left-1/2 w-full max-w-[36rem] -translate-x-1/2 px-7"
          style={{ top: `${(sunY - 0.215) * 100}%` }}
        >
          <h1
            className={`font-display title-face text-center ${motion}`}
            style={{
              margin: 0,
              fontWeight: 400,
              lineHeight: 1.16,
              letterSpacing: "0.01em",
              fontSize: "clamp(30px, 8vw, 62px)",
              textWrap: "balance",
            }}
          >
            {TEXT}
          </h1>
        </div>
      </div>

      {/*
        Подсказка живёт вне маски: она ниже линии холмов, и клип по силуэту
        земли просто съел бы её целиком.
      */}
      <div
        className="font-system caption absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-[0.3em] text-[12px] font-medium tracking-[0.05em] text-star transition-opacity duration-700"
        style={{ opacity: hint && !leaving ? 1 : 0 }}
      >
        <IconChevronUp size={14} />
        смахни
      </div>
    </div>
  );
}
