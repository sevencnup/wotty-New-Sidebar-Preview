# 开发文档：火狐兼容 + 修复 service worker 挂起丢状态

> 创建日期：2026-07-23
> 版本目标：v0.1.27

## 一、问题

### 1.1 火狐用不了
- 当前 `manifest.json` 用 `"background": { "service_worker": "src/background.js" }`，火狐 MV3 不支持 service_worker 作为后台，导致 background 完全不加载，拦截失效
- 缺少 `browser_specific_settings.gecko.id`，火狐无法识别扩展

### 1.2 关闭一次每一次都要重装
- `background.js` 把 `pending`（待处理新标签）和 `handled`（已处理去重）存在内存 `Map`/`Set`
- MV3 service worker 30 秒空闲即挂起，内存状态清空
- 新标签先 `about:blank` 触发 `onCreated`（存入 pending），再导航到真实 URL 触发 `onBeforeNavigate`（读 pending）
- 若 SW 在两次事件间被挂起，`pending` 丢失 → `onBeforeNavigate` 查不到 → 拦截跳过 → 新标签正常打开
- 用户表现为"关闭一次就失效，要重装/重载扩展才恢复"

## 二、方案

### 2.1 火狐兼容
manifest 改为同时支持 Chrome 与火狐：
```json
"background": {
  "service_worker": "src/background.js",
  "scripts": ["src/background.js"]
},
"browser_specific_settings": {
  "gecko": {
    "id": "sidebar-interceptor@sevencnup",
    "strict_min_version": "115.0"
  }
}
```
- Chrome 用 `service_worker`，忽略 `scripts`
- 火狐用 `scripts`（非持久后台页，MV3 事件页）
- `declarativeNetRequest` 火狐 113+ 支持，`getDynamicRules`/静态规则兼容

### 2.2 状态持久化
将 `pending`、`handled` 从内存改为 `chrome.storage.session`：
- session storage 随浏览器会话存活，SW 挂起/重启不丢失
- 启动时从 session 恢复内存缓存，事件中增量写回
- 封装 `loadState`/`savePending`/`saveHandled`，保持事件处理逻辑不变

## 三、实现步骤

1. `manifest.json`：加 `background.scripts`、`browser_specific_settings.gecko`
2. `background.js`：`pending`/`handled` 改为 session storage 持久化
3. 更新 `manifest.json` 版本号 → 0.1.27
4. 更新 `CHANGELOG.md`
5. 更新根 `VERSION.md` 并推送

## 四、验收

- 火狐加载扩展后拦截正常生效
- Chrome 关闭侧边栏后再次打开新标签，拦截仍生效，无需重载扩展
- service worker 挂起重启后 pending/handled 状态完整恢复
