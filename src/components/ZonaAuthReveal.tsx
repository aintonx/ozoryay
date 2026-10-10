"use client";

import type { ReactNode } from "react";
import { ZONA_LIFT_ZOOM } from "@/components/ZonaLift";
import { LAYOUT } from "@/lib/sky/layout";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface ZonaAuthRevealProps {
  /** Момент, когда звезда начинает разгораться, а окно — расти из неё.
   *  Один и тот же флаг ведёт и это, и `zonaStarBoost` у неба на странице:
   *  яркость и рост стартуют в одном кадре, а не «сначала одно, потом
   *  другое». */
  revealed: boolean;
  children: ReactNode;
  className?: string;
}

/** От первого кадра до полностью раскрытой карточки. Столько же длится
 *  разгорание звезды в рендерере (`zonaRate` в `renderer.ts`). */
const REVEAL_MS = 640;

/** Смыкание тьмы вокруг звезды и карточки. */
const DIM_MS = 320;

/**
 * Экранная высота звезды «Зоны», в процентах высоты экрана.
 *
 * Это не `LAYOUT.zonaStar.y` сам по себе: `LiftedSky` растягивает весь
 * канвас через `scale(ZONA_LIFT_ZOOM)` с якорем у верхней кромки, и на
 * `/zona` растяжка уже полностью включена. Точка на доле `y` высоты
 * канваса уезжает на `y * ZONA_LIFT_ZOOM` — то есть на `0.19 × 1.4 = 26.6%`.
 * Слой с карточкой — `fixed inset-0`, тот же прямоугольник, что у канваса,
 * поэтому проценты у них одни и те же.
 */
const STAR_TOP_PCT = LAYOUT.zonaStar.y * ZONA_LIFT_ZOOM * 100;

/**
 * Три числа ниже — отражение `.glass.zona-window` в globals.css
 * (`--arrow-size: 1.05rem`, вершина стрелки на `0.707` от неё выше
 * основания). Если меняете стрелку там — поменяйте и здесь.
 */
const ARROW_REM = 1.05;
const TIP_BELOW_BOX_TOP_REM = ARROW_REM * (1 - 0.707);

/** От центра звезды до кончика хвостика — столько, чтобы кончик касался
 *  её ореола, а не залезал на сам огонь. */
const TIP_GAP_REM = 1;

/** Верх прямоугольника карточки ниже центра звезды. Вершина стрелки сидит
 *  на `TIP_BELOW_BOX_TOP_REM` ниже верха прямоугольника, поэтому сам
 *  прямоугольник ставим выше нужного кончика на эту величину. */
const BOX_BELOW_STAR_REM = TIP_GAP_REM - TIP_BELOW_BOX_TOP_REM;

/**
 * Карточка входа в «Зону» не проявляется — она выпадает из звезды.
 *
 * Раньше здесь работал `SpaceArrival` (прилёт из глубины космоса,
 * растворение размытия): он остаётся в кодовой базе нетронутым — вдруг
 * пригодится ещё для чего-то, — но в самой «Зоне» вместо него теперь этот
 * компонент.
 *
 * Звезда — часть настоящего неба (`LAYOUT.zonaStar`, `drawZonaStar` в
 * `renderer.ts`), горит всегда, как маяк «Смеха». Здесь она не
 * рисуется, а служит точкой отсчёта для двух вещей:
 *  1. карточка стоит так, что кончик её хвостика — прямо под звездой
 *     (`BOX_BELOW_STAR_REM`), а не там, где её оставило бы обычное
 *     центрирование: раньше звезда оказывалась внутри карточки, и
 *     хвостик ни из чего не рос;
 *  2. рост идёт из центра звезды — `transform-origin` сидит в её точке,
 *     чуть выше верха карточки, и схлопнутое окно целиком умещается в
 *     звезду, а потом из неё вытягивается: хвостик первым, окно за ним.
 *
 * Рост — единственное, что движет карточкой. Непрозрачность на ней не
 * трогается ни на кадр: у стекла от этого пропадает размытие, и оно
 * возвращается рывком (см. `.glass` в globals.css). Тьма вокруг блюра не
 * несёт, поэтому гаснет свободно.
 *
 * `prefers-reduced-motion`: без тьмы и без роста — карточка сразу на месте.
 */
export default function ZonaAuthReveal({
  revealed,
  children,
  className = "",
}: ZonaAuthRevealProps) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      {!reducedMotion && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[45]"
          style={{
            // Тёмное — только за пределами полосы «звезда + карточка»:
            // сверху до небольшого запаса над звездой и снизу от уверенно
            // «ниже любой карточки». Простая полоса вместо эллипса — её
            // границы читаются по тем же процентам, что и положение звезды.
            background: `linear-gradient(to bottom, var(--color-night-deep) 0%, transparent ${STAR_TOP_PCT - 7}%, transparent 78%, var(--color-night-deep) 100%)`,
            opacity: revealed ? 1 : 0,
            transition: `opacity ${DIM_MS}ms var(--ease-emerge)`,
          }}
        />
      )}

      {/* Слой ровно на весь экран — тот же прямоугольник, что у канваса
          неба, — поэтому `STAR_TOP_PCT` здесь и там означает одну и ту же
          высоту. */}
      <div className="fixed inset-0 z-50 flex flex-col items-center px-[1.15rem]">
        <div
          aria-hidden
          className="shrink-0"
          style={{ height: `calc(${STAR_TOP_PCT}% + ${BOX_BELOW_STAR_REM}rem)` }}
        />
        <div
          className={`relative shrink-0 ${className}`}
          style={{
            transformOrigin: `50% ${-BOX_BELOW_STAR_REM}rem`,
            transform: reducedMotion || revealed ? "scale(1)" : "scale(0.03)",
            transition: reducedMotion ? "none" : `transform ${REVEAL_MS}ms var(--ease-lift)`,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
