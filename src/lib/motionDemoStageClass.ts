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
  | "holdspacing"
  | "inbetween"
  | "steps"
  | "lipsync"
  | "smear"
  | "pan"
  | "tilt"
  | "zoom"
  | "dolly"
  | "dollyin"
  | "tracking"
  | "whippan"
  | "rackfocus"
  | "shake"
  | "xfade"
  | "wipe"
  | "cut"
  | "jumpcut"
  | "matchcut"
  | "jlcut"
  | "speedramp"
  | "freeze"
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
    case "holdspacing":
      return "mg-holdspacing";
    case "inbetween":
      return "mg-inbetween";
    case "steps":
      return "mg-steps";
    case "lipsync":
      return "mg-lipsync";
    case "smear":
      return "mg-smear";
    case "pan":
      return "mg-pan mg-frame";
    case "tilt":
      return "mg-tilt mg-frame";
    case "zoom":
      return "mg-zoom mg-frame";
    case "dolly":
      return "mg-dolly mg-frame";
    case "dollyin":
      return "mg-dollyin mg-frame";
    case "tracking":
      return "mg-tracking mg-frame";
    case "whippan":
      return "mg-whippan mg-frame";
    case "rackfocus":
      return "mg-rackfocus mg-frame";
    case "shake":
      return "mg-shake mg-frame";
    case "xfade":
      return "mg-xfade";
    case "wipe":
      return "mg-wipe";
    case "cut":
      return "mg-cut";
    case "jumpcut":
      return "mg-jumpcut";
    case "matchcut":
      return "mg-matchcut";
    case "jlcut":
      return "mg-jlcut";
    case "speedramp":
      return "mg-speedramp";
    case "freeze":
      return "mg-freeze";
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
