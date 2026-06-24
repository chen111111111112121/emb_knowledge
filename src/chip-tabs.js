// src/chip-tabs.js — 芯片 Tab 渲染。构建函数为纯函数(可测),挂载/事件单独。

/** 转义 HTML 特殊字符,防止代码片段被当成标签 */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 一个 Tab 按钮的 HTML */
export function tabButtonHtml(chip, isActive) {
  return `<button class="chip-tab${isActive ? ' active' : ''}" data-chip="${chip.id}">${escapeHtml(chip.name)}</button>`;
}

/** 一个芯片面板的 HTML */
export function chipPanelHtml(chip, isActive) {
  const pitfalls = chip.pitfalls.map((p) => `<li>${escapeHtml(p)}</li>`).join('');
  return `
<div class="chip-panel${isActive ? ' active' : ''}" data-panel="${chip.id}">
  <p class="chip-meta"><strong>开发环境:</strong>${escapeHtml(chip.env)}　|　<strong>外设:</strong>${escapeHtml(chip.peripheral)}　|　<strong>引脚:</strong>${escapeHtml(chip.pins)}</p>
  <p class="chip-notes">${escapeHtml(chip.configNotes)}</p>
  <pre><code class="language-${chip.language}">${escapeHtml(chip.code)}</code></pre>
  <div class="chip-pitfalls"><strong>常见坑:</strong><ul>${pitfalls}</ul></div>
</div>`;
}

/**
 * 把芯片 Tab 渲染进容器并绑定切换;若全局有 hljs 则高亮。
 * @param {HTMLElement} container
 * @param {Array} chips
 */
export function renderChipTabs(container, chips) {
  const tabs = chips.map((c, i) => tabButtonHtml(c, i === 0)).join('');
  const panels = chips.map((c, i) => chipPanelHtml(c, i === 0)).join('');
  container.innerHTML = `<div class="chip-tabbar">${tabs}</div>${panels}`;

  container.querySelectorAll('.chip-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.chip;
      container.querySelectorAll('.chip-tab').forEach((b) =>
        b.classList.toggle('active', b.dataset.chip === id));
      container.querySelectorAll('.chip-panel').forEach((p) =>
        p.classList.toggle('active', p.dataset.panel === id));
    });
  });

  if (window.hljs) {
    container.querySelectorAll('pre code').forEach((el) => window.hljs.highlightElement(el));
  }
}
