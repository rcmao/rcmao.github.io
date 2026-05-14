import { publicAssetUrl } from "../lib/publicAssetUrl";

export type ModelKind = "crt" | "cd" | "books" | "decor";

export type ModelPlacement = {
  id: ModelKind;
  label: string;
  path: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

export const modelPlacements: ModelPlacement[] = [
  {
    id: "crt",
    label: "复古 CRT 电脑",
    path: publicAssetUrl("/models/crt-computer.glb"),
    position: [0.18, 0.34, -0.18],
    rotation: [0, -0.08, 0],
    scale: 0.72,
  },
  {
    id: "cd",
    label: "CD 播放机",
    path: publicAssetUrl("/models/cd-player.glb"),
    position: [-1.38, 0.2, 0.18],
    rotation: [0, 0.1, 0],
    scale: 0.48,
  },
  {
    id: "books",
    label: "论文书本",
    path: publicAssetUrl("/models/books.glb"),
    position: [-2.0, 0.26, 0.78],
    rotation: [0, 0.18, -0.06],
    scale: 0.92,
  },
  {
    id: "decor",
    label: "小摆件",
    path: publicAssetUrl("/models/decor.glb"),
    position: [-2.55, 0.44, -0.78],
    rotation: [0, 0.24, 0],
    scale: 0.74,
  },
];
