"use client";

import { useEffect, useRef, useState } from "react";

interface MessageProps {
  /** Отправить послание: запускает комету и сохраняет текст. */
  onSend: (text: string) => void;
}

const MAX = 120;
const FLASH_MS = 2600;

/**
 * Написать в ночь. Нейтральный ввод — для него или для Влады: одна строка,
 * которую можно отправить. По отправке текст улетает кометой за горизонт,
 * а на месте подписи на пару секунд проступает «ушло за горизонт».
 *
 * Сейчас послание сохраняется на устройстве (заглушка). Настоящая доставка
 * появится вместе с базой.
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

  return (
    <div className="fixed bottom-[clamp(20px,4vh,40px)] left-1/2 z-30 -translate-x-1/2 select-none">
      {open ? (
        <div className="flex items-center gap-3">
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
            className="font-text w-[min(72vw,20rem)] border-b border-star/20 bg-transparent pb-1 text-center text-[15px] text-star/85 placeholder:text-star/25 focus:border-amber/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            className="font-mono cursor-pointer text-[11px] font-extralight tracking-[0.18em] whitespace-nowrap text-amber/60 transition-colors hover:text-amber"
          >
            отправить
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            if (e.detail > 0) e.currentTarget.blur();
            setOpen(true);
          }}
          className={`font-mono cursor-pointer text-[11px] font-extralight tracking-[0.24em] whitespace-nowrap transition-colors ${
            flash ? "text-amber/55" : "message-prompt text-star/30 hover:text-star/55"
          }`}
        >
          {flash ? "ушло за горизонт" : "написать в ночь"}
        </button>
      )}
    </div>
  );
}
