# UART 教学内容深化 + 多芯片代码 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `uart.html` 从"只有动画"升级为系统的 UART 教学页,并新增 STM32 / ESP32 / 51 / nRF52 四款芯片的 UART 配置说明与可运行最小示例代码(逐行注释、本地语法高亮)。

**Architecture:** 教学正文直接写进 `uart.html`(语义化 HTML,利于 SEO);四款芯片的代码与配置集中在纯数据模块 `src/chips/uart-chips.js`;`src/chip-tabs.js` 把数据渲染成 Tab + 代码块(纯构建函数可单测,挂载/事件绑定单独);语法高亮用本地 vendored highlight.js,避免国内 CDN 不稳。不改动现有动画逻辑(`uart.js`/`waveform.js`/`player.js`)。

**Tech Stack:** HTML + CSS + 原生 JS(ES Modules);highlight.js(本地 vendored);Vitest 单测;Git。

---

## 文件结构

```
uart.html                  # 升级:动画 + 教学正文(章节1-7)+ 芯片区容器(章节8)
src/chips/uart-chips.js    # 新建:4 款芯片的结构化数据(纯数据)
src/chip-tabs.js           # 新建:数据 → Tab/代码块的纯构建函数 + 挂载函数
test/chip-tabs.test.js     # 新建:chip-tabs 纯函数单测
vendor/highlight.min.js    # 新建:本地语法高亮库
vendor/highlight.css       # 新建:高亮主题
styles/main.css            # 修改:新增教学排版、Bug 表格、Tab、代码块样式
```

职责边界:

| 文件 | 职责 | 依赖 |
|------|------|------|
| `uart.html` | 教学正文 + 芯片区挂载点 | styles, chip-tabs, vendor/highlight |
| `uart-chips.js` | 芯片数据(name/env/pins/configNotes/code/pitfalls) | 无 |
| `chip-tabs.js` | `escapeHtml`、`tabButtonHtml`、`chipPanelHtml`(纯)+ `renderChipTabs`(挂载) | uart-chips(运行时由调用方传入)、hljs(全局) |

---

## Task 1: 教学正文(章节 1-7)+ 排版样式

**Files:**
- Modify: `uart.html`(在现有 `.explain` 之后、`.cta` 之前插入教学章节)
- Modify: `styles/main.css`(新增教学排版与 Bug 表格样式)

- [ ] **Step 1: 在 uart.html 中替换原有简短 `.explain` 段为系统教学章节**

打开 `uart.html`,把现有这一段:
```html
    <section class="explain">
      <h2>UART 是怎么工作的?</h2>
      <p>UART 平时空闲时线上是<strong>高电平</strong>。要发数据时,先拉低一位作为<strong>起始位</strong>通知对方"我要发了";然后从<strong>最低位(LSB)</strong>开始一位位把数据发出去;可选地发一个<strong>校验位</strong>用于检错;最后拉高一位或两位作为<strong>停止位</strong>表示这帧结束。每一位持续的时间由<strong>波特率</strong>决定,9600 波特率就是每秒 9600 位,每位约 0.104 毫秒。</p>
    </section>
```
替换为以下完整教学正文:
```html
    <article class="lesson">
      <section>
        <h2>1. UART 是什么</h2>
        <p>UART(通用异步收发器)是一种<strong>异步串行</strong>通信方式:数据一位接一位地在一根线上传输,收发双方<strong>没有共享时钟线</strong>,而是靠事先约定好的<strong>波特率</strong>各自计时。这点和 SPI、I2C(都有独立时钟线,属于同步通信)正好相反——少一根时钟线更省引脚,代价是双方必须把波特率配成一样。</p>
      </section>

      <section>
        <h2>2. 一帧长什么样</h2>
        <p>上面的动画演示的就是一帧的结构。线路空闲时是<strong>高电平</strong>;发送时依次是:</p>
        <ul>
          <li><strong>起始位</strong>:拉低 1 位,通知对方"要开始了"。</li>
          <li><strong>数据位</strong>:5~9 位,<strong>从最低位(LSB)先发</strong>。</li>
          <li><strong>校验位</strong>(可选):用于检错。</li>
          <li><strong>停止位</strong>:拉高 1 或 2 位,表示这帧结束。</li>
        </ul>
        <p>常用记法 <code>8N1</code> = 8 数据位 / 无校验(None)/ 1 停止位。</p>
      </section>

      <section>
        <h2>3. 波特率与误差</h2>
        <p><strong>波特率</strong>就是每秒传输多少位,如 9600、115200。因为没有时钟线,接收端是这样找准每一位的:检测到起始位下降沿后,以约定的位时间为节拍,在<strong>每一位的中点采样</strong>(芯片内部常用 16 倍过采样来定位中点),这样对边沿抖动最不敏感。</p>
        <p>波特率由芯片时钟分频得到,而<strong>分频往往不能整除</strong>,于是产生<strong>波特率误差</strong>。例如用 11.0592MHz 晶振能精确分出 9600,但用 12MHz 晶振就有约 ±0.16%~±几% 的误差。一般要求收发两端的累计误差控制在 <strong>±2% 以内</strong>,否则采样点会逐位偏移,最终采错位、出现乱码。这也是很多入门套件特意选 11.0592MHz 晶振的原因。</p>
      </section>

      <section>
        <h2>4. 电平与接口:TTL / RS-232 / RS-485</h2>
        <p>"UART"说的是<strong>数据格式</strong),而线上用什么电平是另一回事:</p>
        <ul>
          <li><strong>TTL 电平</strong>:MCU 引脚直接输出,高=供电电压(3.3V 或 5V),低=0V。板内、短距离用。</li>
          <li><strong>RS-232</strong>:电脑老串口,逻辑<strong>反相</strong>且电压为 ±3~±15V,要用 MAX232 之类芯片和 MCU 的 TTL 互转,<strong>不能直连</strong>。</li>
          <li><strong>RS-485</strong>:用<strong>差分</strong>(A/B 两线)传输,抗干扰强、可达上千米、支持多机总线,工业常用,需要 MAX485 之类收发器。</li>
        </ul>
        <p>两条铁律:① 两设备通信必须<strong>共地(GND 相连)</strong>;② <strong>TX 接对方的 RX、RX 接对方的 TX(交叉)</strong>。</p>
      </section>

      <section>
        <h2>5. 校验与可靠性</h2>
        <p>奇偶校验位让一帧里 1 的个数为奇数(奇校验)或偶数(偶校验)。它只能<strong>发现 1 位翻转的错误,不能纠正</strong>,也查不出偶数个位同时出错。芯片收到数据时还会报两类错:<strong>帧错误</strong>(该是停止位的位置却是低电平,通常是波特率不匹配)和<strong>溢出错误</strong>(上一个字节还没被读走,新字节又到了,旧的被覆盖)。</p>
      </section>

      <section>
        <h2>6. 流控(防止收太快丢数据)</h2>
        <ul>
          <li><strong>无流控</strong>:最常见,接收方必须够快(用中断/DMA)否则可能溢出丢字节。</li>
          <li><strong>软件流控(XON/XOFF)</strong>:用两个特殊字符通知对方"暂停/继续发",会占用数据通道、不能传二进制。</li>
          <li><strong>硬件流控(RTS/CTS)</strong>:多两根线,接收方用 RTS 告诉对方"我忙",最可靠,传文件常用。</li>
        </ul>
      </section>

      <section>
        <h2>7. 常见 Bug 排查表</h2>
        <table class="bug-table">
          <thead><tr><th>症状</th><th>可能原因</th><th>怎么排查</th></tr></thead>
          <tbody>
            <tr><td>收到全是乱码</td><td>两端波特率不一致;晶振不准导致误差过大</td><td>核对双方波特率;改用 11.0592MHz 或带误差小的时钟</td></tr>
            <tr><td>完全收不到数据</td><td>没共地;TX/RX 接反;电平不匹配(TTL 直连了 RS-232)</td><td>连 GND;交叉接线;加电平转换芯片</td></tr>
            <tr><td>只能发不能收(或反之)</td><td>对应方向引脚没配对、TX-RX 接反</td><td>万用表/逻辑分析仪确认线序与电平</td></tr>
            <tr><td>偶尔丢字节</td><td>轮询太慢、没用中断/DMA、缓冲区溢出</td><td>改中断或 DMA 接收;加大接收缓冲</td></tr>
            <tr><td>中文/特殊字符乱码</td><td>字符编码不一致(GBK vs UTF-8)</td><td>统一两端编码;按字节看十六进制确认</td></tr>
            <tr><td>偶尔多一位错位</td><td>波特率累计误差超 ±2%</td><td>重算分频值,选误差更小的波特率/时钟</td></tr>
          </tbody>
        </table>
      </section>
    </article>
```
> 注意:上面第 4 章首句 `<strong>数据格式</strong)` 是笔误,实现时写成 `<strong>数据格式</strong>`(正确闭合标签)。

- [ ] **Step 2: 修正 Step 1 中的标签笔误**

确认 `uart.html` 第 4 章首句为:
```html
        <p>"UART"说的是<strong>数据格式</strong>,而线上用什么电平是另一回事:</p>
```

- [ ] **Step 3: 在 styles/main.css 末尾追加教学排版与 Bug 表格样式**

```css
/* 教学正文 */
.lesson { margin-top: 24px; }
.lesson section { margin-bottom: 28px; }
.lesson h2 { font-size: 20px; margin: 0 0 8px; padding-left: 10px; border-left: 4px solid #1a73e8; }
.lesson p { margin: 8px 0; }
.lesson ul { margin: 8px 0; padding-left: 22px; }
.lesson li { margin: 4px 0; }
.lesson code { background: #f1f3f4; padding: 1px 6px; border-radius: 4px; font-size: 13px; }
/* Bug 排查表 */
.bug-table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px; }
.bug-table th, .bug-table td { border: 1px solid #e0e0e0; padding: 8px 10px; text-align: left; vertical-align: top; }
.bug-table th { background: #f8f9fa; }
.bug-table td:first-child { font-weight: 600; white-space: nowrap; }
@media (max-width: 600px) {
  .bug-table, .bug-table thead, .bug-table tbody, .bug-table tr, .bug-table th, .bug-table td { display: block; }
  .bug-table thead { display: none; }
  .bug-table tr { margin-bottom: 12px; border: 1px solid #e0e0e0; border-radius: 6px; padding: 6px; }
  .bug-table td { border: none; }
  .bug-table td:first-child { white-space: normal; color: #1a73e8; }
}
```

- [ ] **Step 4: 浏览器验证教学正文**

Run(若服务器未启动):`npx serve -l 4321 .`
打开 `http://localhost:4321/uart.html`,肉眼确认:7 个章节标题、列表、`8N1` 等行内代码、Bug 表格均正常显示;窄屏下 Bug 表格变为卡片式堆叠。

- [ ] **Step 5: 提交**

```bash
git add uart.html styles/main.css
git commit -m "feat: UART 系统教学正文(原理/波特率/电平/校验/流控/排查表)"
```

---

## Task 2: 芯片数据模块 `uart-chips.js`

**Files:**
- Create: `src/chips/uart-chips.js`

> 代码均已对照官方 API 写出(STM32 HAL、ESP32 Arduino、51 STC 寄存器、nRF52 Zephyr 轮询 API)。执行时若用 context7 复核发现签名差异,以官方为准并同步修正。

- [ ] **Step 1: 创建芯片数据文件**

创建 `src/chips/uart-chips.js`:
```js
// src/chips/uart-chips.js — 4 款芯片的 UART 配置与可运行最小示例(纯数据)
// 每个最小示例统一覆盖:初始化 → 发送一串字符 → 接收一个字节并回显

export const uartChips = [
  {
    id: 'stm32',
    name: 'STM32 (HAL)',
    env: 'STM32CubeIDE / Keil + HAL 库',
    peripheral: 'USART1',
    pins: 'PA9 = TX,PA10 = RX',
    configNotes:
      '以 STM32F1 为例,手写 HAL 配置(不依赖 CubeMX 工程)。要点:① 开 USART1 与 GPIOA 时钟;② TX 配复用推挽、RX 配输入;③ 用 huart 句柄设置 8N1 与波特率后调用 HAL_UART_Init。HAL_UART_Init 内部会回调 HAL_UART_MspInit,所以把时钟和引脚放到该回调里。',
    language: 'c',
    code: `#include "stm32f1xx_hal.h"

UART_HandleTypeDef huart1;

/* USART1: PA9=TX, PA10=RX, 115200 8N1 */
void UART1_Init(void)
{
    huart1.Instance          = USART1;
    huart1.Init.BaudRate     = 115200;               // 波特率
    huart1.Init.WordLength   = UART_WORDLENGTH_8B;   // 8 数据位
    huart1.Init.StopBits     = UART_STOPBITS_1;      // 1 停止位
    huart1.Init.Parity       = UART_PARITY_NONE;     // 无校验
    huart1.Init.Mode         = UART_MODE_TX_RX;      // 收发都开
    huart1.Init.HwFlowCtl    = UART_HWCONTROL_NONE;  // 无流控
    huart1.Init.OverSampling = UART_OVERSAMPLING_16; // 16 倍过采样
    HAL_UART_Init(&huart1);                          // 应用配置(会回调下面的 MspInit)
}

/* HAL_UART_Init 自动调用:在这里开时钟、配引脚 */
void HAL_UART_MspInit(UART_HandleTypeDef *huart)
{
    GPIO_InitTypeDef gpio = {0};
    __HAL_RCC_USART1_CLK_ENABLE();        // 开 USART1 时钟
    __HAL_RCC_GPIOA_CLK_ENABLE();         // 开 GPIOA 时钟

    gpio.Pin   = GPIO_PIN_9;              // PA9 -> TX
    gpio.Mode  = GPIO_MODE_AF_PP;        // 复用推挽输出
    gpio.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOA, &gpio);

    gpio.Pin  = GPIO_PIN_10;             // PA10 -> RX
    gpio.Mode = GPIO_MODE_INPUT;         // 输入
    gpio.Pull = GPIO_PULLUP;             // 上拉,空闲为高
    HAL_GPIO_Init(GPIOA, &gpio);
}

int main(void)
{
    uint8_t ch;
    HAL_Init();                          // 初始化 HAL
    /* 注意:真实工程还需 SystemClock_Config() 配置系统时钟 */
    UART1_Init();

    HAL_UART_Transmit(&huart1, (uint8_t *)"Hello UART\\r\\n", 12, HAL_MAX_DELAY); // 发字符串
    while (1) {
        if (HAL_UART_Receive(&huart1, &ch, 1, HAL_MAX_DELAY) == HAL_OK) {        // 收 1 字节
            HAL_UART_Transmit(&huart1, &ch, 1, HAL_MAX_DELAY);                   // 回显
        }
    }
}`,
    pitfalls: [
      '忘了 SystemClock_Config:时钟没配好会导致波特率全错、收发乱码。',
      '只开了 USART 时钟没开 GPIO 时钟,或 TX 没配成复用推挽(AF_PP),会发不出数据。',
    ],
  },

  {
    id: 'esp32',
    name: 'ESP32 (Arduino)',
    env: 'Arduino IDE + ESP32 开发板包',
    peripheral: 'UART0(USB 调试)/ UART2(外接)',
    pins: 'UART2: RX = GPIO16,TX = GPIO17(可重映射)',
    configNotes:
      'ESP32 在 Arduino 框架下用 Serial 系列对象,极简。Serial 走 USB 调试口;Serial2 可指定任意引脚接外部设备。begin 的第二个参数 SERIAL_8N1 就是 8 数据位/无校验/1 停止位。',
    language: 'cpp',
    code: `void setup() {
  Serial.begin(115200);                       // USB 调试串口(UART0)
  Serial2.begin(9600, SERIAL_8N1, 16, 17);    // UART2: 9600 8N1, RX=GPIO16, TX=GPIO17
  Serial.println("Hello UART");               // 往调试串口发一行
  Serial2.print("Hello UART\\r\\n");           // 往 UART2 发字符串
}

void loop() {
  if (Serial2.available()) {                  // UART2 有数据可读
    char c = Serial2.read();                  // 读 1 个字节
    Serial2.write(c);                         // 回显到 UART2
    Serial.print(c);                          // 同时打到调试串口方便观察
  }
}`,
    pitfalls: [
      'GPIO16/17 在带 PSRAM 的模组上可能被占用,换其它空闲引脚即可(ESP32 UART 引脚可自由映射)。',
      '波特率写错(如把 115200 写成 9600)是乱码最常见原因,串口监视器的波特率也要对应。',
    ],
  },

  {
    id: 'mcs51',
    name: '51 单片机 (STC)',
    env: 'Keil C51',
    peripheral: 'UART(定时器1 产生波特率)',
    pins: 'P3.0 = RXD,P3.1 = TXD',
    configNotes:
      '经典 8051 用定时器1 的模式2(8 位自动重装)产生波特率。下例以 11.0592MHz 晶振、9600 波特率为准,重装值 TH1=TL1=0xFD。SCON=0x50 表示串口模式1(8 位 UART)且允许接收(REN=1)。发送/接收靠查询 TI/RI 标志。',
    language: 'c',
    code: `#include <reg52.h>

/* 11.0592MHz 晶振, 9600 波特率 */
void UART_Init(void)
{
    SCON  = 0x50;   // 模式1(8位UART), REN=1 允许接收
    TMOD &= 0x0F;   // 清定时器1 的控制位
    TMOD |= 0x20;   // 定时器1 工作于模式2(8位自动重装)
    TH1   = 0xFD;   // 重装值: 9600bps @ 11.0592MHz
    TL1   = 0xFD;
    TR1   = 1;      // 启动定时器1
    // PCON &= 0x7F; // SMOD=0, 波特率不加倍(上电默认即为0)
}

void UART_SendByte(unsigned char dat)
{
    SBUF = dat;     // 写入发送缓冲, 硬件自动发出
    while (!TI);    // 等待发送完成(TI 置1)
    TI = 0;         // 软件清发送标志
}

void main(void)
{
    unsigned char c;
    char *s = "Hello UART\\r\\n";

    UART_Init();
    while (*s) UART_SendByte(*s++);   // 发送字符串

    while (1) {
        if (RI) {                     // 收到 1 个字节(RI 置1)
            c  = SBUF;                 // 取走数据
            RI = 0;                    // 软件清接收标志
            UART_SendByte(c);          // 回显
        }
    }
}`,
    pitfalls: [
      '用 12MHz 晶振算 9600 波特率会有误差,容易乱码;入门首选 11.0592MHz。',
      '收/发标志位 TI、RI 必须软件手动清零,忘清会导致一直触发或收不到下一个字节。',
    ],
  },

  {
    id: 'nrf52',
    name: 'Nordic nRF52',
    env: 'nRF Connect SDK(Zephyr RTOS)',
    peripheral: 'uart0(板载调试串口)',
    pins: '由设备树(devicetree)分配;波特率用 current-speed 设置',
    configNotes:
      'nRF Connect SDK 基于 Zephyr。最简单的是轮询 API:用 DEVICE_DT_GET 从设备树拿到 UART 设备,uart_poll_out 发一个字节,uart_poll_in 读一个字节(无数据时返回非 0)。波特率、引脚等在设备树/overlay 里配(如 current-speed = <115200>;),代码里不用手写寄存器。',
    language: 'c',
    code: `#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/drivers/uart.h>

/* 从设备树取 uart0(nRF52 DK 默认连到板载调试串口) */
#define UART_NODE DT_NODELABEL(uart0)
static const struct device *const uart_dev = DEVICE_DT_GET(UART_NODE);

int main(void)
{
    unsigned char c;
    const char *msg = "Hello UART\\r\\n";

    if (!device_is_ready(uart_dev)) {     // 确认设备就绪
        return 0;
    }

    for (const char *p = msg; *p; p++) {
        uart_poll_out(uart_dev, *p);      // 逐字节发送(阻塞直到发出)
    }

    while (1) {
        if (uart_poll_in(uart_dev, &c) == 0) {  // 返回0表示读到1字节
            uart_poll_out(uart_dev, c);          // 回显
        }
        k_msleep(1);                              // 轮询间隔, 让出 CPU
    }
    return 0;
}`,
    pitfalls: [
      '波特率/引脚在设备树而非代码里配置;只改代码里的数值不会生效,要改 .dts/overlay 的 current-speed。',
      '若启用了硬件流控,uart_poll_out 可能一直阻塞;调试期先关掉流控。',
    ],
  },
];
```

- [ ] **Step 2: 用 context7 复核四款芯片的关键 API(只读,不改测试)**

依次核对(发现差异则就地修正上面的 `code`/`configNotes`,以官方为准):
- STM32:`HAL_UART_Init` / `HAL_UART_Transmit` / `HAL_UART_Receive` 参数顺序与类型
- ESP32:`Serial.begin(baud, config, rxPin, txPin)`、`available` / `read` / `write`
- 51:`SCON`/`TMOD`/`TH1` 模式2 在 9600@11.0592MHz 的重装值 `0xFD`
- nRF52:`uart_poll_in(dev, &c)` 返回 0 表示成功、`uart_poll_out(dev, c)`、`DEVICE_DT_GET`

- [ ] **Step 3: 语法自检(确保模块能被加载)**

Run: `node --input-type=module -e "import('./src/chips/uart-chips.js').then(m => console.log('chips:', m.uartChips.length, m.uartChips.map(c => c.id).join(',')))"`
Expected: `chips: 4 stm32,esp32,mcs51,nrf52`

- [ ] **Step 4: 提交**

```bash
git add src/chips/uart-chips.js
git commit -m "feat: 4 款芯片 UART 配置与最小示例数据(STM32/ESP32/51/nRF52)"
```

---

## Task 3: 本地 highlight.js(语法高亮)

**Files:**
- Create: `vendor/highlight.min.js`
- Create: `vendor/highlight.css`

- [ ] **Step 1: 下载 highlight.js 浏览器版与主题到 vendor/**

Run:
```bash
mkdir -p vendor
curl -fsSL https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js -o vendor/highlight.min.js
curl -fsSL https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css -o vendor/highlight.css
```
Expected:两个文件均下载成功(非 0 字节)。

- [ ] **Step 2: 校验文件非空且像预期内容**

Run: `wc -c vendor/highlight.min.js vendor/highlight.css && head -c 80 vendor/highlight.min.js`
Expected:`highlight.min.js` 数十~上百 KB,`highlight.css` 数 KB;文件头部能看到 highlight.js 版权/压缩代码。

> 若 curl 失败(网络受限):改用 npm 取包后复制——
> `npm i -D highlight.js@11.9.0 && cp node_modules/highlight.js/styles/github.css vendor/highlight.css`,
> 浏览器版 JS 从 `node_modules/highlight.js/lib/` 不是单文件,此时改用 jsdelivr 镜像:
> `curl -fsSL https://fastly.jsdelivr.net/npm/highlight.js@11.9.0/lib/highlight.min.js -o vendor/highlight.min.js`(common 构建已含 C/C++)。

- [ ] **Step 3: 提交**

```bash
git add vendor/highlight.min.js vendor/highlight.css
git commit -m "chore: 本地 vendored highlight.js 语法高亮(避免 CDN 不稳)"
```

---

## Task 4: 芯片 Tab 渲染 `chip-tabs.js`(TDD 纯函数)

**Files:**
- Create: `src/chip-tabs.js`
- Test: `test/chip-tabs.test.js`

- [ ] **Step 1: 写失败的测试**

创建 `test/chip-tabs.test.js`:
```js
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run test/chip-tabs.test.js`
Expected: FAIL,无法从 `../src/chip-tabs.js` 导入。

- [ ] **Step 3: 实现纯构建函数**

创建 `src/chip-tabs.js`:
```js
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
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run test/chip-tabs.test.js`
Expected: PASS(6 个断言全过)。

- [ ] **Step 5: 追加挂载函数(浏览器用,不写单测)**

在 `src/chip-tabs.js` 末尾追加:
```js
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
```

- [ ] **Step 6: 运行全部测试确认仍通过**

Run: `npm test`
Expected: PASS(uart + waveform + chip-tabs 全过)。

- [ ] **Step 7: 提交**

```bash
git add src/chip-tabs.js test/chip-tabs.test.js
git commit -m "feat: 芯片 Tab 渲染(纯构建函数含单测 + 挂载/高亮)"
```

---

## Task 5: 整合芯片区到 uart.html + 浏览器验证 + 部署

**Files:**
- Modify: `uart.html`(引入 highlight、加芯片区容器、挂载脚本)
- Modify: `styles/main.css`(Tab 与代码块样式)

- [ ] **Step 1: 在 uart.html 的 `<head>` 引入高亮样式**

在 `<link rel="stylesheet" href="styles/main.css" />` 之前加:
```html
  <link rel="stylesheet" href="vendor/highlight.css" />
```

- [ ] **Step 2: 在教学正文 `</article>` 之后、`.cta` 之前加芯片区容器**

```html
    <section class="chips">
      <h2>8. 主流芯片怎么配 UART</h2>
      <p class="lead">下面是四款常见芯片的最小可运行示例(初始化 → 发字符串 → 收一个字节回显),切换 Tab 查看。</p>
      <div id="chipTabs"></div>
    </section>
```

- [ ] **Step 3: 在 uart.html 底部引入 highlight 与挂载脚本**

在现有 `<script type="module" src="src/ui.js"></script>` 之后加:
```html
  <script src="vendor/highlight.min.js"></script>
  <script type="module">
    import { uartChips } from './src/chips/uart-chips.js';
    import { renderChipTabs } from './src/chip-tabs.js';
    renderChipTabs(document.getElementById('chipTabs'), uartChips);
  </script>
```

- [ ] **Step 4: 在 styles/main.css 末尾追加 Tab 与代码块样式**

```css
/* 芯片区 Tab */
.chips { margin-top: 28px; }
.chip-tabbar { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; border-bottom: 2px solid #eee; }
.chip-tab { padding: 8px 14px; border: none; background: transparent; cursor: pointer; font-size: 14px; color: #5f6368; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.chip-tab.active { color: #1a73e8; border-bottom-color: #1a73e8; font-weight: 600; }
.chip-panel { display: none; }
.chip-panel.active { display: block; }
.chip-meta { font-size: 13px; color: #5f6368; }
.chip-notes { background: #f8f9fa; padding: 12px; border-radius: 8px; }
.chip-panel pre { margin: 12px 0; border-radius: 8px; overflow: auto; }
.chip-panel pre code { font-size: 13px; line-height: 1.5; }
.chip-pitfalls { font-size: 14px; }
.chip-pitfalls ul { margin: 6px 0; padding-left: 20px; }
```

- [ ] **Step 5: 浏览器验证(Playwright)**

创建临时脚本 `test/chips_check.py`:
```python
from playwright.sync_api import sync_playwright

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("pageerror", lambda e: errors.append("PAGEERROR: " + str(e)))
    page.goto("http://localhost:4321/uart.html")
    page.wait_for_load_state("networkidle")

    tabs = page.locator(".chip-tab").count()
    active_first = page.locator(".chip-panel.active [class*='language-']").count()
    # 切到 51 单片机 Tab
    page.click('.chip-tab[data-chip="mcs51"]')
    page.wait_for_timeout(300)
    active_panel = page.locator(".chip-panel.active").get_attribute("data-panel")
    # highlight 是否生效(hljs 会加 class)
    highlighted = page.locator(".chip-panel.active code.hljs").count()
    page.screenshot(path="/tmp/chips.png", full_page=True)

    print("tab_count:", tabs)
    print("first_panel_has_codeblock:", active_first)
    print("active_panel_after_click:", active_panel)
    print("highlighted_blocks:", highlighted)
    print("errors:", errors)
    browser.close()
```
Run:`(npx serve -l 4321 . &) ; sleep 4 ; python test/chips_check.py`
Expected:`tab_count: 4`;`active_panel_after_click: mcs51`;`highlighted_blocks: 1`;`errors: []`。截图 `/tmp/chips.png` 中四个 Tab、代码高亮、常见坑均正常显示。

- [ ] **Step 6: 删除临时验证脚本并跑全部单测**

Run: `rm -f test/chips_check.py && npm test`
Expected: 全部单测 PASS。

- [ ] **Step 7: 提交并合并、推送上线**

```bash
git add uart.html styles/main.css
git commit -m "feat: 整合芯片配置代码区到 UART 教学页(Tab + 高亮)"
git checkout main
git merge --no-ff <feature-branch> -m "merge: UART 教学内容深化 + 多芯片代码"
npm test
git push origin main
git branch -d <feature-branch>
```
Expected:合并后 `npm test` 全过,push 成功。GitHub Pages 已开启的话,几分钟后线上自动更新。

---

## 自查(Self-Review)

- **Spec 覆盖**:
  - 教学章节 1-7(原理/帧/波特率误差/电平接口/校验/流控/Bug表)→ Task 1 ✔
  - 4 款芯片配置 + 最小示例(逐行注释)→ Task 2(STM32/ESP32/51/nRF52)✔
  - 代码准确性(context7 复核)→ Task 2 Step 2 ✔
  - 结构化数据 + 渲染解耦 + 纯函数可测 → Task 2(数据)/ Task 4(`escapeHtml`/`tabButtonHtml`/`chipPanelHtml` 纯函数 + 单测)✔
  - 本地 highlight.js 避免 CDN → Task 3 ✔
  - 移动端可读(Bug 表卡片化、代码块横向滚动)→ Task 1 / Task 5 样式 ✔
  - 不改动现有动画逻辑 → 仅改 `uart.html`/`styles`,未触碰 `uart.js`/`waveform.js`/`player.js` ✔
  - 浏览器验证(Tab 切换/高亮)→ Task 5 ✔
- **占位符扫描**:Task 1 中故意标注的标签笔误已配套 Step 2 修正,非遗留占位;无 TODO/TBD 代码占位。
- **类型/命名一致性**:芯片对象字段 `{id,name,env,peripheral,pins,configNotes,language,code,pitfalls}` 在 `uart-chips.js`(Task 2)、`chip-tabs.js` 构建函数与测试(Task 4)中一致;`renderChipTabs(container, chips)` 与 Task 5 Step 3 调用一致;容器 id `chipTabs`、类名 `chip-tab/chip-panel/data-chip/data-panel` 在 HTML/JS/CSS 中一致。
