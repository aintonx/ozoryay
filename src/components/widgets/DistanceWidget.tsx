"use client";

import { Widget } from "../ui/Widget";
import { IconMarker, IconPin } from "../ui/Icons";
import { spaceThousands } from "@/lib/text/plural";

/**
 * Метка «она» — конец маршрута.
 *
 * Позиция в процентах повторяет конец линии из соседнего svg (186 из
 * 200 — это 93%), поэтому метка стоит ровно там, где обрывается путь,
 * на какой бы ширине ни оказался виджет.
 */
function HerMarker({ at }: { at: number }) {
  return (
    <>
      <span
        className="absolute bottom-0 h-[1.6rem] w-[1.6rem] -translate-x-1/2 translate-y-[0.42rem] rounded-full bg-amber/16"
        style={{ left: `${at}%` }}
      />
      <IconMarker
        size={18}
        className="absolute bottom-0 -translate-x-1/2 translate-y-[0.15rem] text-amber-hot"
        style={{ left: `${at}%` }}
      />
    </>
  );
}

/**
 * Метка «я» — начало маршрута.
 *
 * Не капля, а дышащая точка: та самая метка «текущее местоположение»,
 * знакомая по любой карте. Она — конец пути, я — его начало, и на месте
 * начала естественнее точка, откуда путь ещё только идёт, а не такая же
 * капля, как у цели.
 */
function MeMarker({ at }: { at: number }) {
  return (
    <span
      className="absolute bottom-0 h-[0.55rem] w-[0.55rem] -translate-x-1/2 translate-y-[-0.05rem] rounded-full bg-star/75"
      style={{ left: `${at}%` }}
    >
      <span className="absolute inset-0 rounded-full bg-star/60 animate-[gentle-pulse_2.6s_ease-out_infinite]" />
    </span>
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
 * Не голая цифра, а маршрут: точка отправления и точка назначения, между
 * ними — сплошной путь, как прочерченный маршрут на карте, а не голая
 * дуга. Так расстояние читается как путь, который однажды будет пройден,
 * а не как приговор.
 *
 * Раскладка одна и та же на любой ширине — см. `TimerWidget` рядом:
 * оба виджета всегда живут в узкой колонке сетки, и переключение по
 * ширине окна только рассинхронивало их друг с другом.
 */
export default function DistanceWidget({
  distanceKm,
  myCity,
  herCity,
  className,
}: DistanceWidgetProps) {
  return (
    <Widget icon={<IconPin />} title="МЕЖДУ НАМИ" className={className}>
      <div className="flex min-h-[8.4rem] flex-1 flex-col justify-center">
        <div className="flex items-baseline justify-center gap-[0.35em]">
          <span className="font-system text-[2rem] leading-none font-semibold tabular-nums tracking-[-0.03em] text-star">
            {spaceThousands(distanceKm)}
          </span>
          <span className="font-system text-[13px] text-star/50">км</span>
        </div>

        {/* Маршрут: сплошная линия от моего города к твоему, светлеющая
            к цели, — как прочерченный путь, а не дуга-приговор. Ширина
            растягивается, высота задана жёстко: дуга в своём слое
            с preserveAspectRatio="none", метки — в своём, иначе их
            расплющило бы вместе с линией. */}
        <div className="relative mt-[0.75rem] h-[2.55rem] w-full">
          <svg
            viewBox="0 0 200 46"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="route-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-star)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--color-amber-hot)" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <path
              d="M14 36 Q100 6 186 36"
              fill="none"
              stroke="url(#route-line)"
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </svg>

          <MeMarker at={7} />
          <HerMarker at={93} />
        </div>

        {/* Названия городов — данные, которые правишь в defaults.ts сам:
            если однажды впишешь город длиннее «Краснодара», строка не должна
            перенестись и потянуть за собой высоту — тот же механизм,
            что и в плитках выше, только источник риска другой. */}
        <div className="font-system mt-[0.45rem] flex justify-between gap-[0.5rem] text-[10px] text-star/40">
          <span className="min-w-0 truncate">{myCity}</span>
          <span className="min-w-0 truncate text-amber/70">{herCity}</span>
        </div>
      </div>
    </Widget>
  );
}
