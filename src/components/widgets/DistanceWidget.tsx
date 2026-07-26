"use client";

import { Widget } from "../ui/Widget";
import { IconPin } from "../ui/Icons";
import { spaceThousands } from "@/lib/text/plural";

interface DistanceWidgetProps {
  distanceKm: number;
  myCity: string;
  herCity: string;
  className?: string;
}

/**
 * Сколько между нами.
 *
 * Не голая цифра, а маршрут: две точки и дуга между ними — так расстояние
 * читается как путь, который однажды будет пройден, а не как приговор.
 * Её точка светится тёплым: она конец маршрута.
 */
export default function DistanceWidget({
  distanceKm,
  myCity,
  herCity,
  className,
}: DistanceWidgetProps) {
  return (
    <Widget icon={<IconPin />} title="МЕЖДУ НАМИ" className={className}>
      <div className="flex items-baseline gap-[0.35em]">
        <span className="font-system text-[2.35rem] leading-none font-semibold tabular-nums tracking-[-0.03em] text-star">
          {spaceThousands(distanceKm)}
        </span>
        <span className="font-system text-[13px] text-star/50">км</span>
      </div>

      {/* Маршрут: дуга от моего города к твоему. Высота задана жёстко —
          иначе на широком виджете диаграмма растёт вслед за шириной
          и занимает пол-карточки. */}
      <svg
        viewBox="0 0 200 44"
        className="mt-[0.8rem] h-[2.6rem] w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Дуга — путь по большому кругу, каким его рисуют на картах. */}
        <path
          d="M14 32 Q100 2 186 32"
          fill="none"
          stroke="var(--color-amber)"
          strokeOpacity={0.42}
          strokeWidth={1.4}
          strokeDasharray="3 4"
          strokeLinecap="round"
        />
        {/* Я — обычная точка. */}
        <circle cx="14" cy="32" r="3.4" fill="var(--color-star)" fillOpacity={0.55} />
        {/* Ты — светишься. */}
        <circle cx="186" cy="32" r="7" fill="var(--color-amber)" fillOpacity={0.16} />
        <circle cx="186" cy="32" r="3.6" fill="var(--color-amber-hot)" />
      </svg>

      <div className="font-system mt-[0.5rem] flex justify-between text-[10.5px] text-star/40">
        <span>{myCity}</span>
        <span className="text-amber/70">{herCity}</span>
      </div>
    </Widget>
  );
}
