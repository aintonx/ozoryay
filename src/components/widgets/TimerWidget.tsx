"use client";

import { Widget } from "../ui/Widget";
import { IconClock } from "../ui/Icons";
import { formatShortRuDate } from "@/lib/time/days";
import type { SeparationCounter } from "@/lib/time/useSeparationDays";
import { useMemo } from "react";

interface TimerWidgetProps {
  counter: SeparationCounter;
  /** Момент расставания — ISO-строка из настроек, для подписи «с 30 июня». */
  separationStartISO: string;
  /** Её пояс: та же система координат, в которой считаются сами дни. */
  tz: string;
  className?: string;
}

/**
 * Сколько я без тебя.
 *
 * Кольца — как кольца активности на часах: три толстые дуги с закруглёнными
 * концами, каждая в своём ритме. Часы обходят круг за сутки, минуты за час,
 * секунды за минуту. Рядом — число дней, оно и есть главная величина.
 *
 * На кольце часов — своя маленькая комета: светящаяся точка ровно там, где
 * дуга сейчас обрывается, — тот же приём, что и голова хвоста у соседнего
 * `FollowersWidget`, только здесь она отмечает не рост, а именно текущий
 * момент внутри суток. Кольца при этом ещё и слегка светятся сами — очень
 * тихо, только чтобы стекло вокруг них выглядело не пустой подложкой,
 * а тем, что действительно источает свет.
 *
 * Внизу — не только часы:минуты:секунды, но и дата, с которой всё
 * началось: абстрактное число дней иначе ничем не привязано к реальности,
 * а «с 30 июня» превращает его обратно в конкретный день в календаре.
 *
 * Раскладка одна и та же на любой ширине экрана: кольца сверху, цифры
 * снизу, всё по центру. Виджет всегда живёт в узкой колонке сетки — даже
 * на широком окне ему не достаётся сплошной строки, — поэтому решение
 * «шире экран — переставим кольца в строку» только рассинхронизировало бы
 * его с соседом по сетке, у которого такого переключения нет.
 *
 * Строка часов:минут:секунд и дата под ней прижаты к самому низу общей
 * высоты `min-h-[9.9rem]` — не по центру вместе со всем остальным. У соседнего
 * `DistanceWidget` строка городов и курс устроены ровно так же и прижаты
 * к той же самой высоте: раз оба виджета делят одну высоту и один и тот же
 * способ прижимать нижний блок к низу, их детали сами оказываются на одной
 * линии, без подгонки отступов на глаз. Высота выше 8.75rem, что была
 * раньше, — теперь под кольцами ещё и вторая, более тихая строка снизу,
 * и обоим соседям снова нужен общий запас, который выше содержимого сразу
 * у обоих, чтобы каждый упирался именно в него, а не в свою собственную,
 * чуть разную высоту.
 */
export default function TimerWidget({ counter, separationStartISO, tz, className }: TimerWidgetProps) {
  const { days, hours, minutes, seconds } = counter;

  const rings = [
    { r: 40, value: hours / 24, color: "var(--color-amber-hot)", alpha: 0.95 },
    { r: 29, value: minutes / 60, color: "var(--color-amber)", alpha: 0.8 },
    { r: 18, value: seconds / 60, color: "var(--color-star)", alpha: 0.6 },
  ];

  // Точка на кончике внешнего кольца: тот же угол, что несёт сама дуга,
  // до того, как группа целиком повёрнута на -90° под «12 часов сверху».
  // Считаем её в той же, ещё не повёрнутой системе координат — и кладём
  // внутрь того же `<g>`, чтобы поворот достался ей автоматически, без
  // отдельной поправки на глаз.
  const hourFraction = Math.min(hours / 24, 0.9995);
  const tipAngle = hourFraction * 2 * Math.PI;
  const tipX = rings[0].r * Math.cos(tipAngle);
  const tipY = rings[0].r * Math.sin(tipAngle);

  const pad = (n: number) => String(n).padStart(2, "0");
  const dayWord = days % 10 === 1 && days % 100 !== 11 ? "день" : "дней";

  // Дата пересчитывается только когда меняются её входные данные, а не
  // на каждый секундный тик counter — Intl.DateTimeFormat не бесплатен,
  // а строка всё равно не меняется чаще, чем раз в сутки.
  const sinceLabel = useMemo(
    () => formatShortRuDate(separationStartISO, tz),
    [separationStartISO, tz],
  );

  return (
    <Widget icon={<IconClock />} title="БЕЗ ТЕБЯ" depth className={className}>
      <div className="flex min-h-[9.9rem] flex-1 flex-col gap-[0.6rem]">
        <div className="flex flex-1 flex-col items-center justify-center gap-[0.6rem]">
          {/* Кольца — с очень тихим свечением: тени под самой дугой, а не
              вокруг всего svg, иначе на тёмном небе оно превратилось бы
              в размытое пятно вместо тонкого сияния по контуру. */}
          <svg
            viewBox="-52 -52 104 104"
            className="h-[4.6rem] w-[4.6rem] shrink-0"
            style={{ filter: "drop-shadow(0 0 5px rgba(255, 227, 176, 0.22))" }}
            aria-hidden="true"
          >
            <g transform="rotate(-90)" fill="none" strokeLinecap="round" strokeWidth={8}>
              {rings.map((ring) => {
                const c = 2 * Math.PI * ring.r;
                // Полный круг чуть не замыкаем: закруглённый конец наехал бы
                // на начало и дал заметный шов.
                const filled = Math.min(ring.value, 0.9995);
                return (
                  <g key={ring.r}>
                    <circle r={ring.r} stroke="var(--color-star)" strokeOpacity={0.09} />
                    <circle
                      r={ring.r}
                      stroke={ring.color}
                      strokeOpacity={ring.alpha}
                      strokeDasharray={`${c * filled} ${c}`}
                    />
                  </g>
                );
              })}
              {/* Светящаяся точка «сейчас» на кольце часов — комета, которая
                  не бежит по кругу заметно на глаз, а стоит ровно там, где
                  сутки сейчас и находятся. */}
              <circle
                cx={tipX}
                cy={tipY}
                r={2.6}
                fill="var(--color-amber-hot)"
                style={{ filter: "drop-shadow(0 0 3px rgba(255, 227, 176, 0.85))" }}
              />
            </g>
          </svg>

          {/* Дни — тот же размер, что km у соседа и число у «Ты восхищаешь»:
              одна и та же роль «главного числа виджета» должна выглядеть
              одинаково значимо во всех трёх местах, а не по-разному. */}
          <div className="flex items-baseline justify-center gap-[0.32em]">
            <span className="font-system text-[2.15rem] leading-none font-semibold tabular-nums tracking-[-0.03em] text-star">
              {days}
            </span>
            <span className="font-system text-[13.5px] text-star/56">{dayWord}</span>
          </div>
        </div>

        {/* Часы:минуты:секунды — на одной линии со строкой городов у соседа,
            тот же размер и та же непрозрачность, что и там: это одна и та же
            роль («деталь снизу»), и она должна читаться одинаково в обоих
            виджетах, а не как две разные подписи разной значимости. */}
        <div className="font-mono text-center text-[12.5px] leading-none font-light tabular-nums text-star/70">
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </div>

        {/* Дата начала — вторая, ещё более тихая строка, ровно там же, где
            у соседа стоит курс: обе — тихий «довесок смысла» под главной
            деталью, а не равная ей по весу подпись. */}
        <div className="font-system mt-[0.05rem] text-center text-[10.5px] tracking-[0.06em] text-star/40">
          с {sinceLabel}
        </div>
      </div>
    </Widget>
  );
}
