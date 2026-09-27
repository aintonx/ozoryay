"use client";

import { useTilt, TILT_MAX_DEG_DEEP, TILT_MAX_DEG } from "../ui/Widget";
import type { Ref } from "react";

interface ZonaWidgetProps {
  /** Взгляд пошёл вверх, к «Зоне» — см. `ZonaLift` в `Night`. */
  onOpen: () => void;
  className?: string;
}

/**
 * Вход в «Зону».
 *
 * Тот же корпус (`glass`, `glass-deep`, `tilt`), что и у остальных карточек
 * сайта, но кнопка, а не витрина: тап поднимает взгляд к небу и открывает
 * страницу входа (см. `onOpenZona`/`ZonaLift` в `Night`). За самой дверью
 * пока предпросмотр без базы — `/zona` честно говорит об этом сама
 * («совсем скоро — как только подключим базу…»), поэтому здесь не нужно
 * притворяться больше, чем есть на самом деле.
 *
 * Приглушённые полосы вместо текста — тот же приём, которым сама iOS прячет
 * содержимое уведомления на заблокированном экране, если в настройках
 * выключен его показ: за дверью правда что-то есть, просто пока не тебе
 * читать. Подпись под ними теперь не про закрытость («Откроется позже»),
 * а про действие — ровно то, что кнопка и делает.
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
export default function ZonaWidget({ onOpen, className = "" }: ZonaWidgetProps) {
  const tiltRef = useTilt(true, TILT_MAX_DEG_DEEP / TILT_MAX_DEG);

  return (
    <button
      ref={tiltRef as Ref<HTMLButtonElement>}
      type="button"
      onClick={(e) => {
        // После касания снимаем фокус — как и у остальных карточек-кнопок
        // сайта (см. `WidgetButton`): иначе на стекле остаётся кольцо
        // фокуса, которое здесь читается как рамка интерфейса, а не как
        // часть карточки. Клавиатурный вызов (`e.detail === 0`) фокус
        // сохраняет.
        if (e.detail > 0) e.currentTarget.blur();
        onOpen();
      }}
      className={`glass glass-deep tilt flex min-h-[8rem] w-full min-w-0 flex-col rounded-[1.55rem] p-[0.9rem] text-left ${className}`}
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
          нажми, чтобы открыть
        </span>
      </div>
    </button>
  );
}
