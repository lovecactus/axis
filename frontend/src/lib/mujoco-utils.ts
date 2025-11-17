/**
 * Shared MuJoCo utilities used by both MuJoCoViewer component and mujoco test page
 */

// Declare global type for mujoco module loaded via script tag
declare global {
  interface Window {
    load_mujoco?: () => Promise<any>;
  }
}

/**
 * Load MuJoCo module using script tag (bypasses webpack completely)
 * This is the working strategy that loads MuJoCo WASM at runtime
 */
export async function loadMujoco() {
  if (typeof window === "undefined") {
    throw new Error("MuJoCo can only be loaded in the browser");
  }
  
  // Strategy: Load via script tag (completely bypasses webpack)
  const loadViaScript = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.load_mujoco) {
        resolve(window.load_mujoco);
        return;
      }
      
      // Remove any existing script
      const existingScript = document.getElementById("mujoco-wasm-script");
      if (existingScript) {
        existingScript.remove();
      }
      
      // Create script tag
      const script = document.createElement("script");
      script.id = "mujoco-wasm-script";
      script.type = "module";
      script.src = "/mujoco-js/dist/mujoco_wasm.js";
      
      script.onload = () => {
        // Import the module after script loads (it should be cached)
        setTimeout(async () => {
          try {
            const importModule = new Function(
              'return import("/mujoco-js/dist/mujoco_wasm.js")'
            ) as () => Promise<any>;
            
            const module = await importModule();
            const loader = module.default || module;
            window.load_mujoco = loader;
            resolve(loader);
          } catch (importError: any) {
            reject(importError);
          }
        }, 100);
      };
      
      script.onerror = () => {
        reject(new Error("Failed to load MuJoCo script"));
      };
      
      document.head.appendChild(script);
    });
  };
  
  try {
    const load_mujoco = await loadViaScript();
    
    if (!load_mujoco || typeof load_mujoco !== "function") {
      throw new Error("MuJoCo loader is not a function");
    }
    
    const mujocoInstance = await load_mujoco();
    
    if (!mujocoInstance) {
      throw new Error("MuJoCo instance is null or undefined");
    }
    
    return mujocoInstance;
  } catch (error) {
    console.error("[MuJoCo Utils] Failed to load MuJoCo module:", error);
    throw error;
  }
}

/**
 * Helper function to convert MuJoCo position buffer to Three.js coordinates
 * MuJoCo uses different coordinate system than Three.js (Y and Z are swapped)
 */
export function getPos(
  buffer: Float32Array | Float64Array,
  index: number,
): [number, number, number] {
  return [
    buffer[index * 3 + 0],
    buffer[index * 3 + 2], // Y and Z swapped
    -buffer[index * 3 + 1],
  ];
}

/**
 * Helper function to convert MuJoCo quaternion buffer to Three.js quaternion
 * MuJoCo uses different quaternion convention than Three.js
 */
export function getQuat(
  buffer: Float32Array | Float64Array,
  index: number,
): [number, number, number, number] {
  return [
    -buffer[index * 4 + 1],
    -buffer[index * 4 + 3],
    buffer[index * 4 + 2],
    -buffer[index * 4 + 0],
  ];
}

/**
 * Shared human model XML for MuJoCo simulation
 * Vertical model positioned above ground with actuators
 */
export const HUMAN_MODEL_XML = `
<mujoco>
  <option timestep="0.01" gravity="0 0 -9.81"/>
  <worldbody>
    <light pos="0 0 3" dir="0 0 -1"/>
    <geom type="plane" size="2 2 0.1" rgba="0.15 0.15 0.15 1"/>
    
    <!-- Simple Human Model - Vertical and Above Ground -->
    <!-- Standing upright, positioned so feet are on ground -->
    <!-- In MuJoCo: Z is vertical (gravity is 0 0 -9.81), so pos="0 0 0.7" means Z=0.7 (up) -->
    <!-- This converts to Three.js as Y=0.7 (up) via getPos: (X, Y, Z) → (X, Z, -Y) -->
    <body name="torso" pos="0 0 0.7">
      <joint name="torso_joint" type="free"/>
      <geom type="box" size="0.15 0.2 0.3" rgba="0.8 0.6 0.4 1" mass="10"/>
      
      <!-- Head -->
      <body name="head" pos="0 0 0.4">
        <joint name="head_joint" type="hinge" axis="0 1 0"/>
        <geom type="sphere" size="0.12" rgba="0.9 0.8 0.7 1" mass="2"/>
      </body>
      
      <!-- Left Arm -->
      <body name="left_arm" pos="-0.2 0 0.2">
        <joint name="left_arm_joint" type="hinge" axis="1 0 0"/>
        <geom type="cylinder" size="0.05 0.25" rgba="0.8 0.6 0.4 1" mass="1.5"/>
      </body>
      
      <!-- Right Arm -->
      <body name="right_arm" pos="0.2 0 0.2">
        <joint name="right_arm_joint" type="hinge" axis="1 0 0"/>
        <geom type="cylinder" size="0.05 0.25" rgba="0.8 0.6 0.4 1" mass="1.5"/>
      </body>
      
      <!-- Left Leg -->
      <body name="left_leg" pos="-0.08 0 -0.3">
        <joint name="left_leg_joint" type="hinge" axis="1 0 0"/>
        <geom type="cylinder" size="0.06 0.4" rgba="0.3 0.3 0.6 1" mass="3"/>
      </body>
      
      <!-- Right Leg -->
      <body name="right_leg" pos="0.08 0 -0.3">
        <joint name="right_leg_joint" type="hinge" axis="1 0 0"/>
        <geom type="cylinder" size="0.06 0.4" rgba="0.3 0.3 0.6 1" mass="3"/>
      </body>
    </body>
  </worldbody>
  
  <!-- Actuators: Motors that drive the joints -->
  <actuator>
    <!-- Head motor: controls head rotation -->
    <motor name="head_motor" joint="head_joint" gear="10" ctrllimited="true" ctrlrange="-1 1"/>
    
    <!-- Left arm motor: controls left arm swing -->
    <motor name="left_arm_motor" joint="left_arm_joint" gear="20" ctrllimited="true" ctrlrange="-1 1"/>
    
    <!-- Right arm motor: controls right arm swing -->
    <motor name="right_arm_motor" joint="right_arm_joint" gear="20" ctrllimited="true" ctrlrange="-1 1"/>
    
    <!-- Left leg motor: controls left leg movement -->
    <motor name="left_leg_motor" joint="left_leg_joint" gear="30" ctrllimited="true" ctrlrange="-1 1"/>
    
    <!-- Right leg motor: controls right leg movement -->
    <motor name="right_leg_motor" joint="right_leg_joint" gear="30" ctrllimited="true" ctrlrange="-1 1"/>
  </actuator>
</mujoco>`;

