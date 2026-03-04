[English](README.md)

# Don't Reset Password

一个 Chrome 插件，通过众包的方式收集并展示各网站的密码规则，在密码输入框旁边直接显示——让你再也不用重置密码。

## 功能特性

- 自动检测任意网站的密码输入框
- 以工具提示的形式展示密码规则（最小/最大长度、必需字符类型等）
- 众包规则——任何人都可以为任意网站贡献密码规则
- 投票机制确保规则的准确性
- 预置 30+ 热门网站规则（Google、GitHub、Apple、Amazon 等）
- 支持深色模式
- 双语界面（中文 & English）

## 架构

```
Content Script → chrome.runtime.sendMessage → Service Worker → Cache → Supabase Edge Functions → PostgreSQL
```

- **Manifest V3** Chrome 扩展
- **Supabase** 后端（Edge Functions + PostgreSQL + RLS）
- **Shadow DOM** 工具提示——与页面样式完全隔离
- **无需构建**——纯原生 JS

## 安装

### 从源码安装

1. 克隆本仓库
2. 在 Chrome 中打开 `chrome://extensions`
3. 开启右上角的**开发者模式**
4. 点击**加载已解压的扩展程序** → 选择 `extension/` 目录

### 配置后端

编辑 `extension/utils/api.js`，将 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 替换为你的 Supabase 项目值。

## 后端部署

### 数据库

在 [Supabase SQL Editor](https://supabase.com/dashboard) 中按顺序执行以下 SQL 文件：

```sql
-- 1. 创建表结构
supabase/migrations/001_initial_schema.sql

-- 2. 填充种子数据（30+ 热门网站）
supabase/seed.sql
```

### Edge Functions

```bash
supabase functions deploy get-rules --no-verify-jwt
supabase functions deploy submit-rules --no-verify-jwt
supabase functions deploy vote --no-verify-jwt
supabase functions deploy report --no-verify-jwt
```

## 测试

```bash
npm test
```

116 个单元测试，覆盖域名提取、规则校验、缓存、API 客户端和国际化——使用 Node.js 内置的 `node:test`（零依赖）。

## 预置网站

Google、Apple、Microsoft、Amazon、Facebook、GitHub、X (Twitter)、Netflix、LinkedIn、Chase Bank、Bank of America、PayPal、Dropbox、Adobe、Spotify、Reddit、Discord、Slack、Notion、Steam、Outlook、Zoom、eBay、Walmart、Instagram、淘宝、支付宝、微信、京东、百度、Bilibili

## 工作原理

1. Content Script 检测 `<input type="password">` 输入框（包括通过 MutationObserver 检测动态插入的输入框）
2. 向 Service Worker 请求规则，Service Worker 先查缓存再查 Supabase
3. 在密码输入框下方渲染 Shadow DOM 工具提示
4. 用户可以通过 Popup 对规则进行投票或贡献新规则

## 许可证

MIT
