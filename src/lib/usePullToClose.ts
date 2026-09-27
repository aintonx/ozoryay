"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/** Насколько нужно потянуть вниз (px), чтобы закрытие засчиталось. */
const CLOSE_THRESHOLD_PX = 96;
/** Или отпустить достаточно резко (px/ms) — даже не дотянув до полного
 *  расстояния: так же ведут себя шторки на телефоне. */
const CLOSE_VELOCITY = 0.5;
/** Доводка после отпускания, когда жест был скорее вялым: возврат на место
 *  или уход за край экрана. */
const SETTLE_MS = 320;
/** Нижняя граница доводки при быстром флике — резкий бросок должен закрыться
 *  заметно быстрее, чем неторопливо дотянутый до порога палец (apple-design:
 *  «release should always be snappy», скорость отпускания передаётся дальше
 *  в анимацию, а не гасится одной и той же длительностью для любого жеста). */
const SETTLE_MS_MIN = 180;
/** На каком расстоянии карточка становится полностью прозрачной, если
 *  тянуть и не отпускать — не даёт утянуть её в никуда одним пальцем. Тот
 *  же путь служит и диапазоном для `progress` ниже: небо на `/zona`
 *  дотягивает опускание камеры до конца ровно к той же точке, где карточка
 *  гаснет целиком, — обе доводки одной и той же длины, а не рассинхронены
 *  каждая на свой лад. */
const FADE_DISTANCE_PX = 420;
/** Кривая, которой уже пользуется весь остальной сайт для шторок и
 *  вложенных панелей (Ionic-style «ease-drawer»). */
const EASE_DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * Жест «потяни вниз, чтобы закрыть». Не привязан к разметке: возвращает
 * готовые пропсы для элемента-ручки (`handleProps` — вешать на маленькую
 * полоску-хват, не на всю карточку целиком, иначе перетаскивание спорило
 * бы с обычным тапом по полям формы) и стиль для самой карточки (`style`).
 *
 * Порог закрытия — либо расстояние, либо скорость: то же самое, что
 * у листания карточек и шторок на телефоне, — так что жест не нужно
 * объяснять, он уже знаком.
 *
 * `progress` (0…1) — тот же путь, только нормированный, для всего, что
 * должно двигаться в такт карточке, но не быть ею: на `/zona` это опускание
 * камеры обратно (`LiftedSky`, см. там же), которое обязано идти пальцем
 * 1:1, а не собственной анимацией вдогонку.
 */
export function usePullToClose(onClose: () => void) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const [settleMs, setSettleMs] = useState(SETTLE_MS);
  const isDragging = useRef(false);
  const dragYRef = useRef(0);
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const closeTimer = useRef<number | undefined>(undefined);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Если карточку убрали со сцены до того, как доводка успела вызвать
  // `onClose` (переход на другой экран каким-то иным путём), затянувшийся
  // таймер не должен выстрелить в пустоту.
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    // Повторный хват во время доводки к закрытию — переигрываем её начисто:
    // отменяем отложенный `onClose` и возвращаем управление пальцу. Ручка
    // к этому моменту уже почти или полностью укатилась за нижний край
    // экрана, так что настоящего «поймать на лету» здесь не бывает — но
    // само закрытие обязано быть отменяемым, а не гарантированным silently
    // после отпускания (apple-design: «never lock out input during
    // a transition»).
    window.clearTimeout(closeTimer.current);
    setClosing(false);
    startY.current = e.clientY;
    lastY.current = e.clientY;
    lastT.current = e.timeStamp;
    velocity.current = 0;
    dragYRef.current = 0;
    setDragY(0);
    isDragging.current = true;
    setDragging(true);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dy = Math.max(0, e.clientY - startY.current);
    const dt = e.timeStamp - lastT.current || 1;
    velocity.current = (e.clientY - lastY.current) / dt;
    lastY.current = e.clientY;
    lastT.current = e.timeStamp;
    dragYRef.current = dy;
    setDragY(dy);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    // Знак важен: скорость вверх (палец разгоняется обратно, к отмене)
    // не должна засчитываться как решительный бросок вниз — иначе резкий
    // отдёрг руки в сторону возврата закрывал бы карточку сам того не желая.
    const v = velocity.current;
    const shouldClose = dragYRef.current > CLOSE_THRESHOLD_PX || v > CLOSE_VELOCITY;
    if (shouldClose) {
      // Резкий бросок доводится быстрее неторопливого дотягивания: скорость
      // пальца при отпускании передаётся в длительность доводки, а не
      // теряется на пороге закрытия (apple-design, «velocity handoff»).
      // `CLOSE_VELOCITY` (0.5px/ms) даёт `SETTLE_MS`; втрое резче —
      // нижнюю границу `SETTLE_MS_MIN`, дальше не короче. Дистанционное
      // закрытие без резкого броска (`v <= CLOSE_VELOCITY`) держит обычный
      // `SETTLE_MS` — торопить его нечем.
      const eased = Math.max(SETTLE_MS_MIN, SETTLE_MS - (v - CLOSE_VELOCITY) * 220);
      const ms = v > CLOSE_VELOCITY ? Math.round(eased) : SETTLE_MS;
      setSettleMs(ms);
      setClosing(true);
      closeTimer.current = window.setTimeout(() => onCloseRef.current(), ms);
    } else {
      dragYRef.current = 0;
      setDragY(0);
      // На случай, если предыдущая попытка закрыть была резким броском
      // (см. выше) и её тут же переиграли повторным хватом (`onPointerDown`) —
      // пружина назад, к открытому состоянию, всегда идёт с обычным темпом,
      // а не с укороченным временем чужого, отменённого закрытия.
      setSettleMs(SETTLE_MS);
    }
  }, []);

  const transition = dragging
    ? "none"
    : `transform ${settleMs}ms ${EASE_DRAWER}, opacity ${settleMs}ms ${EASE_DRAWER}`;

  return {
    dragging,
    closing,
    dragY,
    /** 0 — карточка на месте, 1 — оттянута до полного исчезновения (или уже
     *  закрывается). Общий путь с `FADE_DISTANCE_PX`, чтобы всё, что должно
     *  двигаться в такт, доходило до конца ровно там же, где гаснет сама
     *  карточка. */
    progress: closing ? 1 : Math.min(1, dragY / FADE_DISTANCE_PX),
    /** Та же строка `transition`, что и в `style` ниже — для узлов, которые
     *  должны ехать с карточкой в один такт (небо на `/zona`), но не быть ею. */
    transition,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      style: { touchAction: "none" as const },
    },
    style: {
      transform: closing ? "translateY(120%)" : `translateY(${dragY}px)`,
      opacity: closing ? 0 : Math.max(0, 1 - dragY / FADE_DISTANCE_PX),
      transition,
    },
  };
}
