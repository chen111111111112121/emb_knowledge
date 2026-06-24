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
  idle: '#9aa0a6',
  start: '#ea4335',
  data: '#1a73e8',
  parity: '#fbbc04',
  stop: '#34a853',
};

/**
 * 在 canvas 上画出波形。
 * highlightIndex: 当前高亮到第几位(-1 表示不高亮)。
 */
export function drawWaveform(ctx, frame, layout, highlightIndex = -1) {
  const { startX, bitWidth, highY, lowY } = layout;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // 1. 画每一位的底色块(区分起始/数据/校验/停止)
  frame.forEach((bit, i) => {
    const x = startX + i * bitWidth;
    ctx.fillStyle = i <= highlightIndex ? TYPE_COLORS[bit.type] + '33' : '#f1f3f4';
    ctx.fillRect(x, highY - 10, bitWidth, lowY - highY + 20);
  });

  // 2. 画位边界竖线(浅灰),帮助看清每一位
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  frame.forEach((_, i) => {
    const x = startX + i * bitWidth;
    ctx.beginPath();
    ctx.moveTo(x, highY - 10);
    ctx.lineTo(x, lowY + 10);
    ctx.stroke();
  });

  // 3. 画波形折线
  const points = frameToPoints(frame, layout);
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = '#202124';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. 高亮当前位:加粗描其上沿
  if (highlightIndex >= 0 && highlightIndex < frame.length) {
    const x = startX + highlightIndex * bitWidth;
    const y = frame[highlightIndex].value === 1 ? highY : lowY;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + bitWidth, y);
    ctx.strokeStyle = TYPE_COLORS[frame[highlightIndex].type];
    ctx.lineWidth = 5;
    ctx.stroke();
  }
}
