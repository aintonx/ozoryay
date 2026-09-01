"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sky from "@/components/Sky";
import SpaceArrival from "@/components/SpaceArrival";
import { SEED_SETTINGS } from "@/lib/defaults";
import { useObserver } from "@/lib/useObserver";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSeparationCounter } from "@/lib/time/useSeparationDays";
import { usePullToClose } from "@/lib/usePullToClose";

/** Сколько цифр в номере после +7. */
const PHONE_DIGITS = 10;

/** Тот же ключ, что и в `Night.tsx` — вынесен туда, не сюда: страница
 *  «Зоны» его только выставляет и не обязана знать, как он используется. */
const ZONA_RETURN_KEY = "zonaReturning";

/** «9189551673» → «918 955 1673»: те же группы, что в переписке про эти
 *  номера, а не привычная сотовая разбивка по два-два-два-два. */
function formatPhone(digits: string) {
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 10);
  return [a, b, c].filter(Boolean).join(" ");
}

/**
 * Страница входа в «Зону».
 *
 * Небо здесь — тот же компонент, что и на главном экране, с теми же
 * настройками: после `ZonaLift` взгляд должен продолжать смотреть в то же
 * самое небо, а не увидеть внезапно другую картинку. Второго рендерера не
 * заводим — ровно один канвас, тут и там.
 *
 * Карточка просто прилетает на место — см. `SpaceArrival`. Закрывается не
 * кнопкой «назад», а тем же жестом, что и шторки на телефоне: потяни вниз
 * за ручку сверху карточки (`usePullToClose`). При закрытии выставляется
 * метка `zonaReturning` в sessionStorage и происходит обычная навигация на
 * `/` — а там `Night.tsx` подхватывает эту метку и разворачивает подъём
 * взгляда назад: тот же путь, что и открытие, только в обратную сторону.
 * Здесь, на этой странице, разворачивать нечего — вся обратная анимация
 * живёт на главном экране, потому что и виджеты, которые должны вернуться,
 * тоже там.
 *
 * Пока это витрина без базы: номер только форматируется на глазах, вход
 * никуда не ведёт. Экран честно об этом говорит, а не притворяется, что
 * уже работает. Аллоулист (её номер и мой) и сама переписка приедут вместе
 * с базой отдельным шагом.
 */
export default function ZonaPage() {
  const router = useRouter();
  const observer = useObserver({
    lat: SEED_SETTINGS.herLat,
    lon: SEED_SETTINGS.herLon,
    city: SEED_SETTINGS.herCity,
  });
  const counter = useSeparationCounter(SEED_SETTINGS.separationStart, SEED_SETTINGS.herTimezone);
  const reducedMotion = useReducedMotion();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);

  const ready = phone.length === PHONE_DIGITS && name.trim().length > 0;
  const formatted = useMemo(() => formatPhone(phone), [phone]);

  const handleClose = useCallback(() => {
    try {
      window.sessionStorage.setItem(ZONA_RETURN_KEY, "1");
    } catch {
      // Приватный режим/отключённое хранилище — просто открываем обычную
      // главную, без разворота подъёма взгляда. Не критично: это красота,
      // а не функциональность.
    }
    router.push("/");
  }, [router]);

  const pull = usePullToClose(handleClose);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <Sky
        days={counter.nights}
        bearingDeg={SEED_SETTINGS.bearingDeg}
        observer={observer}
        letters={[]}
        chains={[]}
        openId={null}
        hintId={null}
        obsessionId={null}
        birthNight={null}
        projectorImage={null}
        projectorToken={0}
        projectorCancel={0}
        onProjectorDone={() => {}}
        cometToken={0}
        dawn={false}
        reducedMotion={reducedMotion}
      />

      <div className="relative z-10 flex h-full w-full items-center justify-center px-[1.15rem] py-[max(1.5rem,env(safe-area-inset-top))]">
        <SpaceArrival className="w-full max-w-[26rem]">
          <div style={pull.style}>
            <div className="glass w-full rounded-[1.7rem] p-[1.5rem]">
              {/* Ручка-хват: отрицательные поля дотягивают её до самых краёв
                  карточки и до её верхней кромки, так что это один и тот же
                  стеклянный кусок, а не отдельная плашка над ним. Жест висит
                  только здесь, а не на всей карточке, — иначе тап по полям
                  формы то и дело спорил бы с перетаскиванием. */}
              <div
                {...pull.handleProps}
                className="-mx-[1.5rem] -mt-[1.5rem] mb-[0.9rem] flex cursor-grab flex-col items-center gap-[0.4rem] rounded-t-[1.7rem] pb-[0.7rem] pt-[0.55rem] active:cursor-grabbing"
              >
                <span aria-hidden className="h-[0.28rem] w-[2.6rem] rounded-full bg-star/25" />
                <span className="font-system text-[11px] tracking-[0.04em] text-star/45">
                  потяни вниз, чтобы закрыть
                </span>
              </div>

              <h1 className="font-display text-[2rem] leading-none text-amber-hot" style={{ textWrap: "balance" }}>
                Зона
              </h1>

              <p className="font-letter mt-[0.7rem] text-[15px] leading-[1.6] text-star/85">
                «Зона» — Зоря и Набоев, сплавленные в одно слово: то, что
                останется нашим, даже если весь мир вокруг однажды замолчит.
              </p>

              <div className="mt-[1.6rem] flex flex-col gap-[0.85rem]">
                <label className="block">
                  <span className="font-system mb-[0.4rem] block text-[11.5px] font-semibold tracking-[0.05em] text-star/54">
                    номер телефона
                  </span>
                  <span className="flex items-center gap-[0.55rem] rounded-[1rem] border border-white/14 bg-night/40 px-[0.9rem] py-[0.75rem]">
                    <span className="font-system text-[14.5px] font-semibold text-star/70">+7</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={formatted}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, PHONE_DIGITS);
                        setPhone(digits);
                      }}
                      placeholder="918 955 1673"
                      className="font-system w-full bg-transparent text-[14.5px] text-star placeholder:text-star/35 focus:outline-none"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="font-system mb-[0.4rem] block text-[11.5px] font-semibold tracking-[0.05em] text-star/54">
                    как тебя называть
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="имя или ник"
                    maxLength={24}
                    className="font-system w-full rounded-[1rem] border border-white/14 bg-night/40 px-[0.9rem] py-[0.75rem] text-[14.5px] text-star placeholder:text-star/35 focus:outline-none"
                  />
                </label>

                <button
                  type="button"
                  disabled={!ready}
                  onClick={(e) => {
                    if (e.detail > 0) e.currentTarget.blur();
                    setTried(true);
                  }}
                  className="font-system mt-[0.3rem] rounded-[1rem] bg-amber/90 py-[0.85rem] text-center text-[14.5px] font-semibold text-night-deep transition-transform duration-300 active:scale-[0.985] disabled:opacity-35 disabled:active:scale-100"
                >
                  войти
                </button>

                {tried && (
                  <p className="font-system text-center text-[12px] leading-snug text-star/56">
                    совсем скоро — как только подключим базу, здесь и правда
                    можно будет войти
                  </p>
                )}
              </div>
            </div>
          </div>
        </SpaceArrival>
      </div>
    </main>
  );
}
