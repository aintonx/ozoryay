"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Sky from "@/components/Sky";
import { LiftedSky } from "@/components/ZonaLift";
import ZonaAuthReveal from "@/components/ZonaAuthReveal";
import { IconLock, IconUser } from "@/components/ui/Icons";
import { SEED_SETTINGS } from "@/lib/defaults";
import { useObserver } from "@/lib/useObserver";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSeparationCounter } from "@/lib/time/useSeparationDays";
import { usePullToClose } from "@/lib/usePullToClose";

/** Тот же ключ, что и в `Night.tsx` — вынесен туда, не сюда: страница
 *  «Зоны» его только выставляет и не обязана знать, как он используется. */
const ZONA_RETURN_KEY = "zonaReturning";

/**
 * Солнце из вложения, перекрашенное в свои же тона: исходный градиент
 * (rgb 255,227,176 → rgb 242,197,124) — это буквально `--color-amber-hot`
 * и `--color-amber` этого сайта, только записанные не переменными. Ничего
 * не пришлось подбирать заново — только заменить литералы на токены,
 * чтобы шестёрка цветов в `globals.css` осталась единственным источником.
 *
 * Занимает место аватарки из референса, но не на плашке-бейдже: сайт
 * нигде не сажает иконки на закрашенный кружок (см. `WidgetButton` —
 * «не бейдж с пиктограммой внутри»), поэтому вместо подложки — мягкое
 * свечение самим силуэтом (`drop-shadow` ниже).
 */
function SunAccent() {
  return (
    <svg
      viewBox="0 0 1024 768"
      className="h-[3.6rem] w-[3.6rem]"
      style={{
        filter: "drop-shadow(0 0 0.85rem color-mix(in srgb, var(--color-amber) 40%, transparent))",
      }}
      aria-hidden="true"
    >
      <g transform="matrix(12.727819,0,0,12.727819,306.846643,182.811359)">
        <path
          fill="url(#zona-sun-gradient)"
          fillRule="nonzero"
          d="M23.395,14.106C26.353,12.723 26.223,8.038 29.153,8.222C25.028,5.482 25.134,11.328 20.064,9.457C21.171,6.389 17.772,3.171 19.973,1.23C15.118,2.209 19.328,6.269 14.418,8.531C13.034,5.573 8.35,5.703 8.534,2.773C5.794,6.898 11.64,6.792 9.769,11.862C6.701,10.755 3.483,14.154 1.542,11.953C2.521,16.808 6.581,12.598 8.843,17.508C5.885,18.892 6.015,23.576 3.085,23.392C7.21,26.132 7.104,20.286 12.174,22.157C11.067,25.225 14.466,28.443 12.265,30.384C17.12,29.405 12.91,25.345 17.82,23.083C19.204,26.041 23.888,25.911 23.704,28.841C26.444,24.716 20.598,24.822 22.469,19.752C25.537,20.859 28.755,17.46 30.695,19.661C29.716,14.806 25.656,19.016 23.394,14.106L23.395,14.106Z"
        />
      </g>
      <defs>
        <linearGradient
          id="zona-sun-gradient"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(0,29.154,-29.154,0,1.542,1.23)"
        >
          <stop offset="0" stopColor="var(--color-amber-hot)" />
          <stop offset="1" stopColor="var(--color-amber)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Страница входа в «Зону».
 *
 * Небо здесь — тот же компонент, что и на главном экране, с теми же
 * настройками, и обёрнут в тот же `LiftedSky`, что и `ZonaLift` на главном
 * экране (см. `Night.tsx`): к моменту, когда эта страница становится видна,
 * взгляд уже поднят, горизонт и холмы ушли за нижний край — ровно то место,
 * куда камера приехала, а не заново нарисованные дома и холмы с нуля. Раньше
 * здесь не было этой обёртки вовсе — небо рисовалось в состоянии покоя, и на
 * долю секунды под карточкой были видны те же холмы, что и на домашнем
 * экране, будто взгляд никуда и не поднимался.
 *
 * Карточка выпадает из звезды (`ZonaAuthReveal`) — раньше здесь был
 * плавный прилёт из глубины (`SpaceArrival`, теперь нигде не подключён),
 * но появление просили пересобрать целиком. Сама звезда — не декорация
 * этой страницы: она часть настоящего неба (`LAYOUT.zonaStar`,
 * `drawZonaStar` в `renderer.ts`), горит всегда, ещё на главном экране,
 * и лишь становится ярче здесь, через `zonaStarBoost={1}` у `Sky` ниже
 * (на главном экране — `zonaOpening` в `Night.tsx`, тот же проп, тот же
 * сглаженный рост внутри рендерера). Карточка и её стрелка-хвостик —
 * одна фигура, один `clip-path` (`.glass.zona-window` в globals.css).
 *
 * Закрывается по-прежнему не кнопкой «назад», а тем же жестом, что
 * и шторки на телефоне: потяни вниз
 * за ручку сверху карточки (`usePullToClose`). Небо при этом опускается
 * вместе с пальцем один в один — тот же `t`, что ведёт карточку
 * (`pull.progress`), ведёт и масштаб неба через `LiftedSky`, так что
 * «взгляд возвращается» не отдельным шагом после закрытия, а тем же самым
 * движением, что и сам жест: потянул вниз — и камера, и карточка идут
 * вместе, отпустил раньше порога — обе пружинят обратно наверх. Закрытие
 * целиком — от первого миллиметра пальца до полностью опущенного неба —
 * происходит здесь, на этой странице, до навигации: к моменту, когда
 * выставляется метка `zonaReturning` и происходит переход на `/`, небо уже
 * в состоянии покоя. `Night.tsx` на возврате поэтому не переигрывает
 * подъём заново — только возвращает виджеты (см. комментарий там же,
 * у `zonaReturning`).
 *
 * Пока это витрина без базы: никнейм и пароль ничего не проверяют, вход
 * никуда не ведёт. Экран честно об этом говорит, а не притворяется, что
 * уже работает. Здесь же вход = регистрация — своей базы пользователей
 * с восстановлением пароля и прочим этому микроблогу на двоих не нужно,
 * поэтому и полей ровно два. Сама переписка приедет вместе с базой
 * отдельным шагом.
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

  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);

  const ready = nickname.trim().length > 0 && password.length > 0;

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
      {/* `t` идёт от `pull.progress`, не от фиксированного «открыто/закрыто»:
          пока палец на экране, небо опускается ровно настолько, насколько
          утянута карточка (см. `LiftedSky` — тот же приём, что и у `ZonaLift`
          на главном экране, только ведёт им не таймер, а сам жест). */}
      <LiftedSky t={1 - pull.progress} transition={pull.transition} reducedMotion={reducedMotion}>
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
          zonaStarBoost={1}
        />
      </LiftedSky>

      {/* z-50, выше тьмы по краям (`z-40` внутри `LiftedSky`): карточка
          обязана оставаться читаемой на любой стадии жеста, а не просвечивать
          сквозь смыкающуюся тьму на середине перетаскивания. */}
      <div className="relative z-50 flex h-full w-full items-center justify-center px-[1.15rem] py-[max(1.5rem,env(safe-area-inset-top))]">
        <ZonaAuthReveal className="w-full max-w-[26rem]">
          <div style={pull.style}>
            {/* Одна фигура — карточка и стрелка-хвостик вырезаны одним
                `clip-path` (см. `.glass.zona-window` в globals.css), поэтому
                растут и выглядят как одно целое, без шва. `pt` — не
                произвольное число: 1.5rem исходного отступа плюс
                `--arrow-size` (1.05rem) той же карточки, зарезервированные
                под стрелку сверху. */}
            <div className="glass zona-window relative w-full pb-[1.5rem] pl-[1.5rem] pr-[1.5rem] pt-[2.55rem]">
              {/* Ручка-хват: отрицательные поля дотягивают её до самых краёв
                  карточки — до той же кромки, куда `--t` сажает вырез
                  стрелки, — так что это один и тот же стеклянный кусок,
                  а не отдельная плашка над ним. Жест висит только здесь,
                  а не на всей карточке, — иначе тап по полям формы то
                  и дело спорил бы с перетаскиванием. */}
              <div
                {...pull.handleProps}
                className="-mx-[1.5rem] -mt-[2.55rem] mb-[0.5rem] flex cursor-grab flex-col items-center gap-[0.4rem] pb-[0.7rem] pt-[1.6rem] active:cursor-grabbing"
              >
                <span aria-hidden className="h-[0.28rem] w-[2.6rem] rounded-full bg-star/25" />
                <span className="font-system text-[11px] tracking-[0.04em] text-star/45">
                  потяни вниз, чтобы закрыть
                </span>
              </div>

              {/* Место аватарки из референса — вместо неё солнце из вложения,
                  без круглой подложки-бейджа (см. `SunAccent` выше). */}
              <div className="mb-[0.9rem] flex justify-center">
                <SunAccent />
              </div>

              <div className="flex flex-col gap-[0.7rem]">
                <label className="block">
                  <span className="font-system mb-[0.4rem] block text-[11.5px] font-semibold tracking-[0.05em] text-star/54">
                    никнейм
                  </span>
                  <span className="flex items-center gap-[0.6rem] rounded-[1rem] border border-white/14 bg-night/40 px-[0.9rem] py-[0.75rem]">
                    <IconUser size={17} className="shrink-0 text-star/45" />
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="как тебя называть"
                      maxLength={24}
                      autoComplete="username"
                      className="font-system w-full bg-transparent text-[14.5px] text-star placeholder:text-star/35 focus:outline-none"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="font-system mb-[0.4rem] block text-[11.5px] font-semibold tracking-[0.05em] text-star/54">
                    пароль
                  </span>
                  <span className="flex items-center gap-[0.6rem] rounded-[1rem] border border-white/14 bg-night/40 px-[0.9rem] py-[0.75rem]">
                    <IconLock size={17} className="shrink-0 text-star/45" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="придумай пароль"
                      autoComplete="new-password"
                      className="font-system w-full bg-transparent text-[14.5px] text-star placeholder:text-star/35 focus:outline-none"
                    />
                  </span>
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
        </ZonaAuthReveal>
      </div>
    </main>
  );
}
