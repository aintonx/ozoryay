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
 *
 * Строка часов:минут:секунд прижата к самому низу общей высоты
 * `min-h-[8.75rem]` — не по центру вместе со всем остальным. У соседнего
 * `DistanceWidget` строка городов устроена ровно так же и прижата к той
 * же самой высоте: раз оба виджета делят одну высоту и один и тот же
 * способ прижимать нижнюю строку к низу, их детали сами оказываются
 * на одной линии, без подгонки отступов на глаз. Высота — 8.75rem, а не
 * прежние 8.4rem: у колец с числом дней естественная высота и так уже
 * чуть превышала старый min-h, а у соседа с более коротким содержимым —
 * нет, и по факту их нижние строки расходились на пару пикселей. Новое
 * значение выше содержимого обоих виджетов сразу, так что оба всегда
 * упираются именно в него, а не в разную собственную высоту.
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
      <div className="flex min-h-[8.75rem] flex-1 flex-col gap-[0.6rem]">
        <div className="flex flex-1 flex-col items-center justify-center gap-[0.6rem]">
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

          {/* Дни — тот же размер, что km у соседа и число у «Ты восхищаешь»:
              одна и та же роль «главного числа виджета» должна выглядеть
              одинаково значимо во всех трёх местах, а не по-разному. */}
          <div className="flex items-baseline justify-center gap-[0.32em]">
            <span className="font-system text-[2.15rem] leading-none font-semibold tabular-nums tracking-[-0.03em] text-star">
              {days}
            </span>
            <span className="font-system text-[13.5px] text-star/56">{dayWord}</span>
          </div>
        </div>

        {/* Часы:минуты:секунды — на одной линии со строкой городов у соседа,
            тот же размер и та же непрозрачность, что и там: это одна и та же
            роль («деталь снизу»), и она должна читаться одинаково в обоих
            виджетах, а не как две разные подписи разной значимости. */}
        <div className="font-mono text-center text-[12.5px] leading-none font-light tabular-nums text-star/70">
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </div>
      </div>
    </Widget>
  );
}
