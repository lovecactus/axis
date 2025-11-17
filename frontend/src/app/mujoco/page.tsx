"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { loadMujoco, getPos, getQuat } from "@/lib/mujoco-utils";

// RESTORED: Original working implementation that renders directly into canvasContainerRef
// This was working before refactoring to use the MuJoCoViewer component
export default function MuJoCoTestPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [manualControl, setManualControl] = useState<boolean>(false);
  const manualControlRef = useRef<boolean>(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mujocoRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const dataRef = useRef<any>(null);
  const bodiesRef = useRef<Record<number, THREE.Group>>({});
  const mujocoTimeRef = useRef<number>(0);
  const keysPressedRef = useRef<Set<string>>(new Set());
  const initAttemptedRef = useRef<boolean>(false);

  const addLog = useCallback((message: string) => {
    console.log(`[MuJoCo Test] ${message}`);
    setLogs((prev) => {
      // Limit logs to last 100 entries to prevent memory issues
      const newLogs = [...prev, `${new Date().toLocaleTimeString()}: ${message}`];
      return newLogs.slice(-100);
    });
  }, []);

  // Keyboard control setup
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      keysPressedRef.current.add(key);

      // Toggle manual/auto control with 'M' key
      if (key === "m") {
        setManualControl((prev) => {
          const newMode = !prev;
          manualControlRef.current = newMode;
          addLog(`Control mode: ${newMode ? "Manual (keyboard)" : "Automatic (animation)"}`);
          return newMode;
        });
        event.preventDefault();
      }

      // Reset with Space
      if (key === " " && modelRef.current && dataRef.current) {
        mujocoRef.current?.mj_resetData(modelRef.current, dataRef.current);
        addLog("Model reset to initial state");
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysPressedRef.current.delete(key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [addLog]);

  useEffect(() => {
    if (!containerRef.current || initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    let mounted = true;

    async function testMuJoCo() {
      try {
        addLog("Starting MuJoCo test...");

        // Step 1: Load the MuJoCo module
        addLog("Step 1: Loading MuJoCo module...");
        setStatus("Loading MuJoCo module...");

        addLog("Step 2: Calling loadMujoco()...");
        setStatus("Initializing MuJoCo WASM...");
        const mujoco = await loadMujoco();
        addLog("✓ MuJoCo module loaded successfully");

        if (!mujoco) {
          throw new Error("MuJoCo instance is null");
        }

        mujocoRef.current = mujoco;

        // Step 2: Set up Virtual File System
        addLog("Step 3: Setting up Virtual File System...");
        setStatus("Setting up file system...");

        try {
          mujoco.FS.mkdir("/working");
          addLog("✓ Created /working directory");
        } catch (e: any) {
          if (e.message && !e.message.includes("File exists")) {
            addLog(`⚠ Directory might already exist: ${e.message}`);
          }
        }

        mujoco.FS.mount(mujoco.MEMFS, { root: "." }, "/working");
        addLog("✓ Mounted MEMFS to /working");

        // Step 3: Create model XML - Basic Human Model
        addLog("Step 4: Creating human model XML...");
        setStatus("Creating human simulation model...");

        const modelXml = `
<mujoco>
  <option timestep="0.01" gravity="0 0 -9.81"/>
  <worldbody>
    <light pos="0 0 3" dir="0 0 -1"/>
    <geom type="plane" size="2 2 0.1" rgba="0.15 0.15 0.15 1"/>
    
    <!-- Simple Human Model - Horizontal and Above Ground -->
    <!-- Rotated 90 degrees around X axis to lay flat, positioned above ground -->
    <body name="torso" pos="0 0 0.35" quat="0.7071 0.7071 0 0">
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

        mujoco.FS.writeFile("/working/model.xml", modelXml);
        addLog("✓ Human model XML written to /working/model.xml");

        // Step 4: Load model and create data
        addLog("Step 5: Loading model from XML...");
        setStatus("Loading physics model...");

        const model = mujoco.MjModel.loadFromXML("/working/model.xml");
        addLog(`✓ Model loaded. Bodies: ${model.nbody}, Geoms: ${model.ngeom}`);
        addLog(`✓ Joint info: njoint=${model.njnt}, nv=${model.nv} (velocity DOF)`);
        addLog(`✓ Actuator info: nu=${model.nu} actuators available`);

        const data = new mujoco.MjData(model);
        addLog("✓ Data created");
        addLog("✓ Actuators: [0]head_motor, [1]left_arm_motor, [2]right_arm_motor, [3]left_leg_motor, [4]right_leg_motor");
        addLog("✓ Direct velocity control enabled - human model will animate automatically");
        addLog("✓ Keyboard control ready - Press 'M' to toggle manual/auto mode");
        addLog("ℹ Note: Actuators are defined but using direct qvel control. Switch to data.ctrl for actuator control.");

        modelRef.current = model;
        dataRef.current = data;

        // Step 5: Test simulation step
        addLog("Step 6: Testing simulation step...");
        setStatus("Running simulation test...");

        mujoco.mj_step(model, data);
        addLog("✓ Simulation step completed");

        // Setup rendering
        await setupRendering(mujoco, model, data);

        addLog("✅ All tests passed! MuJoCo is working correctly.");
        setStatus("✓ All tests passed!");
      } catch (err: any) {
        addLog(`✗ Error: ${err.message}`);
        setError(err.message);
        setStatus("✗ Error");
        console.error("[MuJoCo Test] Full error object:", err);
      }
    }

    async function setupRendering(mujoco: any, model: any, data: any) {
      if (!canvasContainerRef.current) return;

      const bodies: Record<number, THREE.Group> = {};

      // Create Three.js scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f5f5);
      sceneRef.current = scene;

      // Camera - adjusted for horizontal human model
      const width = 800;
      const height = 600;
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 100);
      camera.position.set(3, 2, 0.5);
      camera.lookAt(0, 0, 0.35);

      // Renderer - KEY DIFFERENCE: Directly appends to canvasContainerRef
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      // DIRECTLY append to canvasContainerRef - no wrapper div
      canvasContainerRef.current.appendChild(renderer.domElement);

      // Controls - centered on horizontal human model
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0.35); // Center on horizontal human torso above ground
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controlsRef.current = controls;

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(3, 3, 3);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Create bodies and geometries from MuJoCo model
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

        if (!bodies[bodyId]) {
          bodies[bodyId] = new THREE.Group();
          scene.add(bodies[bodyId]);
        }

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

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(rgba[0], rgba[1], rgba[2]),
          transparent: rgba[3] < 1.0,
          opacity: rgba[3],
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const pos = getPos(model.geom_pos, g);
        mesh.position.set(pos[0], pos[1], pos[2]);

        const quat = getQuat(model.geom_quat, g);
        mesh.quaternion.set(quat[0], quat[1], quat[2], quat[3]);

        bodies[bodyId].add(mesh);
      }

      bodiesRef.current = bodies;

      // Animation loop
      mujocoTimeRef.current = performance.now();
      function animate(timeMS: number) {
        if (!mounted || !sceneRef.current || !rendererRef.current) return;

        controls.update();

        // Step simulation
        if (model && data && mujoco) {
          const timestep = model.opt.timestep;
          if (timeMS - mujocoTimeRef.current > 35.0) {
            mujocoTimeRef.current = timeMS;
          }

          while (mujocoTimeRef.current < timeMS) {
            // Direct velocity control (Scheme 1)
            // Joint indices: Torso (free, 6 DOF) = qvel[0-5], Head = qvel[6], 
            // Left Arm = qvel[7], Right Arm = qvel[8], Left Leg = qvel[9], Right Leg = qvel[10]
            
            if (manualControlRef.current) {
              // Manual keyboard control
              const keys = keysPressedRef.current;
              
              // ===== OPTION 1: Direct velocity control (alternative) =====
              // Uncomment below to use direct qvel control instead of actuators
              /*
              const speed = 1.5; // Control speed multiplier
              
              // Head control: Q (left) / E (right)
              if (keys.has("q")) {
                data.qvel[6] = speed * 0.5;
              } else if (keys.has("e")) {
                data.qvel[6] = -speed * 0.5;
              } else {
                data.qvel[6] = 0;
              }
              
              // Left Arm: A (forward)
              if (keys.has("a")) {
                data.qvel[7] = speed;
              } else {
                data.qvel[7] = 0;
              }
              
              // Right Arm: D (forward)
              if (keys.has("d")) {
                data.qvel[8] = speed;
              } else {
                data.qvel[8] = 0;
              }
              
              // Left Leg: W (forward)
              if (keys.has("w")) {
                data.qvel[9] = speed * 0.8;
              } else {
                data.qvel[9] = 0;
              }
              
              // Right Leg: S (forward)
              if (keys.has("s")) {
                data.qvel[10] = speed * 0.8;
              } else {
                data.qvel[10] = 0;
              }
              */
              
              // ===== OPTION 2: Actuator control (current) =====
              // Actuator indices: [0]head_motor, [1]left_arm_motor, [2]right_arm_motor, 
              //                   [3]left_leg_motor, [4]right_leg_motor
              const ctrlValue = 0.16; // Control signal (-1 to 1) - 1/5 of original 0.8
              
              // Head control: Q (left) / E (right)
              if (keys.has("q")) {
                data.ctrl[0] = ctrlValue; // head_motor
              } else if (keys.has("e")) {
                data.ctrl[0] = -ctrlValue;
              } else {
                data.ctrl[0] = 0;
              }
              
              // Left Arm: A (forward)
              data.ctrl[1] = keys.has("a") ? ctrlValue : 0; // left_arm_motor
              
              // Right Arm: D (forward)
              data.ctrl[2] = keys.has("d") ? ctrlValue : 0; // right_arm_motor
              
              // Left Leg: W (forward)
              data.ctrl[3] = keys.has("w") ? ctrlValue : 0; // left_leg_motor
              
              // Right Leg: S (forward)
              data.ctrl[4] = keys.has("s") ? ctrlValue : 0; // right_leg_motor
            } else {
              // Automatic animation
              const t = mujocoTimeRef.current / 1000; // Convert to seconds
              
              // ===== OPTION 1: Direct velocity control (alternative) =====
              // Uncomment below to use direct qvel control for automatic animation
              /*
              // Head: slow rotation (Y axis)
              data.qvel[6] = Math.cos(t * 0.5) * 0.3;
              
              // Left Arm: swing forward/back (X axis)
              data.qvel[7] = Math.sin(t * 1.2) * 1.0;
              
              // Right Arm: swing opposite direction
              data.qvel[8] = -Math.sin(t * 1.2) * 1.0;
              
              // Left Leg: walking motion
              data.qvel[9] = Math.sin(t * 2.0) * 0.8;
              
              // Right Leg: opposite phase
              data.qvel[10] = -Math.sin(t * 2.0) * 0.8;
              */
              
              // ===== OPTION 2: Actuator control (current) =====
              // Reduced to 1/5 speed: 0.3->0.06, 0.5->0.1, 0.4->0.08
              data.ctrl[0] = Math.cos(t * 0.5) * 0.06; // head_motor
              data.ctrl[1] = Math.sin(t * 1.2) * 0.1; // left_arm_motor
              data.ctrl[2] = -Math.sin(t * 1.2) * 0.1; // right_arm_motor
              data.ctrl[3] = Math.sin(t * 2.0) * 0.08; // left_leg_motor
              data.ctrl[4] = -Math.sin(t * 2.0) * 0.08; // right_leg_motor
            }
            
            mujoco.mj_step(model, data);
            mujocoTimeRef.current += timestep * 1000.0;
          }

          // Update body positions
          for (let b = 0; b < model.nbody; b++) {
            if (bodies[b]) {
              const pos = getPos(data.xpos, b);
              bodies[b].position.set(pos[0], pos[1], pos[2]);

              const quat = getQuat(data.xquat, b);
              bodies[b].quaternion.set(quat[0], quat[1], quat[2], quat[3]);
            }
          }
        }

        renderer.render(scene, camera);
        animationFrameRef.current = requestAnimationFrame(animate);
      }

      animate(performance.now());
      addLog("✓ Animation loop started");
    }

    testMuJoCo();

    return () => {
      mounted = false;
      // Clean up animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clean up Three.js - KEY DIFFERENCE: Directly removes from canvasContainerRef
      if (rendererRef.current && canvasContainerRef.current) {
        if (canvasContainerRef.current.contains(rendererRef.current.domElement)) {
          canvasContainerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }
      controlsRef.current?.dispose();
      // Clean up MuJoCo
      if (dataRef.current) {
        dataRef.current.delete();
      }
      if (modelRef.current) {
        modelRef.current.delete();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 p-8 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            MuJoCo Test Page
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Debugging MuJoCo integration following the{" "}
            <a
              href="https://github.com/zalo/mujoco_wasm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              mujoco_wasm README
            </a>{" "}
            pattern
          </p>
          
          {/* Control Mode Indicator */}
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  Control Mode:{" "}
                  <span className={manualControl ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"}>
                    {manualControl ? "Manual (Keyboard)" : "Automatic (Animation)"}
                  </span>
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Press <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-xs font-mono dark:border-zinc-700 dark:bg-zinc-800">M</kbd> to toggle control mode
                </p>
              </div>
            </div>
            
            {manualControl && (
              <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  Keyboard Controls:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <div><kbd className="font-mono">Q</kbd> / <kbd className="font-mono">E</kbd> - Head left/right</div>
                  <div><kbd className="font-mono">A</kbd> - Left arm</div>
                  <div><kbd className="font-mono">D</kbd> - Right arm</div>
                  <div><kbd className="font-mono">W</kbd> - Left leg</div>
                  <div><kbd className="font-mono">S</kbd> - Right leg</div>
                  <div><kbd className="font-mono">Space</kbd> - Reset model</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Status
            </h2>
            <p
              className={`mt-2 text-sm font-medium ${
                error
                  ? "text-red-600 dark:text-red-400"
                  : status.includes("✓")
                  ? "text-green-600 dark:text-green-400"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {status}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <h3 className="font-semibold text-red-900 dark:text-red-400">
                Error
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Canvas Container for 3D Rendering - KEY: Direct ref, no wrapper */}
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            3D Simulation
          </h2>
          <div
            ref={canvasContainerRef}
            className="flex items-center justify-center rounded border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950"
            style={{ minHeight: "600px" }}
          >
            {status === "Initializing..." || status.includes("Loading") || status.includes("Setting up") ? (
              <p className="text-zinc-600 dark:text-zinc-400">
                {status}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Test Logs
          </h2>
          <div
            ref={containerRef}
            className="max-h-96 space-y-1 overflow-y-auto rounded border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
          >
            {logs.length === 0 ? (
              <p className="text-zinc-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`break-words ${
                    log.includes("✓")
                      ? "text-green-600 dark:text-green-400"
                      : log.includes("✗")
                      ? "text-red-600 dark:text-red-400"
                      : log.includes("⚠")
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
