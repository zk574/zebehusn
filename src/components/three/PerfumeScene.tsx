"use client";
/**
 * Real-time 3D perfume bottle, built procedurally (no external model needed).
 * mode="assembly"  → parts float apart and assemble as `progress` goes 0 → 1 (scroll-driven)
 * mode="showcase"  → fully assembled, user can drag / touch to rotate
 * A GLB can replace the procedural bottle later via `modelUrl` (admin upload).
 */
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows, Environment, Lightformer, PresentationControls, RoundedBox, Sparkles, useGLTF, Center,
} from "@react-three/drei";
import { Suspense, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

export type Quality = "high" | "low";

interface SceneProps {
  offsetX?: number; // shifts the product sideways (desktop hero layout)
  offsetY?: number;
  scale?: number;
  mode: "assembly" | "showcase";
  progress?: MutableRefObject<number>;
  quality: Quality;
  liquid?: string;
  active?: boolean; // pause rendering when off-screen
  modelUrl?: string;
}

export default function PerfumeScene({ mode, progress, quality, liquid = "#b8742a", active = true, modelUrl, offsetX = 0, offsetY = -0.2, scale = 0.85 }: SceneProps) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: quality === "high", powerPreference: "high-performance", alpha: false }}
      camera={{ position: [0, 0.2, 8], fov: 32 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 9, 16]} />

      <ambientLight intensity={0.15} />
      <spotLight position={[4, 6, 3]} angle={0.4} penumbra={1} intensity={60} color="#ffe2a8" />
      <spotLight position={[-5, 2, -3]} angle={0.5} penumbra={1} intensity={40} color="#c9a45c" />
      <pointLight position={[0, -1.5, 2.5]} intensity={4} color="#e8cf96" />

      <Suspense fallback={null}>
        <Environment resolution={quality === "high" ? 256 : 64} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 2]} scale={[8, 1.5, 1]} color="#fff4dc" />
          <Lightformer form="rect" intensity={2} position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color="#c9a45c" />
          <Lightformer form="rect" intensity={2} position={[5, 1, 0]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} color="#ffffff" />
          <Lightformer form="ring" intensity={1.5} position={[0, 0, -6]} scale={4} color="#e8cf96" />
        </Environment>

        <PresentationControls
          global={mode === "showcase"}
          cursor={mode === "showcase"}
          snap={mode === "assembly"}
          speed={1.4}
          rotation={[0, 0, 0]}
          polar={[-0.35, 0.35]}
          azimuth={mode === "showcase" ? [-Infinity, Infinity] : [-0.6, 0.6]}
        >
          <group position={[offsetX, offsetY, 0]} scale={scale}>
          {modelUrl ? (
            <Center><GLBModel url={modelUrl} /></Center>
          ) : (
            <Bottle mode={mode} progress={progress} quality={quality} liquid={liquid} />
          )}
          </group>
        </PresentationControls>

        <ContactShadows position={[0, -1.75, 0]} opacity={0.65} scale={8} blur={2.6} far={3} color="#000" frames={quality === "high" ? Infinity : 1} />
        <Sparkles count={quality === "high" ? 70 : 25} scale={[7, 5, 4]} size={2} speed={0.25} color="#e8cf96" opacity={0.6} />
      </Suspense>
    </Canvas>
  );
}

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

/* ───────────────────────── Procedural bottle ───────────────────────── */

type Part = {
  key: string;
  assembled: [number, number, number];
  exploded: [number, number, number];
  explodedRot: [number, number, number];
  start: number; // progress at which this part starts moving home
};

// Each part flies home in sequence — glass body first, cap last.
const PARTS: Part[] = [
  { key: "body", assembled: [0, -0.35, 0], exploded: [0, -0.35, 0], explodedRot: [0.2, -0.6, 0.1], start: 0.0 },
  { key: "liquid", assembled: [0, -0.52, 0], exploded: [-2.6, -1.4, 0.8], explodedRot: [0.6, 0.8, -0.4], start: 0.08 },
  { key: "tube", assembled: [0, -0.2, 0], exploded: [2.4, 1.6, -0.8], explodedRot: [0.3, 0, 1.2], start: 0.18 },
  { key: "label", assembled: [0, -0.4, 0.47], exploded: [-2.2, 1.1, 1.4], explodedRot: [-0.5, 1.2, 0.3], start: 0.28 },
  { key: "collar", assembled: [0, 0.82, 0], exploded: [2.6, -0.8, 1.2], explodedRot: [1.2, 0.4, 0.6], start: 0.38 },
  { key: "pump", assembled: [0, 1.06, 0], exploded: [-1.6, 2.2, -0.6], explodedRot: [-0.8, 0, 1.4], start: 0.48 },
  { key: "nozzle", assembled: [0, 1.2, 0], exploded: [1.4, 2.5, 1.0], explodedRot: [0, 2.2, -1.0], start: 0.56 },
  { key: "cap", assembled: [0, 1.48, 0], exploded: [0, 3.4, 0.4], explodedRot: [0.9, 1.6, -0.5], start: 0.64 },
];
const SPAN = 0.26;

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function Bottle({ mode, progress, quality, liquid }: { mode: SceneProps["mode"]; progress?: MutableRefObject<number>; quality: Quality; liquid: string }) {
  const root = useRef<THREE.Group>(null);
  const smooth = useRef(mode === "showcase" ? 1 : 0);

  const mats = useMemo(() => {
    const gold = new THREE.MeshStandardMaterial({ color: "#d4ae62", metalness: 1, roughness: 0.22 });
    const blackLacquer = new THREE.MeshPhysicalMaterial({ color: "#0b0b0c", metalness: 0.4, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 });
    const glass =
      quality === "high"
        ? new THREE.MeshPhysicalMaterial({ color: "#fff8ee", transmission: 1, thickness: 0.9, roughness: 0.04, ior: 1.5, clearcoat: 1, attenuationColor: new THREE.Color("#f3e3c4"), attenuationDistance: 3 })
        : new THREE.MeshPhysicalMaterial({ color: "#f5ead6", transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, clearcoat: 1 });
    const liq = new THREE.MeshPhysicalMaterial({ color: liquid, roughness: 0.1, transmission: quality === "high" ? 0.6 : 0, transparent: quality !== "high", opacity: quality === "high" ? 1 : 0.85, emissive: liquid, emissiveIntensity: 0.15 });
    const tube = new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.5, roughness: 0.2 });
    return { gold, blackLacquer, glass, liq, tube };
  }, [quality, liquid]);

  const tmpV = useMemo(() => new THREE.Vector3(), []);
  const tmpA = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const target = mode === "showcase" ? 1 : progress?.current ?? 0;
    // Remap: 0–0.9 of scroll assembles, final 10% holds the finished bottle.
    smooth.current = THREE.MathUtils.damp(smooth.current, clamp01(target / 0.9), 4, dt);
    const p = smooth.current;
    const time = state.clock.elapsedTime;

    for (const part of PARTS) {
      const g = root.current?.getObjectByName(part.key);
      if (!g) continue;
      const t = ease(clamp01((p - part.start) / SPAN));
      const float = (1 - t) * 0.12;
      tmpV.set(...part.exploded).lerp(tmpA.set(...part.assembled), t);
      g.position.set(tmpV.x, tmpV.y + Math.sin(time * 1.2 + part.start * 20) * float, tmpV.z);
      g.rotation.set(part.explodedRot[0] * (1 - t), part.explodedRot[1] * (1 - t) + time * 0.3 * (1 - t), part.explodedRot[2] * (1 - t));
    }
    if (root.current) {
      const done = clamp01((p - 0.85) / 0.15);
      root.current.rotation.y = p * Math.PI * 1.2 + time * 0.25 * done;
      root.current.position.y = Math.sin(time * 0.8) * 0.04;
    }
  });

  return (
    <group ref={root} scale={1.05}>
      <group name="body">
        <RoundedBox args={[1.5, 2.2, 0.9]} radius={0.16} smoothness={quality === "high" ? 6 : 3} material={mats.glass} />
      </group>
      <group name="liquid">
        <RoundedBox args={[1.32, 1.7, 0.72]} radius={0.12} smoothness={3} material={mats.liq} />
      </group>
      <group name="tube">
        <mesh material={mats.tube}><cylinderGeometry args={[0.025, 0.025, 2.0, 8]} /></mesh>
      </group>
      <group name="label">
        <mesh material={mats.blackLacquer}><boxGeometry args={[0.82, 0.46, 0.02]} /></mesh>
        <mesh material={mats.gold} position={[0, 0, 0.012]}><boxGeometry args={[0.74, 0.012, 0.005]} /></mesh>
        <mesh material={mats.gold} position={[0, -0.12, 0.012]}><boxGeometry args={[0.5, 0.008, 0.005]} /></mesh>
        <mesh material={mats.gold} position={[0, 0.12, 0.012]}><boxGeometry args={[0.5, 0.008, 0.005]} /></mesh>
      </group>
      <group name="collar">
        <mesh material={mats.gold}><cylinderGeometry args={[0.3, 0.34, 0.26, 48]} /></mesh>
        <mesh material={mats.gold} position={[0, -0.14, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.34, 0.025, 12, 48]} /></mesh>
      </group>
      <group name="pump">
        <mesh material={mats.gold}><cylinderGeometry args={[0.13, 0.15, 0.22, 32]} /></mesh>
      </group>
      <group name="nozzle">
        <mesh material={mats.gold}><cylinderGeometry args={[0.17, 0.17, 0.14, 32]} /></mesh>
        <mesh material={mats.blackLacquer} position={[0, 0, 0.17]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.04, 12]} /></mesh>
      </group>
      <group name="cap">
        <RoundedBox args={[0.95, 0.78, 0.95]} radius={0.08} smoothness={4} position={[0, 0.25, 0]} material={mats.blackLacquer} />
        <mesh material={mats.gold} position={[0, -0.12, 0]}><boxGeometry args={[0.97, 0.05, 0.97]} /></mesh>
      </group>
    </group>
  );
}
