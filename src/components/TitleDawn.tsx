"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { glowXFromBearing, groundYAt } from "@/lib/sky/layout";
import { useReducedMotion } from "@/lib/useReducedMotion";

const FULL_MS = 10200; // подъём + 5с + уход, с запасом на снятие
const REDUCED_MS = 5600;
/** Сколько занимает досрочный уход за горизонт. */
const SET_MS = 2600;

const TEXT = "Ты озоряешь мою жизнь, принцесса";

interface TitleDawnProps {
  /** Азимут на её город: рассвет случается ровно с её стороны. */
  bearingDeg: number;
  /** Свет пошёл на убыль — можно выпускать интерфейс. */
  onDone: () => void;
}

/**
 * Слова, которые выносит на себе восход.
 *
 * Само солнце рисует канвас (см. `sky/dawn.ts`) — здесь только строка,
 * едущая по той же кривой. Она восходит из-за холмов, держится пять секунд
 * и уходит обратно за горизонт; если ждать не хочется, достаточно коснуться
 * экрана — и она уйдёт сразу, вместе с солнцем.
 *
 * Маска — clip-path по силуэту земли (та же функция groundYAt, что рисует
 * холмы), поэтому строка пропадает точно по контуру холмов. Полигон задан
 * в долях вьюпорта, значит не зависит от размера экрана.
 */
export default function TitleDawn({ bearingDeg, onDone }: TitleDawnProps) {
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const done = useRef(false);

  // Обработчик держим в рефе, а не в зависимостях эффекта.
  //
  // Родитель пересобирается каждую секунду — тикает счётчик разлуки, — и с
  // обычной зависимостью таймер вступления сбрасывался бы на каждом тике
  // и не срабатывал никогда: сайт навсегда оставался бы в заставке.
  const doneCb = useRef(onDone);
  useEffect(() => {
    doneCb.current = onDone;
  });

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    doneCb.current();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(
      () => {
        finish();
        setGone(true);
      },
      reduced ? REDUCED_MS : FULL_MS,
    );
    return () => window.clearTimeout(t);
  }, [reduced, finish]);

  const dismiss = useCallback(() => {
    if (done.current) return;
    finish();
    setLeaving(true);
    window.setTimeout(() => setGone(true), reduced ? 400 : SET_MS);
  }, [finish, reduced]);

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
      style={{
        clipPath: skyClip,
        WebkitClipPath: skyClip,
        // Пока вступление идёт, любое касание его снимает: ждать не должно
        // приходиться никогда.
        pointerEvents: leaving ? "none" : "auto",
      }}
      onPointerDown={dismiss}
      aria-hidden="true"
    >
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
  );
}
