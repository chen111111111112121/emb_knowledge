import { describe, it, expect } from 'vitest';
import { escapeHtml, tabButtonHtml, chipPanelHtml } from '../src/chip-tabs.js';

const chip = {
  id: 'stm32',
  name: 'STM32 (HAL)',
  env: 'Keil',
  peripheral: 'USART1',
  pins: 'PA9 / PA10',
  configNotes: '配置要点',
  language: 'c',
  code: 'if (a < b && c) x = 1; // 注释',
  pitfalls: ['坑一', '坑二'],
};

describe('escapeHtml', () => {
  it('转义 < > &,避免代码被当成标签', () => {
    expect(escapeHtml('a < b && c > d')).toBe('a &lt; b &amp;&amp; c &gt; d');
  });
});

describe('tabButtonHtml', () => {
  it('包含芯片名与 data-chip,激活态带 active 类', () => {
    const html = tabButtonHtml(chip, true);
    expect(html).toContain('data-chip="stm32"');
    expect(html).toContain('STM32 (HAL)');
    expect(html).toContain('active');
  });
  it('非激活态不带 active 类', () => {
    expect(tabButtonHtml(chip, false)).not.toContain('active');
  });
});

describe('chipPanelHtml', () => {
  it('包含环境/引脚/配置要点/坑,且代码被转义', () => {
    const html = chipPanelHtml(chip, true);
    expect(html).toContain('data-panel="stm32"');
    expect(html).toContain('Keil');
    expect(html).toContain('PA9 / PA10');
    expect(html).toContain('配置要点');
    expect(html).toContain('坑一');
    expect(html).toContain('坑二');
    // 代码中的 < & 必须被转义
    expect(html).toContain('a &lt; b &amp;&amp; c');
    // 指定语言供 highlight.js 使用
    expect(html).toContain('language-c');
  });
});
