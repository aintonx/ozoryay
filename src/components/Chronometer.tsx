"use client";

import { useSyncExternalStore } from "react";
import type { SeparationCounter } from "@/lib/time/useSeparationDays";
import { spaceThousands } from "@/lib/text/plural";

/** Подписка, которая никогда не срабатывает: значение меняется ровно раз. */
const subscribeNever = () => () => {};

interface ChronometerProps {
  counter: SeparationCounter;
  distanceKm: number;
  /** Раскрыто письмо или горит прожектор — прибор уходит в тень. */
  dimmed: boolean;
}

/** Восемь лепестков — столько же, сколько ступеней в йоге. */
const PETALS = 8;

/**
 * Хронометр разлуки: сколько прошло с той минуты и сколько между нами.
 *
 * Приборная панель, выросшая из мандалы. Снаружи — три кольца времени
 * (часы, минуты, секунды), они заполняются и обнуляются, как круги дыхания.
 * Внутри — раскрытый лотос, в сердцевине которого стоит число дней. Всё
 * построено на одной окружности и одном угле: ничего лишнего, только линии
 * и свет.
 *
 * Рисуется в SVG: линии остаются чёткими на любом экране, а секундная стрелка
 * не заставляет перерисовывать небо.
 */
export default function Chronometer({ counter, distanceKm, dimmed }: ChronometerProps) {
  const { days, hours, minutes, seconds } = counter;

  // Секунды тикают, а страница собирается заранее и лежит статикой: числа
  // в готовом HTML и в браузере неизбежно разойдутся. Поэтому прибор
  // рождается уже на клиенте — заодно это совпадает с его появлением
  // из темноты, так что ничего не теряется.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!mounted) return null;

  // Три кольца: каждое показывает свою долю пройденного круга.
  const rings = [
    { r: 96, value: hours / 24, label: "ч", n: hours },
    { r: 82, value: minutes / 60, label: "м", n: minutes },
    { r: 68, value: seconds / 60, label: "с", n: seconds },
  ];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center pb-[9vh] transition-opacity"
      style={{
        opacity: dimmed ? 0.1 : 1,
        // Уходит быстрее, чем возвращается.
        transitionDuration: dimmed ? "300ms" : "700ms",
        transitionTimingFunction: "var(--ease-emerge)",
      }}
    >
      {/* Прибор стоит чуть выше геометрического центра: под ним ещё живут
          подписи и прожектор на холме, и им нужен воздух. */}
      <div className="chrono relative w-[min(66vw,17rem)] max-w-[46vh]">
        {/* Стеклянный диск: небо за ним размывается, и прибор перестаёт
            теряться на звёздах. */}
        <div className="glass absolute inset-0 rounded-full" />
        <svg viewBox="-110 -110 220 220" className="w-full" aria-hidden="true">
          {/* Лотос: восемь лепестков из тонких линий. Раскрыт вверх — так его
              и рисуют, и так он не спорит с числом в сердцевине. */}
          <g stroke="var(--color-amber)" fill="none" strokeLinecap="round">
            {Array.from({ length: PETALS }, (_, i) => {
              const angle = (360 / PETALS) * i;
              // Лепестки, направленные вверх, чуть ярче — свет падает оттуда.
              const up = Math.cos((angle - 180) * (Math.PI / 180));
              return (
                <path
                  key={i}
                  d="M 0 0 C -7 -14, -6 -29, 0 -42 C 6 -29, 7 -14, 0 0"
                  transform={`rotate(${angle})`}
                  strokeWidth={0.55}
                  strokeOpacity={0.16 + 0.12 * Math.max(0, up)}
                />
              );
            })}
            {/* Второй ярус лепестков — короче и повёрнут между первыми. */}
            {Array.from({ length: PETALS }, (_, i) => {
              const angle = (360 / PETALS) * i + 360 / PETALS / 2;
              return (
                <path
                  key={`in-${i}`}
                  d="M 0 0 C -5 -10, -4 -19, 0 -27 C 4 -19, 5 -10, 0 0"
                  transform={`rotate(${angle})`}
                  strokeWidth={0.5}
                  strokeOpacity={0.11}
                />
              );
            })}
          </g>

          {/* Кольца времени. Дуга идёт от верхней точки по часовой стрелке. */}
          <g transform="rotate(-90)" fill="none" strokeLinecap="round">
            {rings.map((ring) => {
              const c = 2 * Math.PI * ring.r;
              const a = ring.value * 2 * Math.PI;
              // Маркер на конце дуги: видно, где сейчас стоит стрелка.
              const mx = Math.cos(a) * ring.r;
              const my = Math.sin(a) * ring.r;
              return (
                <g key={ring.label}>
                  {/* След кольца — путь, который ещё предстоит пройти. */}
                  <circle
                    r={ring.r}
                    stroke="var(--color-star)"
                    strokeOpacity={0.1}
                    strokeWidth={0.5}
                  />
                  <circle
                    r={ring.r}
                    stroke="var(--color-amber)"
                    strokeOpacity={0.62}
                    strokeWidth={1.1}
                    strokeDasharray={`${c * ring.value} ${c}`}
                  />
                  <circle cx={mx} cy={my} r={2.6} fill="var(--color-amber)" fillOpacity={0.14} />
                  <circle cx={mx} cy={my} r={1.15} fill="var(--color-amber-hot)" stroke="none" />
                </g>
              );
            })}
          </g>

          {/* Засечки по внешнему кругу: двенадцать — как часов на циферблате. */}
          <g stroke="var(--color-star)" strokeOpacity={0.14} strokeWidth={0.6}>
            {Array.from({ length: 12 }, (_, i) => (
              <line
                key={i}
                x1={0}
                y1={-101}
                x2={0}
                y2={i % 3 === 0 ? -96 : -99}
                transform={`rotate(${i * 30})`}
              />
            ))}
          </g>
        </svg>

        {/* Число дней — в сердцевине лотоса. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[clamp(30px,9vw,46px)] leading-none font-extralight tabular-nums text-star/92">
            {days}
          </span>
          <span className="font-mono mt-[0.35em] text-[10px] tracking-[0.34em] text-star/40">
            дней
          </span>
        </div>

        {/* Часы, минуты, секунды — по краям колец, приборным шрифтом. */}
        <div className="absolute inset-x-0 bottom-[13%] flex items-center justify-center gap-[1.1em] font-mono text-[11px] tabular-nums">
          {rings.map((ring) => (
            <span key={ring.label} className="flex items-baseline gap-[0.28em]">
              <span className="text-amber/80">{String(ring.n).padStart(2, "0")}</span>
              <span className="text-star/28">{ring.label}</span>
            </span>
          ))}
        </div>

        {/* Расстояние — отдельной стеклянной капсулой под диском. */}
        <div className="absolute inset-x-0 -bottom-[3.4em] flex justify-center">
          <div className="glass flex items-baseline gap-[0.55em] rounded-full px-[1.1em] py-[0.5em]">
            <span className="font-mono text-[clamp(12px,3.2vw,14px)] font-light tabular-nums text-star/90">
              {spaceThousands(distanceKm)} км
            </span>
            <span className="font-text text-[10px] leading-none text-star/45">
              от твоей нежности
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
