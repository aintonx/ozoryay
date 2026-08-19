"use client";

import { Widget } from "../ui/Widget";
import { IconMarker, IconPin } from "../ui/Icons";
import { spaceThousands } from "@/lib/text/plural";

/**
 * Путь и метки живут в одной системе координат: точка на пути и точка
 * маркера считаются от одних и тех же чисел, а не подгоняются на глаз
 * раздельно. `ROUTE_Y` — это высота, на которой лежит маршрут внутри
 * своего SVG (36 из 46 по вертикали), выраженная в процентах: и путь,
 * и обе метки ссылаются на одно и то же число, так что, как бы ни легла
 * ширина колонки, линия начинается ровно из центра точки «я» и ровно
 * из носика капли «она» — без ручной подгонки, которая однажды и разошлась.
 */
const ROUTE_Y = (36 / 46) * 100;

/**
 * Метка «она» — конец маршрута.
 *
 * У капли (IconMarker) сама точка — не центр фигуры, а её носик внизу,
 * на 21.3 из 24 единиц высоты значка. Сдвиг на -89.2% (а не ровно на
 * -100%, как было бы для сдвига на всю высоту значка) ставит именно
 * носик, а не низ невидимого поля вокруг него, в точку `ROUTE_Y`.
 */
function HerMarker({ at }: { at: number }) {
  return (
    <>
      <span
        className="absolute h-[1.6rem] w-[1.6rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/16"
        style={{ left: `${at}%`, top: `${ROUTE_Y}%` }}
      />
      <IconMarker
        size={18}
        className="absolute text-amber-hot"
        style={{ left: `${at}%`, top: `${ROUTE_Y}%`, transform: "translate(-50%, -89.2%)" }}
      />
    </>
  );
}

/**
 * Метка «я» — начало маршрута.
 *
 * Не капля, а дышащая точка: та самая метка «текущее местоположение»,
 * знакомая по любой карте. Центр точки стоит ровно в `ROUTE_Y` — там же,
 * где и начинается сама линия, — обычным центрированием, без капли
 * с несимметричной формой ей заниматься не приходится.
 */
function MeMarker({ at }: { at: number }) {
  return (
    <span
      className="absolute h-[0.55rem] w-[0.55rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-star/75"
      style={{ left: `${at}%`, top: `${ROUTE_Y}%` }}
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
 * Названия городов стоят на той же высоте, что и строка часов:минут:секунд
 * у соседнего `TimerWidget` — оба виджета устроены одинаково: верхний
 * блок (кольца/маршрут) растягивается на всё свободное место, а нижняя
 * строка-деталь прижата к самому низу общей высоты `min-h-[8.4rem]`.
 * Раз высота общая — общая и линия, на которой всё это стоит.
 */
export default function DistanceWidget({
  distanceKm,
  myCity,
  herCity,
  className,
}: DistanceWidgetProps) {
  return (
    <Widget icon={<IconPin />} title="МЕЖДУ НАМИ" className={className}>
      <div className="flex min-h-[8.4rem] flex-1 flex-col gap-[0.6rem]">
        <div className="flex flex-1 flex-col items-center justify-center gap-[0.75rem]">
          <div className="flex items-baseline justify-center gap-[0.35em]">
            <span className="font-system text-[2rem] leading-none font-semibold tabular-nums tracking-[-0.03em] text-star">
              {spaceThousands(distanceKm)}
            </span>
            <span className="font-system text-[13px] text-star/50">км</span>
          </div>

          {/* Маршрут: сплошная линия от моего города к твоему, светлеющая
              к цели, — как прочерченный путь, а не дуга-приговор. Ширина
              растягивается, высота задана жёстко: preserveAspectRatio="none"
              подгоняет дугу под фактическую ширину колонки, а метки ниже
              читают ту же самую высоту ROUTE_Y, что заложена в саму дугу. */}
          <div className="relative h-[2.55rem] w-full">
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
        </div>

        {/* Названия городов — данные, которые правишь в defaults.ts сам:
            если однажды впишешь город длиннее «Краснодара», строка не должна
            перенестись и потянуть за собой высоту — тот же механизм,
            что и в плитках выше, только источник риска другой. */}
        <div className="font-system flex justify-between gap-[0.5rem] text-[10px] leading-none text-star/40">
          <span className="min-w-0 truncate">{myCity}</span>
          <span className="min-w-0 truncate text-amber/70">{herCity}</span>
        </div>
      </div>
    </Widget>
  );
}
