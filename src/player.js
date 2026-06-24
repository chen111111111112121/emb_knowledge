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
    if (timer) return;                       // 已在播放
    if (index >= totalBits - 1) index = -1;  // 播完后重播
    tick();
  }

  function pause() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function stop() {
    pause();
  }

  function stepOnce() {
    pause();
    if (index < totalBits - 1) {
      index += 1;
      onTick(index);
    }
  }

  function reset() {
    pause();
    index = -1;
    onTick(index);
  }

  function setSpeed(ms) {
    stepMs = ms;
  }

  return { play, pause, stepOnce, reset, setSpeed, getIndex: () => index };
}
