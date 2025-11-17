# 人体模型关节列表与控制方案

## 当前模型关节列表

根据当前的简化人体模型，以下是所有关节：

### 1. **Torso (躯干)** - `joint type="free"`
   - **关节索引**: `model.joint_bodyid[0]` (通常是 0)
   - **自由度**: 6 DOF (3个位置 + 3个旋转)
   - **控制方式**: 直接设置位置和速度
   - **说明**: 这是根关节，控制整个人体的位置和朝向

### 2. **Head (头部)** - `joint type="hinge" axis="0 1 0"`
   - **关节索引**: 1
   - **自由度**: 1 DOF (绕 Y 轴旋转)
   - **控制方式**: 设置关节角度或角速度
   - **说明**: 控制头部左右转动

### 3. **Left Arm (左臂)** - `joint type="hinge" axis="1 0 0"`
   - **关节索引**: 2
   - **自由度**: 1 DOF (绕 X 轴旋转)
   - **控制方式**: 设置关节角度或角速度
   - **说明**: 控制左臂前后摆动

### 4. **Right Arm (右臂)** - `joint type="hinge" axis="1 0 0"`
   - **关节索引**: 3
   - **自由度**: 1 DOF (绕 X 轴旋转)
   - **控制方式**: 设置关节角度或角速度
   - **说明**: 控制右臂前后摆动

### 5. **Left Leg (左腿)** - `joint type="hinge" axis="1 0 0"`
   - **关节索引**: 4
   - **自由度**: 1 DOF (绕 X 轴旋转)
   - **控制方式**: 设置关节角度或角速度
   - **说明**: 控制左腿前后摆动

### 6. **Right Leg (右腿)** - `joint type="hinge" axis="1 0 0"`
   - **关节索引**: 5
   - **自由度**: 1 DOF (绕 X 轴旋转)
   - **控制方式**: 设置关节角度或角速度
   - **说明**: 控制右腿前后摆动

## 关节索引查询方法

```typescript
// 获取关节数量
const njoint = model.njnt;

// 获取关节类型
for (let i = 0; i < njoint; i++) {
  const jointType = model.jnt_type[i];
  const bodyId = model.joint_bodyid[i];
  const jointName = model.names[bodyId]; // 如果模型中有命名
  
  console.log(`Joint ${i}: type=${jointType}, body=${bodyId}, name=${jointName}`);
}

// 获取关节自由度
const nv = model.nv; // 速度空间维度（所有关节的自由度总和）
// free joint = 6 DOF, hinge = 1 DOF
// 所以 nv = 6 (torso) + 1 + 1 + 1 + 1 + 1 = 11
```

## 控制方案

### 方案 1: 直接设置关节位置/速度（推荐用于简单控制）

```typescript
// 在动画循环中，步进前设置控制
function animate(timeMS: number) {
  // ... 其他代码 ...
  
  if (!paused && model && data && mujoco) {
    // 方法 1: 设置关节位置 (data.qpos)
    // qpos 数组索引对应速度空间索引
    // free joint 占用 7 个元素 (3 pos + 4 quat)
    // hinge joint 占用 1 个元素 (angle)
    
    // 设置头部角度 (弧度)
    data.qpos[7] = Math.sin(timeMS / 1000) * 0.5; // 左右摆动
    
    // 设置左臂角度
    data.qpos[8] = Math.sin(timeMS / 1000) * 1.0; // 前后摆动
    
    // 设置右臂角度
    data.qpos[9] = -Math.sin(timeMS / 1000) * 1.0; // 相反方向
    
    // 设置左腿角度
    data.qpos[10] = Math.sin(timeMS / 1000) * 0.8;
    
    // 设置右腿角度
    data.qpos[11] = -Math.sin(timeMS / 1000) * 0.8;
    
    // 方法 2: 设置关节速度 (data.qvel)
    // 更自然的控制方式，模拟肌肉驱动
    data.qvel[7] = 0.5; // 头部角速度
    data.qvel[8] = 1.0; // 左臂角速度
    // ... 等等
    
    // 步进仿真
    mujoco.mj_step(model, data);
  }
}
```

### 方案 2: 使用 Actuator（推荐用于精确控制）

首先需要在 XML 模型中添加 actuator：

```xml
<mujoco>
  <!-- ... 现有模型 ... -->
  
  <actuator>
    <!-- 头部控制 -->
    <motor name="head_motor" joint="head_joint" gear="10" ctrllimited="true" ctrlrange="-1 1"/>
    
    <!-- 左臂控制 -->
    <motor name="left_arm_motor" joint="left_arm_joint" gear="20" ctrllimited="true" ctrlrange="-1 1"/>
    
    <!-- 右臂控制 -->
    <motor name="right_arm_motor" joint="right_arm_joint" gear="20" ctrllimited="true" ctrlrange="-1 1"/>
    
    <!-- 左腿控制 -->
    <motor name="left_leg_motor" joint="left_leg_joint" gear="30" ctrllimited="true" ctrlrange="-1 1"/>
    
    <!-- 右腿控制 -->
    <motor name="right_leg_motor" joint="right_leg_joint" gear="30" ctrllimited="true" ctrlrange="-1 1"/>
  </actuator>
</mujoco>
```

然后使用 `data.ctrl` 控制：

```typescript
// 获取 actuator 数量
const nu = model.nu; // actuator 数量

// 设置控制输入
// data.ctrl[i] 对应第 i 个 actuator
data.ctrl[0] = 0.5; // 头部 motor
data.ctrl[1] = 1.0; // 左臂 motor
data.ctrl[2] = -1.0; // 右臂 motor (相反方向)
data.ctrl[3] = 0.8; // 左腿 motor
data.ctrl[4] = -0.8; // 右腿 motor

// 步进仿真
mujoco.mj_step(model, data);
```

### 方案 3: 键盘控制（用户交互）

```typescript
// 在组件中添加键盘事件监听
useEffect(() => {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (!modelRef.current || !dataRef.current) return;
    
    const model = modelRef.current;
    const data = dataRef.current;
    
    switch (event.key.toLowerCase()) {
      case 'q': // 头部左转
        data.qvel[7] = 1.0;
        break;
      case 'e': // 头部右转
        data.qvel[7] = -1.0;
        break;
      case 'a': // 左臂向前
        data.qvel[8] = 2.0;
        break;
      case 'd': // 右臂向前
        data.qvel[9] = 2.0;
        break;
      case 'w': // 左腿向前
        data.qvel[10] = 2.0;
        break;
      case 's': // 右腿向前
        data.qvel[11] = 2.0;
        break;
      case ' ': // 空格：重置
        mujoco.mj_resetData(model, data);
        break;
    }
  };
  
  const handleKeyRelease = (event: KeyboardEvent) => {
    if (!dataRef.current) return;
    const data = dataRef.current;
    
    // 释放时停止运动
    switch (event.key.toLowerCase()) {
      case 'q':
      case 'e':
        data.qvel[7] = 0;
        break;
      case 'a':
        data.qvel[8] = 0;
        break;
      case 'd':
        data.qvel[9] = 0;
        break;
      case 'w':
        data.qvel[10] = 0;
        break;
      case 's':
        data.qvel[11] = 0;
        break;
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  window.addEventListener('keyup', handleKeyRelease);
  
  return () => {
    window.removeEventListener('keydown', handleKeyPress);
    window.removeEventListener('keyup', handleKeyRelease);
  };
}, []);
```

## 推荐实现步骤

### 阶段 1: 基础控制（当前）
1. ✅ 使用 `data.qvel` 直接设置关节速度
2. ✅ 添加简单的键盘控制
3. ✅ 实现基本的行走/摆动动画

### 阶段 2: 添加 Actuator（改进）
1. ⚠️ 在 XML 模型中添加 `<actuator>` 部分
2. ⚠️ 使用 `data.ctrl` 进行更精确的控制
3. ⚠️ 添加力/扭矩限制

### 阶段 3: 高级控制
1. ⚠️ 实现 PD 控制器（位置-速度控制）
2. ⚠️ 实现行走控制器
3. ⚠️ 添加传感器反馈控制

## 注意事项

1. **索引对应关系**：
   - `data.qpos` 和 `data.qvel` 的索引对应速度空间（`nv`）
   - free joint 占用 7 个元素（3 pos + 4 quat）
   - hinge joint 占用 1 个元素
   - 需要根据模型结构计算正确的索引

2. **单位**：
   - 角度使用**弧度**（radians）
   - 角速度使用 rad/s
   - 位置使用米（m）

3. **稳定性**：
   - 避免设置过大的速度值
   - 考虑添加阻尼（在 XML 中设置 `damping`）
   - 使用 `mj_forward()` 更新状态后再设置控制

4. **调试**：
   - 使用 `console.log` 输出关节状态
   - 检查 `model.nv` 和 `model.nu` 确认维度
   - 可视化关节角度帮助调试

## 示例：简单的摆动动画

```typescript
function animate(timeMS: number) {
  if (!paused && model && data && mujoco) {
    const timestep = model.opt.timestep;
    
    // 时间同步
    if (timeMS - mujocoTime > 35.0) {
      mujocoTime = timeMS;
    }
    
    while (mujocoTime < timeMS) {
      // 设置控制（在步进前）
      const t = mujocoTime / 1000; // 转换为秒
      
      // 简单的正弦波摆动
      data.qvel[7] = Math.cos(t) * 0.5; // 头部
      data.qvel[8] = Math.sin(t) * 1.0; // 左臂
      data.qvel[9] = -Math.sin(t) * 1.0; // 右臂
      data.qvel[10] = Math.sin(t * 2) * 0.8; // 左腿
      data.qvel[11] = -Math.sin(t * 2) * 0.8; // 右腿
      
      mujoco.mj_step(model, data);
      mujocoTime += timestep * 1000.0;
    }
    
    // 更新渲染...
  }
}
```

