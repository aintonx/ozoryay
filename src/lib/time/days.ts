/**
 * Дни разлуки считаются по календарным датам в её часовом поясе,
 * а не блоками по 24 часа: число меняется в её полночь.
 */

/** Гражданская дата (год, месяц, день) в заданном поясе. */
export function civilDateInTz(at: Date, tz: string): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  const [y, m, d] = parts.split("-").map(Number);
  return [y, m, d];
}

export interface Clock {
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Её текущее время суток — часы, минуты, секунды. Спутник календарных дней:
 * в её полночь всё обнуляется, а день прибавляется, и пара «дни + время»
 * тикает вперёд, перекатываясь через полночь.
 */
export function clockInTz(at: Date, tz: string): Clock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // en-GB может вернуть час "24" в полночь — приводим к 0.
  return { hours: get("hour") % 24, minutes: get("minute"), seconds: get("second") };
}

/** Разница календарных дат в сутках. */
export function daysBetweenCivil(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const ms = Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2]);
  return Math.round(ms / 86400000);
}

/**
 * Сколько ночей длится разлука. Ровно столько же звёзд на небе.
 *
 * `floor` — сохранённый максимум: если её часовой пояс когда-нибудь сменится
 * на западный, календарная дата может откатиться назад. Разлука не может
 * стать короче, поэтому счётчик обязан удержать достигнутое.
 */
export function separationDays(
  separationStartISO: string,
  tz: string,
  now: Date,
  floor = 0,
): number {
  const startCivil = civilDateInTz(new Date(separationStartISO), tz);
  const nowCivil = civilDateInTz(now, tz);
  const raw = daysBetweenCivil(startCivil, nowCivil);
  return Math.max(0, raw, floor);
}
