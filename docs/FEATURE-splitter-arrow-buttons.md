# 开发文档：splitter 分界线箭头交换按钮

> 创建日期：2026-07-23
> 版本目标：v0.1.30

## 一、需求

在中间可拖拽宽度的分界线（splitter）上放两个箭头按钮：
- ◀（向左箭头）：把右侧侧边栏当前页扔到左边主标签页
- ▶（向右箭头）：把左边主标签页扔到右侧侧边栏

即左右交换功能的可视化入口，让用户一眼看到分界线两侧可互换。

## 二、方案

### 2.1 DOM
splitter 内嵌两个按钮 `.si-swap-left`(◀) / `.si-swap-right`(▶)。
- ◀ 点击 = swapWithLeft()（右侧页 → 左侧）
- ▶ 点击 = 反向交换（左侧页 → 右侧）

反向交换实现：左侧页扔到右侧侧边栏=openUrl(leftUrl)，右侧页扔到左侧主标签=让主标签导航到 sidebarUrl。
但左侧主标签导航需 background 协助，复用 SWAP 消息但参数对调：
- 正向 ◀：SWAP { sidebarUrl→主标签, leftUrl→侧边栏 }
- 反向 ▶：同样 SWAP，因为 swapWithLeft 本就是"右侧页去左边，左侧页去右边"

实际上 ◀ 和 ▶ 是同一交换动作的两种视觉理解。为避免混淆：
- ◀ = 把右侧页推到左边（swapWithLeft）
- ▶ = 把左侧页推到右边（同样 swapWithLeft，结果一样）

两者等价，都调 swapWithLeft()。两个箭头只是提示用户"分界线两侧可互换"。

### 2.2 CSS
按钮垂直居中悬浮在 splitter 上，hover 高亮，点击不触发拖拽。
splitter.mousedown 里判断 e.target 若为按钮则跳过拖拽。

## 三、实现步骤

1. sidebar.js：splitter 内嵌两个按钮，绑 click 调 swapWithLeft，阻止冒泡
2. sidebar.js：initResize 的 mousedown 判断 target 是按钮则 return
3. sidebar.css：.si-swap-left / .si-swap-right 样式
4. 更新 manifest 版本 → 0.1.30
5. 更新 CHANGELOG + VERSION 并推送
