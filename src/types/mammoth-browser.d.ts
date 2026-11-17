// mammoth はブラウザ向けに mammoth.browser.js を別途提供しているが、
// この副パスには型定義(.d.ts)が同梱されていないため最小限の型を自前で宣言する。
// (本体パッケージの ./lib/index.d.ts は Node 版の入力形式(path/buffer)しか
//  受け付けない型のため、ArrayBuffer を渡すブラウザ用途には合わない)
declare module "mammoth/mammoth.browser" {
  export interface MammothMessage {
    type: "warning" | "error";
    message: string;
  }

  export interface MammothConvertResult {
    value: string;
    messages: readonly MammothMessage[];
  }

  interface MammothBrowser {
    convertToHtml(input: {
      arrayBuffer: ArrayBuffer;
    }): Promise<MammothConvertResult>;
  }

  const mammoth: MammothBrowser;
  export default mammoth;
}
