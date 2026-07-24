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
  { id: 1, text: "Познакомились 04.09.2025", category: "anchor", starX: 0.118, starY: 0.292, constellation: "первые", isEternal: false },
  { id: 2, text: "Наш первый поцелуй — 08.09.2025", category: "anchor", starX: 0.196, starY: 0.208, constellation: "первые", isEternal: false },
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
  { id: 16, text: "Поцелуи с тобой как нежные прикосновения ангела", category: "confession", starX: 0.872, starY: 0.672, constellation: null, isEternal: false },
  { id: 17, text: "Ты смелая, а я боюсь аттракционов и потерять тебя", category: "confession", starX: 0.104, starY: 0.742, constellation: null, isEternal: false },
  { id: 18, text: "ОБСЕССИЯ", category: "confession", starX: 0.906, starY: 0.556, constellation: null, isEternal: false, special: "obsession" },
  // Слот оставлен пустым намеренно: текст допишет он. Пока текста нет,
  // звезда на небе не появляется и в счётчик не входит.
  { id: 19, text: "", category: "confession", starX: 0.272, starY: 0.752, constellation: null, isEternal: false },

  // Двадцатая. Не письмо — лампа.
  { id: 20, text: "Ты боишься засыпать одна без света", category: "confession", starX: 0.842, starY: 0.806, constellation: null, isEternal: true },
];

/** Звёзды, которым есть что сказать. Вечная сюда не входит по условию. */
export function speakingLetters(all: Letter[] = LETTERS): Letter[] {
  return all.filter((l) => !l.isEternal && l.text.trim().length > 0);
}

/** Линии созвездия: последовательная цепочка по порядку id внутри группы. */
export function constellationChains(all: Letter[] = LETTERS): Letter[][] {
  const groups = new Map<string, Letter[]>();
  for (const l of all) {
    if (!l.constellation) continue;
    const g = groups.get(l.constellation) ?? [];
    g.push(l);
    groups.set(l.constellation, g);
  }
  return [...groups.values()].map((g) => g.sort((a, b) => a.id - b.id));
}
