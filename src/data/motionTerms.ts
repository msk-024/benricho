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
    id: "fade-in-out",
    jp: "フェードイン・アウト",
    en: "fade in / out",
    category: "basic",
    onomatopoeia: ["ふわっ", "じわっ"],
    description:
      "透明から不透明へ(フェードイン)、不透明から透明へ(フェードアウト)なめらかに切り替わる、もっとも基本的な現れ方・消え方。",
    promptForCode:
      "通知は0.3秒でフェードインし、3秒後に0.3秒かけてフェードアウトして消えるようにして",
    promptForVideo: "scene fades in from black, 1.5 seconds, slow",
    demo: "fade",
  },
  {
    id: "slide-in",
    jp: "スライドイン",
    en: "slide in",
    category: "basic",
    onomatopoeia: ["スッ", "シュッ"],
    description:
      "画面の外から要素がすべり込んでくる動き。どの方向から出てくるかで印象が変わる(下から/横からなど)。",
    promptForCode:
      "トーストは16px下から0.25秒でスライドインし、ease-outで止まるようにして",
    promptForVideo: "the character slides into frame from the left, smooth",
    demo: "slidein",
  },
  {
    id: "scale",
    jp: "スケール(拡大縮小)",
    en: "scale",
    category: "basic",
    onomatopoeia: ["ぐーん"],
    description:
      "要素そのものを拡大・縮小する動き。カメラが動くズームと違い、要素の大きさ自体が変わる。",
    promptForCode:
      "カードはホバー時に0.2秒でscale(1.05)に拡大し、離れたら元に戻るようにして",
    promptForVideo:
      "the logo grows from small to full size, camera stays still",
    demo: "scale",
  },
  {
    id: "spring",
    jp: "スプリング",
    en: "spring (stiffness, damping)",
    category: "basic",
    onomatopoeia: ["ぽよん", "ぷるん"],
    description:
      "物理的なバネのような弾み方。stiffness(硬さ)が高いほど速く、damping(減衰)が低いほどよく弾む。イージング関数より自然に見えることが多い。",
    promptForCode:
      "Motion(Framer Motion)なら type: 'spring', stiffness: 300, damping: 20。CSSだけなら cubic-bezier(0.34, 1.56, 0.64, 1) で0.5秒、少し行き過ぎて戻るように",
    promptForVideo: "bouncy, springy motion, overshoots slightly and settles",
    demo: "spring",
  },
  {
    id: "loop-pingpong",
    jp: "ループ・ピンポン",
    en: "loop, ping-pong",
    category: "basic",
    onomatopoeia: ["ゆらゆら"],
    description:
      "ループは同じ動きを繰り返す、ピンポンは往復するように逆再生もはさんで繰り返す。アイコンの揺れなど、常時目を引きたい動きに。",
    promptForCode:
      "アイコンは上下に4px、2秒周期で揺れ続けるようにして(animation: infinite alternate、ease-in-out)",
    promptForVideo:
      "seamless looping animation, gentle back-and-forth motion, 2 seconds",
    demo: "pingpong",
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
    id: "hold-spacing",
    jp: "タメ・ツメ",
    en: "hold & spacing (slow in / slow out)",
    category: "anime",
    onomatopoeia: ["ぐっ…ピタッ"],
    description:
      "動く前後にしっかり止める「タメ」と、動いている最中の中割りの間隔を詰めて勢いをつける「ツメ」を組み合わせた表現。「溜めて、一気に動いて、ピタッと止まる」というメリハリのある動きになる。",
    promptForCode:
      "アイコンは動く前に0.3秒静止(タメ)し、そこから0.15秒でcubic-bezier(0.83, 0, 0.17, 1)を使って一気に移動して(ツメ)、動いたあとまた0.3秒静止するようにして",
    promptForVideo:
      "character pauses, then snaps into movement with a sharp start and sharp stop, then pauses again",
    demo: "holdspacing",
  },
  {
    id: "in-between",
    jp: "中割り",
    en: "in-between (tweening)",
    category: "anime",
    onomatopoeia: ["すーっ"],
    description:
      "原画(キーポーズ)とキーポーズの間を埋める、途中のコマ(絵)のこと。CSSのアニメーションは2点間を自動で補間するため、中割りの枚数を増やす目的は「滑らかにする」ことではなく、途中に経由点を作って「動くルート(軌道)を変える」こと。",
    promptForCode:
      "0%と100%だけだと直線的に動くので、40%と70%に中割りのキーを足して、弧を描くように動かして",
    promptForVideo:
      "smooth, fluid animation with no choppiness, like densely inbetweened animation",
    demo: "inbetween",
  },
  {
    id: "frame-timing",
    jp: "コマ打ち(1コマ・2コマ・3コマ)",
    en: "frame-on-ones / twos / threes",
    category: "anime",
    onomatopoeia: ["パカパカ", "カクカク"],
    description:
      "1秒間に絵を何回更新するかの打ち方。1コマ打ちは毎フレーム絵を変えて滑らかに、2コマ・3コマ打ちは数フレームおきにしか絵を変えず、カクカクした省略感のある動きになる。日本のTVアニメは3コマ打ちが多い。",
    promptForCode:
      "歩きのアニメーションは3コマ打ちにして(24fps中8回だけ絵を更新。animation-timing-function: steps(8) で1秒ループ)",
    promptForVideo:
      "anime-style limited animation, animated on threes, low frame rate feel",
    demo: "steps",
  },
  {
    id: "lip-sync-blink",
    jp: "口パク・目パチ",
    en: "lip sync & eye blink",
    category: "anime",
    onomatopoeia: ["パチパチ", "もごもご"],
    description:
      "セリフに合わせて口を開閉させる(口パク)、一定間隔で目を閉じる(目パチ)、どちらもキャラクターに生きている感じを出す基本の動き。口は閉・中・開の3パターンを切り替えるだけで喋って見える。",
    promptForCode:
      "キャラクターの口は閉・中・開の3パターンを1音節あたり0.12秒で切り替えて喋っているように見せて。目は3秒に1回、0.1秒だけ閉じて瞬きさせて",
    promptForVideo:
      "anime character talking with simple 3-frame mouth cycle (closed, half-open, open), occasional natural eye blink",
    demo: "lipsync",
  },
  {
    id: "smear-frame",
    jp: "オバケ(残像線)",
    en: "smear frame",
    category: "anime",
    onomatopoeia: ["シャッ", "ビュン"],
    description:
      "速い動きのときに、通過した軌跡が線や半透明の分身として伸びて見える表現。コマ数が少なくても速さや勢いを感じさせられる、アニメ特有の省略表現。",
    promptForCode:
      "キャラクターが素早く動く瞬間だけ、box-shadowで半透明の分身を3つ後方にずらして0.15秒だけ表示し、残像(オバケ)に見せて",
    promptForVideo:
      "anime-style smear frames, speed lines, exaggerated fast motion",
    demo: "smear",
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
