"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Declare global type for mujoco module loaded via script tag
declare global {
  interface Window {
    load_mujoco?: () => Promise<any>;
  }
}

// RESTORED: Original working implementation that renders directly into canvasContainerRef
// This was working before refactoring to use the MuJoCoViewer component
export default function MuJoCoTestPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mujocoRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const dataRef = useRef<any>(null);
  const bodiesRef = useRef<Record<number, THREE.Group>>({});
  const mujocoTimeRef = useRef<number>(0);

  const addLog = (message: string) => {
    console.log(`[MuJoCo Test] ${message}`);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    async function testMuJoCo() {
      try {
        addLog("Starting MuJoCo test...");

        // Step 1: Load the MuJoCo module
        addLog("Step 1: Loading MuJoCo module...");
        setStatus("Loading MuJoCo module...");

        let load_mujoco: any;
        
        const loadViaScript = (): Promise<any> => {
          return new Promise((resolve, reject) => {
            if (window.load_mujoco) {
              addLog("✓ Script already loaded");
              resolve(window.load_mujoco);
              return;
            }
            
            const existingScript = document.getElementById("mujoco-wasm-script");
            if (existingScript) {
              existingScript.remove();
            }
            
            const script = document.createElement("script");
            script.id = "mujoco-wasm-script";
            script.type = "module";
            script.src = "/mujoco-js/dist/mujoco_wasm.js";
            
            script.onload = () => {
              addLog("✓ Script loaded successfully");
              setTimeout(async () => {
                try {
                  const importModule = new Function(
                    'return import("/mujoco-js/dist/mujoco_wasm.js")'
                  ) as () => Promise<any>;
                  
                  const module = await importModule();
                  addLog(`✓ Module imported. Keys: ${Object.keys(module).join(", ")}`);
                  const loader = module.default || module;
                  window.load_mujoco = loader;
                  resolve(loader);
                } catch (importError: any) {
                  addLog(`✗ Import after script load failed: ${importError.message}`);
                  reject(importError);
                }
              }, 100);
            };
            
            script.onerror = (error) => {
              addLog(`✗ Script load failed: ${error}`);
              reject(new Error("Failed to load MuJoCo script"));
            };
            
            document.head.appendChild(script);
            addLog("Script tag appended to head");
          });
        };
        
        try {
          load_mujoco = await loadViaScript();
          addLog(`✓ Loader function obtained. Type: ${typeof load_mujoco}`);
        } catch (scriptError: any) {
          addLog(`✗ Script tag loading failed: ${scriptError.message}`);
          throw scriptError;
        }

        if (!load_mujoco || typeof load_mujoco !== "function") {
          addLog(`✗ Loader is not a function: ${typeof load_mujoco}`);
          throw new Error("MuJoCo loader is not a function");
        }

        addLog("Step 2: Calling load_mujoco()...");
        setStatus("Initializing MuJoCo WASM...");
        const mujoco = await load_mujoco();
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

        // Step 3: Create model XML
        addLog("Step 4: Creating model XML...");
        setStatus("Creating simulation model...");

        const modelXml = `
<mujoco>
  <option timestep="0.01"/>
  <worldbody>
    <light pos="0 0 3" dir="0 0 -1"/>
    <geom type="plane" size="1 1 0.1" rgba="0.9 0.9 0.9 1"/>
    <body pos="0 0 0.5">
      <geom type="box" size="0.1 0.1 0.1" rgba="0.8 0.3 0.3 1" mass="1"/>
      <joint type="free"/>
    </body>
  </worldbody>
</mujoco>`;

        mujoco.FS.writeFile("/working/model.xml", modelXml);
        addLog("✓ Model XML written to /working/model.xml");

        // Step 4: Load model and create data
        addLog("Step 5: Loading model from XML...");
        setStatus("Loading physics model...");

        const model = mujoco.MjModel.loadFromXML("/working/model.xml");
        addLog(`✓ Model loaded. Bodies: ${model.nbody}, Geoms: ${model.ngeom}`);

        const data = new mujoco.MjData(model);
        addLog("✓ Data created");

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

      // Helper functions to convert MuJoCo coordinates to Three.js
      const getPos = (buffer: Float32Array | Float64Array, index: number): [number, number, number] => {
        return [
          buffer[index * 3 + 0],
          buffer[index * 3 + 2], // Y and Z swapped
          -buffer[index * 3 + 1],
        ];
      };

      const getQuat = (buffer: Float32Array | Float64Array, index: number): [number, number, number, number] => {
        return [
          -buffer[index * 4 + 1],
          -buffer[index * 4 + 3],
          buffer[index * 4 + 2],
          -buffer[index * 4 + 0],
        ];
      };

      // Create Three.js scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f5f5);
      sceneRef.current = scene;

      // Camera
      const width = 800;
      const height = 600;
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 100);
      camera.position.set(2, 2, 2);
      camera.lookAt(0, 0, 0);

      // Renderer - KEY DIFFERENCE: Directly appends to canvasContainerRef
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      // DIRECTLY append to canvasContainerRef - no wrapper div
      canvasContainerRef.current.appendChild(renderer.domElement);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0.5, 0);
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
