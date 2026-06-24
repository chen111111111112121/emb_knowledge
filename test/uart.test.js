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

describe('buildFrame', () => {
  it('8N1(8 数据位/无校验/1 停止位)结构正确', () => {
    const frame = buildFrame(0x41, { dataBits: 8, parity: 'none', stopBits: 1 });
    const types = frame.map((b) => b.type);
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
    const dataValues = frame.filter((b) => b.type === 'data').map((b) => b.value);
    expect(dataValues).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('带偶校验和 2 停止位', () => {
    const frame = buildFrame(0x01, { dataBits: 8, parity: 'even', stopBits: 2 });
    const types = frame.map((b) => b.type);
    expect(types.filter((t) => t === 'parity').length).toBe(1);
    expect(types.filter((t) => t === 'stop').length).toBe(2);
  });
});

describe('bitDurationMs', () => {
  it('9600 波特率每位约 0.104 ms', () => {
    expect(bitDurationMs(9600)).toBeCloseTo(0.10417, 4);
  });
});
