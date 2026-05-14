import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { ACESFilmicToneMapping, BackSide, Box3, Color, Group, Vector3 } from "three";
import { playAquariumBubbleSound } from "../audio/bubblePop";
import { playWin7NavigationClick } from "../audio/win7Click";
import { pickRandomAquariumLine } from "../data/aquariumBubbles";

type DesktopSceneProps = {
  onEnterRetro: () => void;
  onOpenMusicPlayer: () => void;
  onOpenBook: () => void;
  onShowNote: () => void;
};

type HoverTarget = "aquarium" | "cd" | "computer" | null;
type LayoutItem = "computer" | "cd" | "plant";
type TransformValue = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};
type SceneLayout = Record<LayoutItem, TransformValue>;

const cameraTarget = [0, 0.22, 0] as const;
const defaultLayout: SceneLayout = {
  computer: {
    position: [0.25, -0.06, -0.19],
    rotation: [0, -1.584, 0],
    scale: 1.360489,
  },
  cd: {
    position: [1.46, 0.06, 0.566],
    rotation: [0, -0.434, 0],
    scale: 0.925926,
  },
  plant: {
    position: [-1.27, -0.06, -0.394],
    rotation: [0, 1.256, 0],
    scale: 1.259712,
  },
};

function cloneItemTransform(value: TransformValue): TransformValue {
  return {
    position: [...value.position],
    rotation: [...value.rotation],
    scale: value.scale,
  };
}

function cloneSceneLayout(layout: SceneLayout): SceneLayout {
  return {
    computer: cloneItemTransform(layout.computer),
    cd: cloneItemTransform(layout.cd),
    plant: cloneItemTransform(layout.plant),
  };
}

/** Soft white-forward studio room gradient + whisper Frutiger aqua on “walls”. */
function FrutigerRoomBackdrop() {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new Color("#ffffff") },
      uHorizon: { value: new Color("#f7f9fe") },
      uBottom: { value: new Color("#edf1f8") },
      uRim: { value: new Color("#d4e7f4") },
    }),
    [],
  );

  const vertexShader = `
    varying vec3 vN;
    void main() {
      vN = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uTop;
    uniform vec3 uHorizon;
    uniform vec3 uBottom;
    uniform vec3 uRim;
    varying vec3 vN;
    void main() {
      float h = vN.y * 0.5 + 0.5;
      vec3 base = mix(uBottom, uTop, smoothstep(0.0, 1.0, pow(h, 0.82)));
      float midBand = 1.0 - abs(vN.y * 1.15);
      midBand = smoothstep(0.15, 0.92, midBand);
      base = mix(base, uHorizon, midBand * 0.22);
      float wall = smoothstep(0.38, 1.0, length(vN.xz));
      float rimAmt = wall * (1.0 - smoothstep(0.55, 1.0, abs(vN.y))) * 0.13;
      base = mix(base, uRim, rimAmt);
      gl_FragColor = vec4(base, 1.0);
    }
  `;

  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <sphereGeometry args={[72, 64, 48]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function NormalizedModel({
  path,
  targetSize,
  rotation = [0, 0, 0],
}: {
  path: string;
  targetSize: number;
  rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(path);

  const scaledRoot = useMemo(() => {
    const model = scene.clone(true);
    model.traverse((object) => {
      if ("isMesh" in object) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    model.position.set(0, 0, 0);
    model.scale.set(1, 1, 1);

    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    const holder = new Group();
    holder.add(model);

    if (maxDimension > 0) {
      holder.scale.setScalar(targetSize / maxDimension);
      model.position.sub(center);
      holder.updateMatrixWorld(true);
      const normalizedBox = new Box3().setFromObject(holder);
      const minY = normalizedBox.min.y;
      model.position.y -= minY / holder.scale.x;
    }

    return holder;
  }, [scene, targetSize]);

  return (
    <group rotation={rotation}>
      <primitive object={scaledRoot} />
    </group>
  );
}

function Computer({
  transform,
  isActive,
  onClick,
  onHoverChange,
}: {
  transform: TransformValue;
  isActive: boolean;
  onClick: () => void;
  onHoverChange: (isHovering: boolean) => void;
}) {
  return (
    <group
      position={transform.position}
      rotation={transform.rotation}
      scale={transform.scale}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <Html
        position={[0, 0.88, 0]}
        center
        distanceFactor={4.6}
        style={{ pointerEvents: "none" }}
      >
        <span className={`scene-hotspot-hint ${isActive ? "is-active" : ""}`}>Ruochen's homepage</span>
      </Html>
      <mesh
        position={[0, 0.4, 0]}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHoverChange(true);
        }}
        onPointerOut={() => onHoverChange(false)}
      >
        <boxGeometry args={[0.82, 0.8, 0.7]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <NormalizedModel path="/models/imac_g3.glb" targetSize={0.82} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

function CdPlayer({
  transform,
  isActive,
  onClick,
  onHoverChange,
}: {
  transform: TransformValue;
  isActive: boolean;
  onClick: () => void;
  onHoverChange: (isHovering: boolean) => void;
}) {
  return (
    <group
      position={transform.position}
      rotation={transform.rotation}
      scale={transform.scale}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <Html
        position={[0, 0.24, 0]}
        center
        distanceFactor={4.6}
        style={{ pointerEvents: "none" }}
      >
        <span className={`scene-hotspot-hint ${isActive ? "is-active" : ""}`}>Music</span>
      </Html>
      <mesh
        position={[0, 0.09, 0]}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHoverChange(true);
        }}
        onPointerOut={() => onHoverChange(false)}
      >
        <boxGeometry args={[0.28, 0.17, 0.26]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <NormalizedModel path="/models/ipod_nano.glb" targetSize={0.28} rotation={[Math.PI / 2, 0, Math.PI / 2]} />
    </group>
  );
}

useGLTF.preload("/models/imac_g3.glb");
useGLTF.preload("/models/ipod_nano.glb");
useGLTF.preload("/models/aquariumtank.glb");

function Aquarium({
  transform,
  isActive,
  onHoverChange,
}: {
  transform: TransformValue;
  isActive: boolean;
  onHoverChange: (isHovering: boolean) => void;
}) {
  const [bubbleLine, setBubbleLine] = useState<string | null>(null);

  useEffect(() => {
    if (isActive) {
      setBubbleLine(pickRandomAquariumLine());
      playAquariumBubbleSound();
      return;
    }
    const t = window.setTimeout(() => setBubbleLine(null), 420);
    return () => window.clearTimeout(t);
  }, [isActive]);

  return (
    <group position={transform.position} rotation={transform.rotation} scale={transform.scale}>
      <Html position={[0, 0.48, 0]} center distanceFactor={4.6} style={{ pointerEvents: "none" }}>
        <div className="aquarium-hotspot-stack">
          <span className={`scene-hotspot-hint ${isActive ? "is-active" : ""}`}>Aquarium</span>
          {bubbleLine ? (
            <div className={`scene-comic-bubble ${isActive ? "is-open" : "is-closing"}`}>
              <div className="scene-comic-bubble-inner">
                <span className="scene-comic-bubble-fish" aria-hidden>
                  🐠
                </span>
                <p className="scene-comic-bubble-text">{bubbleLine}</p>
              </div>
              <div className="scene-comic-bubble-tail" aria-hidden />
            </div>
          ) : null}
        </div>
      </Html>
      <mesh
        position={[0, 0.14, 0]}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHoverChange(true);
        }}
        onPointerOut={() => onHoverChange(false)}
      >
        <boxGeometry args={[0.4, 0.42, 0.38]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <NormalizedModel path="/models/aquariumtank.glb" targetSize={0.46} rotation={[0, 0, 0]} />
    </group>
  );
}

function Desk() {
  return (
    <group position={[0, -0.12, 0]}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={[4.05, 0.12, 1.9]} />
        <meshPhysicalMaterial
          color="#eef9ff"
          roughness={0.26}
          metalness={0.02}
          transmission={0.18}
          thickness={0.28}
          transparent
          opacity={0.86}
          clearcoat={0.62}
          clearcoatRoughness={0.28}
        />
      </mesh>
      {[
        [-1.82, -0.68, -0.82],
        [1.82, -0.68, -0.82],
        [-1.82, -0.68, 0.82],
        [1.82, -0.68, 0.82],
      ].map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} castShadow position={[x, y, z]}>
          <boxGeometry args={[0.08, 1.2, 0.08]} />
          <meshStandardMaterial color="#e7f5fb" roughness={0.34} metalness={0.08} />
        </mesh>
      ))}
    </group>
  );
}

function DesktopScene({
  onEnterRetro,
  onOpenMusicPlayer,
}: DesktopSceneProps) {
  const layout = useMemo(() => cloneSceneLayout(defaultLayout), []);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>(null);

  const canvasShellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = canvasShellRef.current;
    if (!shell) {
      return;
    }

    const nudge = () => {
      window.dispatchEvent(new Event("resize"));
    };

    nudge();
    const ro = new ResizeObserver(() => nudge());
    ro.observe(shell);
    const frame = window.requestAnimationFrame(nudge);
    const delayed = window.setTimeout(nudge, 120);

    return () => {
      ro.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
    };
  }, []);

  return (
    <div className="canvas-shell" ref={canvasShellRef}>
      <Canvas
        camera={{ position: [3.1, 1.7, 3.7], fov: 45 }}
        shadows
        dpr={1}
        style={{ display: "block", width: "100%", height: "100%" }}
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.02 }}
      >
        <FrutigerRoomBackdrop />
        <fog attach="fog" args={["#eef1f7", 22, 58]} />
        <OrbitControls
          target={cameraTarget}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={2.65}
          maxDistance={7.5}
          minPolarAngle={0.72}
          maxPolarAngle={1.34}
        />
        <Environment preset="studio" environmentIntensity={0.38} background={false} />
        <hemisphereLight intensity={0.48} color="#f3f8ff" groundColor="#e8f0eb" />
        <ambientLight intensity={0.24} color="#f2f7fc" />
        <directionalLight
          position={[-3.0, 6.2, 4.2]}
          intensity={0.74}
          color="#fffcf8"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <rectAreaLight position={[0.12, 3.42, 1.75]} width={6.0} height={3.2} intensity={0.72} color="#f4f9ff" />

        <Desk />

        <Suspense fallback={null}>
          <group>
            <Computer
              transform={layout.computer}
              isActive={hoverTarget === "computer"}
              onClick={() => {
                playWin7NavigationClick();
                onEnterRetro();
              }}
              onHoverChange={(isHovering) => setHoverTarget(isHovering ? "computer" : null)}
            />
            <CdPlayer
              transform={layout.cd}
              isActive={hoverTarget === "cd"}
              onClick={onOpenMusicPlayer}
              onHoverChange={(isHovering) => setHoverTarget(isHovering ? "cd" : null)}
            />
            <Aquarium
              transform={layout.plant}
              isActive={hoverTarget === "aquarium"}
              onHoverChange={(isHovering) => setHoverTarget(isHovering ? "aquarium" : null)}
            />
          </group>
        </Suspense>

        <ContactShadows opacity={0.14} scale={7.5} blur={5} far={5} position={[0, -1.02, 0]} />
      </Canvas>

      <div className="begin-hint is-ready">Drag to rotate · Scroll to zoom</div>
    </div>
  );
}

export default DesktopScene;
