import Night from "@/components/Night";
import { SEED_SETTINGS } from "@/lib/defaults";
import { LETTERS } from "@/lib/letters";

export default function Page() {
  // Настройки и письма живут в коде: сайт статический, базы нет.
  //
  // Время здесь НЕ считаем: страница собирается один раз при сборке, и любое
  // посчитанное сейчас число «замёрзнет» в HTML. Счётчик считает браузер —
  // сразу при первом кадре, сверяясь со временем сервера (см. useSeparationCounter).
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <Night settings={SEED_SETTINGS} letters={LETTERS} />
    </main>
  );
}
