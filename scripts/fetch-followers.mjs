/**
 * Сколько людей её читает.
 *
 * Сайт статический и живёт на GitHub Pages — спросить инстаграм прямо из
 * браузера нельзя: ключ пришлось бы положить в открытый код, а инстаграм
 * всё равно не пустит запрос с чужого домена. Поэтому за числом ходит
 * не браузер, а GitHub Actions по расписанию: раз в три часа он берёт
 * свежее значение, кладёт его в public/data/followers.json и коммитит.
 * Сайт просто читает готовый файл.
 *
 * Токен живёт в секретах репозитория и в код не попадает никогда.
 *
 * Два способа спросить, оба официальные:
 *
 *   IG_USER_ID + IG_TOKEN — через страницу в фейсбуке (graph.facebook.com).
 *     Токен страницы не протухает, настроить один раз и забыть. Так лучше.
 *
 *   только IG_TOKEN — через вход в инстаграм (graph.instagram.com).
 *     Проще получить, но токен живёт 60 дней и его надо продлевать.
 *
 * Запускать: npm run followers
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public", "data");
const FILE = join(DIR, "followers.json");

/** Сколько дней истории храним. Виджет показывает последние тридцать. */
const KEEP_DAYS = 120;
const API = "v21.0";

const token = process.env.IG_TOKEN?.trim();
const userId = process.env.IG_USER_ID?.trim();

if (!token) {
  const hint = "followers: нет IG_TOKEN — пропускаю. Токен кладётся в секреты репозитория.";
  if (process.env.CI) {
    console.error(hint);
    process.exit(1);
  }
  console.log(hint);
  process.exit(0);
}

const url = userId
  ? `https://graph.facebook.com/${API}/${userId}?fields=followers_count,username&access_token=${encodeURIComponent(token)}`
  : `https://graph.instagram.com/${API}/me?fields=followers_count,username&access_token=${encodeURIComponent(token)}`;

const res = await fetch(url);
const body = await res.json().catch(() => null);

if (!res.ok || !body || typeof body.followers_count !== "number") {
  // Ошибку печатаем целиком: у инстаграма в ней сказано, что именно не так —
  // протух токен, не тот тип аккаунта, не выдано разрешение.
  console.error("followers: инстаграм не отдал число.", JSON.stringify(body ?? { status: res.status }));
  process.exit(1);
}

const now = new Date();
const day = now.toISOString().slice(0, 10);

let prev = { history: [] };
try {
  prev = JSON.parse(await readFile(FILE, "utf8"));
} catch {
  // Файла ещё нет — заведём.
}

// В истории по одной точке на день: последнее известное за этот день
// вытесняет предыдущее, чтобы восемь замеров в сутки не раздували файл.
const history = (Array.isArray(prev.history) ? prev.history : []).filter((p) => p?.d !== day);
history.push({ d: day, n: body.followers_count });
history.sort((a, b) => (a.d < b.d ? -1 : 1));

const next = {
  updatedAt: now.toISOString(),
  username: body.username ?? prev.username ?? null,
  followers: body.followers_count,
  history: history.slice(-KEEP_DAYS),
};

await mkdir(DIR, { recursive: true });
await writeFile(FILE, JSON.stringify(next, null, 2) + "\n");

const before = prev.followers;
const delta = typeof before === "number" ? body.followers_count - before : 0;
console.log(
  `followers: ${body.followers_count}` +
    (delta ? ` (${delta > 0 ? "+" : ""}${delta} с прошлого раза)` : " (без изменений)"),
);
