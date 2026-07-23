# 开发文档：全局默认快捷键功能

> 创建日期：2026-07-23
> 版本目标：v0.1.26

## 一、需求背景

当前快捷键按域名独立存储（`si-sidebar-close-shortcut@<域名>`），未单独设置的网站硬编码走默认 `Esc` 关闭。问题：

- 用户无法统一修改"所有未单独设置的网站"的默认关闭键
- 想把默认键从 Esc 改成 Alt+W，必须逐个站点设置，繁琐

## 二、功能目标

新增**全局默认快捷键**：用户可修改一个全局默认值，所有未单独设置快捷键的网站统一使用该全局默认，而非硬编码 Esc。

## 三、设计方案

### 3.1 存储结构

| key | 含义 | 取值 |
|-----|------|------|
| `si-sidebar-close-shortcut@__global__` | 全局默认快捷键 | `null`(Esc) / `{key,ctrl,alt,shift,meta}` / `false`(禁用) |
| `si-sidebar-close-shortcut@<域名>` | 单站点快捷键（不变） | 同上 |

### 3.2 快捷键解析优先级

```
域名自定义(已设) > 全局默认 > 硬编码 Esc
```

- 域名有自定义 → 用域名自定义
- 域名未设置 → 用全局默认
- 全局默认也为 null → 走硬编码 Esc（保持向后兼容）

### 3.3 设置入口

侧边栏顶栏新增"全局默认快捷键"按钮（齿轮图标 ⚙），点击后录入按键：
- 按某键组合 → 设为全局默认
- 按 Esc → 全局默认恢复为 Esc（null）
- 按 Backspace/Delete → 全局默认禁用（false）

原 ⌨ 按钮保持不变，仅设置当前域名快捷键。

### 3.4 兼容性

- 全局默认未设置时（旧用户）等同 null，行为不变
- Esc 冲突处理逻辑（冒泡阶段、尊重网站 defaultPrevented）保持不变

## 四、实现步骤

1. `sidebar.js`：新增全局默认快捷键读取与缓存（localStorage + chrome.storage）
2. `sidebar.js`：`matchShortcut` 与 keydown 监听改为"域名自定义 > 全局默认 > Esc"三级解析
3. `sidebar.js`：新增 `setGlobalShortcut()` 函数 + ⚙ 按钮入口
4. `sidebar.css`：（如需）按钮样式沿用现有 `.si-btn`
5. 更新 `manifest.json` 版本号
6. 更新 `CHANGELOG.md`
7. 更新根 `VERSION.md` 并推送 GitHub

## 五、验收

- 未设自定义的网站：全局默认为 Alt+W 时按 Alt+W 关侧边栏，Esc 归网站
- 全局默认为 Esc（默认）时行为与旧版一致
- 单站点自定义仍优先于全局默认
- 全局禁用(false) 时未设自定义的网站不能用快捷键关闭，只能点 ✕
