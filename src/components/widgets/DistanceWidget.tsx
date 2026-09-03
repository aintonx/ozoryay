"use client";

import { Widget } from "../ui/Widget";
import { spaceThousands } from "@/lib/text/plural";

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
  /**
   * Начальный азимут большого круга от меня к ней, в градусах от севера.
   * Сейчас не используется здесь — слово-румб («ЮЮВ») убрано из подписи
   * как лишнее рядом с городами. Проп оставлен как есть — `HomeScreen`
   * продолжает передавать его без изменений, — чтобы вернуть азимут
   * в подпись можно было одной строкой прямо в этом файле.
   */
  bearingDeg: number;
  className?: string;
}

/**
 * Сколько между нами.
 *
 * Циферблат-компас убран — вместо направления теперь полоса-шкала: то же
 * расстояние, но на фоне условного масштаба, а не голым числом. Панель —
 * той же фиксированной высоты (`.trend-panel`), что и календарь недели
 * в соседнем виджете «БЕЗ ТЕБЯ», числом, а не содержимым — поэтому
 * «1 754 км» и «64 дня» стоят на одной линии при любом содержимом обеих
 * панелей, а не только когда оно случайно совпало по длине.
 *
 * Города остались в подписи под шкалой; слово-румб («ЮЮВ») рядом с ними
 * убрано — с самим маршрутом оно ничего не добавляло, только удлиняло
 * строку.
 */
export default function DistanceWidget({
  distanceKm,
  myCity,
  herCity,
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

        <div className="inset-panel trend-panel px-[0.85rem] py-[0.65rem]">
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
            {myCity} → {herCity}
          </div>
        </div>
      </div>
    </Widget>
  );
}
