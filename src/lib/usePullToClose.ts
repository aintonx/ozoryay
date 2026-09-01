"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/** Насколько нужно потянуть вниз (px), чтобы закрытие засчиталось. */
const CLOSE_THRESHOLD_PX = 96;
/** Или отпустить достаточно резко (px/ms) — даже не дотянув до полного
 *  расстояния: так же ведут себя шторки на телефоне. */
const CLOSE_VELOCITY = 0.5;
/** Доводка после отпускания: возврат на место или уход за край экрана. */
const SETTLE_MS = 320;
/** На каком расстоянии карточка становится полностью прозрачной, если
 *  тянуть и не отпускать — не даёт утянуть её в никуда одним пальцем. */
const FADE_DISTANCE_PX = 420;

/**
 * Жест «потяни вниз, чтобы закрыть». Не привязан к разметке: возвращает
 * готовые пропсы для элемента-ручки (`handleProps` — вешать на маленькую
 * полоску-хват, не на всю карточку целиком, иначе перетаскивание спорило
 * бы с обычным тапом по полям формы) и стиль для самой карточки (`style`).
 *
 * Порог закрытия — либо расстояние, либо скорость: то же самое, что
 * у листания карточек и шторок на телефоне, — так что жест не нужно
 * объяснять, он уже знаком.
 */
export function usePullToClose(onClose: () => void) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const isDragging = useRef(false);
  const dragYRef = useRef(0);
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    lastY.current = e.clientY;
    lastT.current = e.timeStamp;
    velocity.current = 0;
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
    const shouldClose = dragYRef.current > CLOSE_THRESHOLD_PX || velocity.current > CLOSE_VELOCITY;
    if (shouldClose) {
      setClosing(true);
      window.setTimeout(onClose, SETTLE_MS);
    } else {
      dragYRef.current = 0;
      setDragY(0);
    }
  }, [onClose]);

  return {
    dragging,
    closing,
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
      transition: dragging
        ? "none"
        : `transform ${SETTLE_MS}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${SETTLE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
    },
  };
}
