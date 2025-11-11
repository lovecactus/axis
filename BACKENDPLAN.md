# 后端实施规划

## 技术栈与基础设施
- 依赖工具：选择 Poetry 或 Pipenv 管理虚拟环境与依赖。
- 应用框架：FastAPI 作为 Web 框架，SQLAlchemy 负责 ORM，PostgreSQL 作为主数据库，Alembic 管理迁移。
- 缓存与异步：Redis 用于缓存、会话状态及后续异步任务；预留 Celery 脚手架集成。
- 配置管理：通过 `.env` 文件定义敏感配置，`python-dotenv` 在应用启动时加载。
- 容器化：使用 Docker Compose 编排 FastAPI、PostgreSQL、Redis 等服务，统一本地开发环境。

## 目录结构建议
- `app/core`：配置加载、日志、数据库连接、依赖注入。
- `app/auth`：Privy/OAuth 占位登录流程、JWT 签发与验证依赖。
- `app/users`：用户资料、历史记录、贡献值读取。
- `app/tasks`：任务列表、筛选逻辑、详情接口。
- `app/sessions`：任务执行生命周期、遥测数据上传、状态回传。
- `app/scoring`：ERM 简化评分逻辑与贡献值映射占位实现。
- `app/models` 与 `app/schemas`：SQLAlchemy 模型和 Pydantic Schema 分层。
- `app/services`：封装业务服务/仓储逻辑，供路由使用。

## 核心 API（MVP 阶段）
1. `GET /tasks`：分页并支持类型/难度/用时筛选的任务列表。
2. `GET /tasks/{task_id}`：单个任务详情。
3. `POST /sessions/`：启动任务会话，返回 session 标识及上传占位信息。
4. `POST /sessions/{session_id}/telemetry`：轨迹数据分片上传接口。
5. `POST /sessions/{session_id}/complete`：提交结果指标、触发评分占位逻辑、返回贡献值。
6. `GET /me`：登录用户的个人信息、贡献值统计、历史记录。
7. `POST /auth/login` / `POST /auth/verify`：符合 Privy 集成计划的登录占位接口。

## 开发步骤
1. **前期准备**：创建虚拟环境、统一脚本（Makefile/poetry run）、生成 `.env.example`、搭建 Docker Compose。
2. **应用启动配置**：实现 FastAPI 工厂模式，配置 CORS、日志、健康检查，初始化数据库会话与 Alembic。
3. **领域建模**：定义 `User`、`Task`、`TaskSession`、`ContributionRecord` 等模型与对应的 Pydantic Schema，编写首个迁移。
4. **路由骨架**：为 `tasks`、`sessions`、`auth`、`users` 等模块创建路由与依赖，返回占位数据以确保端到端打通。
5. **业务服务层**：实现任务筛选、会话状态管理、贡献值计算占位逻辑，并编写单元测试验证。
6. **鉴权占位实现**：模拟 Privy 登录流程，完成 JWT 签发、刷新与 protected route 依赖注入。
7. **遥测数据处理**：定义轨迹数据协议（JSON/二进制），实现存储接口（数据库或对象存储占位），并预留异步处理钩子。
8. **测试与质量保障**：配置 pytest、coverage、ruff/black，添加示例测试和 CI 脚本，确保核心 API 稳定。


