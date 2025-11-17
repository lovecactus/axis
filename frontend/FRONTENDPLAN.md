# 前端实施规划

## 技术栈与基础设施 ✅
- ✅ **框架**：Next.js 16.0.1 (App Router)，React 19.2.0，TypeScript 5。
- ✅ **样式**：Tailwind CSS 4，支持深色模式。
- ✅ **认证**：Privy React Auth 3.6.1，支持邮箱和钱包登录。
- ✅ **3D 渲染**：Three.js 0.181.1，MuJoCo.js 0.0.7 (WASM)，用于物理模拟可视化。
- ✅ **构建工具**：Webpack 配置（支持 WASM），Turbopack 可选。
- ✅ **代码质量**：ESLint 9，TypeScript 严格模式。

## 目录结构现状 ✅
- ✅ `src/app`：Next.js App Router 页面路由。
  - ✅ `layout.tsx`：根布局，集成 Privy Provider。
  - ✅ `page.tsx`：首页重定向到 `/tasks`。
  - ✅ `globals.css`：全局样式，Tailwind 配置。
- ✅ `src/components`：可复用组件。
  - ✅ `auth/auth-controls.tsx`：登录/登出控件，Privy 会话交换。
  - ✅ `mujoco-viewer.tsx`：MuJoCo 3D 模拟器组件（完整实现）。
  - ✅ `mujoco-viewer-wrapper.tsx`：MuJoCo 组件 SSR 包装器。
- ✅ `src/lib`：工具函数和配置。
  - ✅ `api-base.ts`：API 基础 URL 配置（区分服务端/客户端）。
- ✅ `src/providers`：React Context Providers。
  - ✅ `privy-provider.tsx`：Privy 认证提供者配置。
- ✅ `public/mujoco-js`：MuJoCo WASM 文件（通过 postinstall 脚本复制）。

## 页面路由实现状态

### 已实现 ✅
1. ✅ **`/tasks`** (`src/app/tasks/page.tsx`)：
   - 任务列表展示（从后端 API 获取）。
   - 筛选 UI（任务类型、难度、预计用时）已创建，**待连接后端筛选逻辑**。
   - 难度星级显示。
   - 任务卡片布局。
   - 响应式设计。

2. ✅ **`/task-detail`** (`src/app/task-detail/page.tsx`)：
   - 任务详情展示。
   - MuJoCo 3D 预览（内嵌简单模型）。
   - 任务元数据（难度、预计用时、完成率）。
   - "开始任务" 按钮链接到 `/task-running`。

3. ✅ **`/task-running`** (`src/app/task-running/page.tsx`)：
   - 任务运行界面骨架。
   - 任务状态显示（占位数据）。
   - 操作说明。
   - **待实现**：实时 MuJoCo 模拟、遥测数据上传、任务控制逻辑。

4. ✅ **`/task-done`** (`src/app/task-done/page.tsx`)：
   - 任务完成页面。
   - 贡献值计算和显示（占位逻辑）。
   - 等级进度条。
   - 统计信息展示。
   - **待实现**：真实贡献值数据、图表可视化。

5. ✅ **`/mujoco-test`** (`src/app/mujoco-test/page.tsx`)：
   - MuJoCo 集成测试页面。
   - 完整的 MuJoCo WASM 加载流程。
   - Three.js 渲染集成。
   - 调试日志输出。

6. ✅ **`/admin/database`** (`src/app/admin/database/page.tsx`)：
   - 管理员数据总览。
   - 用户列表（前 20 条）。
   - 任务列表（前 20 条）。
   - 表格展示。

### 待实现 ⚠️
- ⚠️ **用户个人中心**：`/me` 或 `/profile` 页面（显示用户信息、贡献值统计、历史记录）。
- ⚠️ **用户历史记录**：`/me/history` 或 `/history` 页面（会话历史列表）。

## 组件实现状态

### 已实现 ✅
1. ✅ **`AuthControls`** (`src/components/auth/auth-controls.tsx`)：
   - Privy 登录/登出。
   - 自动会话交换（Privy token → 后端 session cookie）。
   - 错误处理和重试逻辑。
   - 用户信息显示（邮箱/钱包地址）。

2. ✅ **`MuJoCoViewer`** (`src/components/mujoco-viewer.tsx`)：
   - MuJoCo WASM 模块动态加载。
   - Three.js 场景渲染。
   - 物理模拟循环。
   - 模型 XML 加载（URL 或内联）。
   - 相机控制（OrbitControls）。
   - 资源清理。

3. ✅ **`MuJoCoViewerWrapper`** (`src/components/mujoco-viewer-wrapper.tsx`)：
   - SSR 安全包装（禁用服务端渲染）。
   - 动态导入优化。

### 待实现 ⚠️
- ⚠️ **任务筛选组件**：将筛选逻辑从页面中提取为独立组件。
- ⚠️ **贡献值显示组件**：可复用的贡献值/等级展示。
- ⚠️ **加载状态组件**：统一的加载指示器。
- ⚠️ **错误边界组件**：错误处理和用户友好提示。

## 功能实现状态

### 已实现 ✅
1. ✅ **认证流程**：
   - Privy 登录集成。
   - 后端会话同步（`/api/sessions/privy`）。
   - 会话 cookie 管理。
   - 自动重试机制。

2. ✅ **API 集成**：
   - API 基础 URL 配置（`api-base.ts`）。
   - 服务端/客户端环境区分。
   - 任务列表获取（`GET /api/tasks`）。
   - 任务详情获取（`GET /api/taskdetail`）。
   - 管理员数据获取（`GET /api/admin/database-overview`）。

3. ✅ **MuJoCo 集成**：
   - WASM 模块加载（绕过 Webpack）。
   - 虚拟文件系统设置。
   - 模型 XML 解析。
   - Three.js 渲染管道。
   - 物理模拟循环。

4. ✅ **UI/UX**：
   - 响应式布局。
   - 深色模式支持。
   - Tailwind CSS 样式系统。
   - 基础导航和路由。

### 待实现 ⚠️
1. ⚠️ **任务筛选功能**：
   - 连接筛选 UI 到后端 API 参数。
   - 实现客户端筛选（作为备选）。
   - 分页支持。

2. ⚠️ **任务执行流程**：
   - 创建任务会话（`POST /api/sessions/`）。
   - 实时遥测数据上传（`POST /api/sessions/{id}/telemetry`）。
   - 任务完成提交（`POST /api/sessions/{id}/complete`）。
   - 任务状态实时更新。

3. ⚠️ **用户数据展示**：
   - 用户个人信息（`GET /api/me`）。
   - 用户历史记录（`GET /api/me/history`）。
   - 贡献值统计和可视化。

4. ⚠️ **MuJoCo 增强**：
   - 从后端加载真实任务模型 XML。
   - 用户输入控制（键盘/鼠标事件）。
   - 遥测数据可视化。
   - 性能优化（大模型支持）。

5. ⚠️ **数据可视化**：
   - 任务完成统计图表。
   - 贡献值趋势图。
   - 会话历史时间线。

## 已完成开发步骤 ✅
1. ✅ **项目初始化**：Next.js 项目搭建，TypeScript 配置，Tailwind CSS 集成。
2. ✅ **认证集成**：Privy Provider 配置，登录/登出流程，会话同步。
3. ✅ **基础路由**：App Router 页面创建，导航结构。
4. ✅ **API 集成**：API 客户端配置，基础数据获取。
5. ✅ **MuJoCo 集成**：WASM 加载策略，Three.js 渲染，测试页面。
6. ✅ **UI 组件**：基础组件实现，样式系统，响应式布局。

## 待完成开发步骤 ⚠️

### 高优先级
1. ⚠️ **任务筛选功能**：
   - 实现筛选参数传递到后端 API。
   - 添加分页支持。
   - 优化筛选 UI 交互。

2. ⚠️ **任务执行完整流程**：
   - 实现任务会话创建。
   - 实现遥测数据实时上传。
   - 实现任务完成和评分展示。
   - 连接 MuJoCo 模拟到真实任务数据。

3. ⚠️ **用户数据页面**：
   - 创建用户个人中心页面。
   - 实现用户信息展示。
   - 实现历史记录列表。

### 中优先级
4. ⚠️ **MuJoCo 增强功能**：
   - 从后端 API 加载任务模型 XML。
   - 实现用户控制输入（键盘/鼠标）。
   - 实现遥测数据实时同步。
   - 性能优化和错误处理。

5. ⚠️ **数据可视化**：
   - 集成图表库（如 Recharts 或 Chart.js）。
   - 实现贡献值趋势图。
   - 实现任务统计图表。

6. ⚠️ **组件优化**：
   - 提取可复用组件。
   - 实现加载状态组件。
   - 实现错误边界。
   - 优化组件性能（React.memo, useMemo）。

### 低优先级
7. ⚠️ **测试与质量保障**：
   - 配置 Jest/React Testing Library。
   - 添加组件单元测试。
   - 添加 E2E 测试（Playwright/Cypress）。
   - 代码覆盖率配置。

8. ⚠️ **性能优化**：
   - 图片优化（Next.js Image）。
   - 代码分割优化。
   - 懒加载优化。
   - Bundle 大小分析。

9. ⚠️ **可访问性（A11y）**：
   - ARIA 标签完善。
   - 键盘导航支持。
   - 屏幕阅读器优化。
   - 颜色对比度检查。

## 技术债务与改进建议
- **MuJoCo 加载策略**：当前使用 script tag 绕过 Webpack，考虑更优雅的解决方案。
- **API 错误处理**：统一错误处理机制，用户友好的错误提示。
- **类型安全**：为 API 响应创建完整的 TypeScript 类型定义。
- **状态管理**：考虑引入 Zustand 或 Jotai 管理全局状态（用户信息、任务列表缓存）。
- **环境变量管理**：完善 `.env.example`，添加环境变量验证。
- **路由保护**：实现受保护路由（需要登录才能访问的页面）。
- **国际化（i18n）**：考虑添加多语言支持（如 next-intl）。
- **SEO 优化**：完善 metadata，添加 Open Graph 标签。
- **PWA 支持**：考虑添加 Service Worker，支持离线访问。

## 已知问题与限制
- MuJoCo WASM 文件较大，首次加载可能较慢。
- 筛选功能 UI 已创建但未连接后端。
- 任务执行页面使用占位数据，需要连接真实 API。
- 贡献值计算使用客户端占位逻辑，需要后端真实数据。
- 部分页面缺少错误边界，可能导致白屏。

