# 项目实施计划

## 后端（`backend/`）
- 技术栈：FastAPI、SQLAlchemy、PostgreSQL、Alembic；Redis 用于缓存/异步任务；可选 Celery 脚手架支持后续评分任务。
- 模块：`core`（配置、数据库、日志）、`auth`（Privy/OAuth 占位 + JWT）、`users`（个人资料与历史）、`tasks`（CRUD/列表/筛选）、`sessions`（任务执行生命周期、遥测上传）、`scoring`（ERM 评分到贡献值的占位映射）。
- 基础设施：使用 poetry 或 pipenv 管理依赖，`.env` 通过 `python-dotenv` 读取，Docker Compose 编排 Postgres/Redis，pytest 单元测试脚手架。
- MVP API：
  1. `GET /tasks` —— 支持筛选与分页的任务列表。
  2. `GET /tasks/{task_id}` —— 单个任务详情。
  3. `POST /sessions/` —— 启动任务，创建会话并返回上传占位信息。
  4. `POST /sessions/{session_id}/telemetry` —— 接收轨迹数据分片。
  5. `POST /sessions/{session_id}/complete` —— 完成任务并触发评分占位逻辑，返回贡献值结果。
  6. `GET /me` —— 当前用户资料、总贡献值、历史记录。
  7. 鉴权接口 —— 基于 Privy 集成计划的登录质询/验证。
- 测试：使用 pytest + 示例数据夹具；CI 挂钩执行 lint/test。

## 前端（`frontend/`）
- 技术栈：Next.js（App Router）+ React + TypeScript、TailwindCSS、TanStack Query、Zustand（管理仿真状态）、Axios/fetch 客户端。
- 结构：`app/(public)/tasks`、`app/tasks/[id]`、`app/play/[sessionId]`、`app/result/[sessionId]`、`app/me`；通用 UI 组件放在 `src/components`。
- 功能：全局导航布局、任务大厅列表（调用后端）、任务详情页、运行页（WebGL 画布占位）、结果页（读取后端返回）、账户页（历史记录/贡献值）。
- 鉴权：接入 Privy SDK 占位（钱包/邮箱登录），MVP 采用模拟登录流程；令牌存储在 Query Client 或状态库中。
- 工具链：ESLint、Prettier、Jest/React Testing Library；环境变量通过 `next.config` 管理。

## 共享与工具
- Monorepo 结构包含 `backend/`、`frontend/`、`design/` 以及现有 `README.md`。
- 根目录配置 `.gitignore`、`.editorconfig`，Docker Compose 支持本地开发（后端、前端、Postgres、Redis）。
- 定义数据契约（`Task`、`TaskSession`、`ContributionResult`），通过 FastAPI OpenAPI 导出并生成 TS 类型（如使用 `openapi-typescript`）。
- 可选：GitHub Actions 占位，用于 lint/test 工作流。

## 里程碑
1. 搭建后端脚手架（环境配置、FastAPI 应用骨架、数据库迁移、Docker 服务）。
2. 搭建前端脚手架（初始化 Next.js、配置 Tailwind、基础路由和布局）。
3. 端到端实现任务列表/详情（`GET /tasks`、`GET /tasks/{id}`）。
4. 构建任务会话生命周期（启动、遥测上传、完成）及其前端交互。
5. 添加鉴权占位与用户资料/历史相关接口和界面。
6. 增加自动化测试、代码规范检查，以及部署脚本（Docker 镜像、CI/CD）。

