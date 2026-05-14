import { publicAssetUrl } from "../lib/publicAssetUrl";

export type DeskTrack = {
  id: string;
  title: string;
  artist: string;
  src: string;
  coverSrc: string;
};

export const DESK_PLAYLIST: DeskTrack[] = [
  {
    id: "ishikawa-adventurer-rest",
    title: "冒険者の休息 ～無人島開拓～",
    artist: "石川大樹",
    src: publicAssetUrl("/bgm/daiki-ishikawa-adventurer-rest.mp3"),
    coverSrc: publicAssetUrl("/bgm/ishikawa-cover.jpg"),
  },
];
