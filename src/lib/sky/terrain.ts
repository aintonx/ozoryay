import { groundYAt, projectorMetrics, PROJECTOR_BOX } from "./layout";
import { withAlpha } from "./stars";

/**
 * Земля почти чёрная, но не абсолютно: чистый #000 на OLED читается как дыра
 * в экране, а не как холм на фоне ночи.
 */
const EARTH = "#02030A";

/**
 * Деревья и дома. Позиция задаётся долей ширины, а РАЗМЕР — только долей
 * высоты, ширина каждого объекта выводится из его же высоты.
 *
 * Если брать ширину от ширины экрана, а высоту от высоты, форма объекта
 * начинает зависеть от формата окна: на широком мониторе дома расплываются
 * в плоские сараи, а ели сплющиваются. Полоса земли задана долей высоты —
 * значит, и всё, что на ней стоит, должно мерить себя высотой.
 */
const TREES = [
  { x: 0.286, h: 0.041, aspect: 0.32 },
  { x: 0.317, h: 0.062, aspect: 0.28 },
  { x: 0.354, h: 0.05, aspect: 0.29 },
  { x: 0.389, h: 0.033, aspect: 0.33 },
  { x: 0.049, h: 0.03, aspect: 0.33 },
];

/** Деревня далеко: крыши пологие, дома приземистые, ни одной детали. */
const HOUSES = [
  { x: 0.703, body: 0.016, widthRatio: 2.0, roofRatio: 0.68, chimney: true },
  { x: 0.792, body: 0.012, widthRatio: 2.0, roofRatio: 0.67, chimney: false },
];

export function drawTerrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = EARTH;

  // Профиль земли: частая выборка гауссиан, поэтому кривая гладкая
  // и одновременно позволяет ставить объекты точно на склон.
  ctx.beginPath();
  ctx.moveTo(0, h + 2);
  const steps = Math.max(120, Math.ceil(w / 3));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ctx.lineTo(t * w, groundYAt(t) * h);
  }
  ctx.lineTo(w, h + 2);
  ctx.closePath();
  ctx.fill();

  for (const t of TREES) {
    const th = t.h * h;
    drawFir(ctx, t.x * w, groundYAt(t.x) * h + 1, th * t.aspect, th);
  }
  for (const ho of HOUSES) drawHouse(ctx, ho, w, h);

  drawProjector(ctx, w, h);
  ctx.restore();
}

/** Ель: три яруса, только силуэт. Никакой текстуры, никакой обводки. */
function drawFir(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + w * 0.26, y - h * 0.58);
  ctx.lineTo(x + w * 0.15, y - h * 0.58);
  ctx.lineTo(x + w * 0.42, y - h * 0.27);
  ctx.lineTo(x + w * 0.26, y - h * 0.27);
  ctx.lineTo(x + w * 0.54, y);
  ctx.lineTo(x - w * 0.54, y);
  ctx.lineTo(x - w * 0.26, y - h * 0.27);
  ctx.lineTo(x - w * 0.42, y - h * 0.27);
  ctx.lineTo(x - w * 0.15, y - h * 0.58);
  ctx.lineTo(x - w * 0.26, y - h * 0.58);
  ctx.closePath();
  ctx.fill();
}

function drawHouse(
  ctx: CanvasRenderingContext2D,
  ho: (typeof HOUSES)[number],
  w: number,
  h: number,
) {
  const x = ho.x * w;
  const y = groundYAt(ho.x) * h + 1;
  const bh = ho.body * h;
  const bw = bh * ho.widthRatio;
  const rh = bh * ho.roofRatio;

  // Без выноса стрех и с пологим коньком: иначе силуэт читается
  // как домик из детской книжки, а не как крыша вдалеке.
  ctx.beginPath();
  ctx.moveTo(x - bw / 2, y);
  ctx.lineTo(x - bw / 2, y - bh);
  ctx.lineTo(x - bw * 0.16, y - bh - rh);
  ctx.lineTo(x + bw * 0.16, y - bh - rh);
  ctx.lineTo(x + bw / 2, y - bh);
  ctx.lineTo(x + bw / 2, y);
  ctx.closePath();
  ctx.fill();

  if (ho.chimney) {
    ctx.fillRect(x + bw * 0.24, y - bh - rh * 1.55, bw * 0.055, rh * 1.6);
  }
}

/**
 * Прожектор: тренога, короб, линза. Плоский силуэт на гребне холма.
 * Погашенная линза еле тлеет амбером — иначе не понять, что штука живая.
 */
function drawProjector(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { x, base, size: s, headY, pivot } = projectorMetrics(w, h);
  const legSpread = s * 0.3;

  ctx.save();
  ctx.fillStyle = EARTH;
  ctx.strokeStyle = EARTH;
  ctx.lineCap = "round";

  // Тренога.
  ctx.lineWidth = Math.max(1.4, s * 0.045);
  ctx.beginPath();
  ctx.moveTo(x - legSpread, base);
  ctx.lineTo(x, headY);
  ctx.lineTo(x + legSpread, base);
  ctx.moveTo(x + legSpread * 0.28, base);
  ctx.lineTo(x, headY);
  ctx.stroke();

  // Короб — те же константы, что и у луча: pivot и наклон берём из метрик,
  // чтобы линза короба и источник луча были одной точкой.
  const bw = s * PROJECTOR_BOX.widthRatio;
  const bh = s * PROJECTOR_BOX.heightRatio;
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(PROJECTOR_BOX.tilt);
  ctx.beginPath();
  ctx.moveTo(-bw * 0.5, -bh * 0.4);
  ctx.lineTo(bw * 0.42, -bh * 0.5);
  ctx.lineTo(bw * 0.42, bh * 0.5);
  ctx.lineTo(-bw * 0.5, bh * 0.4);
  ctx.closePath();
  ctx.fill();

  // Линза тлеет, а не светит: это признак жизни, а не источник света.
  // Луч включится только по клику и родится ровно из этой точки.
  const lensX = bw * PROJECTOR_BOX.lensRatio;
  const lensR = bh * 0.36;
  const glow = ctx.createRadialGradient(lensX, 0, 0, lensX, 0, lensR * 2.6);
  glow.addColorStop(0, withAlpha("#F2C57C", 0.34));
  glow.addColorStop(0.3, withAlpha("#F2C57C", 0.07));
  glow.addColorStop(1, withAlpha("#F2C57C", 0));
  ctx.fillStyle = glow;
  ctx.fillRect(lensX - lensR * 2.6, -lensR * 2.6, lensR * 5.2, lensR * 5.2);
  ctx.restore();

  ctx.restore();
}
