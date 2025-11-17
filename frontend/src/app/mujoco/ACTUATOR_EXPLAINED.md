# MuJoCo Actuator（执行器）说明

## 什么是 Actuator？

**Actuator（执行器）** 是 MuJoCo 中用于控制关节运动的组件。它类似于现实世界中的电机、马达或肌肉，可以将控制信号转换为作用在关节上的力或力矩。

## 类比理解

想象一下：
- **没有 Actuator**：就像一个人体模型，你可以直接推拉它的关节，但需要手动施加力
- **有 Actuator**：就像给人体模型装上电机，你只需要发送控制信号（比如"转 30 度"），电机就会自动产生力来驱动关节

## Actuator 的作用

1. **接收控制输入**：通过 `data.ctrl[i]` 接收你的控制信号
2. **转换为力/力矩**：将控制信号转换为作用在关节上的力或力矩
3. **驱动关节运动**：产生的力驱动关节按照你的意图运动

## 两种控制方式的区别

### 方式 1: 直接控制（当前方案，不需要 Actuator）

```typescript
// 直接设置关节速度
data.qvel[7] = 1.0;  // 直接告诉关节"以这个速度转动"
mujoco.mj_step(model, data);
```

**特点**：
- ✅ 简单直接
- ✅ 不需要在 XML 中定义 Actuator
- ✅ 适合简单的控制场景
- ❌ 不够真实（现实中关节不会直接"知道"速度）
- ❌ 难以模拟力限制、阻尼等物理特性

### 方式 2: 通过 Actuator 控制（更真实，需要定义 Actuator）

```xml
<!-- 在 XML 中定义 Actuator -->
<actuator>
  <motor name="head_motor" joint="head_joint" gear="10"/>
</actuator>
```

```typescript
// 通过 Actuator 控制
data.ctrl[0] = 0.5;  // 发送控制信号给 Actuator
mujoco.mj_step(model, data);  // Actuator 将信号转换为力，驱动关节
```

**特点**：
- ✅ 更真实（模拟电机/肌肉驱动）
- ✅ 可以设置力限制、阻尼等参数
- ✅ 可以模拟不同类型的驱动（电机、位置控制、速度控制等）
- ❌ 需要在 XML 中定义
- ❌ 稍微复杂一些

## Actuator 的类型

MuJoCo 提供多种 Actuator 类型：

### 1. **Motor（电机）**
最简单的执行器，直接将控制信号转换为力矩：

```xml
<motor name="arm_motor" joint="arm_joint" gear="20" ctrllimited="true" ctrlrange="-1 1"/>
```

- `gear`: 传动比（控制信号的放大倍数）
- `ctrllimited`: 是否限制控制范围
- `ctrlrange`: 控制范围（-1 到 1）

### 2. **Position（位置控制）**
控制关节到达目标位置：

```xml
<position name="arm_position" joint="arm_joint" kp="100"/>
```

- `kp`: 位置增益（刚度）

### 3. **Velocity（速度控制）**
控制关节达到目标速度：

```xml
<velocity name="arm_velocity" joint="arm_joint" kv="10"/>
```

- `kv`: 速度增益（阻尼）

### 4. **General（通用）**
最灵活的类型，可以自定义力生成函数。

## 为什么方案 1 不需要 Actuator？

方案 1（直接速度控制）是**直接操作关节状态**，跳过了 Actuator 这一层：

```
你的代码 → 直接设置 data.qvel → 关节运动
```

而使用 Actuator 是**通过力驱动关节**：

```
你的代码 → 设置 data.ctrl → Actuator 产生力 → 力驱动关节 → 关节运动
```

## 什么时候需要 Actuator？

### 不需要 Actuator 的场景：
- ✅ 简单的动画演示
- ✅ 测试和调试
- ✅ 简单的摆动/周期性运动
- ✅ 学习 MuJoCo 基础

### 需要 Actuator 的场景：
- ⚠️ 模拟真实的机器人控制
- ⚠️ 需要力限制（防止关节过度用力）
- ⚠️ 需要模拟电机特性（惯性、阻尼等）
- ⚠️ 复杂的控制任务（行走、抓取等）
- ⚠️ 需要传感器反馈控制

## 总结

- **Actuator = 执行器 = 驱动关节的"电机"**
- **方案 1（直接控制）**：简单，不需要 Actuator，适合当前学习阶段
- **方案 2（Actuator 控制）**：更真实，需要定义 Actuator，适合高级应用

对于当前的简化人体模型，**方案 1 完全够用**。等需要更真实的物理模拟时，再考虑添加 Actuator。

