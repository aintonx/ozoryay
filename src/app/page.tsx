import Night from "@/components/Night";
import { SEED_SETTINGS } from "@/lib/defaults";
import { LETTERS } from "@/lib/letters";
import { hourInTz, separationDays } from "@/lib/time/days";

// Небо и счётчик зависят от текущей ночи — страница не кэшируется.
export const dynamic = "force-dynamic";

export default function Page() {
  // Пока настройки и письма живут в коде. Когда появится база, изменится
  // только источник этих двух значений — компоненты останутся прежними.
  const settings = SEED_SETTINGS;
  const letters = LETTERS;

  // Считается на сервере: при загрузке не мигают нули и не прыгает вёрстка.
  const now = new Date();
  const days = separationDays(settings.separationStart, settings.herTimezone, now, settings.daysFloor);
  const hours = hourInTz(now, settings.herTimezone);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <Night days={days} hours={hours} settings={settings} letters={letters} />
    </main>
  );
}
