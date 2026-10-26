import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { CopyButton } from "../components/CopyButton";
import {
  STYLE_CATEGORIES,
  STYLE_CAUTION_NOTE,
  STYLE_COMBO_EXAMPLES,
  STYLE_CONFUSION_NOTES,
  STYLE_ENTRIES,
  type StyleCategory,
  type StyleEntry,
} from "../data/styleIndex";

type CategoryFilter = "all" | StyleCategory;

/** 日本語名・英語名・特徴を対象に検索する */
function matchesSearch(entry: StyleEntry, query: string): boolean {
  if (query === "") return true;
  const haystack = [entry.jp, entry.en, entry.description]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

/**
 * AI画像生成 Style Index。画風・撮影技法・構図・質感・デザイン様式・光の演出を
 * 横断して検索し、英語のスタイル名をそのままコピーできる辞典。
 */
export function StyleIndexTool(): ReactElement {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return STYLE_ENTRIES.filter(
      (entry) =>
        (category === "all" || entry.category === category) &&
        matchesSearch(entry, query),
    );
  }, [category, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="カテゴリで絞り込む"
        >
          <button
            type="button"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              category === "all"
                ? "border-ink-strong bg-ink-strong text-ink-inverted"
                : "border-line-strong bg-surface text-ink"
            }`}
          >
            すべて
          </button>
          {STYLE_CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={category === option.value}
              onClick={() => setCategory(option.value)}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${
                category === option.value
                  ? "border-ink-strong bg-ink-strong text-ink-inverted"
                  : "border-line-strong bg-surface text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="日本語・英語で探す(例: チルトシフト, cinematic)"
          aria-label="スタイルを検索"
          className="min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 py-1.5 text-sm"
        />
        <span className="font-mono text-xs text-subtle">
          {filtered.length} / {STYLE_ENTRIES.length}種
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">
          見つかりませんでした。別のことばで探してみてください。
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <StyleCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      <details className="rounded-lg border border-line bg-surface-muted p-4 text-sm">
        <summary className="cursor-pointer font-medium text-ink-strong">
          使い方・組み合わせ例
        </summary>
        <div className="mt-3 space-y-4 text-ink-soft">
          <p>
            英語のスタイル名をコピーして、
            <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">
              [主題], [Style], [構図], [光], [色], [比率]
            </code>
            の順に組み合わせて使う。
          </p>
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-subtle">
              組み合わせ例
            </p>
            {STYLE_COMBO_EXAMPLES.map((example) => (
              <div
                key={example}
                className="flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2"
              >
                <code className="flex-1 whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink">
                  {example}
                </code>
                <CopyButton text={example} />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wide text-subtle">
              混同しやすい組み合わせ
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {STYLE_CONFUSION_NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-subtle">{STYLE_CAUTION_NOTE}</p>
        </div>
      </details>
    </div>
  );
}

function StyleCard({ entry }: { entry: StyleEntry }): ReactElement {
  const categoryLabel =
    STYLE_CATEGORIES.find((option) => option.value === entry.category)?.label ??
    entry.category;

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      <StyleThumbnail id={entry.id} jp={entry.jp} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-ink-strong">{entry.jp}</p>
          <p className="font-mono text-xs text-muted">{entry.en}</p>
        </div>
        <span className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-ink-soft">
          {categoryLabel}
        </span>
      </div>
      <p className="text-sm text-ink-soft">{entry.description}</p>
      <div className="mt-auto flex items-center justify-end">
        <CopyButton text={entry.en} />
      </div>
    </article>
  );
}

/**
 * サムネイル見本画像。/public/style-samples/{id}.webp が存在すれば表示する。
 * まだ用意できていないスタイルの方が多いため、読み込み失敗時は何も表示せず
 * 従来のテキストのみのカードに戻す(壊れた画像アイコンを出さない)。
 */
function StyleThumbnail({
  id,
  jp,
}: {
  id: string;
  jp: string;
}): ReactElement | null {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={`/style-samples/${id}.webp`}
      alt={`${jp}の見本画像`}
      loading="lazy"
      className="aspect-square w-full rounded-md border border-line object-cover"
      onError={() => setFailed(true)}
    />
  );
}
