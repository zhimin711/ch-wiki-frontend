# ch-wiki Nuxt SSR 前端

> 临时落地目录，后续整体迁出为独立 Git 仓库。参见 `.spec-workflow/specs/frontend-separation/frontend-repository-plan.md`。

## 快速开始

```bash
# frontend/
npm install

# 默认 http://localhost:3000
npm run dev

npm run typecheck
npm run build

npm run preview
```

本地联调前先在仓库根目录启动后端：

```bash
./mvnw spring-boot:run -pl web -Dspring-boot.run.profiles=local
```

## 环境变量

复制 `.env.example` 为 `.env`，根据本地环境修改。不要提交 `.env`：

```bash
cp .env.example .env
```

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `NUXT_PUBLIC_API_BASE_URL` | Nuxt SSR 服务端访问后端的地址 | `http://127.0.0.1:7003` |
| `NUXT_PUBLIC_UPLOAD_BASE_URL` | 上传资源基础地址 | `http://127.0.0.1:7003` |
| `NUXT_PUBLIC_OAUTH2_LOGIN_URLS` | OAuth2 登录地址 | `{"gitee":"/oauth2/authorization/gitee"}` |
| `NUXT_PUBLIC_SITE_NAME` | 站点名称 | `ch-wiki` |

**禁止**在 `.env` 或代码中包含 JWT secret、OAuth2 client secret、API Key 明文。

## 目录说明

```
frontend/
├── pages/           # 页面路由（Nuxt 文件路由）
├── components/      # 可复用组件
├── composables/     # 组合式函数
├── services/        # API 调用封装
├── stores/          # Pinia 状态管理
├── middleware/       # 路由中间件
├── layouts/         # 页面布局
├── assets/          # 静态资源（会被构建处理）
└── public/          # 公共静态文件（不处理）
```

## API 代理

开发时通过 `nuxt.config.ts` 中的 `routeRules` 转发：

| 路径 | 目标 |
|------|------|
| `/api/**` | `http://127.0.0.1:7003/api/**` |
| `/upload/**` | `http://127.0.0.1:7003/upload/**` |
| `/resource/**` | `http://127.0.0.1:7003/resource/**` |
| `/oauth2/**` | `http://127.0.0.1:7003/oauth2/**` |
| `/login/oauth2/**` | `http://127.0.0.1:7003/login/oauth2/**` |

浏览器端 API 使用相对路径并经过上述代理；SSR 请求使用 `NUXT_PUBLIC_API_BASE_URL` 直连后端。容器部署时不要把该变量写成容器自身的 `127.0.0.1`，除非后端与 Nuxt 确实运行在同一网络命名空间。

生产环境建议由 Nginx 使用同域分流，页面请求进入 Nuxt，API、上传、下载和 OAuth2 请求进入 Spring Boot。

## 路由与回滚

后端通过 `frontend.separation.*` 配置按公开页、登录、个人中心和工作台四组切换。开关关闭时继续使用旧 Thymeleaf 页面，开关开启时旧入口重定向到 `frontend.separation.frontend-base-url`。

当前 `/index.html`、`/login.html`、`/my/book/**` 和 `/toolbox/:id` 不能仅依赖原路径透传，发布前需要精确重写、Nuxt 兼容页或继续保留旧页面。

完整路由映射、分批发布和回滚步骤见：

- `.spec-workflow/specs/frontend-separation-supplement/rollout-notes.md`
- `.spec-workflow/specs/frontend-separation-supplement/e2e-route-checklist.md`

## 发布前验证

```bash
npm run typecheck
npm run build
```

构建后还必须用匿名、登录用户、非管理员和管理员身份执行路由清单。公开页面需检查 SSR 源码和刷新，私有页面需检查 401/403 与资源归属。

## 迁出为独立仓库

1. 将 `frontend/` 目录整体复制到新 Git 仓库
2. 在新仓库中 `git init` 并提交初始版本
3. 更新 `nuxt.config.ts` 中的代理配置
4. 在后端仓库 README 中更新前端仓库链接
5. 两个仓库通过 API 契约和发布版本号协作

## 技术栈

- Nuxt 3 (SSR)
- Vue 3 + Composition API
- Element Plus
- Pinia
- Axios
- TypeScript
#