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
 *
 * `min-h-[8rem]` — раньше было 13rem, для высоты вровень с «Ты
 * восхищаешь». Содержимому самой «Зоны» (заголовок, три полоски-плейсхолдера,
 * подпись) для этого нужно около 6.1rem — то есть почти 5rem из 13rem
 * были чистым запасом ради выравнивания, а не ради содержимого. На
 * экране автора задачи этот запас — часть причины, по которой сетка
 * не помещалась целиком (`natural=925` при `available=576`, реальные
 * цифры с его телефона). 8rem — с небольшим отступом над настоящей
 * потребностью, не впритык. Если высоты вровень с «Ты восхищаешь» снова
 * захочется — тогда правильнее растить не эту карточку под чужую, а
 * прямо здесь задать `min-h-[13.5rem]` осознанно, зная цену в пикселях
 * `natural`-высоты всей сетки.
 */
export default function ZonaWidget({ className = "" }: ZonaWidgetProps) {
  const tiltRef = useTilt(true, TILT_MAX_DEG_DEEP / TILT_MAX_DEG);

  return (
    <div
      ref={tiltRef as Ref<HTMLDivElement>}
      className={`glass glass-deep tilt flex min-h-[8rem] w-full min-w-0 flex-col rounded-[1.55rem] p-[0.9rem] ${className}`}
    >
      <div className="mb-[0.6rem] text-center font-system text-[15px] font-semibold tracking-[0.04em] text-amber/85">
        ЗОНА
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-[0.8rem]">
        <div className="flex w-full max-w-[13rem] flex-col items-center gap-[0.4rem]" aria-hidden="true">
          <span className="h-[0.55rem] w-[70%] rounded-full bg-star/16" />
          <span className="h-[0.55rem] w-[90%] rounded-full bg-star/16" />
          <span className="h-[0.55rem] w-[50%] rounded-full bg-star/16" />
        </div>
        {/*
          Тот же шрифт и то же исполнение, что у подписи «он улетит ко мне»
          под «Отправить поцелуй» (`hint` в `WidgetButton`, layout=tile) —
          полностью, включая цвет (`text-star/60`) и размер: если тот
          вырастет, этот растёт вместе с ним.
        */}
        <span className="font-system text-[15px] leading-snug text-star/60">
          Откроется позже
        </span>
      </div>
    </div>
  );
}
