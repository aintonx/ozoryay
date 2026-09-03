"use client";

import { Widget } from "../ui/Widget";
import { formatShortRuDate, weekRangeInTz } from "@/lib/time/days";
import { plural } from "@/lib/text/plural";
import type { SeparationCounter } from "@/lib/time/useSeparationDays";
import { useMemo } from "react";

interface TimerWidgetProps {
  counter: SeparationCounter;
  /** Момент расставания — ISO-строка из настроек, для подписи «с 30 июня». */
  separationStartISO: string;
  /** Её пояс: та же система координат, в которой считаются сами дни. */
  tz: string;
  className?: string;
}

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/**
 * Сколько я без тебя.
 *
 * Число дней — по-прежнему крупнее всего на сайте и по-прежнему
 * единственное, что должно быть понятно с одного взгляда. Тикающие часы
 * под ним убраны: секунды спорили за внимание с самим фактом, а не
 * поддерживали его.
 *
 * Вместо часов — календарная неделя (пн–вс, сегодня подсвечен), в панели
 * той же фиксированной высоты (`.trend-panel`), что и шкала расстояния
 * в соседнем виджете, — поэтому «64 дня» и «1 754 км» стоят на одной
 * линии при любом содержимом обеих панелей, а не только когда оно
 * случайно совпало по длине. Даты начала и конца недели под календарём
 * не подписаны отдельно: подсвеченная сегодняшняя буква уже говорит,
 * какой это день, а числа рядом с ней ничего не добавляли, только шумели.
 *
 * Подпись внизу совмещает то же число дней словами («9 недель и 1 день»)
 * с датой начала («с 30 июня»): дата привязывает абстрактное число обратно
 * к конкретному дню в календаре, а слова переводят его в единицы, которые
 * проще держать в голове, чем сразу три цифры подряд.
 */
export default function TimerWidget({ counter, separationStartISO, tz, className }: TimerWidgetProps) {
  const { days } = counter;
  const weeks = Math.floor(days / 7);
  const restDays = days % 7;

  // Дата и неделя пересчитываются только когда меняются входные данные
  // или сам день (`days` от тикающего счётчика меняется ровно раз в сутки
  // в её поясе) — не на каждый секундный тик: Intl.DateTimeFormat не
  // бесплатен, а результат всё равно не меняется чаще.
  const sinceLabel = useMemo(
    () => formatShortRuDate(separationStartISO, tz),
    [separationStartISO, tz],
  );
  const { weekday } = useMemo(
    () => weekRangeInTz(new Date(), tz),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tz, days],
  );

  return (
    <Widget title="БЕЗ ТЕБЯ" depth className={className}>
      <div className="flex flex-1 flex-col justify-between gap-[0.85rem]">
        <div className="flex flex-1 flex-col items-center justify-center gap-[0.15rem] py-[0.4rem]">
          <span className="hero-number">{days}</span>
          <span className="hero-unit">{plural(days, "день", "дня", "дней")}</span>
        </div>

        <div className="inset-panel trend-panel px-[0.85rem] py-[0.65rem]">
          <div className="week-row">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={label} className={`week-cell${i + 1 === weekday ? " is-today" : ""}`}>
                {label}
              </span>
            ))}
          </div>
          <div className="trend-caption-line">
            {weeks} {plural(weeks, "неделя", "недели", "недель")}
            {restDays > 0 && ` и ${restDays} ${plural(restDays, "день", "дня", "дней")}`} · с {sinceLabel}
          </div>
        </div>
      </div>
    </Widget>
  );
}
