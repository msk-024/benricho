/**
 * デモを実装済みのキー一覧。新しい用語を追加する際、対応するデモが未実装だと
 * motionTerms.ts の demo フィールドで型エラーになるようにする(タイプミス・実装漏れの検出用)
 */
export type MotionDemoKey =
  | "ease"
  | "keyframe"
  | "stagger"
  | "fade"
  | "slidein"
  | "scale"
  | "spring"
  | "pingpong"
  | "antic"
  | "squash"
  | "follow"
  | "pan"
  | "tilt"
  | "zoom"
  | "dolly"
  | "xfade"
  | "wipe"
  | "parallax"
  | "skeleton"
  | "micro"
  | "toast";

/**
 * demoキーごとに .mg-stage へ追加するクラス(カメラワーク系は mg-frame で枠を重ねる)。
 * MotionDemo.tsx と同じファイルに置くとReact Fast Refreshの境界検出が壊れるため分離している。
 */
export function getMotionDemoStageClass(demoKey: MotionDemoKey): string {
  switch (demoKey) {
    case "ease":
      return "mg-ease";
    case "keyframe":
      return "mg-kf";
    case "stagger":
      return "mg-stagger";
    case "fade":
      return "mg-fade";
    case "slidein":
      return "mg-slidein";
    case "scale":
      return "mg-scale";
    case "spring":
      return "mg-spring";
    case "pingpong":
      return "mg-pingpong";
    case "antic":
      return "mg-antic";
    case "squash":
      return "mg-squash";
    case "follow":
      return "mg-follow";
    case "pan":
      return "mg-pan mg-frame";
    case "tilt":
      return "mg-tilt mg-frame";
    case "zoom":
      return "mg-zoom mg-frame";
    case "dolly":
      return "mg-dolly mg-frame";
    case "xfade":
      return "mg-xfade";
    case "wipe":
      return "mg-wipe";
    case "parallax":
      return "mg-parallax";
    case "skeleton":
      return "mg-skeleton";
    case "micro":
      return "mg-micro";
    case "toast":
      return "mg-toast";
    default:
      return "";
  }
}
