# 「看得懂的嵌入式」UART 可视化 MVP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出一个纯静态网站,用交互动画演示 UART 串口通信"一个字节如何一位位变成电平信号发出去",供嵌入式新手学习。

**Architecture:** 纯静态站点,无后端。核心逻辑(字节+配置 → 带类型标注的位序列)写成无 DOM 依赖的纯 JS 模块 `uart.js`,以后可直接搬到微信小程序;渲染层(Canvas 波形)和播放控制层与逻辑解耦。首页列概念,`uart.html` 是 UART 子页,以后加新概念就加一个子页。

**Tech Stack:** HTML + CSS + 原生 JavaScript(ES Modules);Canvas 绘制波形;Vitest 做纯逻辑单元测试;Git 做版本管理;最终部署到 Cloudflare Pages / Vercel / GitHub Pages 等免费静态托管。

---

## 文件结构

```
project/
  package.json              # vitest 依赖与脚本
  .gitignore                # 忽略 node_modules
  index.html                # 首页:概念列表(MVP 只有 UART)
  uart.html                 # UART 可视化页面
  styles/
    main.css                # 全站样式 + 移动端适配
  src/
    uart.js                 # 纯逻辑:字节+配置 → 位序列(可测、可复用)
    waveform.js             # 波形渲染:位序列 → Canvas 折线 + 高亮
    player.js               # 播放控制:逐位推进、速度、单步、播放/暂停
    ui.js                   # 把输入/配置 UI 与逻辑、渲染、播放接起来
  test/
    uart.test.js            # uart.js 单元测试
    waveform.test.js        # waveform.js 纯函数单元测试
```

各单元职责:

| 文件 | 职责 | 依赖 |
|------|------|------|
| `src/uart.js` | 字节+配置 → 带类型标注的位序列(纯函数,无 DOM) | 无 |
| `src/waveform.js` | 位序列 → 折线坐标点(纯函数)+ 画到 Canvas | Canvas API |
| `src/player.js` | 控制当前播放到第几位、速度、单步 | 无(通过回调通知) |
| `src/ui.js` | 收集输入 → 调 uart.js → 交给 waveform/player | 上述三者 + DOM |
| `uart.html` / `index.html` | 页面结构、讲解文案、移动端布局 | styles + src |

---

## Task 1: 项目脚手架与测试环境

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `test/uart.test.js`(占位测试,确认 vitest 跑通)

- [ ] **Step 1: 初始化 git 与 npm**

Run:
```bash
cd "D:/Desktop/AI/project"
git init
npm init -y
```
Expected: 生成 `.git/` 目录与 `package.json`。

- [ ] **Step 2: 安装 Vitest**

Run:
```bash
npm install -D vitest
```
Expected: `node_modules/` 出现,`package.json` 的 devDependencies 含 vitest。

- [ ] **Step 3: 配置 test 脚本与 .gitignore**

编辑 `package.json`,把 `"scripts"` 改成:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```
并在 `package.json` 顶层加上 `"type": "module"`(让项目用 ES Modules)。

创建 `.gitignore`:
```
node_modules/
.DS_Store
```

- [ ] **Step 4: 写一个占位测试确认环境跑通**

创建 `test/uart.test.js`:
```js
import { describe, it, expect } from 'vitest';

describe('环境自检', () => {
  it('vitest 能正常运行', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: 运行测试验证环境**

Run: `npm test`
Expected: PASS,1 个测试通过。

- [ ] **Step 6: 提交**

```bash
git add .gitignore package.json package-lock.json test/uart.test.js
git commit -m "chore: 初始化项目与 vitest 测试环境"
```

---

## Task 2: UART 核心逻辑 `uart.js`(TDD)

**Files:**
- Create: `src/uart.js`
- Test: `test/uart.test.js`(替换占位测试)

- [ ] **Step 1: 写失败的测试 — byteToDataBits(LSB 在前)**

把 `test/uart.test.js` 内容替换为:
```js
import { describe, it, expect } from 'vitest';
import { byteToDataBits, computeParityBit, buildFrame, bitDurationMs } from '../src/uart.js';

describe('byteToDataBits', () => {
  it('按 LSB 在前的顺序拆位', () => {
    // 0b00000001 -> [1,0,0,0,0,0,0,0]
    expect(byteToDataBits(0x01, 8)).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('0x41 (字符 A, 0b01000001) 拆成 8 位', () => {
    expect(byteToDataBits(0x41, 8)).toEqual([1, 0, 0, 0, 0, 0, 1, 0]);
  });

  it('支持 5 位数据', () => {
    expect(byteToDataBits(0b10101, 5)).toEqual([1, 0, 1, 0, 1]);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm test`
Expected: FAIL,提示 `byteToDataBits` 未定义 / 无法从 `../src/uart.js` 导入。

- [ ] **Step 3: 实现 byteToDataBits**

创建 `src/uart.js`:
```js
// src/uart.js — 纯逻辑,无 DOM 依赖,可复用到微信小程序

/** 把一个字节拆成数据位数组,LSB(最低位)在前——这正是 UART 实际发送顺序 */
export function byteToDataBits(byte, dataBits) {
  const bits = [];
  for (let i = 0; i < dataBits; i++) {
    bits.push((byte >> i) & 1);
  }
  return bits;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test`
Expected: byteToDataBits 的 3 个测试 PASS(computeParityBit/buildFrame 相关仍报未定义——下一步实现)。

- [ ] **Step 5: 追加校验位测试**

在 `test/uart.test.js` 末尾追加:
```js
describe('computeParityBit', () => {
  it('parity=none 返回 null', () => {
    expect(computeParityBit([1, 0, 1], 'none')).toBe(null);
  });

  it('偶校验:数据里 1 的个数为奇数时,校验位为 1 凑成偶数', () => {
    // [1,0,1,0,0,0,0,0] 有 2 个 1(偶) -> 偶校验位 = 0
    expect(computeParityBit([1, 0, 1, 0, 0, 0, 0, 0], 'even')).toBe(0);
    // [1,0,0,0,0,0,0,0] 有 1 个 1(奇) -> 偶校验位 = 1
    expect(computeParityBit([1, 0, 0, 0, 0, 0, 0, 0], 'even')).toBe(1);
  });

  it('奇校验:让 1 的总个数为奇数', () => {
    // [1,0,0,0,0,0,0,0] 有 1 个 1(奇) -> 奇校验位 = 0
    expect(computeParityBit([1, 0, 0, 0, 0, 0, 0, 0], 'odd')).toBe(0);
    // [1,1,0,0,0,0,0,0] 有 2 个 1(偶) -> 奇校验位 = 1
    expect(computeParityBit([1, 1, 0, 0, 0, 0, 0, 0], 'odd')).toBe(1);
  });
});
```

- [ ] **Step 6: 运行测试验证失败**

Run: `npm test`
Expected: FAIL,`computeParityBit` 未定义。

- [ ] **Step 7: 实现 computeParityBit**

在 `src/uart.js` 追加:
```js
/** 计算校验位。parityMode: 'none' | 'even' | 'odd' */
export function computeParityBit(dataBits, parityMode) {
  if (parityMode === 'none') return null;
  const ones = dataBits.reduce((sum, b) => sum + b, 0);
  if (parityMode === 'even') return ones % 2 === 0 ? 0 : 1;
  if (parityMode === 'odd') return ones % 2 === 0 ? 1 : 0;
  throw new Error('未知校验模式: ' + parityMode);
}
```

- [ ] **Step 8: 运行测试验证通过**

Run: `npm test`
Expected: byteToDataBits + computeParityBit 全部 PASS。

- [ ] **Step 9: 追加完整帧测试 buildFrame**

在 `test/uart.test.js` 末尾追加:
```js
describe('buildFrame', () => {
  it('8N1(8 数据位/无校验/1 停止位)结构正确', () => {
    const frame = buildFrame(0x41, { dataBits: 8, parity: 'none', stopBits: 1 });
    const types = frame.map(b => b.type);
    expect(types).toEqual([
      'idle', 'start',
      'data', 'data', 'data', 'data', 'data', 'data', 'data', 'data',
      'stop',
    ]);
    // 空闲与停止位都是高电平,起始位是低电平
    expect(frame[0].value).toBe(1); // idle
    expect(frame[1].value).toBe(0); // start
    expect(frame[frame.length - 1].value).toBe(1); // stop
  });

  it('数据位电平按 LSB 在前', () => {
    const frame = buildFrame(0x01, { dataBits: 8, parity: 'none', stopBits: 1 });
    const dataValues = frame.filter(b => b.type === 'data').map(b => b.value);
    expect(dataValues).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('带偶校验和 2 停止位', () => {
    const frame = buildFrame(0x01, { dataBits: 8, parity: 'even', stopBits: 2 });
    const types = frame.map(b => b.type);
    expect(types.filter(t => t === 'parity').length).toBe(1);
    expect(types.filter(t => t === 'stop').length).toBe(2);
  });
});

describe('bitDurationMs', () => {
  it('9600 波特率每位约 0.104 ms', () => {
    expect(bitDurationMs(9600)).toBeCloseTo(0.10417, 4);
  });
});
```

- [ ] **Step 10: 运行测试验证失败**

Run: `npm test`
Expected: FAIL,`buildFrame` / `bitDurationMs` 未定义。

- [ ] **Step 11: 实现 buildFrame 与 bitDurationMs**

在 `src/uart.js` 追加:
```js
/**
 * 构建一帧 UART 信号的位序列。
 * config: { dataBits=8, parity='none', stopBits=1 }
 * 返回: [{ value: 0|1, type, label }]
 * 顺序: 空闲(高) -> 起始位(低) -> 数据位(LSB在前) -> [校验位] -> 停止位(高)
 */
export function buildFrame(byte, config = {}) {
  const { dataBits = 8, parity = 'none', stopBits = 1 } = config;
  const data = byteToDataBits(byte, dataBits);
  const frame = [];

  frame.push({ value: 1, type: 'idle', label: '空闲(高电平)' });
  frame.push({ value: 0, type: 'start', label: '起始位(拉低)' });
  data.forEach((b, i) => {
    frame.push({ value: b, type: 'data', label: `数据位 D${i}` });
  });

  const parityBit = computeParityBit(data, parity);
  if (parityBit !== null) {
    frame.push({
      value: parityBit,
      type: 'parity',
      label: parity === 'even' ? '偶校验位' : '奇校验位',
    });
  }

  for (let i = 0; i < stopBits; i++) {
    frame.push({ value: 1, type: 'stop', label: '停止位(拉高)' });
  }

  return frame;
}

/** 每一位持续的时间(毫秒)= 1 / 波特率 */
export function bitDurationMs(baudRate) {
  return 1000 / baudRate;
}
```

- [ ] **Step 12: 运行全部测试验证通过**

Run: `npm test`
Expected: PASS,所有 uart 逻辑测试通过。

- [ ] **Step 13: 提交**

```bash
git add src/uart.js test/uart.test.js
git commit -m "feat: UART 核心逻辑(位序列/校验/帧构建)+ 单元测试"
```

---

## Task 3: 波形坐标计算 `waveform.js`(TDD 纯函数部分)

**Files:**
- Create: `src/waveform.js`
- Test: `test/waveform.test.js`

- [ ] **Step 1: 写失败的测试 — frameToPoints**

创建 `test/waveform.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { frameToPoints } from '../src/waveform.js';

describe('frameToPoints', () => {
  const layout = { startX: 0, bitWidth: 10, highY: 0, lowY: 100 };

  it('每一位生成进入电平和保持两个点,形成方波', () => {
    // 两位: 高(1) 然后 低(0)
    const frame = [{ value: 1 }, { value: 0 }];
    const pts = frameToPoints(frame, layout);
    // 第 0 位 [x0..x10] 高电平 y=0;第 1 位 [x10..x20] 低电平 y=100
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1]).toEqual({ x: 10, y: 0 });
    expect(pts[2]).toEqual({ x: 10, y: 100 });
    expect(pts[3]).toEqual({ x: 20, y: 100 });
  });

  it('点的数量是位数的两倍', () => {
    const frame = [{ value: 1 }, { value: 0 }, { value: 1 }];
    expect(frameToPoints(frame, layout).length).toBe(6);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm test`
Expected: FAIL,`frameToPoints` 未定义。

- [ ] **Step 3: 实现 frameToPoints**

创建 `src/waveform.js`:
```js
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
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: 追加绘制函数(Canvas,手动验证,不写单测)**

在 `src/waveform.js` 追加(纯绘制,靠浏览器肉眼验证):
```js
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

  // 2. 画波形折线
  const points = frameToPoints(frame, layout);
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = '#202124';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. 高亮当前位:加粗描其上沿
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
```

- [ ] **Step 6: 运行测试确认纯函数仍通过**

Run: `npm test`
Expected: PASS(新增绘制函数不影响测试)。

- [ ] **Step 7: 提交**

```bash
git add src/waveform.js test/waveform.test.js
git commit -m "feat: 波形坐标计算(含单测)与 Canvas 绘制"
```

---

## Task 4: 播放控制 `player.js`

**Files:**
- Create: `src/player.js`

> 说明:动画基于定时器,逐位推进。这里把"推进到下一位"的逻辑做成简单可控的控制器,供 UI 调用。靠浏览器手动验证播放/暂停/单步/调速。

- [ ] **Step 1: 实现 Player 控制器**

创建 `src/player.js`:
```js
// src/player.js — 逐位播放控制器。与渲染解耦:每推进一位就回调 onTick(index)。

export function createPlayer({ totalBits, onTick, onDone }) {
  let index = -1;       // 当前播放到第几位
  let timer = null;     // setTimeout 句柄
  let stepMs = 600;     // 每位停留时间(慢放默认 600ms)

  function tick() {
    index += 1;
    onTick(index);
    if (index >= totalBits - 1) {
      stop();
      if (onDone) onDone();
      return;
    }
    timer = setTimeout(tick, stepMs);
  }

  function play() {
    if (timer) return;            // 已在播放
    if (index >= totalBits - 1) index = -1; // 播完后重播
    tick();
  }

  function pause() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function stop() {
    pause();
  }

  function stepOnce() {
    pause();
    if (index < totalBits - 1) { index += 1; onTick(index); }
  }

  function reset() {
    pause();
    index = -1;
    onTick(index);
  }

  function setSpeed(ms) { stepMs = ms; }

  return { play, pause, stepOnce, reset, setSpeed, getIndex: () => index };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/player.js
git commit -m "feat: 逐位播放控制器(播放/暂停/单步/调速/重置)"
```

---

## Task 5: UART 页面与交互 `uart.html` + `ui.js`

**Files:**
- Create: `uart.html`
- Create: `src/ui.js`
- Create: `styles/main.css`

- [ ] **Step 1: 写 UART 页面骨架**

创建 `uart.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>一个动画看懂 UART 串口通信 - 看得懂的嵌入式</title>
  <meta name="description" content="用交互动画演示 UART 串口通信:起始位、数据位、校验位、停止位是怎么一位位发出去的。嵌入式新手必看。" />
  <link rel="stylesheet" href="styles/main.css" />
</head>
<body>
  <header class="site-header">
    <a href="index.html" class="logo">看得懂的嵌入式</a>
  </header>

  <main class="container">
    <h1>一个动画看懂 UART 串口通信</h1>
    <p class="lead">输入一个字符,点击"发送",看它如何一位位变成电平信号发出去。</p>

    <section class="controls">
      <label>发送字符
        <input id="charInput" type="text" maxlength="1" value="A" />
      </label>
      <label>波特率
        <select id="baudSelect">
          <option value="9600">9600</option>
          <option value="115200" selected>115200</option>
        </select>
      </label>
      <label>数据位
        <select id="dataBitsSelect">
          <option value="5">5</option><option value="6">6</option>
          <option value="7">7</option><option value="8" selected>8</option>
          <option value="9">9</option>
        </select>
      </label>
      <label>校验位
        <select id="paritySelect">
          <option value="none" selected>无</option>
          <option value="even">偶校验</option>
          <option value="odd">奇校验</option>
        </select>
      </label>
      <label>停止位
        <select id="stopBitsSelect">
          <option value="1" selected>1</option>
          <option value="2">2</option>
        </select>
      </label>
      <label>速度
        <select id="speedSelect">
          <option value="1000">慢</option>
          <option value="600" selected>中</option>
          <option value="250">快</option>
        </select>
      </label>
    </section>

    <section class="player-bar">
      <button id="playBtn">▶ 发送</button>
      <button id="stepBtn">单步 ⏭</button>
      <button id="resetBtn">重置 ↺</button>
    </section>

    <canvas id="waveCanvas" width="900" height="220"></canvas>

    <p id="bitInfo" class="bit-info">点击「发送」开始演示</p>
    <p class="binary-info">二进制(LSB在前):<span id="binaryView">—</span></p>

    <section class="explain">
      <h2>UART 是怎么工作的?</h2>
      <p>UART 平时空闲时线上是<strong>高电平</strong>。要发数据时,先拉低一位作为<strong>起始位</strong>通知对方"我要发了";然后从<strong>最低位(LSB)</strong>开始一位位把数据发出去;可选地发一个<strong>校验位</strong>用于检错;最后拉高一位或两位作为<strong>停止位</strong>表示这帧结束。每一位持续的时间由<strong>波特率</strong>决定,9600 波特率就是每秒 9600 位,每位约 0.104 毫秒。</p>
    </section>

    <section class="cta">
      <p>想系统学习嵌入式?关注我的公众号 / 知识星球(链接待补充),获取完整教程与源码。</p>
    </section>
  </main>

  <script type="module" src="src/ui.js"></script>
</body>
</html>
```

- [ ] **Step 2: 写 UI 接线逻辑**

创建 `src/ui.js`:
```js
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
```

- [ ] **Step 3: 写样式(含移动端适配)**

创建 `styles/main.css`:
```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #202124;
  background: #fff;
  line-height: 1.6;
}
.site-header { padding: 16px 24px; border-bottom: 1px solid #eee; }
.logo { font-weight: 700; font-size: 18px; color: #1a73e8; text-decoration: none; }
.container { max-width: 960px; margin: 0 auto; padding: 24px; }
h1 { font-size: 28px; }
.lead { color: #5f6368; }
.controls {
  display: flex; flex-wrap: wrap; gap: 12px;
  background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;
}
.controls label { display: flex; flex-direction: column; font-size: 13px; color: #5f6368; gap: 4px; }
.controls input, .controls select { padding: 6px 8px; border: 1px solid #dadce0; border-radius: 6px; }
.player-bar { display: flex; gap: 12px; margin-bottom: 12px; }
.player-bar button {
  padding: 8px 16px; border: none; border-radius: 6px;
  background: #1a73e8; color: #fff; font-size: 14px; cursor: pointer;
}
.player-bar button:hover { background: #1558b0; }
#waveCanvas { width: 100%; height: auto; border: 1px solid #eee; border-radius: 8px; background: #fff; }
.bit-info { font-size: 18px; font-weight: 600; min-height: 28px; }
.binary-info { font-family: monospace; color: #5f6368; }
.explain { margin-top: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px; }
.cta { margin-top: 24px; padding: 16px; border: 1px dashed #1a73e8; border-radius: 8px; color: #1558b0; }
@media (max-width: 600px) {
  h1 { font-size: 22px; }
  .controls { flex-direction: column; }
}
```

- [ ] **Step 4: 本地起静态服务器手动验证**

Run: `npx serve .`(或用 VS Code Live Server)
打开浏览器访问输出的本地地址,打开 `/uart.html`。
Expected(逐项肉眼验证):
- 页面正常显示,有输入框、配置项、按钮、画布、讲解文字
- 点击「发送」后波形从左到右逐位高亮播放,文字解说同步更新("起始位""数据位 D0"…)
- 改字符/配置后波形随之变化;二进制显示 LSB 在前
- 「单步」每点一次前进一位;「重置」回到初始;「速度」可调快慢
- 手机尺寸(浏览器窄屏)下配置项纵向排列、画布自适应

- [ ] **Step 5: 提交**

```bash
git add uart.html src/ui.js styles/main.css
git commit -m "feat: UART 可视化页面与交互(输入/配置/播放/讲解)"
```

---

## Task 6: 首页 `index.html`

**Files:**
- Create: `index.html`

- [ ] **Step 1: 写首页(概念列表)**

创建 `index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>看得懂的嵌入式 - 用动画学嵌入式</title>
  <meta name="description" content="用交互动画把嵌入式协议和算法讲给新手听。第一课:UART 串口通信。" />
  <link rel="stylesheet" href="styles/main.css" />
</head>
<body>
  <header class="site-header">
    <a href="index.html" class="logo">看得懂的嵌入式</a>
  </header>
  <main class="container">
    <h1>用动画,把嵌入式讲到你"秒懂"</h1>
    <p class="lead">抽象的协议、算法,看动画比看文档快十倍。每个概念都能动手交互。</p>

    <ul class="topic-list">
      <li class="topic-card">
        <a href="uart.html">
          <h2>UART 串口通信</h2>
          <p>一个字节如何一位位变成电平信号发出去。起始位 / 数据位 / 校验位 / 停止位。</p>
        </a>
      </li>
      <li class="topic-card coming">
        <span>
          <h2>I2C / SPI 时序 <em>(即将上线)</em></h2>
          <p>主从、时钟线与数据线、地址与 ACK。</p>
        </span>
      </li>
    </ul>
  </main>
</body>
</html>
```

- [ ] **Step 2: 给首页卡片补样式**

在 `styles/main.css` 末尾追加:
```css
.topic-list { list-style: none; padding: 0; display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.topic-card a, .topic-card span { display: block; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-decoration: none; color: inherit; transition: box-shadow .2s; }
.topic-card a:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
.topic-card h2 { margin: 0 0 8px; font-size: 18px; color: #1a73e8; }
.topic-card p { margin: 0; color: #5f6368; font-size: 14px; }
.topic-card.coming span { opacity: .5; cursor: default; }
.topic-card.coming em { font-size: 12px; color: #9aa0a6; }
```

- [ ] **Step 3: 手动验证首页**

Run: `npx serve .`
打开本地地址根路径。
Expected:首页显示标题、概念卡片;点击 UART 卡片跳到 `uart.html`;窄屏下卡片单列。

- [ ] **Step 4: 提交**

```bash
git add index.html styles/main.css
git commit -m "feat: 首页概念列表"
```

---

## Task 7: 部署上线

**Files:** 无新增代码

- [ ] **Step 1: 跑一遍全部测试确保绿**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 2: 选一个免费静态托管部署**

推荐其一(都不需要备案):
- **Cloudflare Pages**:连接 GitHub 仓库或直接上传文件夹;构建命令留空,输出目录设为根目录。
- **Vercel**:`npx vercel` 按提示部署(framework 选 Other / static)。
- **GitHub Pages**:把代码推到 GitHub,仓库 Settings → Pages → 选分支根目录。

> 注意:`node_modules/` 和 `test/` 不需要上线;静态托管只需 `index.html`、`uart.html`、`styles/`、`src/`。

- [ ] **Step 3: 线上验收**

打开线上地址,重复 Task 5 Step 4 的肉眼验证项,确认线上行为与本地一致(含手机访问)。

- [ ] **Step 4: 首发引流(非代码,记录待办)**

- 录一段屏幕演示,发布到 B站,标题:「一个动画看懂 UART 串口通信」
- 公众号 / 掘金 / CSDN 同步发文,文末放网站链接
- 观察数据反馈,决定下一个要做的概念(I2C / CRC / PID …)

---

## 自查(Self-Review)

- **Spec 覆盖**:
  - UART 可视化(输入/波特率/数据位/校验/停止位/逐位动画/速度/讲解/移动端)→ Task 2/3/4/5 ✔
  - 核心逻辑与渲染解耦、纯逻辑可复用 → `uart.js`(Task 2)无 DOM 依赖,`waveform.js` 纯函数 frameToPoints 单独可测 ✔
  - 首页 + 子页可扩展结构 → Task 5/6 ✔
  - 引流入口(公众号/星球 CTA)→ `uart.html` 的 `.cta` 区块 ✔
  - 免费静态部署 → Task 7 ✔
  - 明确不做(登录/后端/广告/支付/其它协议)→ 计划未引入,符合 YAGNI ✔
- **占位符扫描**:无 TBD/TODO 式代码占位;CTA 文案里"链接待补充"是内容占位(上线前填真实链接),非代码缺口 ✔
- **类型一致性**:`buildFrame` 返回的 `{value,type,label}` 在 `waveform.js`/`ui.js` 中字段名一致;`createPlayer({totalBits,onTick,onDone})` 与 `ui.js` 调用一致;`frameToPoints(frame, layout)` 的 layout 字段 `{startX,bitWidth,highY,lowY}` 在 `ui.js` 的 `layoutFor` 中一致 ✔
