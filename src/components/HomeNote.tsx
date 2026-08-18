"use client";

interface HomeNoteProps {
  show: boolean;
  onDismiss: () => void;
}

const TEXT =
  "Рассвет случится с твоим приездом, а пока здесь тьма и пустота — как интерпретация моей души без тебя, как сердце, запертое в темнице. «Озоряй» — это про тебя: про свет и про любовь.";

/**
 * Послание, которое раньше стояло плиткой в сетке виджетов.
 *
 * Теперь это не часть сетки, а короткая записка сверху экрана: она сама
 * приходит через пару секунд после того, как открылся домашний экран
 * (см. таймер в `Night`), держится немного и уходит сама — либо от касания.
 *
 * Не спорит с другими действиями: занимает только свою собственную область
 * у верхнего края, а не весь экран, и это настоящая `<button>` — жест
 * смены экрана в `Screens` уже умеет не начинаться с кнопок, ссылок
 * и полей ввода, так что смахнуть куда угодно за пределами записки
 * по-прежнему можно в любой момент.
 */
export default function HomeNote({ show, onDismiss }: HomeNoteProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-30 flex justify-center px-[1.15rem]"
      aria-live="polite"
    >
      <button
        type="button"
        tabIndex={show ? 0 : -1}
        onClick={(e) => {
          if (e.detail > 0) e.currentTarget.blur();
          onDismiss();
        }}
        className="glass font-system caption max-w-[26rem] rounded-[1.3rem] px-[1.15rem] py-[0.85rem] text-left text-[12.5px] leading-[1.5] text-star/78 transition-all duration-500"
        style={{
          opacity: show ? 1 : 0,
          filter: show ? "blur(0)" : "blur(4px)",
          transform: show ? "translateY(0)" : "translateY(-0.6rem)",
          pointerEvents: show ? "auto" : "none",
        }}
      >
        {TEXT}
      </button>
    </div>
  );
}
