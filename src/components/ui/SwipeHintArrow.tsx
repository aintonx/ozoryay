"use client";

import { IconChevronUp } from "./Icons";

/**
 * Единый размер стрелки-подсказки о свайпе — что здесь, что в заставке
 * (`TitleDawn`), где рядом с ней остаётся подпись. Раньше в разных местах
 * стояли то 13, то 14 пикселей — на глаз почти одно и то же, но не совсем;
 * теперь это одно число на весь сайт.
 */
export const SWIPE_HINT_ARROW_SIZE = 16;

interface SwipeHintArrowProps {
  /** Куда указывает и куда зовёт свайпнуть: вверх — к небу, вниз — обратно к виджетам. */
  direction: "up" | "down";
  onClick: () => void;
  className?: string;
}

/**
 * Голая стрелка-подсказка, без подписи рядом — только для главного экрана
 * и экрана неба (см. `HomeScreen`/`SkyScreen`). Раньше здесь стоял текст
 * («смахни вверх» / «смахни вниз»); теперь вместо слов — сама стрелка тихо
 * дышит и слегка покачивается в ту сторону, куда зовёт, как это принято
 * на дорогих сайтах: не объявление, а намёк. Подпись рядом со стрелкой
 * остаётся во всех остальных местах сайта (заставка, зажжённый контент,
 * путешествие к созвездию) — этот компонент их не трогает и не заменяет.
 *
 * Форма стрелки не меняется — тот же `IconChevronUp`, что был здесь и
 * раньше, — задача была только убрать подпись и увеличить и выровнять
 * размер, не рисовать новую иконку.
 */
export function SwipeHintArrow({ direction, onClick, className = "" }: SwipeHintArrowProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        if (e.detail > 0) e.currentTarget.blur();
        onClick();
      }}
      aria-label={direction === "up" ? "Смахнуть вверх, к небу" : "Смахнуть вниз, к виджетам"}
      className={`swipe-hint-arrow swipe-hint-arrow--${direction} z-[1] mx-auto flex shrink-0 items-center justify-center p-[0.875rem] text-star transition-opacity duration-300 hover:opacity-80 ${className}`}
    >
      <IconChevronUp size={SWIPE_HINT_ARROW_SIZE} />
    </button>
  );
}
