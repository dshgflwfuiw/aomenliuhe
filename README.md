# 特肖趋势 Pro - Cloudflare Pages 部署版

纯静态单页应用（无后端），已在原单文件 `index.html` 基础上拆分为：

```
public/
  index.html    页面结构
  style.css     样式（原 <style> 块）
  app.js        逻辑（原 <script> 块）
functions/
  api/proxy.js  Cloudflare Pages Function: 开奖数据代理 /api/proxy?year=2026
wrangler.toml   部署配置
```

## 为什么需要数据代理

浏览器直接请求开奖接口会受跨域（CORS）限制，且原页面依赖的第三方代理
`lottery-proxy.fuyingone.workers.dev` 不受自己控制。部署到 Cloudflare 后，
页面请求同源的 `/api/proxy?year=YYYY`，由 Pages Function 在服务端拉取数据并
返回，同时带 1 小时边缘缓存。若代理不可用，前端仍会回退直连原接口，再不行
自动加载演示数据，不会白屏。

## 本地预览（推荐）

```bash
npx wrangler pages dev
```

该命令会在本地同时启动静态资源服务和 Functions（`/api/proxy` 可用）。

## 部署

方式一：命令行

```bash
npx wrangler login
npx wrangler pages project create teshu-trend   # 首次创建项目
npx wrangler pages deploy                        # 之后每次部署
```

方式二：Git 接入

在 Cloudflare 控制台新建 Pages 项目，连接本仓库，构建命令留空、
构建输出目录填 `public`，保存后每次 push 自动部署。

## 已修复的问题（相对原单文件版）

- 手动导入 JSON 失效：`processData` 现在会先 `JSON.parse`
- `sizeSmallBar` 重复 id：遗漏页的"小"柱状图改为 `sizeChartSmallBar`，不再错位
- 移除从未使用的 ECharts CDN 引用与 `wuxingMap` 死代码
- 清理文件尾部的 `_marker_` 残留

## 新增功能

- 平特肖K线：在"分析模式"中选择，支持两种跟肖方式：
  - 跟位次：指定第 1~7 号中的位次，以上一期该位的生肖为跟肖目标，本期
    7 个开奖号包含该生肖则 +1，否则 -1（首期无上一期，计 0 待定）；
  - 选生肖：固定选择 12 个生肖之一，每期 7 个号包含该生肖 +1、未中 -1。

原 `index.html` 保留在项目根目录作为备份，确认新版本无误后可自行删除。
