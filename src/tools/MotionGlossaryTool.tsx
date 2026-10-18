import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { CopyButton } from "../components/CopyButton";
import { MotionDemo } from "../components/MotionDemo";
import {
  MOTION_TERM_CATEGORIES,
  MOTION_TERMS,
  type MotionTerm,
  type MotionTermCategory,
} from "../data/motionTerms";
import { getMotionDemoStageClass } from "../lib/motionDemoStageClass";
import "../styles/motionGlossary.css";

type CategoryFilter = "all" | MotionTermCategory;

/** 日本語名・英語名・説明・オノマトペを対象に検索する */
function matchesSearch(term: MotionTerm, query: string): boolean {
  if (query === "") return true;
  const haystack = [term.jp, term.en, term.description, ...term.onomatopoeia]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

/**
 * うごき辞典。見たことある動きの名前を、デモ・オノマトペ・説明から探せるギャラリー。
 * Claude Code用・動画生成AI用の頼み方の例文をコピーできる。
 */
export function MotionGlossaryTool(): ReactElement {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);

  const filtered = useMemo(() => {
    return MOTION_TERMS.filter(
      (term) =>
        (category === "all" || term.category === category) &&
        matchesSearch(term, query),
    );
  }, [category, query]);

  return (
    <div className={`mg-root ${paused ? "mg-paused" : ""}`}>
      <div className="mg-toolbar">
        <div className="mg-chips" role="group" aria-label="カテゴリで絞り込む">
          <button
            type="button"
            className="mg-chip"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
          >
            すべて
          </button>
          {MOTION_TERM_CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              className="mg-chip"
              aria-pressed={category === option.value}
              onClick={() => setCategory(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          className="mg-search"
          type="search"
          placeholder="ことば・英語名で探す(例: ease, ズーム)"
          aria-label="用語を検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type="button"
          className="mg-pause"
          aria-pressed={paused}
          onClick={() => setPaused((prev) => !prev)}
        >
          {paused ? "再生" : "一時停止"}
        </button>
        <span className="mg-count">
          {filtered.length} / {MOTION_TERMS.length}語
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="mg-empty">
          見つかりませんでした。別のことばで探してみてください。
        </p>
      ) : (
        <div className="mg-grid">
          {filtered.map((term) => (
            <MotionTermCard key={term.id} term={term} />
          ))}
        </div>
      )}
    </div>
  );
}

function MotionTermCard({ term }: { term: MotionTerm }): ReactElement {
  const prompts: ReadonlyArray<{ label: string; text: string }> = [
    ...(term.promptForCode !== undefined
      ? [{ label: "Claude Code用", text: term.promptForCode }]
      : []),
    ...(term.promptForVideo !== undefined
      ? [{ label: "動画AI用", text: term.promptForVideo }]
      : []),
  ];
  const categoryLabel =
    MOTION_TERM_CATEGORIES.find((option) => option.value === term.category)
      ?.label ?? term.category;

  return (
    <article className="mg-card">
      <div
        className={`mg-stage ${getMotionDemoStageClass(term.demo)}`}
        aria-hidden="true"
      >
        <MotionDemo demoKey={term.demo} />
      </div>
      <div className="mg-meta">
        <div className="mg-row">
          <span className="mg-jp">{term.jp}</span>
          <span className="mg-en">{term.en}</span>
          <span className={`mg-tag mg-tag-${term.category}`}>
            {categoryLabel}
          </span>
        </div>
        <p className="mg-desc">{term.description}</p>
      </div>
      {prompts.length > 0 && (
        <div className="mg-prompts">
          <span className="mg-prompts-label">AIへの頼み方</span>
          {prompts.map((prompt) => (
            <div key={prompt.label} className="mg-prompt">
              <code>{prompt.text}</code>
              <CopyButton text={prompt.text} />
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
