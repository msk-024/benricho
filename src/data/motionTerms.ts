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
      "レンズで画角をせばめて寄る動き(ズームアウトはこの逆)。カメラ自体は動かないため遠近感は変わらない点が、カメラごと近づくドリーとの違い。",
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
    id: "dolly-in-out",
    jp: "ドリー",
    en: "dolly (dolly in / out)",
    category: "camera",
    onomatopoeia: ["ぐんぐん"],
    description:
      "カメラごと被写体に近づく(離れる)。レンズで寄るズームと違い、背景との距離感が変わって入り込む感じが出る。",
    promptForVideo:
      "slow dolly in toward the character, camera physically moves forward, background perspective shifts",
    demo: "dollyin",
  },
  {
    id: "tracking-shot",
    jp: "トラッキング",
    en: "tracking shot",
    category: "camera",
    onomatopoeia: ["すーっ"],
    description:
      "カメラが被写体と一緒に移動しながら、同じ距離感を保って撮り続けるカメラワーク。歩く人物を横から追う、車を併走して撮るなど、臨場感や没入感を出したいときに使う。",
    promptForVideo:
      "tracking shot, camera moves alongside the subject at the same speed, maintaining consistent distance",
    demo: "tracking",
  },
  {
    id: "whip-pan",
    jp: "ウィップパン",
    en: "whip pan (swish pan)",
    category: "camera",
    onomatopoeia: ["ビュン", "シャッ"],
    description:
      "パンを非常に速く行い、画面が一瞬ブレて流れるカメラワーク。場面転換や、勢いよく視線を切り替える演出に使われる。",
    promptForCode:
      "スライドの切り替えは、0.25秒で横に流しながら filter: blur(6px) をかけて、次のスライドでブレを消すウィップパン風にして",
    promptForVideo:
      "extremely fast whip pan, strong motion blur, snap transition to the next subject",
    demo: "whippan",
  },
  {
    id: "rack-focus",
    jp: "ラックフォーカス",
    en: "rack focus (focus pull)",
    category: "camera",
    onomatopoeia: ["スッ"],
    description:
      "手前と奥、どちらにピントを合わせるかを途中で切り替えるカメラワーク。ピントが合っていない方はぼやけて見える。視線を誘導したいときに使う。",
    promptForCode:
      "手前と奥に重ねた2つの要素で、0.6秒かけて手前をfilter: blur(8px)にしながら奥をblur(0)にして、ピントが奥に移ったように見せて",
    promptForVideo:
      "rack focus from the foreground subject to the background subject, 0.6 seconds, shallow depth of field",
    demo: "rackfocus",
  },
  {
    id: "camera-shake",
    jp: "手ブレ・シェイク",
    en: "camera shake",
    category: "camera",
    onomatopoeia: ["ガクガク", "ブルブル"],
    description:
      "手持ちカメラのような小刻みな揺れ。緊迫感や衝撃、ドキュメンタリー風のリアルさを出したいときに使う。",
    promptForCode:
      "入力エラーのときは、フォームを左右に±6pxで3回、0.4秒で揺らして(@keyframes shake)",
    promptForVideo:
      "handheld camera shake, subtle jitter, documentary-style realism",
    demo: "shake",
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
    id: "cut",
    jp: "カット",
    en: "cut (hard cut)",
    category: "edit",
    onomatopoeia: ["パッ"],
    description:
      "場面を瞬時に切り替える、最も基本的なつなぎ。ジャンプカット・マッチカットはこの応用。",
    promptForCode:
      "ギャラリーの画像切り替えはフェードを使わず、0秒で次の画像に瞬時に切り替えて",
    promptForVideo: "hard cut to the next shot, no transition, instant change",
    demo: "cut",
  },
  {
    id: "jump-cut",
    jp: "ジャンプカット",
    en: "jump cut",
    category: "edit",
    onomatopoeia: ["パッ", "ガクッ"],
    description:
      "同じアングル・同じ被写体のまま時間を飛ばしてカットするため、映像が不連続にガクッと飛んで見える編集技法。あえて違和感を演出したいVlogやSNS動画でよく使われる。",
    promptForVideo:
      "jump cut, same subject and angle, abrupt time skip, no transition",
    demo: "jumpcut",
  },
  {
    id: "match-cut",
    jp: "マッチカット",
    en: "match cut",
    category: "edit",
    onomatopoeia: [],
    description:
      "形・動き・構図が似た2つの場面をつなぐことで、違和感なく(あるいは意図的な意外性を持って)場面転換する編集技法。例: 回転する車輪→回転する太陽。",
    promptForVideo:
      "match cut from the spinning wheel to the sun, matching shape and motion",
    demo: "matchcut",
  },
  {
    id: "jl-cut",
    jp: "J/Lカット",
    en: "J-cut / L-cut",
    category: "edit",
    onomatopoeia: [],
    description:
      "次の場面の音声を映像より先に始める(Jカット)、または前の場面の音声を映像の切り替え後も残す(Lカット)編集技法。音と映像の切り替えをずらすことで、自然な会話のつなぎや場面転換を作れる。",
    promptForVideo:
      "J-cut transition, next scene's audio begins before its video appears",
    demo: "jlcut",
  },
  {
    id: "speed-ramp",
    jp: "スピードランプ",
    en: "speed ramp",
    category: "edit",
    onomatopoeia: ["キュイーン"],
    description:
      "1つのカットの中で再生速度を滑らかに変化させる技法。スローモーションから通常速度へ、あるいはその逆へ加減速しながら切り替わる。",
    promptForCode:
      "動画のplaybackRateを、requestAnimationFrameで0.3秒かけて0.3から1.0まで少しずつ上げて、スピードランプのように加速させて",
    promptForVideo:
      "speed ramp from slow motion to normal speed, smooth acceleration",
    demo: "speedramp",
  },
  {
    id: "freeze-frame",
    jp: "フリーズフレーム",
    en: "freeze frame",
    category: "edit",
    onomatopoeia: ["ピタッ"],
    description:
      "動いている映像の1コマで時間を止め、静止画として一定時間止めて見せる技法。決めのポーズを印象づけたいときや、ナレーションを入れたいときに使う。",
    promptForCode:
      "動画は3秒経過した瞬間でフリーズフレームにして1.5秒間静止させ、その後また再生を続けて",
    promptForVideo:
      "freeze frame on the character's pose, hold for 1.5 seconds, then resume",
    demo: "freeze",
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
  {
    id: "transition",
    jp: "トランジション",
    en: "transition (CSS transition)",
    category: "web",
    onomatopoeia: ["すっ"],
    description:
      "ある状態から別の状態へ切り替わるとき、瞬時にではなく一定時間かけてなめらかに変化させること。CSSの`transition`は、ホバーやクラス切り替えなど「何かがきっかけで値が変わる瞬間」をなめらかにする仕組み(常に動き続ける`@keyframes`アニメーションとの違い)。",
    promptForCode:
      "ボタンの背景色は、ホバーしたときだけtransition: background-color 0.2s ease で切り替わるようにして(keyframesではなくtransitionを使う)",
    promptForVideo:
      "smooth, gradual transition between two states, not an abrupt change",
    demo: "transition",
  },
  {
    id: "hover",
    jp: "ホバー",
    en: "hover",
    category: "web",
    onomatopoeia: ["ふわっ", "きゅっ"],
    description:
      "マウスカーソルを要素に重ねたときだけ起こる変化。少し浮き上がる・影がつく・下線が伸びるなど「触れられる」ことを伝える合図になる。スマホではタップ時の代替(active疑似クラス)を用意することが多い。",
    promptForCode:
      "カードはホバー時に4px浮き上がり、影を濃くして0.2秒でtransition。タップ端末ではactive疑似クラスで代替して",
    promptForVideo:
      "cursor hovers over the button, the button lifts slightly and a shadow appears",
    demo: "hover",
  },
  {
    id: "scroll-linked",
    jp: "スクロール連動",
    en: "scroll-linked animation (scroll-triggered)",
    category: "web",
    onomatopoeia: ["にゅるっ"],
    description:
      "スクロールの位置や進み具合に合わせて要素が現れたり動いたりする演出。「画面に入ったら一度だけ再生」と「スクロール量にそのまま連動して動く」の2パターンがある。モダンCSSでは`animation-timeline: scroll()`でJS無しでも作れる。",
    promptForCode:
      "セクション見出しは画面に入った瞬間に下から20pxフェードインさせて(IntersectionObserverかCSSのanimation-timeline: viewで)。1回再生したら元に戻さないで。animation-timelineに未対応のブラウザや、prefers-reduced-motionが有効な場合は、最初から表示された状態でOK",
    promptForVideo:
      "content reveals and animates in progressively as the view scrolls downward, elements fading and sliding into place",
    demo: "scrolllink",
  },
  {
    id: "page-transition",
    jp: "ページ遷移",
    en: "page transition (View Transitions API)",
    category: "web",
    onomatopoeia: ["シュン", "ぬるっ"],
    description:
      "ページ(画面)を移動するとき、前の画面から次の画面へなめらかにつながる演出。ブラウザ標準のView Transitions APIを使うと、前後の画面を自動でクロスフェードしたり、同じ要素同士を滑らかに移動・変形させたりできる。",
    promptForCode:
      "商品一覧のサムネイルをクリックしたら、View Transitions API(document.startViewTransitionとview-transition-name)でそのサムネイルが詳細ページの大きな画像へそのまま滑らかに変形・移動するようにして。Next.js(App Router)の場合は、ページ遷移の管理方法が違うので、使えるやり方を先に提案して。未対応ブラウザでは普通に切り替わればOK",
    promptForVideo:
      "a shared element (like a thumbnail) smoothly morphs and moves into its new position as the screen transitions to the next page",
    demo: "viewtransition",
  },
];
