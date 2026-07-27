export type LetterCategory = "anchor" | "trait" | "confession";

export interface Letter {
  id: number;
  text: string;
  category: LetterCategory;
  /** Нормализованные координаты 0..1. Заданы навсегда и никогда не меняются. */
  starX: number;
  starY: number;
  constellation: string | null;
  isEternal: boolean;
  /**
   * Особое поведение. Сейчас единственное значение — "obsession":
   * такая звезда не открывает панель, а часто мерцает и растворяет слово
   * вокруг себя. Поведению нужно где-то жить, поэтому поле отдельное,
   * а не выведенное из id.
   */
  special?: "obsession";
}

/**
 * Двадцать звёзд.
 *
 * Координаты подобраны вручную под колонку текста, которая стоит на левой
 * оси и занимает примерно x 0.08–0.63, y 0.40–0.72. Якоря собраны в дугу
 * над заголовком, приметы рассыпаны, признания разведены по краям.
 *
 * Менять эти числа нельзя. Она должна иметь возможность вернуться
 * к любимой звезде и найти её там же.
 */
export const LETTERS: Letter[] = [
  // Якоря — соединяются тонкими линиями в созвездие.
  { id: 1, text: "Познакомились 4 сентября", category: "anchor", starX: 0.118, starY: 0.292, constellation: "первые", isEternal: false },
  { id: 2, text: "Наш первый поцелуй — 8 сентября", category: "anchor", starX: 0.196, starY: 0.208, constellation: "первые", isEternal: false },
  { id: 3, text: "Наш первый поцелуй в Таврическом саду, под деревом", category: "anchor", starX: 0.298, starY: 0.170, constellation: "первые", isEternal: false },
  { id: 4, text: "На первом свидании я читал тебе стихи у кофейни Ohaus на Чёрной речке", category: "anchor", starX: 0.402, starY: 0.212, constellation: "первые", isEternal: false },
  { id: 5, text: "Первый фильм, который мы посмотрели, — «Я — начало»", category: "anchor", starX: 0.458, starY: 0.310, constellation: "первые", isEternal: false },
  { id: 6, text: "Мы познакомились в Питере, а позже любили друг друга в разных городах", category: "anchor", starX: 0.356, starY: 0.362, constellation: "первые", isEternal: false },

  // Приметы — мелкая россыпь.
  { id: 7, text: "Ты любишь «Милку» с цельным фундуком", category: "trait", starX: 0.846, starY: 0.242, constellation: null, isEternal: false },
  { id: 8, text: "Твой чизкейк самый вкусный", category: "trait", starX: 0.606, starY: 0.094, constellation: null, isEternal: false },
  { id: 9, text: "Твой любимый десерт — тирамису", category: "trait", starX: 0.902, starY: 0.436, constellation: null, isEternal: false },
  { id: 10, text: "Ты любишь апельсины", category: "trait", starX: 0.068, starY: 0.148, constellation: null, isEternal: false },
  { id: 11, text: "Ты в восторге от киндер-бегемотиков", category: "trait", starX: 0.768, starY: 0.352, constellation: null, isEternal: false },
  { id: 12, text: "Ты не любишь ромашки", category: "trait", starX: 0.702, starY: 0.606, constellation: null, isEternal: false },
  { id: 13, text: "В цветах ты предпочитаешь больше зелени", category: "trait", starX: 0.934, starY: 0.152, constellation: null, isEternal: false },
  { id: 14, text: "Ты боишься пауков", category: "trait", starX: 0.512, starY: 0.068, constellation: null, isEternal: false },

  // Признания — редкие и самые яркие.
  { id: 15, text: "Я очень тебя люблю!", category: "confession", starX: 0.676, starY: 0.452, constellation: null, isEternal: false },
  { id: 16, text: "Поцелуи с тобой — как нежные прикосновения ангела", category: "confession", starX: 0.872, starY: 0.672, constellation: null, isEternal: false },
  { id: 17, text: "Ты смелая, а я боюсь аттракционов и потерять тебя", category: "confession", starX: 0.104, starY: 0.742, constellation: null, isEternal: false },
  { id: 18, text: "ОБСЕССИЯ", category: "confession", starX: 0.906, starY: 0.556, constellation: null, isEternal: false, special: "obsession" },
  // Слот оставлен пустым намеренно: текст допишет он. Пока текста нет,
  // звезда на небе не появляется и в счётчик не входит.
  { id: 19, text: "", category: "confession", starX: 0.272, starY: 0.752, constellation: null, isEternal: false },

  // Двадцатая. Не письмо — лампа.
  { id: 20, text: "Ты боишься засыпать одна без света", category: "confession", starX: 0.842, starY: 0.806, constellation: null, isEternal: true },
];

/**
 * Звёзды, которым есть что сказать.
 *
 * Вечная сюда не входит по условию, пустые слоты — потому что текста ещё
 * нет, а звезда обсессии — потому что у неё вместо текста заглушка: она
 * жила отдельной механикой, которой больше нет.
 */
export function speakingLetters(all: Letter[] = LETTERS): Letter[] {
  return all.filter((l) => !l.isEternal && !l.special && l.text.trim().length > 0);
}

interface Point {
  x: number;
  y: number;
}

/**
 * Мини-созвездия: жёлтые звёзды-письма соединяются в НЕСКОЛЬКО небольших
 * групп, а не в одно большое созвездие.
 *
 * Строим остовное дерево (Краскал по возрастанию длины рёбер) и отбрасываем
 * связи длиннее порога — так далёкие звёзды не соединяются, и небо распадается
 * на несколько отдельных рисунков. Расстояние взвешено по вертикали, потому
 * что на телефоне экран вытянут, и близкие по вертикали звёзды визуально
 * дальше. Возвращаются рёбра — по паре точек на линию.
 */
export function miniConstellations(all: Letter[] = LETTERS): Point[][] {
  const stars: Point[] = all
    .filter((l) => !l.isEternal && l.text.trim().length > 0)
    .map((l) => ({ x: l.starX, y: l.starY }));

  const WY = 1.7; // вес вертикали (примерно пропорции телефона)
  const THRESHOLD = 0.3;
  const MAX_SIZE = 5; // потолок кластера — иначе всё слипается в одно созвездие
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, (a.y - b.y) * WY);

  const edges: Array<{ i: number; j: number; d: number }> = [];
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      edges.push({ i, j, d: dist(stars[i], stars[j]) });
    }
  }
  edges.sort((a, b) => a.d - b.d);

  const parent = stars.map((_, i) => i);
  const size = stars.map(() => 1);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };

  const chains: Point[][] = [];
  for (const e of edges) {
    if (e.d > THRESHOLD) break; // рёбра отсортированы — дальше только длиннее
    const ri = find(e.i);
    const rj = find(e.j);
    if (ri === rj) continue; // без циклов
    if (size[ri] + size[rj] > MAX_SIZE) continue; // не даём кластеру разрастись
    parent[ri] = rj;
    size[rj] += size[ri];
    chains.push([stars[e.i], stars[e.j]]);
  }
  return chains;
}
