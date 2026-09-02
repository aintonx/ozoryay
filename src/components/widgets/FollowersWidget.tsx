"use client";

import { Widget } from "../ui/Widget";
import type { Followers } from "@/lib/useFollowers";
import { formatDateTimeRu } from "@/lib/time/days";
import { plural, spaceThousands } from "@/lib/text/plural";

interface FollowersWidgetProps {
  data: Followers;
  /** Её пояс — та же система координат, в которой пишутся вехи. */
  tz: string;
  className?: string;
}

/** Куда ведёт вся карточка целиком. */
const PROFILE_URL = "https://www.instagram.com/vladisunn/";

/**
 * Как ты её восхищаешь.
 *
 * Число — не статистика, а часть подарка: она следит за ним каждый день,
 * и здесь оно стоит рядом с днями разлуки и километрами между нами, тем же
 * крупным шрифтом. Линия-график и подпись прироста убраны совсем: вместо
 * сухого «+8 за 3 дня» — во вложенной панели внизу одна настоящая веха,
 * с датой и временем, когда она случилась.
 *
 * Обе величины — счётчик и веха — правятся вручную, в одном файле:
 * `public/data/followers.json`. Следующая веха («двухтысячница» и её
 * дата) вписывается туда же, когда до неё дойдёт дело.
 */
export default function FollowersWidget({ data, tz, className }: FollowersWidgetProps) {
  const count = data.followers ?? 0;
  const milestone =
    data.milestoneAt && data.milestoneLabel
      ? `${formatDateTimeRu(data.milestoneAt, tz)} ты стала ${data.milestoneLabel}`
      : null;

  return (
    <Widget title="ТЫ ВОСХИЩАЕШЬ" href={PROFILE_URL} className={className}>
      <div className="flex flex-1 flex-col justify-between gap-[0.85rem]">
        <div className="relative flex flex-1 flex-col items-center justify-center gap-[0.15rem] py-[0.4rem]">
          <div className="hero-glow" aria-hidden="true" />
          <span className="hero-number relative tabular-nums">{spaceThousands(count)}</span>
          <span className="hero-unit relative">{plural(count, "человек", "человека", "человек")}</span>
        </div>

        {milestone && (
          <div className="inset-panel px-[0.95rem] py-[0.7rem] text-center">
            <span className="font-letter text-[15px] leading-snug text-star/88 italic">{milestone}</span>
          </div>
        )}
      </div>
    </Widget>
  );
}
