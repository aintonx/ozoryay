"use client";

import { useEffect, useState } from "react";
import { Words } from "./Emerge";
import type { Letter } from "@/lib/letters";

interface LetterFieldProps {
  letters: Letter[];
  openId: number | null;
  obsessionId: number | null;
  onActivate: (letter: Letter) => void;
  onClose: () => void;
  reducedMotion: boolean;
}

/** Слово обсессии рассыпается вокруг звезды и тает. */
const OBSESSION_ECHOES = [
  { dx: -74, dy: -34, delay: 0, rot: -7 },
  { dx: 58, dy: -52, delay: 140, rot: 5 },
  { dx: -96, dy: 26, delay: 260, rot: 3 },
  { dx: 44, dy: 44, delay: 400, rot: -4 },
  { dx: -28, dy: 70, delay: 540, rot: 6 },
  { dx: 82, dy: 8, delay: 680, rot: -2 },
];

export default function LetterField({
  letters,
  openId,
  obsessionId,
  onActivate,
  onClose,
  reducedMotion,
}: LetterFieldProps) {
  const [vp, setVp] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  useEffect(() => {
    if (openId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, onClose]);

  const open = openId === null ? null : (letters.find((l) => l.id === openId) ?? null);
  const obsession = obsessionId === null ? null : (letters.find((l) => l.id === obsessionId) ?? null);

  return (
    <>
      {/* Клик в любом месте закрывает. Слой ниже кнопок-звёзд, поэтому
          нажатие на другую звезду сразу переключает письмо. */}
      {open && <div className="fixed inset-0 z-20" onClick={onClose} aria-hidden="true" />}

      <div className="pointer-events-none fixed inset-0 z-30">
        {letters.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // detail === 0 означает клавиатуру: тогда фокус нужно сохранить,
              // чтобы было видно, где стоит курсор. После нажатия мышью или
              // пальцем фокус снимаем — иначе первая же клавиша зажжёт вокруг
              // звезды кольцо focus-visible.
              if (e.detail > 0) e.currentTarget.blur();
              onActivate(l);
            }}
            aria-label={l.text || "Звезда без письма"}
            aria-expanded={openId === l.id}
            // Невидимая зона не меньше 44px: попасть в точку в 4px пальцем
            // невозможно, а никаких визуальных подсказок здесь быть не должно.
            className="star-hit pointer-events-auto absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${l.starX * 100}%`, top: `${l.starY * 100}%` }}
          />
        ))}
      </div>

      {/* Текст письма — прямо в световом пятне. Ни рамки, ни крестика. */}
      {open && vp.w > 0 && (
        <div
          key={open.id}
          className="pointer-events-none fixed z-40"
          style={textPosition(open, vp)}
        >
          <p className="font-letter text-amber-hot/92 text-[clamp(18px,4.4vw,24px)] leading-[1.42] font-light [text-wrap:balance]">
            {reducedMotion ? open.text : <Words text={open.text} delay={220} step={60} />}
          </p>
        </div>
      )}

      {/* Обсессия: панель не открывается, слово еле различимо повторяется. */}
      {obsession && vp.w > 0 && (
        <div className="pointer-events-none fixed inset-0 z-40" aria-hidden="true">
          {OBSESSION_ECHOES.map((e, i) => (
            <span
              key={i}
              className="obsession-echo font-mono absolute text-[11px] font-extralight tracking-[0.3em] whitespace-nowrap text-amber/70"
              style={{
                left: obsession.starX * vp.w + fanInward(e.dx, obsession.starX),
                top: obsession.starY * vp.h + e.dy,
                transform: `translate(-50%,-50%) rotate(${e.rot}deg)`,
                animationDelay: `${e.delay}ms`,
              }}
            >
              {obsession.text}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * У края экрана эхо разворачивается внутрь. Слово длинное, и звезда,
 * стоящая в правой части неба, иначе разбрасывает половину повторов
 * за пределы вьюпорта.
 */
function fanInward(dx: number, starX: number): number {
  if (starX > 0.7) return -Math.abs(dx);
  if (starX < 0.3) return Math.abs(dx);
  return dx;
}

/**
 * Текст ставится внутрь светового пятна, но никогда не наезжает на саму
 * звезду и не вылезает за край экрана: сверху неба — под звездой,
 * снизу — над ней, по горизонтали прижимается к вьюпорту с отступом.
 */
function textPosition(l: Letter, vp: { w: number; h: number }): React.CSSProperties {
  const margin = 22;
  const gap = 32;
  // Шире, чем раньше: короткие письма ложатся в одну строку, длинные —
  // максимум в две, а не в столбик.
  const width = Math.min(420, vp.w - margin * 2);
  const x = l.starX * vp.w;
  const y = l.starY * vp.h;

  const left = Math.max(margin, Math.min(x - width / 2, vp.w - margin - width));
  const below = l.starY < 0.55;

  return below
    ? { left, top: y + gap, width }
    : { left, bottom: vp.h - y + gap, width };
}
