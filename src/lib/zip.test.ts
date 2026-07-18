import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createZip } from "./zip";

describe("createZip", () => {
  it("全エントリを格納し、解凍で元データが復元できる", () => {
    const zip = createZip([
      { name: "01_main.png", data: new Uint8Array([1, 2, 3]) },
      { name: "01_tab.png", data: new Uint8Array([4, 5]) },
    ]);
    const unzipped = unzipSync(zip);
    expect(Object.keys(unzipped).sort()).toEqual(["01_main.png", "01_tab.png"]);
    expect(Array.from(unzipped["01_main.png"])).toEqual([1, 2, 3]);
    expect(Array.from(unzipped["01_tab.png"])).toEqual([4, 5]);
  });

  it("空エントリ・ファイル名重複で RangeError を投げる", () => {
    expect(() => createZip([])).toThrow(RangeError);
    expect(() =>
      createZip([
        { name: "a.png", data: new Uint8Array([1]) },
        { name: "a.png", data: new Uint8Array([2]) },
      ]),
    ).toThrow("重複");
  });
});
