import { Html } from "@react-three/drei";
import { Suspense, type ReactNode } from "react";
import { MESSAGE_TREE_LABEL } from "../data/messageTree";

export const SAKURA_GLB_PATH = "/models/sakura.glb";
export const SAKURA_MODEL_TARGET_SIZE = 11.4;

const SAKURA_GROUP_POSITION: [number, number, number] = [0.92, -1.4, -2.28];
const SAKURA_GROUP_ROTATION: [number, number, number] = [0, 0.38, 0];
/** Label near the trunk (~lower third of the scaled tree). */
const TRUNK_HTML_POSITION: [number, number, number] = [0.1, 3.32, 0.14];

type SakuraGuestbookProps = {
  deskLite: boolean;
  isActive: boolean;
  onHoverChange: (hovering: boolean) => void;
  onOpenPanel: () => void;
  children: ReactNode;
};

export function SakuraGuestbook({
  deskLite,
  isActive,
  onHoverChange,
  onOpenPanel,
  children,
}: SakuraGuestbookProps) {
  return (
    <group position={SAKURA_GROUP_POSITION} rotation={SAKURA_GROUP_ROTATION}>
      <Suspense fallback={null}>{children}</Suspense>
      <mesh
        position={[0, 3.35, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverChange(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverChange(false);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onOpenPanel();
        }}
      >
        <boxGeometry args={[2.5, 6.4, 2.35]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html
        position={TRUNK_HTML_POSITION}
        center
        distanceFactor={deskLite ? 4.35 : 4.65}
        className="sakura-guestbook-html"
        style={{ pointerEvents: "none" }}
      >
        <span className={`scene-hotspot-hint ${isActive ? "is-active" : ""}`}>{MESSAGE_TREE_LABEL}</span>
      </Html>
    </group>
  );
}
