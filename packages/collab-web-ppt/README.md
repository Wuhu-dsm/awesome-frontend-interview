# 协同 Web-PPT（最小架构）

基于 **Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript** 的最小项目，用于开发协同 Web-PPT。

## 运行方式

1. 进入项目目录：
   ```bash
   cd packages/collab-web-ppt
   ```
2. 启动开发服务器：
   ```bash
   pnpm dev
   ```
3. 打开浏览器访问 `http://localhost:3000`

## 目录结构（简化）

```
src/
  app/
    layout.tsx      # 全局布局
    globals.css     # Tailwind v4 样式入口
    page.tsx        # 首页（CTA → /slides）
    slides/
      page.tsx      # Slides 编辑页面（占位）
  components/
    Slide.tsx       # 幻灯片占位组件
    Toolbar.tsx     # 顶部工具栏占位组件
  lib/
    realtime.ts     # 实时协作占位模块
```

> 代码保持最简单，后续可按需接入实时协作（WebSocket/WebRTC）、多用户编辑、PPT数据模型等。
