"use client";

import { Widget } from "../ui/Widget";
import type { Followers, FollowersPoint } from "@/lib/useFollowers";
import { plural, spaceThousands } from "@/lib/text/plural";

interface FollowersWidgetProps {
  data: Followers;
  className?: string;
}

/** Куда ведёт вся карточка целиком. */
const PROFILE_URL = "https://www.instagram.com/vladisunn/";

/** Сколько последних точек истории показывать столбиками. */
const SPARK_POINTS = 7;

/**
 * Высоты столбиков в процентах — от 15 (не пропадает совсем даже самая
 * низкая точка) до 100 (самая высокая). Если во всех точках одно и то же
 * число — например, история совсем короткая, — все столбики выходят
 * одной ровной высоты вместо деления на ноль.
 */
function sparkHeights(history: FollowersPoint[]): number[] {
  const recent = history.slice(-SPARK_POINTS);
  if (recent.length === 0) return [];
  const values = recent.map((p) => p.n);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  return values.map((v) => (range === 0 ? 60 : 15 + ((v - min) / range) * 85));
}

/**
 * Как ты её восхищаешь.
 *
 * Веха с датой и курсивная строка под ней убраны целиком — вместо разовой
 * фразы теперь тенденция: столбики читаются из тех же данных, что уже
 * лежат в `public/data/followers.json` (`history`), просто раньше нигде
 * не показывались. Без подписи под ними и без цифры прироста — одного
 * взгляда на растущую линию хватает, а любое число рядом с ней снова
 * превращало бы ощущение роста в сухой отчёт.
 *
 * `milestoneAt`/`milestoneLabel` в данных остаются как есть — они просто
 * сейчас нигде не отображаются, ровно как молчал неиспользуемый прирост
 * раньше: правится тот же файл, когда придёт время показать это снова.
 */
export default function FollowersWidget({ data, className }: FollowersWidgetProps) {
  const count = data.followers ?? 0;
  const heights = sparkHeights(data.history);

  return (
    <Widget title="ТЫ ВОСХИЩАЕШЬ" href={PROFILE_URL} className={className}>
      <div className="flex flex-1 flex-col justify-between gap-[0.85rem]">
        <div className="flex flex-1 flex-col items-center justify-center gap-[0.15rem] py-[0.4rem]">
          <span className="hero-number">{spaceThousands(count)}</span>
          <span className="hero-unit">{plural(count, "человек", "человека", "человек")}</span>
        </div>

        {heights.length > 0 && (
          <div className="inset-panel px-[0.85rem] py-[0.65rem]">
            <div className="trend-row">
              {heights.map((h, i) => (
                <div
                  key={i}
                  className={`trend-bar${i === heights.length - 1 ? " is-last" : ""}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Widget>
  );
}
