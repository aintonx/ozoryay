"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ZonaLiftProps {
  /** Пошёл подъём взгляда: виджеты уже уезжают вместе с остальными (см.
   *  `veiled` в `Night`), а само небо запрокидывается вслед за ними. */
  active: boolean;
  /** Небо целиком — оно оборачивается здесь, а не подменяется: тот же
   *  канвас, та же картинка звёзд, только идёт по другой дуге движения. */
  children: ReactNode;
  /** Взгляд запрокинут до конца, тьма сомкнулась — можно открывать страницу. */
  onDone: () => void;
}

/** От первого кадра до вызова onDone. */
const LIFT_MS = 1800;
/** Насколько запрокидывается небо. Отрицательный угол — верхний край уходит
 *  от зрителя, будто он сам откидывает голову назад. */
const TILT_DEG = -52;
/** Небольшое приближение вдогонку наклону — вместе с ним читается как один
 *  жест, а не как два разных движения сразу. */
const ZOOM = 1.22;

/**
 * Подъём взгляда к «Зоне».
 *
 * Не перелёт сквозь звёзды — это уже занято `ConstellationJourney` для
 * «Созвездия Вечного Смеха». Здесь другой, более прямой жест: как будто
 * запрокидываешь голову и смотришь прямо в небо над собой. Небо наклоняется
 * вокруг нижней кромки экрана — от «ног» зрителя, а не от середины, — будто
 * горизонт откидывается назад, а не просто уезжает вверх. Тьма по краям
 * смыкается к концу движения и прячет под собой стык со страницей `/zona`,
 * которая откроется уже после `onDone`.
 *
 * Числа (угол, приближение, время) — первая прикидка, не сверенная глазами
 * ни на одном экране: наклон живёт в CSS-переменных вверху файла нарочно,
 * чтобы его было легко подкрутить после первого живого просмотра.
 */
export default function ZonaLift({ active, children, onDone }: ZonaLiftProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (!active) {
      fired.current = false;
      return;
    }
    if (fired.current) return;
    fired.current = true;
    const t = window.setTimeout(onDone, LIFT_MS);
    return () => window.clearTimeout(t);
  }, [active, onDone]);

  return (
    <div className="fixed inset-0" style={{ perspective: active ? "800px" : undefined }}>
      <div
        className="fixed inset-0"
        style={{
          transform: active
            ? `translateY(-3%) scale(${ZOOM}) rotateX(${TILT_DEG}deg)`
            : "translateY(0) scale(1) rotateX(0deg)",
          transformOrigin: "50% 100%",
          transition: active ? `transform ${LIFT_MS}ms var(--ease-lift)` : "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>

      {/* Тьма по краям: смыкается ровно к моменту, когда взгляд запрокинут
          до конца, и прячет под собой переход на следующую страницу. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          background: "radial-gradient(circle at 50% 100%, transparent 0%, var(--color-night-deep) 78%)",
          opacity: active ? 1 : 0,
          transition: active ? `opacity ${LIFT_MS}ms var(--ease-lift)` : "none",
        }}
      />
    </div>
  );
}