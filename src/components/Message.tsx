"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

interface MessageProps {
  /** Отправить послание: запускает комету и сохраняет текст. */
  onSend: (text: string) => void;
}

const MAX = 120;
const FLASH_MS = 2600;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Написать в ночь. Нейтральный ввод — для него или для Влады: одна строка,
 * которую можно отправить. По отправке текст улетает кометой за горизонт,
 * а на месте подписи на пару секунд проступает «ушло за горизонт».
 *
 * Подпись и поле ввода не переключаются резко, а плавно перетекают друг в
 * друга через прозрачность и размытие — в общем стиле сайта. Пока послание
 * сохраняется на устройстве (заглушка); настоящая доставка придёт с базой.
 */
export default function Message({ onSend }: MessageProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  function send() {
    const value = text.trim().slice(0, MAX);
    if (!value) return;
    onSend(value);
    setText("");
    setOpen(false);
    setFlash(true);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(false), FLASH_MS);
  }

  // Плавное перетекание: то, что уходит, — размывается и гаснет.
  const fade = (shown: boolean): CSSProperties => ({
    opacity: shown ? 1 : 0,
    filter: shown ? "blur(0)" : "blur(4px)",
    pointerEvents: shown ? "auto" : "none",
    transition: `opacity 520ms ${EASE}, filter 520ms ${EASE}`,
  });

  return (
    <div className="fixed bottom-[clamp(20px,4vh,40px)] left-1/2 z-30 h-8 w-[min(80vw,22rem)] -translate-x-1/2 select-none">
      {/* Ввод */}
      <div className="absolute inset-0 flex items-center justify-center gap-3" style={fade(open)}>
        <input
          ref={inputRef}
          value={text}
          maxLength={MAX}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
            if (e.key === "Escape") setOpen(false);
          }}
          onBlur={() => {
            if (!text.trim()) setOpen(false);
          }}
          placeholder="твоё слово…"
          aria-label="Написать в ночь"
          className="font-text min-w-0 flex-1 border-b border-star/25 bg-transparent pb-1 text-center text-[15px] text-star/90 placeholder:text-star/30 focus:border-amber/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={send}
          className="font-mono cursor-pointer text-[11px] font-light tracking-[0.16em] whitespace-nowrap text-amber/75 transition-colors hover:text-amber"
        >
          отправить
        </button>
      </div>

      {/* Подпись-приглашение */}
      <div className="absolute inset-0 flex items-center justify-center" style={fade(!open)}>
        <button
          type="button"
          onClick={(e) => {
            if (e.detail > 0) e.currentTarget.blur();
            setOpen(true);
          }}
          className={`font-mono cursor-pointer text-[11px] font-light tracking-[0.2em] whitespace-nowrap transition-colors ${
            flash ? "text-amber/70" : "message-prompt text-star/55 hover:text-star/85"
          }`}
        >
          {flash ? "ушло за горизонт" : "написать в ночь"}
        </button>
      </div>
    </div>
  );
}
