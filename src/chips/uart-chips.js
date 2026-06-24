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
