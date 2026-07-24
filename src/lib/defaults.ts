/**
 * Исходные значения для сида базы.
 *
 * Приложение читает настройки ИЗ БАЗЫ и меняет их через админку.
 * Этот файл — единственный источник для `prisma/seed.ts` и запасной вариант
 * на то время, пока база ещё не подключена. В компонентах его импортировать
 * нельзя: они получают настройки пропсами с сервера.
 */
export const SEED_SETTINGS = {
  separationStart: "2026-06-30T16:33:00+03:00",
  herTimezone: "Europe/Moscow",
  herCity: "Краснодар",
  myCity: "Шексна",
  distanceKm: 1576,
  /** Начальный азимут Шексна → Краснодар по большому кругу. Практически юг. */
  bearingDeg: 178.7,
  dawnAt: null as string | null,
  daysFloor: 0,
};

export type Settings = typeof SEED_SETTINGS;
