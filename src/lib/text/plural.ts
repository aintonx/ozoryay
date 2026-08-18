/**
 * Русское склонение числительных: 1 день, 2 дня, 5 дней, 21 день, 24 дня.
 * Счётчик стоит на самом видном месте — ошибка в окончании его убьёт.
 */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/** Разряды тонкой неразрывной шпацией: 1 576, а не 1,576 и не 1576. */
export function spaceThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
