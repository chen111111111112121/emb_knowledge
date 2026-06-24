import { buildFrame, bitDurationMs } from './uart.js';
import { drawWaveform } from './waveform.js';
import { createPlayer } from './player.js';

const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');

const el = (id) => document.getElementById(id);
const bitInfo = el('bitInfo');
const binaryView = el('binaryView');

let frame = [];
let player = null;

const LAYOUT_PAD = 40;

function readConfig() {
  return {
    char: el('charInput').value || 'A',
    baud: Number(el('baudSelect').value),
    dataBits: Number(el('dataBitsSelect').value),
    parity: el('paritySelect').value,
    stopBits: Number(el('stopBitsSelect').value),
    stepMs: Number(el('speedSelect').value),
  };
}

function layoutFor(frameLen) {
  const usable = canvas.width - LAYOUT_PAD * 2;
  return {
    startX: LAYOUT_PAD,
    bitWidth: usable / frameLen,
    highY: 60,
    lowY: 170,
  };
}

function render(highlightIndex) {
  drawWaveform(ctx, frame, layoutFor(frame.length), highlightIndex);
  if (highlightIndex >= 0 && highlightIndex < frame.length) {
    const bit = frame[highlightIndex];
    bitInfo.textContent = `${bit.label} → 电平 ${bit.value === 1 ? '高(1)' : '低(0)'}`;
  } else {
    bitInfo.textContent = '点击「发送」开始演示';
  }
}

function rebuild() {
  const cfg = readConfig();
  const byte = cfg.char.charCodeAt(0) & ((1 << cfg.dataBits) - 1);
  frame = buildFrame(byte, {
    dataBits: cfg.dataBits,
    parity: cfg.parity,
    stopBits: cfg.stopBits,
  });

  const dataBitsStr = frame
    .filter((b) => b.type === 'data')
    .map((b) => b.value)
    .join('');
  binaryView.textContent = `${dataBitsStr}  (每位约 ${bitDurationMs(cfg.baud).toFixed(3)} ms)`;

  player = createPlayer({
    totalBits: frame.length,
    onTick: (i) => render(i),
  });
  player.setSpeed(cfg.stepMs);
  render(-1);
}

// 配置变化即重建
['charInput', 'baudSelect', 'dataBitsSelect', 'paritySelect', 'stopBitsSelect', 'speedSelect']
  .forEach((id) => el(id).addEventListener('change', rebuild));

el('playBtn').addEventListener('click', () => player.play());
el('stepBtn').addEventListener('click', () => player.stepOnce());
el('resetBtn').addEventListener('click', () => player.reset());

rebuild();
