# MuJoCo 集成实施规划

## 当前实现状态 ✅

### 已完成的组件和工具 ✅
1. ✅ **共享工具库** (`src/lib/mujoco-utils.ts`)：
   - `loadMujoco()`：通过 script tag 动态加载 MuJoCo WASM 模块（绕过 Webpack）
   - `getPos()`：MuJoCo 坐标到 Three.js 坐标转换（Y/Z 轴交换）
   - `getQuat()`：MuJoCo 四元数到 Three.js 四元数转换
   - 全局类型声明：`window.load_mujoco`

2. ✅ **MuJoCoViewer 组件** (`src/components/mujoco-viewer.tsx`)：
   - MuJoCo WASM 模块加载
   - Three.js 场景初始化（场景、相机、渲染器、控制器）
   - 物理模拟循环（requestAnimationFrame）
   - 模型 XML 加载（支持 URL 或内联 XML）
   - 几何体创建（支持 plane, sphere, capsule, cylinder, box）
   - 材质和光照设置
   - 资源清理（组件卸载时）
   - 错误处理和加载状态

3. ✅ **MuJoCo 测试页面** (`src/app/mujoco/page.tsx`)：
   - 完整的 MuJoCo 集成测试
   - 详细的调试日志输出
   - 状态显示和错误报告
   - 使用共享工具库

4. ✅ **任务详情页面集成** (`src/app/task-detail/page.tsx`)：
   - 使用 `MuJoCoViewer` 组件显示任务预览
   - 内嵌简单模型 XML（占位）

### 代码重构完成 ✅
- ✅ 提取共享代码到 `mujoco-utils.ts`
- ✅ 消除重复代码（`loadMujoco`, `getPos`, `getQuat`）
- ✅ 统一代码风格和错误处理
- ✅ 删除未使用的 `mujoco-viewer-wrapper.tsx`

## 技术架构

### 加载策略
- **WASM 加载**：通过 script tag 动态加载，完全绕过 Webpack 打包
- **模块缓存**：使用 `window.load_mujoco` 缓存已加载的模块
- **虚拟文件系统**：使用 MuJoCo 的 MEMFS 挂载到 `/working` 目录

### 坐标系统转换
- **位置转换**：MuJoCo (X, Y, Z) → Three.js (X, Z, -Y)
- **四元数转换**：MuJoCo 四元数顺序 → Three.js 四元数顺序
- **原因**：MuJoCo 和 Three.js 使用不同的坐标系约定

### 渲染管道
1. 加载 MuJoCo WASM 模块
2. 创建虚拟文件系统
3. 写入模型 XML 到文件系统
4. 加载模型并创建数据对象
5. 创建 Three.js 场景和几何体
6. 启动动画循环（同步 MuJoCo 物理步进和 Three.js 渲染）

## 待实现功能 ⚠️

### 高优先级
1. ⚠️ **从后端加载真实任务模型**：
   - 实现从后端 API 获取任务模型 XML
   - 支持任务模型 URL 配置（`task.model_xml_url` 或类似字段）
   - 错误处理和回退机制

2. ⚠️ **用户输入控制**：
   - 键盘事件处理（W/A/S/D 移动，空格执行动作）
   - 鼠标事件处理（视角控制已通过 OrbitControls 实现）
   - 输入状态管理
   - 将用户输入转换为 MuJoCo 控制信号

3. ⚠️ **遥测数据上传**：
   - 实时采集模拟状态（位置、速度、关节角度等）
   - 数据序列化（JSON 格式）
   - 分片上传到后端 API (`POST /api/sessions/{id}/telemetry`)
   - 上传频率控制（避免过度请求）

4. ⚠️ **任务会话集成**：
   - 创建任务会话时初始化 MuJoCo 模型
   - 会话状态管理（运行中、暂停、完成）
   - 任务完成时提交结果

### 中优先级
5. ⚠️ **性能优化**：
   - 大模型加载优化（延迟加载、渐进式渲染）
   - 帧率控制（避免过度渲染）
   - 内存管理（及时释放不需要的资源）
   - Web Worker 支持（将物理计算移到后台线程）

6. ⚠️ **错误恢复**：
   - 网络错误重试机制
   - 模型加载失败回退
   - 模拟崩溃恢复
   - 用户友好的错误提示

7. ⚠️ **可视化增强**：
   - 目标区域高亮显示
   - 轨迹可视化（显示操作路径）
   - 实时统计信息（步数、时间、成功率）
   - 调试模式（显示碰撞体、关节等）

### 低优先级
8. ⚠️ **类型安全**：
   - 为 MuJoCo API 创建完整的 TypeScript 类型定义
   - 替换 `any` 类型为具体类型
   - 类型检查和自动补全支持

9. ⚠️ **测试覆盖**：
   - 单元测试（工具函数）
   - 集成测试（组件渲染）
   - E2E 测试（完整任务流程）

10. ⚠️ **文档完善**：
    - API 文档
    - 使用示例
    - 故障排除指南

## 已知问题和限制

### 技术限制
- **WASM 文件大小**：MuJoCo WASM 文件较大（~2-3MB），首次加载可能较慢
- **浏览器兼容性**：需要支持 WebAssembly 的现代浏览器
- **内存使用**：复杂模型可能消耗较多内存
- **单线程限制**：物理计算在主线程，可能影响 UI 响应

### 当前问题
- 任务详情页面使用硬编码的简单模型，未从后端加载真实模型
- 缺少用户输入控制实现
- 遥测数据上传功能未实现
- 错误处理可以更完善

## 实施路线图

### 阶段 1：基础功能完善（当前）
- ✅ 代码重构和共享工具提取
- ⚠️ 从后端加载任务模型
- ⚠️ 基本的用户输入控制

### 阶段 2：任务执行集成
- ⚠️ 遥测数据采集和上传
- ⚠️ 任务会话生命周期管理
- ⚠️ 任务完成和评分集成

### 阶段 3：优化和增强
- ⚠️ 性能优化
- ⚠️ 可视化增强
- ⚠️ 错误恢复机制

### 阶段 4：完善和测试
- ⚠️ 类型安全改进
- ⚠️ 测试覆盖
- ⚠️ 文档完善

## 技术债务

1. **类型定义**：需要为 MuJoCo API 创建完整的 TypeScript 类型
2. **错误处理**：统一错误处理机制，提供更好的用户反馈
3. **代码组织**：考虑将几何体创建逻辑提取为独立函数
4. **配置管理**：模型路径、上传频率等应该可配置
5. **日志系统**：统一日志格式和级别（开发/生产环境）

## 相关文件

- `src/lib/mujoco-utils.ts` - 共享工具函数
- `src/components/mujoco-viewer.tsx` - MuJoCo 查看器组件
- `src/app/mujoco/page.tsx` - MuJoCo 测试页面
- `src/app/task-detail/page.tsx` - 任务详情页面（使用 MuJoCoViewer）
- `public/mujoco-js/dist/` - MuJoCo WASM 文件
