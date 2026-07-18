import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { lexer } from "marked";
import type { Token, Tokens } from "marked";

const ORDERED_LIST_REFERENCE = "benricho-ordered-list";
const MAX_LIST_LEVEL = 2;
const CODE_FONT = "Consolas";

type DocxBlock = Paragraph | Table;

interface RunFormat {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  isHyperlink?: boolean;
}

interface BuildContext {
  /** 番号付きリストごとに採番をリセットするためのインスタンス連番 */
  orderedListInstance: number;
}

/**
 * Markdown 文字列を docx の Document オブジェクトに変換する。
 * 対応: 見出し/段落/リスト(入れ子・番号付き)/コード/引用/表/区切り線/強調/リンク
 *
 * @precondition markdown は文字列(空でもよい)
 * @postcondition 戻り値は Packer でシリアライズ可能な Document
 */
export function markdownToDocument(markdown: string): Document {
  const tokens = lexer(markdown, { gfm: true });
  const context: BuildContext = { orderedListInstance: 0 };
  const children = tokens.flatMap((token) =>
    blockTokenToDocx(token, context, 0),
  );
  return new Document({
    numbering: { config: [buildOrderedListConfig()] },
    sections: [{ children }],
  });
}

/**
 * Markdown を .docx の Blob に変換する(ブラウザ用の副作用なし変換)。
 *
 * @postcondition 戻り値は Word で開ける .docx バイナリ
 */
export async function markdownToDocxBlob(markdown: string): Promise<Blob> {
  return Packer.toBlob(markdownToDocument(markdown));
}

function buildOrderedListConfig() {
  return {
    reference: ORDERED_LIST_REFERENCE,
    levels: [0, 1, 2].map((level) => ({
      level,
      format: LevelFormat.DECIMAL,
      text: `%${level + 1}.`,
      alignment: AlignmentType.START,
      style: {
        paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } },
      },
    })),
  };
}

// marked の Token 共用体は拡張用の Tokens.Generic(type: string)を含むため、
// case 判定では特定トークン型に絞り込まれない。標準構文の lexer は
// Generic を生成しないので、type 判定済みの箇所でのキャストは安全。
function blockTokenToDocx(
  token: Token,
  context: BuildContext,
  listLevel: number,
): DocxBlock[] {
  switch (token.type) {
    case "heading":
      return [headingToParagraph(token as Tokens.Heading)];
    case "paragraph":
      return [
        new Paragraph({
          children: inlineTokensToRuns(token.tokens, {}),
          spacing: { after: 120 },
        }),
      ];
    case "list":
      return listTokenToDocx(token as Tokens.List, context, listLevel);
    case "code":
      return codeBlockToParagraphs(token.text);
    case "blockquote":
      return blockquoteToDocx(token as Tokens.Blockquote, context);
    case "table":
      return [tableTokenToDocx(token as Tokens.Table)];
    case "hr":
      return [new Paragraph({ thematicBreak: true, spacing: { after: 120 } })];
    case "space":
      return [];
    case "html":
      return [
        new Paragraph({
          children: [new TextRun({ text: token.raw.trim(), color: "888888" })],
        }),
      ];
    case "text":
      return [
        new Paragraph({
          children: blockTextToRuns(token as Tokens.Text),
          spacing: { after: 120 },
        }),
      ];
    default:
      return [];
  }
}

const HEADING_BY_DEPTH = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const;

function headingToParagraph(token: Tokens.Heading): Paragraph {
  const depth = Math.min(Math.max(token.depth, 1), 6);
  return new Paragraph({
    children: inlineTokensToRuns(token.tokens, {}),
    heading: HEADING_BY_DEPTH[depth],
    spacing: { before: 240, after: 120 },
  });
}

function listTokenToDocx(
  list: Tokens.List,
  context: BuildContext,
  listLevel: number,
): DocxBlock[] {
  if (list.ordered) context.orderedListInstance += 1;
  const instance = context.orderedListInstance;
  return list.items.flatMap((item) =>
    listItemToDocx(item, list.ordered, instance, context, listLevel),
  );
}

function listItemToDocx(
  item: Tokens.ListItem,
  ordered: boolean,
  instance: number,
  context: BuildContext,
  listLevel: number,
): DocxBlock[] {
  const level = Math.min(listLevel, MAX_LIST_LEVEL);
  const marker = ordered
    ? { numbering: { reference: ORDERED_LIST_REFERENCE, level, instance } }
    : { bullet: { level } };
  return item.tokens.flatMap((child) => {
    if (child.type === "text" || child.type === "paragraph") {
      return [
        new Paragraph({
          children: blockTextToRuns(child as Tokens.Paragraph | Tokens.Text),
          ...marker,
        }),
      ];
    }
    if (child.type === "list")
      return listTokenToDocx(child as Tokens.List, context, listLevel + 1);
    return blockTokenToDocx(child, context, listLevel);
  });
}

function codeBlockToParagraphs(codeText: string): Paragraph[] {
  return codeText.split("\n").map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line, font: CODE_FONT, size: 19 })],
        shading: { type: ShadingType.CLEAR, fill: "F5F5F5" },
        spacing: { after: 0 },
      }),
  );
}

function blockquoteToDocx(
  token: Tokens.Blockquote,
  context: BuildContext,
): DocxBlock[] {
  return token.tokens.flatMap((inner) => {
    if (inner.type !== "paragraph" && inner.type !== "text") {
      return blockTokenToDocx(inner, context, 0);
    }
    return [
      new Paragraph({
        children: blockTextToRuns(inner as Tokens.Paragraph | Tokens.Text),
        indent: { left: 360 },
        border: {
          left: {
            style: BorderStyle.SINGLE,
            size: 18,
            color: "CCCCCC",
            space: 8,
          },
        },
        spacing: { after: 120 },
      }),
    ];
  });
}

function tableTokenToDocx(token: Tokens.Table): Table {
  const headerRow = new TableRow({
    children: token.header.map((cell) => tableCellToDocx(cell, true)),
    tableHeader: true,
  });
  const bodyRows = token.rows.map(
    (cells) =>
      new TableRow({
        children: cells.map((cell) => tableCellToDocx(cell, false)),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}

function tableCellToDocx(cell: Tokens.TableCell, isHeader: boolean): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: inlineTokensToRuns(cell.tokens, { bold: isHeader }),
      }),
    ],
    shading: isHeader ? { type: ShadingType.CLEAR, fill: "F0F1F2" } : undefined,
  });
}

/** paragraph / text トークンの中身をインライン run 群へ変換する */
function blockTextToRuns(
  token: Tokens.Paragraph | Tokens.Text,
): (TextRun | ExternalHyperlink)[] {
  if (token.tokens !== undefined) return inlineTokensToRuns(token.tokens, {});
  return [new TextRun({ text: decodeBasicHtmlEntities(token.text) })];
}

function inlineTokensToRuns(
  tokens: readonly Token[] | undefined,
  format: RunFormat,
): (TextRun | ExternalHyperlink)[] {
  if (tokens === undefined) return [];
  return tokens.flatMap((token) => inlineTokenToRuns(token, format));
}

function inlineTokenToRuns(
  token: Token,
  format: RunFormat,
): (TextRun | ExternalHyperlink)[] {
  switch (token.type) {
    case "strong":
      return inlineTokensToRuns(token.tokens, { ...format, bold: true });
    case "em":
      return inlineTokensToRuns(token.tokens, { ...format, italics: true });
    case "del":
      return inlineTokensToRuns(token.tokens, { ...format, strike: true });
    case "codespan":
      return [
        new TextRun({
          text: decodeBasicHtmlEntities(token.text),
          font: CODE_FONT,
          shading: { type: ShadingType.CLEAR, fill: "F0F1F2" },
        }),
      ];
    case "link":
      return [
        new ExternalHyperlink({
          link: token.href,
          children: inlineTokensToRuns(token.tokens, {
            ...format,
            isHyperlink: true,
          }),
        }),
      ];
    case "image":
      return [
        makeTextRun(`[画像: ${token.text !== "" ? token.text : token.href}]`, {
          ...format,
          italics: true,
        }),
      ];
    case "br":
      return [new TextRun({ text: "", break: 1 })];
    case "escape":
    case "text":
      return [makeTextRun(decodeBasicHtmlEntities(token.text), format)];
    case "html":
      return [makeTextRun(token.raw, format)];
    default:
      return "raw" in token ? [makeTextRun(token.raw, format)] : [];
  }
}

function makeTextRun(text: string, format: RunFormat): TextRun {
  return new TextRun({
    text,
    bold: format.bold,
    italics: format.italics,
    strike: format.strike,
    style: format.isHyperlink === true ? "Hyperlink" : undefined,
  });
}

/** marked がトークン化時に付与する HTML エンティティを元の文字に戻す */
function decodeBasicHtmlEntities(text: string): string {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}
