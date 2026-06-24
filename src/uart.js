// src/uart.js — 纯逻辑,无 DOM 依赖,可复用到微信小程序

/** 把一个字节拆成数据位数组,LSB(最低位)在前——这正是 UART 实际发送顺序 */
export function byteToDataBits(byte, dataBits) {
  const bits = [];
  for (let i = 0; i < dataBits; i++) {
    bits.push((byte >> i) & 1);
  }
  return bits;
}

/** 计算校验位。parityMode: 'none' | 'even' | 'odd' */
export function computeParityBit(dataBits, parityMode) {
  if (parityMode === 'none') return null;
  const ones = dataBits.reduce((sum, b) => sum + b, 0);
  if (parityMode === 'even') return ones % 2 === 0 ? 0 : 1;
  if (parityMode === 'odd') return ones % 2 === 0 ? 1 : 0;
  throw new Error('未知校验模式: ' + parityMode);
}

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
