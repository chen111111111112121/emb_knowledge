# 看得懂的嵌入式

用**交互动画**把嵌入式协议/算法讲给新手听的学习网站。

🔗 第一课:**[一个动画看懂 UART 串口通信](uart.html)** —— 输入一个字符,看它如何一位位变成电平信号发出去(起始位 / 数据位 / 校验位 / 停止位)。

## 本地运行

纯静态网站,无需构建。任选一种方式起一个本地服务器:

```bash
npx serve .
# 然后浏览器打开输出的地址,访问 / 或 /uart.html
```

## 运行测试

核心逻辑(`src/uart.js`、`src/waveform.js`)有单元测试:

```bash
npm install
npm test
```

## 目录结构

```
index.html        首页:概念列表
uart.html         UART 可视化页面
src/uart.js       纯逻辑:字节+配置 → 位序列(可测、可复用到小程序)
src/waveform.js   波形坐标计算(纯函数)+ Canvas 绘制
src/player.js     逐位播放控制器
src/ui.js         页面与逻辑/渲染/播放的接线
styles/main.css   样式(含移动端适配)
test/             单元测试
docs/             设计文档与实现计划
```

## 设计与计划

- 设计文档:`docs/superpowers/specs/2026-06-24-embedded-visual-learning-design.md`
- 实现计划:`docs/superpowers/plans/2026-06-24-embedded-visual-learning-uart.md`
