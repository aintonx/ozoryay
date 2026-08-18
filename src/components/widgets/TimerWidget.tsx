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
 *
 * Раскладка одна и та же на любой ширине экрана: кольца сверху, цифры
 * снизу, всё по центру. Виджет всегда живёт в узкой колонке сетки — даже
 * на широком окне ему не достаётся сплошной строки, — поэтому решение
 * «шире экран — переставим кольца в строку» только рассинхронивало его
 * с соседом по сетке, у которого такого переключения не было.
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
      <div className="flex min-h-[8.4rem] flex-1 flex-col items-center justify-center gap-[0.6rem]">
        {/* Кольца */}
        <svg viewBox="-52 -52 104 104" className="h-[4.6rem] w-[4.6rem] shrink-0" aria-hidden="true">
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
        <div className="min-w-0 text-center">
          <div className="flex items-baseline justify-center gap-[0.32em]">
            <span className="font-system text-[2rem] leading-none font-semibold tabular-nums tracking-[-0.03em] text-star">
              {days}
            </span>
            <span className="font-system text-[13px] text-star/50">{dayWord}</span>
          </div>
          <div className="font-mono mt-[0.5em] text-[13px] leading-none font-light tabular-nums text-star/70">
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </div>
        </div>
      </div>
    </Widget>
  );
}
