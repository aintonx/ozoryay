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
 * Условный потолок шкалы — не настоящий предел расстояния (предела в
 * принципе нет), а масштаб, при котором реалистичные значения не упираются
 * в самый край полосы и не теряются у нуля.
 */
const SCALE_MAX_KM = 3000;

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
 * Циферблат-компас убран — вместо направления теперь полоса-шкала: то же
 * расстояние, но на фоне условного масштаба, а не голым числом. Той же
 * визуальной массы и по той же трёхчастной структуре (визуализация →
 * опорные подписи по краям → строка-подпись), что календарь недели в
 * соседнем виджете «БЕЗ ТЕБЯ»: пара должна читаться вместе, одного веса,
 * а не как два случайно похожих по духу виджета.
 *
 * Азимут словом («ЮЮВ») и города никуда не делись — просто переехали
 * в подпись под шкалой вместо отдельного циферблата со стрелкой.
 */
export default function DistanceWidget({
  distanceKm,
  myCity,
  herCity,
  bearingDeg,
  className,
}: DistanceWidgetProps) {
  const pct = Math.min(100, Math.max(0, (distanceKm / SCALE_MAX_KM) * 100));

  return (
    <Widget title="МЕЖДУ НАМИ" className={className}>
      <div className="flex flex-1 flex-col justify-between gap-[0.85rem]">
        <div className="flex flex-1 flex-col items-center justify-center gap-[0.15rem] py-[0.4rem]">
          <span className="hero-number">{spaceThousands(distanceKm)}</span>
          <span className="hero-unit">км</span>
        </div>

        <div className="inset-panel px-[0.85rem] py-[0.65rem]">
          <div className="scale-track">
            <div className="scale-fill" style={{ width: `${pct}%` }} />
            <div className="scale-marker" style={{ left: `${pct}%` }} />
          </div>
          <div className="trend-endpoints">
            <span>0</span>
            <span>{SCALE_MAX_KM / 2}</span>
            <span>{SCALE_MAX_KM} км</span>
          </div>
          <div className="trend-caption-line">
            {compassLabel(bearingDeg)} · {myCity} → {herCity}
          </div>
        </div>
      </div>
    </Widget>
  );
}
