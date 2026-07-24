/**
 * Серверное время. Единственный источник истины для счётчиков.
 *
 * Часы устройства доверия не заслуживают: у части телефонов они сбиты
 * на минуты, а иногда и на сутки. Клиент один раз снимает офсет
 * относительно этого ответа и дальше тикает сам.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { now: Date.now() },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
