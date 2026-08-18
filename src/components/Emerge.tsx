"use client";

import type { CSSProperties, ReactNode } from "react";

interface EmergeProps {
  children: ReactNode;
  /** Задержка до появления, мс. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "p" | "span";
}

/** Появление: прозрачность и размытие. Ни сдвигов, ни отскоков, ни масштаба. */
export function Emerge({ children, delay = 0, className = "", style, as = "div" }: EmergeProps) {
  const Tag = as;
  return (
    <Tag className={`emerge ${className}`} style={{ animationDelay: `${delay}ms`, ...style }}>
      {children}
    </Tag>
  );
}

interface WordsProps {
  text: string;
  /** Задержка до первого слова, мс. */
  delay?: number;
  /** Шаг между словами, мс. */
  step?: number;
  className?: string;
}

/**
 * Проявление по словам. Текст остаётся цельной строкой для выделения
 * и для скринридера — на span разбита только анимация.
 */
export function Words({ text, delay = 0, step = 90, className = "" }: WordsProps) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className="emerge inline"
          style={{ animationDelay: `${delay + i * step}ms` }}
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
