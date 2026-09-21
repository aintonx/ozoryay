"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type ScreenIndex = 0 | 1;

interface ScreensProps {
  /** Главный экран: виджеты. */
  home: ReactNode;
  /** Второй экран: небо и то, что можно в нём зажечь. */
  sky: ReactNode;
  index: ScreenIndex;
  onChange: (i: ScreenIndex) => void;
  /**
   * Убрать интерфейс с глаз: он уезжает вниз за край экрана.
   *
   * Нужен на время вступления, поцелуя и любой вспышки — всего, ради чего
   * стоит смотреть на небо, а не на кнопки. Именно движением, а не
   * прозрачностью: у стекла внутри от прозрачности пропадает размытие.
   */
  hidden?: boolean;
}

/** Пикселей пальцем, после которых свайп считается намеренным. */
const THRESHOLD = 52;
/** Сопротивление: экран идёт за пальцем медленнее пальца, как у резинки. */
const RUBBER = 0.42;
/** Пока жест короче этого, не решаем, наш он или чужой. */
const SLOP = 5;

/**
 * Порог для колеса мыши/тачпада, в пикселях `deltaY`, после которого жест
 * считается намеренным переходом между экранами, — свой, отдельный от
 * `THRESHOLD` пальца: колесо мыши отдаёт куда более крупные и редкие
 * значения за одно движение, чем палец на сенсорном экране.
 */
const WHEEL_THRESHOLD = 60;
/**
 * Пауза после сработавшего перехода: одно колёсико/один свайп по тачпаду
 * должны переключить экран ровно один раз, а не несколько подряд, пока
 * рука ещё не оторвалась от мыши. Примерно равна времени самого перехода
 * (см. `EASE` ниже).
 */
const WHEEL_COOLDOWN = 650;
/**
 * Если колесо молчит дольше этого — накопленное смещение обнуляется: две
 * короткие, разнесённые по времени прокрутки не должны складываться в один
 * жест, как будто их и не разделяла пауза.
 */
const WHEEL_IDLE_RESET = 220;

const EASE = "transform 620ms cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * Два экрана над одним небом.
 *
 * Небо остаётся на месте — уезжает только интерфейс: виджеты уходят вверх,
 * открывая то, что за ними. Так переход читается не как смена страницы,
 * а как «поднять глаза».
 *
 * Жесты слушаются здесь целиком: у контейнера `touch-action: none`, поэтому
 * браузер не пытается прокрутить страницу вместо нас и не отбирает касание
 * на середине движения. Ради этого содержимое экранов обязано помещаться
 * в экран — прокручивать внутри нечего.
 *
 * Раньше палец на экране двигал офсет в пикселях (`${drag}px`), а экран
 * в состоянии покоя стоял на `-100%`/`calc(100% + ...)` — смена жеста на
 * анимацию отпускания была сменой единицы измерения прямо посреди одного
 * CSS-перехода. Браузеры обычно справляются и с этим, но не гарантированно
 * гладко везде; понадёжнее — вообще не давать поводов для сомнения. Здесь
 * высота экрана меряется один раз через `ResizeObserver` (`screenHeight`),
 * и офсет всегда в пикселях, что во время жеста, что в покое, — переход
 * между ними остаётся внутри одной и той же единицы измерения от начала
 * и до конца.
 *
 * Второе: раньше каждое `pointermove` пальца напрямую вызывало `setDrag` —
 * состояние React, а значит и перерисовку, на каждое из них. Тачскрин
 * присылает эти события чаще, чем браузер успевает рисовать кадры, и
 * россыпь перерисовок, обгоняющих кадровую частоту, на слабом устройстве
 * и читалась как дребезжание. Теперь между пальцем и `setDrag` встал
 * `requestAnimationFrame`: сколько бы `pointermove` ни пришло между двумя
 * кадрами, состояние обновится максимум один раз — ровно к следующей
 * отрисовке, не чаще.
 */
export default function Screens({ home, sky, index, onChange, hidden = false }: ScreensProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [screenHeight, setScreenHeight] = useState(0);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScreenHeight(el.clientHeight));
    ro.observe(el);
    setScreenHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const startY = useRef(0);
  const startX = useRef(0);
  /** null — ещё не решили; true — свайп наш; false — жест не вертикальный. */
  const owns = useRef<boolean | null>(null);
  /** Кадр, в котором уже запланировано применить следующий накопленный `drag`. */
  const dragFrame = useRef(0);
  /** Последнее значение пальца между кадрами — то, что применит следующий rAF. */
  const pendingDrag = useRef(0);

  const [drag, setDrag] = useState(0);
  // Отдельный флаг вместо чтения рефа в рендере: пока палец на экране,
  // движение обязано идти без анимации, иначе оно отстаёт от пальца.
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") onChange(1);
      if (e.key === "ArrowUp" || e.key === "PageUp") onChange(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange]);

  /*
   * Колесо мыши/тачпад как ещё один способ сделать тот же жест, что и палец:
   * попытка прокрутить страницу на десктопе раньше ни к чему не приводила —
   * страницу и так никуда не проскроллить (см. `overflow: hidden` на body
   * в globals.css), поэтому колесо просто ничего не делало, и переключить
   * экран можно было только кнопкой. Здесь оно ведёт себя как палец: одно
   * уверенное движение — один переход, без анимации внутри самого жеста
   * (та же логика, что и в свайпе выше), только порог и охлаждение свои,
   * под масштаб событий колеса, а не касания.
   */
  useEffect(() => {
    if (hidden) return;
    let cooling = false;
    let acc = 0;
    let idleTimer: number | undefined;

    const onWheel = (e: WheelEvent) => {
      // Pinch-to-zoom на трекпаде тоже приходит как wheel с зажатым Ctrl —
      // это жест масштабирования, а не пролистывания, трогать его нельзя.
      if (e.ctrlKey || cooling) return;

      if (Math.sign(e.deltaY) !== Math.sign(acc)) acc = 0;
      acc += e.deltaY;
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        acc = 0;
      }, WHEEL_IDLE_RESET);

      if (Math.abs(acc) < WHEEL_THRESHOLD) return;

      const next: ScreenIndex = acc > 0 ? 1 : 0;
      acc = 0;
      if (next === index) return;

      cooling = true;
      onChange(next);
      window.setTimeout(() => {
        cooling = false;
      }, WHEEL_COOLDOWN);
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.clearTimeout(idleTimer);
    };
  }, [index, onChange, hidden]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (hidden) return;
    // Только настоящие поля ввода не должны начинать свайп — жест внутри
    // них должен остаться жестом выделения текста. Кнопки и ссылки больше
    // не исключены: раскладка теперь почти целиком — виджеты-кнопки, и
    // прежнее исключение оставляло свайпу лишь узкие щели между карточками.
    // Разница между тапом и свайпом решается ниже, по `SLOP` и направлению
    // движения, а не по тому, что оказалось под пальцем в момент касания.
    if ((e.target as HTMLElement).closest("input, textarea, select")) return;
    startY.current = e.clientY;
    startX.current = e.clientX;
    owns.current = null;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dy = e.clientY - startY.current;
    const dx = e.clientX - startX.current;

    if (owns.current === null) {
      if (Math.abs(dy) < SLOP && Math.abs(dx) < SLOP) return;
      owns.current = Math.abs(dy) > Math.abs(dx);
      if (!owns.current) return;
      // Захватываем указатель только теперь, когда жест точно наш —
      // короткий тап по кнопке до этой строки никогда не доходит, поэтому
      // клик под пальцем срабатывает как обычно, без вмешательства свайпа.
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (!owns.current) return;

    // Тянуть можно только туда, куда есть куда идти.
    const allowed = index === 0 ? Math.min(0, dy) : Math.max(0, dy);
    pendingDrag.current = allowed * RUBBER;
    // На один кадр — максимум одно обновление состояния, сколько бы
    // `pointermove` за это время ни пришло (см. комментарий над компонентом).
    if (!dragFrame.current) {
      dragFrame.current = requestAnimationFrame(() => {
        dragFrame.current = 0;
        setDrag(pendingDrag.current);
      });
    }
  }

  function onPointerUp() {
    if (!dragging) return;
    if (dragFrame.current) {
      cancelAnimationFrame(dragFrame.current);
      dragFrame.current = 0;
    }
    // Последний накопленный кадр мог не успеть дойти до `setDrag` — решение
    // «долистали или нет» должно смотреть на самое свежее положение пальца,
    // а не на то, что React успел отрисовать последним.
    const finalDrag = pendingDrag.current;
    if (index === 0 && finalDrag < -THRESHOLD * RUBBER) onChange(1);
    if (index === 1 && finalDrag > THRESHOLD * RUBBER) onChange(0);
    owns.current = null;
    setDragging(false);
    setDrag(0);
    pendingDrag.current = 0;
  }

  useEffect(() => {
    return () => {
      if (dragFrame.current) cancelAnimationFrame(dragFrame.current);
    };
  }, []);

  // Раньше здесь была асимметрия: у неактивного неба офсет в состоянии
  // покоя всё равно учитывал `drag` (`calc(100% + drag)`) — небо оставалось
  // визуально приклеенным к главному экрану весь жест. А у неактивного
  // главного экрана офсет был жёсткой константой (`-100%`), без `drag`
  // вовсе — на обратном свайпе (небо → виджеты) главный экран весь жест
  // простаивал за кадром невидимым и запускал свою анимацию появления
  // с нуля только на отпускании, независимо от того, докуда палец уже
  // дотянул небо. Это и был скачок именно в одном направлении свайпа —
  // самый вероятный источник ощущения рваности. Здесь оба офсета ведут
  // себя одинаково: неактивный экран тоже держится вплотную к активному
  // через `drag`, в каком бы направлении жест ни шёл.
  //
  // Пока высота ещё не измерена (самый первый кадр до эффекта выше),
  // офсет в покое — те же 0/100%, что были раньше: подстраховка на случай,
  // если что-то отрисуется до первого `ResizeObserver`.
  const homeOffset = index === 0 ? drag : screenHeight ? -screenHeight + drag : "-100%";
  const skyOffset = index === 1 ? drag : screenHeight ? screenHeight + drag : "100%";

  // `height: 100dvh` в style ниже — не дублирование `inset-0`. У `position:
  // fixed` с одним только `inset: 0` не гарантирована настоящая динамическая
  // высота на iOS Safari (см. правку `html`/`body` в globals.css — тот же
  // сюжет, тот же зазор внизу экрана, если пропустить этот слой). Число
  // должно быть явным и здесь, а не только выше по дереву.
  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-10 overflow-hidden"
      style={{
        height: "100dvh",
        touchAction: "none",
        transform: hidden ? "translate3d(0, 100%, 0)" : "translate3d(0, 0, 0)",
        transition: EASE,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Главный экран */}
      <div
        className="absolute inset-0"
        inert={index !== 0 || hidden}
        style={{
          transform: `translate3d(0, ${typeof homeOffset === "number" ? `${homeOffset}px` : homeOffset}, 0)`,
          transition: dragging ? "none" : EASE,
          willChange: "transform",
        }}
      >
        {home}
      </div>

      {/* Экран неба */}
      <div
        className="absolute inset-0"
        inert={index !== 1 || hidden}
        style={{
          transform: `translate3d(0, ${typeof skyOffset === "number" ? `${skyOffset}px` : skyOffset}, 0)`,
          transition: dragging ? "none" : EASE,
          willChange: "transform",
        }}
      >
        {sky}
      </div>
    </div>
  );
}
