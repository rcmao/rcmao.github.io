import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { ACESFilmicToneMapping, BackSide, Box3, Color, Group, Vector3 } from "three";
import { playAquariumBubbleSound } from "../audio/bubblePop";
import { playWin7NavigationClick } from "../audio/win7Click";
import { pickRandomAquariumLine } from "../data/aquariumBubbles";
import { publicAssetUrl } from "../lib/publicAssetUrl";

function usePreferDeskLite(): boolean {
  const compute = (): boolean => {
    if (typeof window === "undefined") {
      return false;
    }
    const w = window.innerWidth;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    return w <= 900 || (coarsePointer && w <= 1200);
  };

  const [deskLite, setDeskLite] = useState<boolean>(compute);

  useEffect(() => {
    const onResize = (): void => {
      setDeskLite(compute());
    };
    window.addEventListener("resize", onResize);
    const mq = window.matchMedia("(pointer: coarse)");
    mq.addEventListener("change", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", onResize);
    };
  }, []);

  return deskLite;
}

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
function FrutigerRoomBackdrop({ dense }: { dense: boolean }) {
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

  const radius = 72;
  const widthSegments = dense ? 64 : 32;
  const heightSegments = dense ? 48 : 24;

  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <sphereGeometry args={[radius, widthSegments, heightSegments]} />
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
  const { scene } = useGLTF(path, false, true);

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
      <Suspense fallback={null}>
        <NormalizedModel path={publicAssetUrl("/models/imac_g3.glb")} targetSize={0.82} rotation={[0, Math.PI, 0]} />
      </Suspense>
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
      <Suspense fallback={null}>
        <NormalizedModel path={publicAssetUrl("/models/ipod_nano.glb")} targetSize={0.28} rotation={[Math.PI / 2, 0, Math.PI / 2]} />
      </Suspense>
    </group>
  );
}

function Aquarium({
  transform,
  isActive,
  onHoverChange,
  modelReady,
}: {
  transform: TransformValue;
  isActive: boolean;
  onHoverChange: (isHovering: boolean) => void;
  modelReady: boolean;
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
      {modelReady ? (
        <Suspense fallback={null}>
          <NormalizedModel path={publicAssetUrl("/models/aquariumtank.glb")} targetSize={0.46} rotation={[0, 0, 0]} />
        </Suspense>
      ) : null}
    </group>
  );
}

/** Tracks drei/three queued loads so large GLBs stay behind a readable overlay until done (or stalled). */
function DesktopAssetLoadingOverlay({ lite }: { lite?: boolean }) {
  const { active, progress, errors } = useProgress();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let fadeOutTimer: ReturnType<typeof window.setTimeout>;
    if (active) {
      setMounted(true);
    } else {
      fadeOutTimer = window.setTimeout(() => setMounted(false), 380);
    }
    return () => window.clearTimeout(fadeOutTimer);
  }, [active]);

  const [slowHintVisible, setSlowHintVisible] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlowHintVisible(false);
      return;
    }
    const slowTimer = window.setTimeout(() => setSlowHintVisible(true), 22_000);
    return () => window.clearTimeout(slowTimer);
  }, [active]);

  if (!mounted) {
    return null;
  }

  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  const hasErrors = errors.length > 0;

  return (
    <div
      className={`desktop-scene-loading${active ? "" : " desktop-scene-loading--leaving"}${lite ? " desktop-scene-loading--desk-lite" : ""}`}
      aria-busy={active}
      aria-live="polite"
    >
      <p className="desktop-scene-loading-title">
        {hasErrors ? "Couldn't load assets" : "Loading scene & models"}
      </p>
      <div className="desktop-scene-loading-track" aria-hidden="true">
        <div className="desktop-scene-loading-bar" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <span className="desktop-scene-loading-pct">{hasErrors ? "—" : `${pct}%`}</span>
      {slowHintVisible && !hasErrors ? (
        <p className="desktop-scene-loading-slow">
          Taking a while? Your connection may be slow—give it time or refresh the page.
        </p>
      ) : null}
      {hasErrors ? (
        <p className="desktop-scene-loading-err">{`${errors.length} asset(s) failed to load. Refresh and try again.`}</p>
      ) : null}
    </div>
  );
}

function Desk({ lite }: { lite: boolean }) {
  return (
    <group position={[0, -0.12, 0]}>
      <mesh receiveShadow castShadow={!lite}>
        <boxGeometry args={[4.05, 0.12, 1.9]} />
        {lite ? (
          <meshStandardMaterial
            color="#f0fbff"
            roughness={0.35}
            metalness={0.06}
            transparent
            opacity={0.9}
          />
        ) : (
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
        )}
      </mesh>
      {[
        [-1.82, -0.68, -0.82],
        [1.82, -0.68, -0.82],
        [-1.82, -0.68, 0.82],
        [1.82, -0.68, 0.82],
      ].map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} castShadow={!lite} position={[x, y, z]}>
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
  const deskLite = usePreferDeskLite();
  const layout = useMemo(() => cloneSceneLayout(defaultLayout), []);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget>(null);
  const [aquariumModelReady, setAquariumModelReady] = useState(!deskLite);

  useEffect(() => {
    if (!deskLite) {
      setAquariumModelReady(true);
      return;
    }
    setAquariumModelReady(false);
    const t = window.setTimeout(() => setAquariumModelReady(true), 550);
    return () => window.clearTimeout(t);
  }, [deskLite]);

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
        shadows={deskLite ? false : true}
        dpr={1}
        style={{ display: "block", width: "100%", height: "100%" }}
        gl={{
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.02,
          powerPreference: deskLite ? "low-power" : "high-performance",
        }}
      >
        <FrutigerRoomBackdrop dense={!deskLite} />
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
        {!deskLite ? <Environment preset="studio" environmentIntensity={0.38} background={false} /> : null}
        <hemisphereLight
          intensity={deskLite ? 0.62 : 0.48}
          color="#f3f8ff"
          groundColor="#e8f0eb"
        />
        <ambientLight intensity={deskLite ? 0.42 : 0.24} color="#f2f7fc" />
        <directionalLight
          position={[-3.0, 6.2, 4.2]}
          intensity={deskLite ? 1.06 : 0.74}
          color="#fffcf8"
          castShadow={deskLite ? false : true}
          shadow-mapSize={deskLite ? [512, 512] : ([2048, 2048] as const)}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        {!deskLite ? (
          <rectAreaLight position={[0.12, 3.42, 1.75]} width={6.0} height={3.2} intensity={0.72} color="#f4f9ff" />
        ) : null}

        <Desk lite={deskLite} />

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
            modelReady={aquariumModelReady}
          />
        </group>

        {!deskLite ? <ContactShadows opacity={0.14} scale={7.5} blur={5} far={5} position={[0, -1.02, 0]} /> : null}
      </Canvas>

      <DesktopAssetLoadingOverlay lite={deskLite} />

      <div className="begin-hint is-ready">Drag to rotate · Scroll to zoom</div>
    </div>
  );
}

export default DesktopScene;
