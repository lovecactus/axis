# MuJoCo WASM 使用指南

本文档基于 [mujoco_wasm](https://github.com/zalo/mujoco_wasm) 参考实现，说明如何在我们的项目中使用 MuJoCo。

## 核心概念

### MuJoCo 对象结构

MuJoCo WASM 提供以下核心对象：

- **`mujoco`**: MuJoCo 模块实例，包含所有 MuJoCo API
- **`MjModel`**: 物理模型对象，包含几何、关节、约束等
- **`MjData`**: 仿真数据对象，包含状态、控制输入、传感器输出等
- **`FS`**: 虚拟文件系统，用于加载模型和资源文件

### 坐标系转换

MuJoCo 和 Three.js 使用不同的坐标系：

- **MuJoCo**: 右手坐标系，Y 轴向上
- **Three.js**: 右手坐标系，Z 轴向上

转换函数（参考 [mujocoUtils.js](https://raw.githubusercontent.com/zalo/mujoco_wasm/main/src/mujocoUtils.js)）：

```typescript
// 位置转换: MuJoCo (X, Y, Z) → Three.js (X, Z, -Y)
function getPos(buffer: Float32Array | Float64Array, index: number): [number, number, number] {
  return [
    buffer[index * 3 + 0],  // X
    buffer[index * 3 + 2],  // Z (Y and Z swapped)
    -buffer[index * 3 + 1],  // -Y
  ];
}

// 四元数转换: MuJoCo → Three.js
function getQuat(buffer: Float32Array | Float64Array, index: number): [number, number, number, number] {
  return [
    -buffer[index * 4 + 1],
    -buffer[index * 4 + 3],
    buffer[index * 4 + 2],
    -buffer[index * 4 + 0],
  ];
}
```

## 基本使用流程

### 1. 加载 MuJoCo 模块

```typescript
import { loadMujoco } from "@/lib/mujoco-utils";

// 加载 MuJoCo WASM 模块
const mujoco = await loadMujoco();
```

**实现细节**：
- 通过 script tag 动态加载，绕过 Webpack 打包
- 使用 `window.load_mujoco` 缓存已加载的模块
- 模块路径：`/mujoco-js/dist/mujoco_wasm.js`

### 2. 设置虚拟文件系统

MuJoCo 需要虚拟文件系统来加载模型和资源：

```typescript
// 创建工作目录
mujoco.FS.mkdir("/working");

// 挂载内存文件系统
mujoco.FS.mount(mujoco.MEMFS, { root: "." }, "/working");
```

### 3. 加载模型

#### 方式 A: 从 XML 字符串加载

```typescript
const modelXml = `
<mujoco>
  <worldbody>
    <light pos="0 0 3" dir="0 0 -1"/>
    <geom type="plane" size="1 1 0.1" rgba="0.9 0.9 0.9 1"/>
    <body pos="0 0 0.5">
      <geom type="box" size="0.15 0.15 0.15" rgba="0.8 0.3 0.3 1" mass="1"/>
      <joint type="free"/>
    </body>
  </worldbody>
</mujoco>
`;

// 写入文件系统
mujoco.FS.writeFile("/working/model.xml", modelXml);

// 加载模型
const model = mujoco.MjModel.loadFromXML("/working/model.xml");
const data = new mujoco.MjData(model);
```

#### 方式 B: 从 URL 加载

```typescript
// 从网络获取 XML
const response = await fetch(modelUrl);
const xmlContent = await response.text();

// 写入文件系统
mujoco.FS.writeFile("/working/model.xml", xmlContent);

// 加载模型
const model = mujoco.MjModel.loadFromXML("/working/model.xml");
const data = new mujoco.MjData(model);
```

#### 方式 C: 加载复杂模型（包含资源文件）

参考 [mujocoUtils.js](https://raw.githubusercontent.com/zalo/mujoco_wasm/main/src/mujocoUtils.js) 的 `downloadExampleScenesFolder` 函数：

```typescript
// 下载所有资源文件到虚拟文件系统
async function downloadAssets(mujoco, baseUrl: string, files: string[]) {
  const requests = files.map((url) => fetch(`${baseUrl}/${url}`));
  const responses = await Promise.all(requests);
  
  for (let i = 0; i < responses.length; i++) {
    const split = files[i].split("/");
    let working = '/working/';
    
    // 创建目录结构
    for (let f = 0; f < split.length - 1; f++) {
      working += split[f];
      if (!mujoco.FS.analyzePath(working).exists) {
        mujoco.FS.mkdir(working);
      }
      working += "/";
    }

    // 写入文件（二进制或文本）
    if (files[i].endsWith(".png") || files[i].endsWith(".stl") || files[i].endsWith(".obj")) {
      mujoco.FS.writeFile("/working/" + files[i], new Uint8Array(await responses[i].arrayBuffer()));
    } else {
      mujoco.FS.writeFile("/working/" + files[i], await responses[i].text());
    }
  }
}
```

### 4. 创建 Three.js 场景

```typescript
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getPos, getQuat } from "@/lib/mujoco-utils";

// 创建场景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f5);

// 创建相机
const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 100);
camera.position.set(2, 2, 2);
camera.lookAt(0, 0, 0);

// 创建渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 创建控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.1;

// 添加光照
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(3, 3, 3);
directionalLight.castShadow = true;
scene.add(directionalLight);
```

### 5. 从 MuJoCo 模型创建 Three.js 几何体

参考 [mujocoUtils.js](https://raw.githubusercontent.com/zalo/mujoco_wasm/main/src/mujocoUtils.js) 的几何体创建逻辑：

```typescript
const bodies: Record<number, THREE.Group> = {};

// 遍历所有几何体
for (let g = 0; g < model.ngeom; g++) {
  const bodyId = model.geom_bodyid[g];
  const geomType = model.geom_type[g];
  const size = [
    model.geom_size[g * 3 + 0],
    model.geom_size[g * 3 + 1],
    model.geom_size[g * 3 + 2],
  ];
  const rgba = [
    model.geom_rgba[g * 4 + 0],
    model.geom_rgba[g * 4 + 1],
    model.geom_rgba[g * 4 + 2],
    model.geom_rgba[g * 4 + 3],
  ];

  // 创建 body group（如果不存在）
  if (!bodies[bodyId]) {
    bodies[bodyId] = new THREE.Group();
    scene.add(bodies[bodyId]);
  }

  // 根据几何类型创建 Three.js 几何体
  let geometry: THREE.BufferGeometry;
  switch (geomType) {
    case 0: // mjGEOM_PLANE
      geometry = new THREE.PlaneGeometry(size[0] * 2, size[1] * 2);
      break;
    case 2: // mjGEOM_SPHERE
      geometry = new THREE.SphereGeometry(size[0], 16, 16);
      break;
    case 3: // mjGEOM_CAPSULE
      geometry = new THREE.CylinderGeometry(size[0], size[0], size[1] * 2, 16);
      break;
    case 5: // mjGEOM_CYLINDER
      geometry = new THREE.CylinderGeometry(size[0], size[0], size[1] * 2, 16);
      break;
    case 6: // mjGEOM_BOX
      geometry = new THREE.BoxGeometry(size[0] * 2, size[2] * 2, size[1] * 2);
      break;
    default:
      geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  }

  // 创建材质
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(rgba[0], rgba[1], rgba[2]),
    transparent: rgba[3] < 1.0,
    opacity: rgba[3],
  });

  // 创建网格
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // 设置位置和旋转（使用坐标转换函数）
  const pos = getPos(model.geom_pos, g);
  mesh.position.set(pos[0], pos[1], pos[2]);

  const quat = getQuat(model.geom_quat, g);
  mesh.quaternion.set(quat[0], quat[1], quat[2], quat[3]);

  bodies[bodyId].add(mesh);
}
```

### 6. 运行仿真循环

```typescript
let mujocoTime = performance.now();

function animate(timeMS: number) {
  // 更新控制器
  controls.update();

  // 步进物理仿真
  if (!paused && model && data && mujoco) {
    const timestep = model.opt.timestep;
    
    // 时间同步（避免过度步进）
    if (timeMS - mujocoTime > 35.0) {
      mujocoTime = timeMS;
    }

    // 步进到当前时间
    while (mujocoTime < timeMS) {
      mujoco.mj_step(model, data);
      mujocoTime += timestep * 1000.0;
    }

    // 更新 Three.js 对象位置
    for (let b = 0; b < model.nbody; b++) {
      if (bodies[b]) {
        const pos = getPos(data.xpos, b);
        bodies[b].position.set(pos[0], pos[1], pos[2]);

        const quat = getQuat(data.xquat, b);
        bodies[b].quaternion.set(quat[0], quat[1], quat[2], quat[3]);
      }
    }
  }

  // 渲染场景
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate(performance.now());
```

## 高级功能

### 控制输入

参考 [main.js](https://github.com/zalo/mujoco_wasm/blob/main/src/main.js) 的控制实现：

```typescript
// 设置控制输入（actuator 控制）
// data.ctrl 是控制输入数组，长度为 model.nu（actuator 数量）
data.ctrl[actuatorIndex] = controlValue;

// 在步进前设置控制
mujoco.mj_step(model, data);
```

### 传感器数据

```typescript
// 读取传感器数据
// data.sensordata 包含所有传感器输出
for (let i = 0; i < model.nsensor; i++) {
  const sensorValue = data.sensordata[i];
  // 处理传感器数据
}
```

### 重置仿真

```typescript
// 重置到初始状态
mujoco.mj_resetData(model, data);

// 或者重置到特定状态
mujoco.mj_forward(model, data);
```

### 前向动力学

```typescript
// 计算前向动力学（不步进时间）
mujoco.mj_forward(model, data);

// 计算逆动力学
mujoco.mj_inverse(model, data);
```

### 肌腱和柔性体

参考 [mujocoUtils.js](https://raw.githubusercontent.com/zalo/mujoco_wasm/main/src/mujocoUtils.js) 的 `drawTendonsAndFlex` 函数：

```typescript
// 绘制肌腱
for (let t = 0; t < model.ntendon; t++) {
  let startW = data.ten_wrapadr[t];
  let r = model.tendon_width[t];
  
  for (let w = startW; w < startW + data.ten_wrapnum[t] - 1; w++) {
    let tendonStart = getPosition(data.wrap_xpos, w, new THREE.Vector3());
    let tendonEnd = getPosition(data.wrap_xpos, w + 1, new THREE.Vector3());
    // 绘制肌腱线段
  }
}

// 绘制柔性体顶点
for (let i = 0; i < model.nflex; i++) {
  for (let j = 0; j < model.flex_vertnum[i]; j++) {
    let vertIndex = model.flex_vertadr[i] + j;
    let vertPos = getPosition(data.flexvert_xpos, vertIndex, new THREE.Vector3());
    // 绘制顶点
  }
}
```

## 资源清理

```typescript
// 清理 Three.js 资源
renderer.dispose();
controls.dispose();

// 清理 MuJoCo 资源
data.delete();
model.delete();
```

## 常见问题

### 1. 模型加载失败

- 检查 XML 文件路径是否正确
- 确保所有资源文件（.obj, .png, .stl 等）都已下载到虚拟文件系统
- 检查文件系统目录结构是否匹配 XML 中的路径

### 2. 坐标系不匹配

- 始终使用 `getPos()` 和 `getQuat()` 进行坐标转换
- 注意 MuJoCo 和 Three.js 的坐标系差异

### 3. 性能问题

- 限制仿真步进频率，避免过度计算
- 使用时间同步机制，确保实时性
- 对于复杂模型，考虑使用实例化渲染（InstancedMesh）

### 4. 内存泄漏

- 确保在组件卸载时清理所有资源
- 删除 MuJoCo 对象（`model.delete()`, `data.delete()`）
- 清理 Three.js 对象和事件监听器

## 参考资源

- [mujoco_wasm GitHub 仓库](https://github.com/zalo/mujoco_wasm)
- [main.js 源码](https://github.com/zalo/mujoco_wasm/blob/main/src/main.js)
- [mujocoUtils.js 源码](https://raw.githubusercontent.com/zalo/mujoco_wasm/main/src/mujocoUtils.js)
- [MuJoCo 官方文档](https://mujoco.readthedocs.io/)
- [Three.js 文档](https://threejs.org/docs/)

## 项目中的实现

- **共享工具**: `src/lib/mujoco-utils.ts` - `loadMujoco()`, `getPos()`, `getQuat()`
- **查看器组件**: `src/components/mujoco-viewer.tsx` - 完整的 MuJoCo 集成组件
- **测试页面**: `src/app/mujoco/page.tsx` - MuJoCo 功能测试和调试

