"use client";

import { useSyncExternalStore } from "react";
import type { SeparationCounter } from "@/lib/time/useSeparationDays";
import { spaceThousands } from "@/lib/text/plural";

/** Подписка, которая никогда не срабатывает: значение меняется ровно раз. */
const subscribeNever = () => () => {};

interface ChronometerProps {
  counter: SeparationCounter;
  distanceKm: number;
  /** Раскрыто письмо — прибор уходит в тень. */
  dimmed: boolean;
}

/**
 * Хронометр разлуки — по образцу колец активности Apple Watch.
 *
 * Три толстых кольца с закруглёнными концами: часы, минуты, секунды. Каждое
 * заполняется и обнуляется в своём ритме. В центре — число дней и подпись
 * системным шрифтом. Никакой орнаментики: только кольца, цифры и стекло
 * под ними.
 */
export default function Chronometer({ counter, distanceKm, dimmed }: ChronometerProps) {
  const { days, hours, minutes, seconds } = counter;

  // Секунды тикают, а страница собирается заранее и лежит статикой: числа
  // в готовом HTML и в браузере неизбежно разойдутся. Поэтому прибор
  // рождается уже на клиенте.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!mounted) return null;

  // Кольца идут снаружи внутрь, как на часах: крупная единица — внешняя.
  const rings = [
    { r: 92, value: hours / 24, color: "var(--color-amber-hot)", alpha: 0.95 },
    { r: 74, value: minutes / 60, color: "var(--color-amber)", alpha: 0.85 },
    { r: 56, value: seconds / 60, color: "var(--color-star)", alpha: 0.7 },
  ];

  const pad = (n: number) => String(n).padStart(2, "0");
  const dayWord = days % 10 === 1 && days % 100 !== 11 ? "день" : "дней";

  return (
    <div
      className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-[1.5rem] transition-opacity"
      style={{
        opacity: dimmed ? 0.1 : 1,
        // Уходит быстрее, чем возвращается.
        transitionDuration: dimmed ? "300ms" : "700ms",
        transitionTimingFunction: "var(--ease-emerge)",
      }}
    >
      <div className="chrono relative w-[min(68vw,17rem)] max-w-[42vh]">
        {/* Стеклянный диск: небо за ним размывается, и прибор не теряется. */}
        <div className="glass absolute inset-0 rounded-full" />

        <svg viewBox="-110 -110 220 220" className="w-full" aria-hidden="true">
          {/* Дуги идут от верхней точки по часовой стрелке. */}
          <g transform="rotate(-90)" fill="none" strokeLinecap="round" strokeWidth={11}>
            {rings.map((ring) => {
              const c = 2 * Math.PI * ring.r;
              // Полный круг чуть не замыкаем: закруглённый конец наехал бы
              // на начало и дал заметный шов.
              const filled = Math.min(ring.value, 0.9995);
              return (
                <g key={ring.r}>
                  <circle r={ring.r} stroke="var(--color-star)" strokeOpacity={0.08} />
                  <circle
                    r={ring.r}
                    stroke={ring.color}
                    strokeOpacity={ring.alpha}
                    strokeDasharray={`${c * filled} ${c}`}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {/* Дни — в центре колец. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-system text-[clamp(34px,10vw,50px)] leading-none font-medium tabular-nums tracking-[-0.02em] text-star">
            {days}
          </span>
          <span className="font-system mt-[0.5em] text-[11px] tracking-[0.01em] text-star/45">
            {dayWord} без тебя
          </span>
          <span className="font-mono mt-[0.85em] text-[clamp(11px,3vw,13px)] font-light tabular-nums text-star/55">
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </span>
        </div>
      </div>

      {/* Расстояние — стеклянной капсулой под кольцами. */}
      <div className="glass flex items-baseline gap-[0.55em] rounded-full px-[1.1em] py-[0.5em]">
        <span className="font-mono text-[clamp(12px,3.2vw,14px)] font-light tabular-nums text-star/90">
          {spaceThousands(distanceKm)} км
        </span>
        <span className="font-system text-[10px] leading-none text-star/45">
          от твоей нежности
        </span>
      </div>
    </div>
  );
}
