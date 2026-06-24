// src/waveform.js — 波形渲染。坐标计算是纯函数(可测),绘制部分依赖 Canvas。

/**
 * 把位序列转成折线点。value=1 取 highY(屏幕上方),value=0 取 lowY(下方)。
 * layout: { startX, bitWidth, highY, lowY }
 * 每一位产生两个点(本位起点、本位终点),从而画出方波台阶。
 */
export function frameToPoints(frame, layout) {
  const { startX, bitWidth, highY, lowY } = layout;
  const points = [];
  frame.forEach((bit, i) => {
    const y = bit.value === 1 ? highY : lowY;
    const xStart = startX + i * bitWidth;
    const xEnd = startX + (i + 1) * bitWidth;
    points.push({ x: xStart, y });
    points.push({ x: xEnd, y });
  });
  return points;
}

const TYPE_COLORS = {
  idle: '#64748b',
  start: '#f87171',
  data: '#60a5fa',
  parity: '#fbbf24',
  stop: '#22c55e',
};

const SCOPE_BG = '#060a14';
const GRID = 'rgba(34, 197, 94, 0.10)';
const WAVE = '#22c55e';

/**
 * 在 canvas 上画出波形(暗色示波器风格)。
 * highlightIndex: 当前高亮到第几位(-1 表示不高亮)。
 */
export function drawWaveform(ctx, frame, layout, highlightIndex = -1) {
  const { startX, bitWidth, highY, lowY } = layout;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // 0. 示波器深色底
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = SCOPE_BG;
  ctx.fillRect(0, 0, W, H);

  // 1. 示波器网格(graticule)
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 30) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
  }
  for (let gy = 0; gy <= H; gy += 30) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }

  // 2. 每一位的相位底色块(已播放的按类型上色,未播放的极淡)
  frame.forEach((bit, i) => {
    const x = startX + i * bitWidth;
    ctx.fillStyle = i <= highlightIndex ? TYPE_COLORS[bit.type] + '22' : 'rgba(255,255,255,0.02)';
    ctx.fillRect(x, highY - 12, bitWidth, lowY - highY + 24);
  });

  // 3. 位边界竖线
  ctx.strokeStyle = 'rgba(148,163,184,0.18)';
  ctx.lineWidth = 1;
  frame.forEach((_, i) => {
    const x = startX + i * bitWidth;
    ctx.beginPath();
    ctx.moveTo(x, highY - 12);
    ctx.lineTo(x, lowY + 12);
    ctx.stroke();
  });

  // 4. 发光的绿色波形折线
  const points = frameToPoints(frame, layout);
  ctx.save();
  ctx.shadowColor = WAVE;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = WAVE;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  // 5. 高亮当前位:加粗描其上沿(按类型色 + 发光)
  if (highlightIndex >= 0 && highlightIndex < frame.length) {
    const x = startX + highlightIndex * bitWidth;
    const y = frame[highlightIndex].value === 1 ? highY : lowY;
    ctx.save();
    ctx.shadowColor = TYPE_COLORS[frame[highlightIndex].type];
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + bitWidth, y);
    ctx.strokeStyle = TYPE_COLORS[frame[highlightIndex].type];
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  }
}
