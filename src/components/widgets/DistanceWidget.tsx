"use client";

import { Widget } from "../ui/Widget";
import { IconMarker, IconPin } from "../ui/Icons";
import { spaceThousands } from "@/lib/text/plural";

/**
 * Метка на конце маршрута.
 *
 * Позиция в процентах повторяет концы дуги из соседнего svg (14 и 186 из
 * 200 — это 7% и 93%), поэтому метка стоит ровно там, где обрывается
 * пунктир, на какой бы ширине ни оказался виджет.
 */
function Marker({ at, className }: { at: number; className: string }) {
  return (
    <IconMarker
      size={18}
      className={`absolute bottom-0 -translate-x-1/2 translate-y-[0.15rem] ${className}`}
      style={{ left: `${at}%` }}
    />
  );
}

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

      {/* Маршрут: дуга от моего города к твоему. Ширина растягивается,
          высота задана жёстко — иначе на широком виджете диаграмма растёт
          вслед за шириной и занимает пол-карточки. Дуга поэтому в своём
          слое с preserveAspectRatio="none", а метки — в своём, иначе их
          бы расплющило вместе с ней. */}
      <div className="relative mt-[0.8rem] h-[2.9rem] w-full">
        <svg
          viewBox="0 0 200 46"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M14 36 Q100 6 186 36"
            fill="none"
            stroke="var(--color-amber)"
            strokeOpacity={0.42}
            strokeWidth={1.4}
            strokeDasharray="3 4"
            strokeLinecap="round"
          />
        </svg>

        {/* Я — метка неяркая. Ты — метка горящая, с ореолом вокруг. */}
        <Marker at={7} className="text-star/55" />
        <span
          className="absolute bottom-0 h-[1.6rem] w-[1.6rem] -translate-x-1/2 translate-y-[0.42rem] rounded-full bg-amber/16"
          style={{ left: "93%" }}
        />
        <Marker at={93} className="text-amber-hot" />
      </div>

      <div className="font-system mt-[0.5rem] flex justify-between text-[10.5px] text-star/40">
        <span>{myCity}</span>
        <span className="text-amber/70">{herCity}</span>
      </div>
    </Widget>
  );
}
