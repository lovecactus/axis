# 相机角度和位置代码详解

本文档详细解释 MuJoCo 模拟器中相机（Camera）的设置代码，包括位置、角度、视野等参数。

## 坐标系说明

Three.js 使用**右手坐标系**：
- **X 轴**：向右为正
- **Y 轴**：向上为正（注意：这是 Three.js 的约定，与 MuJoCo 不同）
- **Z 轴**：向前为正（朝向观察者）

## 相机类型：PerspectiveCamera（透视相机）

```typescript
const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 100);
```

### 参数说明

1. **`45`** - **FOV (Field of View，视野角度)**
   - 单位：度（degrees）
   - 含义：垂直视野角度，控制相机能看到多大的范围
   - `45°` 是一个常用的值，提供自然的视角
   - 值越大，视野越广（类似广角镜头）
   - 值越小，视野越窄（类似长焦镜头）

2. **`width / height`** - **Aspect Ratio（宽高比）**
   - 计算：`800 / 600 = 1.333...`
   - 含义：渲染画布的宽高比
   - 必须与实际的渲染区域匹配，否则物体会被拉伸或压缩

3. **`0.001`** - **Near Plane（近裁剪面）**
   - 单位：世界单位
   - 含义：相机能看到的最近距离
   - 小于这个距离的物体会被裁剪掉（不显示）
   - `0.001` 是一个非常小的值，允许相机非常接近物体

4. **`100`** - **Far Plane（远裁剪面）**
   - 单位：世界单位
   - 含义：相机能看到的最远距离
   - 大于这个距离的物体会被裁剪掉（不显示）
   - `100` 对于我们的场景来说足够远

## 相机位置

```typescript
camera.position.set(3, 2, 0.5);
```

### 参数详解

- **`x = 3`**：相机在 X 轴（右）方向的位置
  - 正值表示在原点右侧
  - 这个值让相机从右侧观察模型

- **`y = 2`**：相机在 Y 轴（上）方向的位置
  - 正值表示在原点上方
  - 这个值让相机从上方俯视模型
  - **注意**：在 Three.js 中，Y 轴向上，这与 MuJoCo 不同

- **`z = 0.5`**：相机在 Z 轴（前）方向的位置
  - 正值表示朝向观察者方向
  - 这个值让相机稍微向前移动

### 视觉效果

`(3, 2, 0.5)` 这个位置创建了一个**斜上方视角**：
- 从右侧和上方观察模型
- 类似于"鸟瞰图"但带有角度
- 可以看到模型的顶部和侧面

## 相机朝向（Look At）

```typescript
camera.lookAt(0, 0, 0.35);
```

### 参数说明

- **`x = 0`**：相机看向的 X 坐标（场景中心）
- **`y = 0`**：相机看向的 Y 坐标（场景中心）
- **`z = 0.35`**：相机看向的 Z 坐标（人体模型的中心高度）

### 作用

`lookAt()` 方法让相机**自动旋转**，使其朝向指定的点。这相当于：
- 相机位置：`(3, 2, 0.5)` - 观察者的位置
- 观察目标：`(0, 0, 0.35)` - 人体模型的中心
- 相机会自动计算旋转角度，使视线指向目标点

### 为什么是 `0.35`？

- 人体模型的躯干（torso）位置是 `pos="0 0 0.35"`
- 这是模型在水平状态下的中心高度
- 让相机看向这个点，可以确保模型在画面中心

## OrbitControls（轨道控制器）

```typescript
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0.35);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
```

### 作用

`OrbitControls` 允许用户通过鼠标交互来旋转、缩放和平移相机。

### 参数详解

1. **`controls.target.set(0, 0, 0.35)`**
   - 设置**轨道中心点**
   - 相机会围绕这个点旋转
   - 与 `camera.lookAt()` 的目标点一致，确保初始状态正确

2. **`enableDamping = true`**
   - 启用**阻尼效果**
   - 相机移动会有惯性，更平滑自然
   - 类似于真实相机的运动感觉

3. **`dampingFactor = 0.1`**
   - 阻尼系数，控制惯性衰减的速度
   - `0.1` 表示每次更新时速度衰减 10%
   - 值越小，惯性越明显，运动越平滑

### 用户交互

启用 `OrbitControls` 后，用户可以：
- **左键拖拽**：围绕目标点旋转相机
- **右键拖拽**：平移场景
- **滚轮**：缩放（拉近/拉远）
- **中键拖拽**：平移场景

## 完整示例

```typescript
// 1. 创建透视相机
const camera = new THREE.PerspectiveCamera(
  45,              // FOV: 45度视野
  800 / 600,       // 宽高比: 1.333
  0.001,           // 近裁剪面: 0.001
  100              // 远裁剪面: 100
);

// 2. 设置相机位置（观察者位置）
camera.position.set(3, 2, 0.5);
// 位置：右侧3单位，上方2单位，前方0.5单位

// 3. 设置相机朝向（观察目标）
camera.lookAt(0, 0, 0.35);
// 看向：场景中心，高度0.35（模型中心）

// 4. 创建轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0.35);  // 围绕模型中心旋转
controls.enableDamping = true;     // 启用平滑运动
controls.dampingFactor = 0.1;     // 阻尼系数
```

## 调整建议

### 改变视角高度
```typescript
// 更高的俯视角度
camera.position.set(3, 5, 0.5);

// 更低的平视角度
camera.position.set(3, 0.5, 0.5);
```

### 改变观察距离
```typescript
// 更远（看到更多场景）
camera.position.set(5, 3, 2);

// 更近（特写）
camera.position.set(1, 1, 0.5);
```

### 改变视野角度
```typescript
// 广角（看到更多）
const camera = new THREE.PerspectiveCamera(60, width / height, 0.001, 100);

// 窄角（特写效果）
const camera = new THREE.PerspectiveCamera(30, width / height, 0.001, 100);
```

### 改变观察角度
```typescript
// 从正面观察
camera.position.set(0, 2, 3);
camera.lookAt(0, 0, 0.35);

// 从侧面观察
camera.position.set(3, 2, 0);
camera.lookAt(0, 0, 0.35);

// 从上方俯视
camera.position.set(0, 5, 0);
camera.lookAt(0, 0, 0.35);
```

## 坐标系转换注意事项

**重要**：MuJoCo 和 Three.js 使用不同的坐标系：
- **MuJoCo**：Y 轴向上，Z 轴向前
- **Three.js**：Y 轴向上，Z 轴向前（但渲染时 Z 轴朝向观察者）

在代码中，我们使用 `getPos()` 和 `getQuat()` 函数来转换坐标，确保模型正确显示。

## 总结

当前的相机设置创建了一个：
- **视角**：从右上方观察（斜上方视角）
- **距离**：中等距离，可以看到整个模型
- **焦点**：人体模型的中心（高度 0.35）
- **交互**：支持鼠标旋转、缩放、平移

这个配置适合观察水平放置的人体模型，用户可以自由调整视角来查看模型的不同角度。

