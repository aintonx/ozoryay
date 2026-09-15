"use client";

import { useTilt, TILT_MAX_DEG_DEEP, TILT_MAX_DEG } from "../ui/Widget";
import type { Ref } from "react";

interface ZonaWidgetProps {
  /**
   * Взгляд пошёл вверх, к «Зоне» — см. `ZonaLift` в `Night`. Сейчас не
   * используется здесь: страница `/zona` ещё не готова открываться (см.
   * комментарий ниже). Проп и его тип оставлены как есть — `HomeScreen`
   * и `Night` продолжают передавать его без изменений, — чтобы включить
   * переход обратно можно было одной строкой прямо в этом файле.
   */
  onOpen: () => void;
  className?: string;
}

/**
 * Вход в «Зону» — пока не вход.
 *
 * Страница `/zona` ещё не готова открываться по-настоящему, поэтому
 * карточка временно не кнопка и никуда не ведёт: тот же корпус (`glass`,
 * `glass-deep`, `tilt`), что и у остальных карточек сайта, но без
 * `onClick`. Прежнее «поле ввода» с мигающим курсором и приглашением
 * писать — тоже убрано целиком: обещать разговор, который пока никуда
 * не открывается, хуже, чем честно сказать, что его ещё нет.
 *
 * Вместо этого — несколько тускло-приглушённых полос вместо текста: тот
 * же приём, которым сама iOS прячет содержимое уведомления на
 * заблокированном экране, если в настройках выключен его показ. Поверх —
 * короткая подпись без экивоков: «Откроется позже».
 */
export default function ZonaWidget({ className = "" }: ZonaWidgetProps) {
  const tiltRef = useTilt(true, TILT_MAX_DEG_DEEP / TILT_MAX_DEG);

  return (
    <div
      ref={tiltRef as Ref<HTMLDivElement>}
      className={`glass glass-deep tilt flex min-h-[9.6rem] w-full min-w-0 flex-col rounded-[1.55rem] p-[1.05rem] ${className}`}
    >
      <div className="mb-[0.6rem] text-center font-system text-[13px] font-semibold tracking-[0.04em] text-amber/85">
        ЗОНА
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-[0.8rem]">
        <div className="flex w-full max-w-[13rem] flex-col items-center gap-[0.4rem]" aria-hidden="true">
          <span className="h-[0.55rem] w-[70%] rounded-full bg-star/16" />
          <span className="h-[0.55rem] w-[90%] rounded-full bg-star/16" />
          <span className="h-[0.55rem] w-[50%] rounded-full bg-star/16" />
        </div>
        {/*
          Тот же стиль, что у подписи под «Отправить поцелуй» и «Взгляни
          на небо» (`hint` в `WidgetButton`, layout=tile): тот же размер,
          тот же вес (обычный, не medium) и та же плотная строка
          (`leading-snug`). Цвет — по-прежнему `text-star/90`, не общий
          с теми подписями `text-star/60`: это отдельная, более ранняя
          правка («сделать белым»), которую эта задача не отменяла.
        */}
        <span className="font-system text-[13.5px] leading-snug text-star/90">
          Откроется позже
        </span>
      </div>
    </div>
  );
}
