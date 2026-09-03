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

export interface Elapsed {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Сколько прошло с начала разлуки: дни, часы, минуты, секунды.
 *
 * Именно прошедшее время, а не текущее время суток — отсчёт идёт от самой
 * минуты расставания. Значение только растёт: `floorMs` держит достигнутый
 * максимум, потому что разлука не может стать короче ни при каких поправках
 * часов и часовых поясов.
 */
export function elapsedSince(separationStartISO: string, now: Date, floorMs = 0): Elapsed {
  const ms = Math.max(elapsedMs(separationStartISO, now), floorMs);

  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor(ms / 3600000) % 24,
    minutes: Math.floor(ms / 60000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

/** Прошедшие миллисекунды — в этом виде удобно хранить достигнутый максимум. */
export function elapsedMs(separationStartISO: string, now: Date): number {
  return Math.max(0, now.getTime() - new Date(separationStartISO).getTime());
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
 * Короткая дата на русском: «30 июня». Год добавляется, только если дата
 * пришлась не на этот же (в её поясе) год, — иначе он не несёт новой
 * информации и только удлиняет строку, которой и так тесно под кольцами.
 *
 * Пояс передаётся тот же, что и в счётчике разлуки: дата начала не должна
 * съехать на сутки против собственных же дней, которые считаются в нём же.
 */
export function formatShortRuDate(separationStartISO: string, tz: string, now: Date = new Date()): string {
  const date = new Date(separationStartISO);
  const sameYear = civilDateInTz(date, tz)[0] === civilDateInTz(now, tz)[0];
  return new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "long",
    year: sameYear ? undefined : "numeric",
    timeZone: tz,
  }).format(date);
}

/**
 * Разовая метка на русском, с датой и временем: «28 июля 2026 в 18:00».
 * В отличие от даты начала разлуки, год здесь не отбрасывается никогда:
 * у такой метки он часть смысла («в две тысячи двадцать шестом», а не
 * «в этом году»), а не сведение, которое можно опустить без потери.
 */
export function formatDateTimeRu(iso: string, tz: string): string {
  const date = new Date(iso);
  const dateLabel = new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: tz,
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("ru", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(date);
  return `${dateLabel} в ${timeLabel}`;
}

const WEEKDAY_MAP: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export interface WeekRange {
  /** 1 (понедельник) … 7 (воскресенье). */
  weekday: number;
  monday: [number, number, number];
  sunday: [number, number, number];
}

/**
 * Календарная неделя (пн–вс), в которую попадает `at` в поясе `tz`, плюс
 * номер дня недели самого `at`. Используется календарём в `TimerWidget`:
 * семь ячеек недели и подсветка сегодняшней — те же дни, что показал бы
 * настоящий календарь в её поясе, а не в местном времени браузера.
 *
 * Арифметика — в UTC-миллисекундах от гражданской даты, тем же приёмом,
 * что и в `daysBetweenCivil`: часовой пояс уже учтён на входе (`civilDateInTz`),
 * дальше это просто счёт календарных суток, а не разница моментов времени.
 */
export function weekRangeInTz(at: Date, tz: string): WeekRange {
  const civil = civilDateInTz(at, tz);
  const weekdayName = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(at);
  const weekday = WEEKDAY_MAP[weekdayName] ?? 1;

  const toCivil = (ms: number): [number, number, number] => {
    const d = new Date(ms);
    return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
  };

  const todayMs = Date.UTC(civil[0], civil[1] - 1, civil[2]);
  const mondayMs = todayMs - (weekday - 1) * 86400000;
  const sundayMs = mondayMs + 6 * 86400000;

  return { weekday, monday: toCivil(mondayMs), sunday: toCivil(sundayMs) };
}

/** «31.08» — день и месяц гражданской даты, для подписей недели. */
export function formatCivilShort([, m, d]: [number, number, number]): string {
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
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
