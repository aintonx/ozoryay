"use client";

import { Widget } from "../ui/Widget";
import { IconLock } from "../ui/Icons";

interface LockWidgetProps {
  /** Один раз становится true — и запись навсегда сменяется подписью замка. */
  revealed: boolean;
  className?: string;
}

const NOTE_TEXT =
  "Рассвет случится с твоим приездом, а пока здесь тьма и пустота — как интерпретация моей души без тебя, как сердце, запертое в темнице. «Озоряй» — это про тебя: про свет и про любовь.";

/** Общая длительность и кривая для обоих слоёв — иначе один обгонит другого. */
const DRUM_TRANSITION = "transform 650ms cubic-bezier(0.5,0,0.2,1), opacity 500ms ease, filter 500ms ease";

/**
 * Замок и послание — одна и та же карточка, две фазы.
 *
 * При входе на сайт здесь стоит короткая записка — то самое послание,
 * что раньше было отдельной плиткой в сетке. Она и есть первое, что видно,
 * ещё до всякого замка. Спустя нужное время (таймер — в `Night`, приходит
 * сюда через `revealed`) она укатывается вверх и растворяется, а на её
 * место снизу тем же движением въезжает иконка замка с подписью — как
 * переворачивающаяся табличка в будильнике, где одна пластина сменяет
 * другую, а не просто гаснет одна и загорается другая.
 *
 * Высота карточки — жёстко зафиксирована и ОДНА И ТА ЖЕ в обеих фазах
 * (`h-`, не `min-h-`, плюс `overflow-hidden`): `HomeScreen` меряет
 * естественную высоту всей сетки через ResizeObserver и подгоняет под неё
 * масштаб экрана. Если бы высота карточки менялась при смене фазы, это
 * вызвало бы ровно тот же бесконечный дребезг, что уже однажды чинили
 * у плиток выше по сетке, — только не от переноса строки, а от самого
 * факта переключения. Оба слоя лежат друг на друге абсолютным
 * позиционированием и по очереди уезжают за пределы видимой области —
 * до переключения второй слой на 100% ниже своей карточки и невидим
 * вдвойне: и сдвигом, и прозрачностью, и обрезкой `overflow-hidden`.
 * 11rem, а не прежние 10.5rem — при более крупном тексте послания
 * (13.5px вместо 12.5px) шести строкам нужно чуть больше запаса.
 */
export default function LockWidget({ revealed, className = "" }: LockWidgetProps) {
  return (
    <Widget className={`h-[11rem] overflow-hidden ${className}`}>
      <div className="relative h-full w-full">
        <div
          aria-hidden={revealed}
          className="font-system caption absolute inset-0 flex items-center justify-center px-[0.35rem] text-center text-[13.5px] leading-[1.6] text-star/82"
          style={{
            transition: DRUM_TRANSITION,
            transform: revealed ? "translateY(-100%)" : "translateY(0)",
            opacity: revealed ? 0 : 1,
            filter: revealed ? "blur(3px)" : "blur(0)",
          }}
        >
          {NOTE_TEXT}
        </div>

        <div
          aria-hidden={!revealed}
          className="absolute inset-0 flex flex-col items-center justify-center gap-[0.55rem]"
          style={{
            transition: DRUM_TRANSITION,
            transform: revealed ? "translateY(0)" : "translateY(100%)",
            opacity: revealed ? 1 : 0,
            filter: revealed ? "blur(0)" : "blur(3px)",
          }}
        >
          <span className="flex h-[2.9rem] w-[2.9rem] items-center justify-center rounded-full bg-amber/12 text-[1.3rem] text-amber/85">
            <IconLock />
          </span>
          {/* Тот же размер и та же непрозрачность, что у строки-детали
              в остальных виджетах — одна и та же роль везде. */}
          <span className="font-system text-[12.5px] text-star/56">
            продолжение откроется позже
          </span>
        </div>
      </div>
    </Widget>
  );
}
