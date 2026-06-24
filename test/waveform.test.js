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
