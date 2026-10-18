import type { MotionDemoKey } from "../lib/motionDemoStageClass";

export type MotionTermCategory = "basic" | "anime" | "camera" | "edit" | "web";

export interface MotionTerm {
  id: string;
  /** 日本語名 */
  jp: string;
  /** 英語名(AIに通じる言い方) */
  en: string;
  category: MotionTermCategory;
  /** 検索用オノマトペ */
  onomatopoeia: string[];
  /** 一言説明(1〜2文) */
  description: string;
  /** Claude Code用: 秒数・イージング値まで入った日本語の指示例 */
  promptForCode?: string;
  /** 動画生成AI用: 英語のカメラワーク・動き指示 */
  promptForVideo?: string;
  /** デモの種類を表すキー(MotionDemoコンポーネントと対応) */
  demo: MotionDemoKey;
}

export const MOTION_TERM_CATEGORIES: ReadonlyArray<{
  value: MotionTermCategory;
  label: string;
}> = [
  { value: "basic", label: "基本" },
  { value: "anime", label: "アニメ" },
  { value: "camera", label: "カメラ" },
  { value: "edit", label: "編集" },
  { value: "web", label: "Web" },
];

/**
 * 試作(ugoki-jiten.html)の16語を移植したもの。
 * カテゴリは試作の3分類(common/video/web)から、指示書の40語一覧にある
 * 5分類(basic/anime/camera/edit/web)へ割り当て直している
 * (例: 予備動作・つぶしと伸ばし・フォロースルーは「動きの基本」→「アニメ」へ)。
 */
export const MOTION_TERMS: readonly MotionTerm[] = [
  {
    id: "easing",
    jp: "イージング",
    en: "easing (ease-in / ease-out)",
    category: "basic",
    onomatopoeia: ["ふわっ", "シュッ"],
    description:
      "動きの加速・減速のつけ方。ease-in は「ゆっくり始まって速く終わる」、ease-out は「速く始まってゆっくり止まる」。",
    promptForCode: "メニューは ease-out で0.25秒かけて開いてください",
    promptForVideo: "camera moves slowly, ease-in-out",
    demo: "ease",
  },
  {
    id: "keyframe",
    jp: "キーフレーム",
    en: "keyframe",
    category: "basic",
    onomatopoeia: [],
    description:
      "「この時点でこの状態」という目印。間の動きは自動でつながる。黄色の◆がキーフレーム。",
    promptForCode:
      "0%で四角、50%で丸く1.3倍、100%で四角に戻る @keyframes を作って",
    demo: "keyframe",
  },
  {
    id: "stagger",
    jp: "スタッガー",
    en: "stagger",
    category: "basic",
    onomatopoeia: ["パラパラ", "順番に"],
    description:
      "同じ動きを少しずつ時間差でずらして、順番に出す。一覧やカードの登場によく使う。",
    promptForCode: "カード一覧は下から0.1秒ずつスタッガーでフェードインさせて",
    demo: "stagger",
  },
  {
    id: "anticipation",
    jp: "予備動作",
    en: "anticipation",
    category: "anime",
    onomatopoeia: ["ぐっ"],
    description:
      "動く前に、逆方向へ少しためる。ジャンプ前にしゃがむような動き。動きに説得力が出る。",
    promptForCode:
      "ボタンを押したらアイコンが一瞬後ろに引いてから飛び出す動きにして",
    promptForVideo: "character crouches before jumping (anticipation)",
    demo: "antic",
  },
  {
    id: "squash-stretch",
    jp: "つぶしと伸ばし",
    en: "squash & stretch",
    category: "anime",
    onomatopoeia: ["ぽよん", "ぼよん"],
    description:
      "着地でつぶれ、跳ねると縦に伸びる。弾力や柔らかさを表すアニメの基本原則。",
    promptForCode:
      "バウンドするボールに squash & stretch をつけて、着地でつぶれるようにして",
    demo: "squash",
  },
  {
    id: "follow-through",
    jp: "フォロースルー",
    en: "follow-through / overshoot",
    category: "anime",
    onomatopoeia: ["びよーん"],
    description:
      "止まる位置を少し行き過ぎてから戻る。点線の位置が本来の停止位置。",
    promptForCode:
      "モーダルは少しオーバーシュートしてから止まる動きにして(スプリング)",
    demo: "follow",
  },
  {
    id: "pan",
    jp: "パン",
    en: "pan",
    category: "camera",
    onomatopoeia: [],
    description:
      "カメラの位置はそのまま、首を左右に振る。風景を見せる、視線を移すときに。",
    promptForVideo: "slow pan from left to right across the landscape",
    demo: "pan",
  },
  {
    id: "tilt",
    jp: "ティルト",
    en: "tilt",
    category: "camera",
    onomatopoeia: [],
    description:
      "カメラの位置はそのまま、首を上下に振る。足元から顔へ、地面から空へなど。",
    promptForVideo: "tilt up from the ground to the sky, slow",
    demo: "tilt",
  },
  {
    id: "zoom-in",
    jp: "ズームイン",
    en: "zoom in",
    category: "camera",
    onomatopoeia: ["ぐーっと"],
    description:
      "レンズで画角をせばめて寄る。カメラは動かないので、遠近感は変わらない。",
    promptForVideo: "slow zoom in on the right hill",
    demo: "zoom",
  },
  {
    id: "dolly-zoom",
    jp: "ドリーズーム",
    en: "dolly zoom (Vertigo effect)",
    category: "camera",
    onomatopoeia: ["ぐにゃ"],
    description:
      "人物の大きさはそのままで、背景だけが伸び縮みする。驚き・不安・衝撃の演出。",
    promptForVideo:
      "dolly zoom on the character's face, background stretches away",
    demo: "dolly",
  },
  {
    id: "cross-dissolve",
    jp: "クロスフェード",
    en: "cross-dissolve / crossfade",
    category: "edit",
    onomatopoeia: ["じわっ"],
    description:
      "前の場面が消えながら、次の場面が重なって現れるつなぎ。時間の経過やゆるい場面転換に。",
    promptForCode: "場面Aから場面Bへ0.5秒のクロスフェードでつないで",
    promptForVideo: "cross-dissolve transition",
    demo: "xfade",
  },
  {
    id: "wipe",
    jp: "ワイプ",
    en: "wipe",
    category: "edit",
    onomatopoeia: ["シャッ"],
    description:
      "境界線が画面を横切りながら、次の場面に塗り替わるつなぎ。テンポよく切り替えたいときに。",
    promptForCode: "左から右へのワイプで次のシーンに切り替えて",
    demo: "wipe",
  },
  {
    id: "parallax",
    jp: "パララックス",
    en: "parallax",
    category: "web",
    onomatopoeia: [],
    description:
      "手前ほど速く、奥ほどゆっくり動かして奥行きを出す。スクロール演出や横移動の背景に。",
    promptForCode: "ヒーロー画像を3層に分けて、スクロールでパララックスさせて",
    demo: "parallax",
  },
  {
    id: "skeleton-loading",
    jp: "スケルトンローディング",
    en: "skeleton screen, shimmer",
    category: "web",
    onomatopoeia: ["キラッ"],
    description:
      "読み込み中に、中身の形だけ灰色で先に見せる。光がすべる演出は shimmer と呼ぶ。",
    promptForCode:
      "データ取得中はカード型のスケルトンを shimmer つきで表示して",
    demo: "skeleton",
  },
  {
    id: "micro-interaction",
    jp: "マイクロインタラクション",
    en: "micro-interaction",
    category: "web",
    onomatopoeia: ["ぽんっ"],
    description:
      "押した・いいねした等の小さな操作への、小さな反応の動き。押した実感が出る。",
    promptForCode:
      "いいねボタンは押した瞬間に縮んでから弾むように大きくなり、色がつくようにして",
    demo: "micro",
  },
  {
    id: "toast",
    jp: "トースト",
    en: "toast",
    category: "web",
    onomatopoeia: ["ぴょこっ"],
    description:
      "画面の端からそっと出て、数秒で自動で消える小さな通知。「保存しました」など。",
    promptForCode: "保存したら画面下からトーストを出して、3秒で消して",
    demo: "toast",
  },
];
