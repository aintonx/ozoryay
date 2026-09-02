"use client";

import { Widget } from "../ui/Widget";
import { spaceThousands } from "@/lib/text/plural";

/**
 * Шестнадцать румбов компаса на русском — для перевода азимута маршрута
 * в слово, которое читается сразу, без пересчёта из градусов в голове.
 */
const COMPASS_POINTS = [
  "С", "ССВ", "СВ", "ВСВ", "В", "ВЮВ", "ЮВ", "ЮЮВ",
  "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ",
];

/** Азимут (градусы от севера по часовой) → ближайший из шестнадцати румбов. */
function compassLabel(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % COMPASS_POINTS.length;
  return COMPASS_POINTS[index];
}

/**
 * Компас — вместо прежней линии маршрута с точками.
 *
 * Не живой (без гироскопа телефона): азимут между двумя городами не
 * меняется от того, как повёрнут телефон в руке, а живой датчик означал
 * бы ещё и экран с просьбой разрешить доступ к нему — лишний шаг ради
 * стрелки, которая всё равно указывает в одну и ту же сторону. Вместо
 * этого — циферблат с фиксированным севером сверху и стрелкой, повёрнутой
 * на реальный азимут `bearingDeg`: та же информация, без диалогов
 * с разрешениями и без риска, что на части телефонов датчик просто
 * не ответит.
 *
 * Нарочно без лишних засечек и цифр по кругу — только север, стрелка
 * и точка-ось: азимут словом («ЮЮВ») уже написан рядом текстом, а лишние
 * деления на циферблате не прибавили бы ясности, только шум.
 */
function CompassDial({ bearingDeg }: { bearingDeg: number }) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--color-star)" strokeOpacity="0.28" strokeWidth="1.1" />
      <path d="M12 1.7v1.9" stroke="var(--color-star)" strokeOpacity="0.5" strokeWidth="1.3" strokeLinecap="round" />
      <g transform={`rotate(${bearingDeg} 12 12)`}>
        <path d="M12 12 L10.9 12 L12 3.4 L13.1 12 Z" fill="var(--color-amber-hot)" />
      </g>
      <circle cx="12" cy="12" r="1.15" fill="var(--color-night-deep)" stroke="var(--color-amber-hot)" strokeWidth="1" />
    </svg>
  );
}

interface DistanceWidgetProps {
  distanceKm: number;
  myCity: string;
  herCity: string;
  /** Начальный азимут большого круга от меня к ней, в градусах от севера. */
  bearingDeg: number;
  className?: string;
}

/**
 * Сколько между нами.
 *
 * Прежняя дуга-маршрут с двумя метками убрана целиком — расстояние теперь
 * говорит само за себя одним крупным числом, тем же по роли и размеру,
 * что число дней в соседнем виджете. Компас и города — во вложенной
 * панели ниже: не расшифровка карты, а азимут и два названия, коротко.
 */
export default function DistanceWidget({
  distanceKm,
  myCity,
  herCity,
  bearingDeg,
  className,
}: DistanceWidgetProps) {
  return (
    <Widget title="МЕЖДУ НАМИ" className={className}>
      <div className="flex flex-1 flex-col justify-between gap-[0.85rem]">
        <div className="relative flex flex-1 flex-col items-center justify-center gap-[0.15rem] py-[0.4rem]">
          <div className="hero-glow" aria-hidden="true" />
          <span className="hero-number relative tabular-nums">{spaceThousands(distanceKm)}</span>
          <span className="hero-unit relative">км</span>
        </div>

        <div className="inset-panel flex items-center gap-[0.7rem] px-[0.85rem] py-[0.65rem]">
          <span className="h-[2.3rem] w-[2.3rem] shrink-0">
            <CompassDial bearingDeg={bearingDeg} />
          </span>
          <span className="min-w-0">
            <span className="font-system block text-[14.5px] font-semibold text-amber-hot">
              {compassLabel(bearingDeg)}
            </span>
            <span className="font-system block truncate text-[12px] text-star/48">
              {myCity} → {herCity}
            </span>
          </span>
        </div>
      </div>
    </Widget>
  );
}
