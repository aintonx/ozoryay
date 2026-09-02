"use client";

import { Widget } from "../ui/Widget";
import { formatShortRuDate } from "@/lib/time/days";
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

/**
 * Сколько я без тебя.
 *
 * Заполняющихся колец здесь больше нет — карточка держится на одном факте:
 * числе дней, набранном крупнее всего на сайте. Это единственное, что
 * должно быть понятно с одного взгляда, без объяснений и без дуг, которые
 * нужно было ещё и расшифровать.
 *
 * Всё остальное — тикающее время и дата, с которой всё началось, —
 * не соперничает с числом за внимание, а стоит рядом, в собственной,
 * чуть более тёмной панели: втором, младшем контейнере внутри первого.
 * Абстрактное число дней иначе ничем не привязано к реальности; «с 30
 * июня» возвращает его обратно в конкретный день в календаре.
 */
export default function TimerWidget({ counter, separationStartISO, tz, className }: TimerWidgetProps) {
  const { days, hours, minutes, seconds } = counter;

  const pad = (n: number) => String(n).padStart(2, "0");
  const dayWord = days % 10 === 1 && days % 100 !== 11 ? "день" : "дней";

  // Дата пересчитывается только когда меняются её входные данные, а не
  // на каждый секундный тик counter — Intl.DateTimeFormat не бесплатен,
  // а строка всё равно не меняется чаще, чем раз в сутки.
  const sinceLabel = useMemo(
    () => formatShortRuDate(separationStartISO, tz),
    [separationStartISO, tz],
  );

  return (
    <Widget title="БЕЗ ТЕБЯ" depth className={className}>
      <div className="flex flex-1 flex-col justify-between gap-[0.85rem]">
        <div className="relative flex flex-1 flex-col items-center justify-center gap-[0.15rem] py-[0.4rem]">
          <div className="hero-glow" aria-hidden="true" />
          <span className="hero-number relative tabular-nums">{days}</span>
          <span className="hero-unit relative">{dayWord}</span>
        </div>

        <div className="inset-panel flex flex-col items-center gap-[0.15rem] px-[0.9rem] py-[0.6rem]">
          <span className="font-mono text-[16px] leading-none font-light tabular-nums text-star/85">
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </span>
          <span className="font-system text-[12.5px] text-star/48">с {sinceLabel}</span>
        </div>
      </div>
    </Widget>
  );
}
