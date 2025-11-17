# 后端实施规划

## 技术栈与基础设施 ✅
- ✅ **依赖管理**：使用 `requirements.txt` 管理依赖（Poetry/Pipenv 未采用）。
- ✅ **应用框架**：FastAPI 作为 Web 框架，SQLAlchemy 负责 ORM，PostgreSQL 作为主数据库，Alembic 管理迁移。
- ✅ **缓存与异步**：Redis 配置已就绪，Celery 已在依赖中，待集成。
- ✅ **配置管理**：通过 `.env` 文件定义敏感配置，`pydantic-settings` 在应用启动时加载。
- ✅ **容器化**：Docker Compose 已配置，编排 FastAPI、PostgreSQL、Redis 等服务。

## 目录结构现状 ✅
- ✅ `app/core`：配置加载（`config.py`）、日志（`logging_config.py`）、数据库连接（`database.py`）已完成。
- ✅ `app/auth`：Privy 登录占位接口已创建（`/login`, `/verify`），Privy token 交换已实现（`/sessions/privy`）。
- ✅ `app/users`：用户资料和历史记录路由骨架已创建（`/me`, `/me/history`），待实现业务逻辑。
- ✅ `app/tasks`：任务列表和详情接口已实现（`GET /tasks`, `GET /tasks/{task_id}`）。
- ✅ `app/taskdetail`：任务详情查询接口已实现（`GET /taskdetail`）。
- ✅ `app/sessions`：Privy token 交换已实现；任务会话生命周期接口骨架已创建（`POST /sessions/`, `/telemetry`, `/complete`），待实现业务逻辑。
- ⚠️ `app/scoring`：目录已创建，ERM 评分逻辑待实现。
- ✅ `app/models`：`User`、`Task`、`Session` 模型已定义。
- ✅ `app/schemas`：`TaskRead`、`TaskListResponse`、`UserSummary`、`AdminDatabaseOverviewResponse` 已定义。
- ⚠️ `app/services`：目录已创建，业务服务层待实现。
- ✅ `app/admin`：数据库概览接口已实现（`GET /admin/database-overview`）。

## 数据库迁移状态 ✅
- ✅ **迁移 1** (`b0c9603578e5`)：创建 `tasks` 表，包含 2 个示例任务数据。
- ✅ **迁移 2** (`b6450813a61e`)：创建 `users` 和 `sessions` 表，支持 Privy 集成。

## 核心 API 实现状态

### 已实现 ✅
1. ✅ `GET /api/tasks`：任务列表（已实现，**待添加分页和筛选功能**）。
2. ✅ `GET /api/tasks/{task_id}`：单个任务详情。
3. ✅ `GET /api/taskdetail`：任务详情查询（通过 query 参数 `id`）。
4. ✅ `POST /api/sessions/privy`：Privy token 交换，创建用户和会话记录。
5. ✅ `GET /api/admin/database-overview`：管理员数据库概览。
6. ✅ `GET /health`：健康检查端点。

### 待实现 ⚠️
1. ⚠️ `GET /api/tasks`：**添加分页、类型/难度/用时筛选功能**。
2. ⚠️ `POST /api/sessions/`：启动任务会话，返回 session 标识及上传占位信息（骨架已创建）。
3. ⚠️ `POST /api/sessions/{session_id}/telemetry`：轨迹数据分片上传接口（骨架已创建）。
4. ⚠️ `POST /api/sessions/{session_id}/complete`：提交结果指标、触发评分逻辑、返回贡献值（骨架已创建）。
5. ⚠️ `GET /api/me`：登录用户的个人信息、贡献值统计、历史记录（骨架已创建）。
6. ⚠️ `GET /api/me/history`：用户会话历史记录（骨架已创建）。
7. ⚠️ `POST /api/auth/login` / `POST /api/auth/verify`：Privy 登录占位接口（骨架已创建，实际使用 `/sessions/privy`）。

## 已完成开发步骤 ✅
1. ✅ **前期准备**：`Makefile` 已创建，`.env.example` 已生成，Docker Compose 已搭建。
2. ✅ **应用启动配置**：FastAPI 工厂模式已实现，CORS、日志、健康检查已配置，数据库会话与 Alembic 已初始化。
3. ✅ **领域建模**：`User`、`Task`、`Session` 模型已定义，对应的 Pydantic Schema 已创建，2 个迁移已编写。
4. ✅ **路由骨架**：`tasks`、`sessions`、`auth`、`users`、`admin`、`taskdetail` 模块路由已创建，部分接口已实现。
5. ✅ **Privy 集成**：Privy token 验证和会话交换已实现，用户和会话记录自动创建。

## 待完成开发步骤 ⚠️

### 高优先级
1. ⚠️ **任务筛选功能**：为 `GET /api/tasks` 添加分页、难度、预期时长筛选。
2. ⚠️ **会话生命周期管理**：
   - 实现 `POST /api/sessions/` 创建任务会话（关联 task_id 和 user_id）。
   - 实现 `POST /api/sessions/{session_id}/telemetry` 存储遥测数据。
   - 实现 `POST /api/sessions/{session_id}/complete` 完成会话并触发评分。
3. ⚠️ **用户信息端点**：实现 `GET /api/me` 返回当前用户信息、贡献值统计。
4. ⚠️ **用户历史记录**：实现 `GET /api/me/history` 返回用户会话历史。

### 中优先级
5. ⚠️ **业务服务层**：在 `app/services` 中封装任务筛选、会话状态管理、贡献值计算逻辑。
6. ⚠️ **评分模块**：在 `app/scoring` 中实现 ERM 简化评分逻辑与贡献值映射。
7. ⚠️ **鉴权依赖**：创建 protected route 依赖，验证会话 cookie 或 JWT token。
8. ⚠️ **遥测数据存储**：定义轨迹数据协议（JSON/二进制），实现存储接口（数据库或对象存储）。

### 低优先级
9. ⚠️ **测试与质量保障**：配置 pytest、coverage，添加单元测试和集成测试，确保核心 API 稳定。
10. ⚠️ **CI 脚本**：添加 GitHub Actions 或其他 CI 配置，自动化测试和代码质量检查。

## 技术债务与改进建议
- 考虑将 `app/taskdetail` 路由合并到 `app/tasks` 中（功能重复）。
- 考虑添加数据库索引优化查询性能（如 `tasks.difficulty`, `sessions.user_id`）。
- 考虑添加 API 版本控制（如 `/api/v1/`）。
- 考虑添加请求限流和错误处理中间件。
- 考虑添加 OpenAPI/Swagger 文档增强。

