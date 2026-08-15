"use client";

import { Widget } from "../ui/Widget";
import { IconClock } from "../ui/Icons";
import type { SeparationCounter } from "@/lib/time/useSeparationDays";

interface TimerWidgetProps {
  counter: SeparationCounter;
  className?: string;
}

/**
 * Сколько я без тебя.
 *
 * Кольца — как кольца активности на часах: три толстые дуги с закруглёнными
 * концами, каждая в своём ритме. Часы обходят круг за сутки, минуты за час,
 * секунды за минуту. Рядом — число дней, оно и есть главная величина.
 */
export default function TimerWidget({ counter, className }: TimerWidgetProps) {
  const { days, hours, minutes, seconds } = counter;

  const rings = [
    { r: 40, value: hours / 24, color: "var(--color-amber-hot)", alpha: 0.95 },
    { r: 29, value: minutes / 60, color: "var(--color-amber)", alpha: 0.8 },
    { r: 18, value: seconds / 60, color: "var(--color-star)", alpha: 0.6 },
  ];

  const pad = (n: number) => String(n).padStart(2, "0");
  const dayWord = days % 10 === 1 && days % 100 !== 11 ? "день" : "дней";

  return (
    <Widget icon={<IconClock />} title="БЕЗ ТЕБЯ" className={className}>
      <div className="flex items-center gap-[1.1rem]">
        {/* Кольца */}
        <svg viewBox="-52 -52 104 104" className="h-[6.2rem] w-[6.2rem] shrink-0" aria-hidden="true">
          <g transform="rotate(-90)" fill="none" strokeLinecap="round" strokeWidth={8}>
            {rings.map((ring) => {
              const c = 2 * Math.PI * ring.r;
              // Полный круг чуть не замыкаем: закруглённый конец наехал бы
              // на начало и дал заметный шов.
              const filled = Math.min(ring.value, 0.9995);
              return (
                <g key={ring.r}>
                  <circle r={ring.r} stroke="var(--color-star)" strokeOpacity={0.09} />
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

        {/* Цифры */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-[0.32em]">
            <span className="font-system text-[2.35rem] leading-none font-semibold tabular-nums tracking-[-0.03em] text-star">
              {days}
            </span>
            <span className="font-system text-[13px] text-star/50">{dayWord}</span>
          </div>
          <div className="font-mono mt-[0.6em] text-[15px] leading-none font-light tabular-nums text-star/70">
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </div>
          <div className="font-system mt-[0.5em] flex gap-[0.75em] text-[10px] text-star/35">
            <span>часы</span>
            <span>минуты</span>
            <span>секунды</span>
          </div>
        </div>
      </div>
    </Widget>
  );
}
