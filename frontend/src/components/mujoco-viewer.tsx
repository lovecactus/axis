"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Dynamic import for mujoco-js to avoid SSR issues
// This must only be called client-side, never during SSR or build time
async function loadMujoco() {
  if (typeof window === "undefined") {
    throw new Error("MuJoCo can only be loaded in the browser");
  }
  
  try {
    // Use dynamic import that only happens at runtime
    // The path must match exactly what's in node_modules
    const mujocoModule = await import(
      /* webpackIgnore: true */
      "mujoco-js/dist/mujoco_wasm.js"
    );
    
    const load_mujoco = mujocoModule.default || mujocoModule;
    if (!load_mujoco || typeof load_mujoco !== "function") {
      throw new Error("MuJoCo loader function not found in module");
    }
    
    return await load_mujoco();
  } catch (error) {
    console.error("Failed to load MuJoCo module:", error);
    throw error;
  }
}

interface MuJoCoViewerProps {
  modelUrl?: string;
  modelXml?: string;
  width?: number;
  height?: number;
  paused?: boolean;
  className?: string;
}

export function MuJoCoViewer({
  modelUrl,
  modelXml,
  width = 400,
  height = 300,
  paused = false,
  className = "",
}: MuJoCoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mujocoRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const dataRef = useRef<any>(null);
  const bodiesRef = useRef<Record<number, THREE.Group>>({});
  const lightsRef = useRef<THREE.Light[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mujocoTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    async function init() {
      try {
        // Load MuJoCo module
        const mujoco = await loadMujoco();
        if (!mounted || !mujoco) return;

        mujocoRef.current = mujoco;

        // Set up Virtual File System
        try {
          mujoco.FS.mkdir("/working");
        } catch (e) {
          // Directory might already exist
        }
        mujoco.FS.mount(mujoco.MEMFS, { root: "." }, "/working");

        // Load model XML
        let xmlContent: string;
        if (modelXml) {
          xmlContent = modelXml;
        } else if (modelUrl) {
          const response = await fetch(modelUrl);
          xmlContent = await response.text();
        } else {
          // Default simple model
          xmlContent = `
<mujoco>
  <worldbody>
    <light pos="0 0 3" dir="0 0 -1"/>
    <geom type="plane" size="1 1 0.1" rgba="0.8 0.8 0.8 1"/>
    <body pos="0 0 1">
      <geom type="box" size="0.2 0.2 0.2" rgba="0.8 0.3 0.3 1"/>
      <joint type="free"/>
    </body>
  </worldbody>
</mujoco>
          `;
        }

        mujoco.FS.writeFile("/working/model.xml", xmlContent);

        // Load model and create data
        const model = mujoco.MjModel.loadFromXML("/working/model.xml");
        const data = new mujoco.MjData(model);

        modelRef.current = model;
        dataRef.current = data;

        // Create Three.js scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(
          45,
          width / height,
          0.001,
          100,
        );
        camera.position.set(2, 2, 2);
        camera.lookAt(0, 0, 0);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;

        if (containerRef.current) {
          containerRef.current.appendChild(renderer.domElement);
        }

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

        // Load geometry from MuJoCo model
        const bodies: Record<number, THREE.Group> = {};
        const bodiesObj: Record<number, THREE.Group> = {};

        // Helper function to get position from MuJoCo buffer
        const getPos = (
          buffer: Float32Array | Float64Array,
          index: number,
        ): [number, number, number] => {
          return [
            buffer[index * 3 + 0],
            buffer[index * 3 + 2], // Y and Z swapped
            -buffer[index * 3 + 1],
          ];
        };

        // Helper function to get quaternion from MuJoCo buffer
        const getQuat = (
          buffer: Float32Array | Float64Array,
          index: number,
        ): [number, number, number, number] => {
          return [
            -buffer[index * 4 + 1],
            -buffer[index * 4 + 3],
            buffer[index * 4 + 2],
            -buffer[index * 4 + 0],
          ];
        };

        // Create bodies and geometries
        for (let g = 0; g < model.ngeom; g++) {
          const bodyId = model.geom_bodyid[g];
          const geomType = model.geom_type[g];
          const size = [
            model.geom_size[g * 3 + 0],
            model.geom_size[g * 3 + 1],
            model.geom_size[g * 3 + 2],
          ];

          // Get color
          const rgba = [
            model.geom_rgba[g * 4 + 0],
            model.geom_rgba[g * 4 + 1],
            model.geom_rgba[g * 4 + 2],
            model.geom_rgba[g * 4 + 3],
          ];

          if (!bodies[bodyId]) {
            bodies[bodyId] = new THREE.Group();
            bodiesObj[bodyId] = bodies[bodyId];
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
              // Use cylinder as fallback for CapsuleGeometry (not available in all three.js versions)
              geometry = new THREE.CylinderGeometry(
                size[0],
                size[0],
                size[1] * 2,
                16,
              );
              break;
            case 5: // mjGEOM_CYLINDER
              geometry = new THREE.CylinderGeometry(
                size[0],
                size[0],
                size[1] * 2,
                16,
              );
              break;
            case 6: // mjGEOM_BOX
              geometry = new THREE.BoxGeometry(
                size[0] * 2,
                size[2] * 2,
                size[1] * 2,
              );
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

          // Set position and rotation from geom
          const pos = getPos(model.geom_pos, g);
          mesh.position.set(pos[0], pos[1], pos[2]);

          const quat = getQuat(model.geom_quat, g);
          mesh.quaternion.set(quat[0], quat[1], quat[2], quat[3]);

          bodies[bodyId].add(mesh);
        }

        bodiesRef.current = bodies;

        // Animation loop
        function animate(timeMS: number) {
          if (!mounted || !sceneRef.current || !rendererRef.current) return;

          controls.update();

          if (!paused && model && data && mujocoRef.current) {
            const timestep = model.opt.timestep;
            if (timeMS - mujocoTimeRef.current > 35.0) {
              mujocoTimeRef.current = timeMS;
            }

            while (mujocoTimeRef.current < timeMS) {
              mujocoRef.current.mj_step(model, data);
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

        mujocoTimeRef.current = performance.now();
        animate(performance.now());

        setIsLoading(false);
      } catch (err) {
        console.error("MuJoCo initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to load MuJoCo");
        setIsLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && containerRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (dataRef.current) {
        dataRef.current.delete();
      }
      if (modelRef.current) {
        modelRef.current.delete();
      }
      controlsRef.current?.dispose();
    };
  }, [modelUrl, modelXml, width, height, paused]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 ${className}`}
      >
        <p className="text-sm">Error: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          加载模拟中...
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
      style={{ width, height }}
    />
  );
}

