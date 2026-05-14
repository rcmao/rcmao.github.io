import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, Suspense, type ReactNode } from "react";
import { ACESFilmicToneMapping, BackSide, Box3, Color, Group, Object3D, Vector3 } from "three";
import type { Mesh } from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { SkeletonUtils } from "three-stdlib";
import { playAquariumBubbleSound } from "../audio/bubblePop";
import { playDogBarkSound } from "../audio/dogBark";
import { playWin7NavigationClick } from "../audio/win7Click";
import { pickRandomAquariumLine } from "../data/aquariumBubbles";
import { CHAICHAI_NAME_STORAGE_KEY, chaichaiDialog } from "../data/chaichaiDialog";
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

type HoverTarget = "aquarium" | "cd" | "chaichai" | "computer" | null;
type LayoutItem = "computer" | "cd" | "plant";
type TransformValue = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};
type SceneLayout = Record<LayoutItem, TransformValue>;

const cameraTarget = [0, 0.2, 0] as const;
const defaultLayout: SceneLayout = {
  computer: {
    position: [0.38, -0.06, -0.28],
    rotation: [0, -1.584, 0],
    scale: 1.360489,
  },
  cd: {
    position: [1.88, 0.06, 0.72],
    rotation: [0, -0.434, 0],
    scale: 0.925926,
  },
  plant: {
    position: [-1.58, -0.06, -0.5],
    rotation: [0, 1.256, 0],
    scale: 1.259712,
  },
};

/** Hand-tuned floor pose for the Shiba model. */
const shibaLayout: TransformValue = {
  position: [-1.5148323878446326, -1.538503407935737, 1.6847537645411534],
  rotation: [0, 0.06753345786340563, 0],
  scale: 1,
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

  const radius = 86;
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

/** Reliable AABB for rigs: `setFromObject` is wrong on SkinnedMesh and can explode scale. */
function unionGeometryWorldBox(root: Object3D): Box3 | null {
  root.updateMatrixWorld(true);
  const acc = new Box3();
  let has = false;
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh || !mesh.geometry) {
      return;
    }
    const geom = mesh.geometry;
    if (!geom.boundingBox) {
      geom.computeBoundingBox();
    }
    if (!geom.boundingBox || geom.boundingBox.isEmpty()) {
      return;
    }
    const local = geom.boundingBox.clone();
    local.applyMatrix4(mesh.matrixWorld);
    if (!has) {
      acc.copy(local);
      has = true;
    } else {
      acc.union(local);
    }
  });
  return has ? acc : null;
}

/** Like NormalizedModel but clones rigged GLTFs correctly (SkinnedMesh / skeleton). */
function NormalizedSkinnedModel({
  path,
  targetSize,
  rotation = [0, 0, 0],
}: {
  path: string;
  targetSize: number;
  rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(path, false, false);

  const scaledRoot = useMemo(() => {
    const model = SkeletonUtils.clone(scene);
    model.traverse((object) => {
      if ("isMesh" in object) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    model.position.set(0, 0, 0);
    model.scale.set(1, 1, 1);

    const box = unionGeometryWorldBox(model);
    const holder = new Group();
    holder.add(model);

    if (!box || box.isEmpty()) {
      holder.scale.setScalar(targetSize * 0.03);
      return holder;
    }

    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    let maxDimension = Math.max(size.x, size.y, size.z);
    if (maxDimension < 1e-5) {
      maxDimension = Math.max(geomFallbackMaxDim(model), 1e-4);
    }

    model.position.sub(center);
    holder.scale.setScalar(targetSize / maxDimension);
    holder.updateMatrixWorld(true);

    const placed = unionGeometryWorldBox(holder);
    if (placed) {
      const minY = placed.min.y;
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

function geomFallbackMaxDim(model: Object3D): number {
  let m = 0;
  model.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh || !mesh.geometry) {
      return;
    }
    const g = mesh.geometry;
    if (!g.boundingBox) {
      g.computeBoundingBox();
    }
    if (!g.boundingBox) {
      return;
    }
    const s = g.boundingBox.getSize(new Vector3());
    m = Math.max(m, s.x, s.y, s.z);
  });
  return m;
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
  largeTapTarget,
}: {
  transform: TransformValue;
  isActive: boolean;
  onHoverChange: (isHovering: boolean) => void;
  modelReady: boolean;
  largeTapTarget: boolean;
}) {
  const [bubbleLine, setBubbleLine] = useState<string | null>(null);

  const hitDims = largeTapTarget ? ([0.56, 0.58, 0.54] as const) : ([0.4, 0.42, 0.38] as const);

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
      <group
        onPointerDown={(event) => {
          event.stopPropagation();
          onHoverChange(true);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHoverChange(true);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onHoverChange(false);
        }}
      >
        <Html position={[0, 0.48, 0]} center distanceFactor={4.6} style={{ pointerEvents: "none" }}>
          <div className="aquarium-hotspot-stack">
            <span className={`scene-hotspot-hint ${isActive ? "is-active" : ""}`}>Aquarium</span>
            {bubbleLine ? (
              <div className={`scene-comic-bubble scene-comic-bubble--glass ${isActive ? "is-open" : "is-closing"}`}>
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
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[...hitDims]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {modelReady ? (
          <Suspense fallback={null}>
            <NormalizedModel path={publicAssetUrl("/models/aquariumtank.glb")} targetSize={0.46} rotation={[0, 0, 0]} />
          </Suspense>
        ) : null}
      </group>
    </group>
  );
}

function ShibaModel({ targetSize }: { targetSize: number }) {
  return (
    <Suspense fallback={null}>
      <NormalizedSkinnedModel
        path={publicAssetUrl("/models/shiba_inu_texture_updated.glb")}
        targetSize={targetSize}
        rotation={[0, 0, 0]}
      />
    </Suspense>
  );
}

type ChaichaiDogProps = {
  isActive: boolean;
  onHoverChange: (hovering: boolean) => void;
};

/** Highlights pet names inside a single line of dialog copy. */
function highlightPetNamesInLine(line: string, lineKey: string): ReactNode {
  const parts = line.split(/(Chaichai|xiaojinzi)/gi);
  return parts.map((part, i) => {
    if (/^xiaojinzi$/i.test(part)) {
      return (
        <span key={`${lineKey}-p-${i}`} className="pet-name pet-name--xiaojinzi">
          {part}
        </span>
      );
    }
    if (/^chaichai$/i.test(part)) {
      return (
        <span key={`${lineKey}-p-${i}`} className="pet-name pet-name--chaichai">
          {part}
        </span>
      );
    }
    return part;
  });
}

function ChaichaiDog({ isActive, onHoverChange }: ChaichaiDogProps) {
  const wagRef = useRef<Group>(null);
  const hoverSoundGateRef = useRef(false);
  const [isHovering, setIsHovering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPhase, setDialogPhase] = useState<"menu" | "response">("menu");
  const [responseText, setResponseText] = useState<string | null>(null);
  const [farewellResponse, setFarewellResponse] = useState(false);
  const [nameRevealed, setNameRevealed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(CHAICHAI_NAME_STORAGE_KEY) === "1";
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogPhase("menu");
    setResponseText(null);
    setFarewellResponse(false);
  };

  useFrame(({ clock }) => {
    const g = wagRef.current;
    if (!g) {
      return;
    }
    const wag = isHovering || dialogOpen ? Math.sin(clock.elapsedTime * 5.2) * 0.055 : 0;
    g.rotation.z = wag;
  });

  return (
    <group position={shibaLayout.position} rotation={shibaLayout.rotation} scale={shibaLayout.scale}>
      <group
        onPointerOver={(event) => {
          event.stopPropagation();
          setIsHovering(true);
          onHoverChange(true);
          if (!hoverSoundGateRef.current) {
            hoverSoundGateRef.current = true;
            playDogBarkSound();
          }
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setIsHovering(false);
          onHoverChange(false);
          hoverSoundGateRef.current = false;
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (dialogOpen) {
            return;
          }
          playWin7NavigationClick();
          setDialogOpen(true);
          setDialogPhase("menu");
          setResponseText(null);
          setFarewellResponse(false);
        }}
      >
        <group ref={wagRef}>
          <ShibaModel targetSize={0.013} />
        </group>
        <Html position={[0, 0.28, 0]} center distanceFactor={8.4} style={{ pointerEvents: "none" }}>
          <div className="chaichai-hotspot-stack" style={{ pointerEvents: dialogOpen ? "auto" : "none" }}>
            <span className={`scene-hotspot-hint ${isActive ? "is-active" : ""}`}>
              {nameRevealed ? (
                <span className="pet-name pet-name--chaichai">Chaichai</span>
              ) : (
                "a dog"
              )}
            </span>
            {isHovering && !dialogOpen ? (
              <div className="scene-comic-bubble scene-comic-bubble--glass is-open">
                <div className="scene-comic-bubble-inner">
                  <span className="scene-comic-bubble-emoji" aria-hidden>
                    🐕
                  </span>
                  <p className="scene-comic-bubble-text">{chaichaiDialog.hoverTeaser}</p>
                </div>
                <div className="scene-comic-bubble-tail" aria-hidden />
              </div>
            ) : null}
            {dialogOpen ? (
              <div
                className="chaichai-dialog"
                role="dialog"
                aria-label="Chaichai"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <div className="chaichai-dialog-header">
                  <span className="chaichai-dialog-title">
                    Ruochen&apos;s lab · <span className="pet-name pet-name--chaichai">Chaichai</span>
                  </span>
                  <button
                    type="button"
                    className="chaichai-dialog-close"
                    aria-label="Close"
                    onClick={() => {
                      playWin7NavigationClick();
                      closeDialog();
                    }}
                  >
                    ×
                  </button>
                </div>
                {dialogPhase === "menu" ? (
                  <>
                    <p className="chaichai-dialog-intro">{chaichaiDialog.initial}</p>
                    <ul className="chaichai-dialog-options">
                      {chaichaiDialog.options.map((opt) => (
                        <li key={opt.label}>
                          <button
                            type="button"
                            className="chaichai-dialog-option"
                            onClick={() => {
                              playWin7NavigationClick();
                              if (opt.revealsName) {
                                setNameRevealed(true);
                                window.localStorage.setItem(CHAICHAI_NAME_STORAGE_KEY, "1");
                              }
                              setResponseText(opt.response);
                              setFarewellResponse(!!opt.close);
                              setDialogPhase("response");
                              if (opt.close) {
                                window.setTimeout(() => {
                                  closeDialog();
                                }, 1800);
                              }
                            }}
                          >
                            {opt.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="chaichai-dialog-response-block">
                    <p className="chaichai-dialog-response">
                      {responseText?.split("\n").map((line, i, arr) => (
                        <span key={`ln-${i}`}>
                          {highlightPetNamesInLine(line, `ln-${i}`)}
                          {i < arr.length - 1 ? <br /> : null}
                        </span>
                      ))}
                    </p>
                    {!farewellResponse ? (
                      <button
                        type="button"
                        className="chaichai-dialog-back"
                        onClick={() => {
                          playWin7NavigationClick();
                          setDialogPhase("menu");
                          setResponseText(null);
                          setFarewellResponse(false);
                        }}
                      >
                        Ask something else
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </Html>
      </group>
    </group>
  );
}

/** Tracks drei/three queued loads so large GLBs stay behind a readable overlay until done (or stalled). */
function DesktopAssetLoadingOverlay({ lite }: { lite?: boolean }) {
  const { active, progress, errors } = useProgress();
  const [mounted, setMounted] = useState(false);
  const hadLoadingRef = useRef(false);
  /** After the first loading burst completes, never block the canvas again (e.g. follow-up HDR/env loads). */
  const [barrierLifted, setBarrierLifted] = useState(false);
  /** If one huge GLB stalls LoadingManager, don't block the desk forever. */
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  useEffect(() => {
    let fadeOutTimer: ReturnType<typeof window.setTimeout>;
    if (active) {
      hadLoadingRef.current = true;
      if (!barrierLifted) {
        setMounted(true);
      }
    } else if (hadLoadingRef.current) {
      if (!barrierLifted) {
        setBarrierLifted(true);
      }
      fadeOutTimer = window.setTimeout(() => setMounted(false), 380);
    }
    return () => window.clearTimeout(fadeOutTimer);
  }, [active, barrierLifted]);

  useEffect(() => {
    if (!active) {
      setLoadTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setLoadTimedOut(true), 8000);
    return () => window.clearTimeout(t);
  }, [active]);

  const [slowHintVisible, setSlowHintVisible] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlowHintVisible(false);
      return;
    }
    const slowMs = lite ? 10_000 : 14_000;
    const slowTimer = window.setTimeout(() => setSlowHintVisible(true), slowMs);
    return () => window.clearTimeout(slowTimer);
  }, [active, lite]);

  if (!mounted) {
    return null;
  }

  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  const hasErrors = errors.length > 0;
  const blocking = active && !loadTimedOut && !barrierLifted;

  return (
    <div
      className={`desktop-scene-loading${blocking ? "" : " desktop-scene-loading--leaving"}${lite ? " desktop-scene-loading--desk-lite" : ""}`}
      aria-busy={blocking}
      aria-live="polite"
    >
      <p className="desktop-scene-loading-title">
        {hasErrors
          ? "Couldn't load assets"
          : loadTimedOut && active
            ? "Still loading in the background…"
            : "Loading scene & models"}
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
        <boxGeometry args={[5.2, 0.12, 2.38]} />
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
        [-2.36, -0.68, -1.02],
        [2.36, -0.68, -1.02],
        [-2.36, -0.68, 1.02],
        [2.36, -0.68, 1.02],
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
  /** Defer the large Shiba GLB on mobile so smaller desk models can load & render first. */
  const [chaichaiModelReady, setChaichaiModelReady] = useState(!deskLite);

  useEffect(() => {
    if (!deskLite) {
      setAquariumModelReady(true);
      return;
    }
    setAquariumModelReady(false);
    const t = window.setTimeout(() => setAquariumModelReady(true), 550);
    return () => window.clearTimeout(t);
  }, [deskLite]);

  useEffect(() => {
    if (!deskLite) {
      setChaichaiModelReady(true);
      return;
    }
    setChaichaiModelReady(false);
    const t = window.setTimeout(() => setChaichaiModelReady(true), 1100);
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
        camera={{ position: [4.35, 2.12, 5.65], fov: 52 }}
        shadows={deskLite ? false : true}
        dpr={1}
        style={{ display: "block", width: "100%", height: "100%" }}
        gl={{
          antialias: !deskLite,
          alpha: false,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.02,
          powerPreference: deskLite ? "low-power" : "high-performance",
        }}
        onCreated={() => {
          RectAreaLightUniformsLib.init();
        }}
      >
        <FrutigerRoomBackdrop dense={!deskLite} />
        <fog attach="fog" args={["#eef1f7", 38, 96]} />
        <OrbitControls
          target={cameraTarget}
          enablePan={false}
          enableDamping
          dampingFactor={0.07}
          minDistance={2.35}
          maxDistance={32}
          minPolarAngle={0.38}
          maxPolarAngle={1.72}
        />
        <hemisphereLight
          intensity={deskLite ? 0.62 : 0.55}
          color="#f3f8ff"
          groundColor="#e8f0eb"
        />
        <ambientLight intensity={deskLite ? 0.42 : 0.34} color="#f2f7fc" />
        <directionalLight
          position={[-3.0, 6.2, 4.2]}
          intensity={deskLite ? 1.06 : 0.92}
          color="#fffcf8"
          castShadow={deskLite ? false : true}
          shadow-mapSize={deskLite ? [512, 512] : ([2048, 2048] as const)}
          shadow-camera-left={-6.8}
          shadow-camera-right={6.8}
          shadow-camera-top={6.8}
          shadow-camera-bottom={-6.8}
        />
        {!deskLite ? (
          <rectAreaLight position={[0.12, 3.55, 1.85]} width={7.2} height={3.5} intensity={0.72} color="#f4f9ff" />
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
            largeTapTarget={deskLite}
          />
          {chaichaiModelReady ? (
            <ChaichaiDog
              isActive={hoverTarget === "chaichai"}
              onHoverChange={(hovering) => setHoverTarget(hovering ? "chaichai" : null)}
            />
          ) : null}
        </group>

        {!deskLite ? <ContactShadows opacity={0.14} scale={10.2} blur={5} far={5} position={[0, -1.02, 0]} /> : null}
      </Canvas>

      <DesktopAssetLoadingOverlay lite={deskLite} />

      <div className="begin-hint is-ready">Drag to rotate · Scroll to zoom</div>
    </div>
  );
}

export default DesktopScene;
