import type { CSSProperties, ReactElement } from "react";
import type { MotionDemoKey } from "../lib/motionDemoStageClass";

/** .mg-stage の中身を demoKey に応じて描き分ける(ugoki-jiten.html試作のデモをJSX化したもの) */
export function MotionDemo({
  demoKey,
}: {
  demoKey: MotionDemoKey;
}): ReactElement | null {
  switch (demoKey) {
    case "ease":
      return (
        <>
          <span className="mg-lbl mg-l1">in</span>
          <span className="mg-lbl mg-l2">out</span>
          <div className="mg-dot mg-d1" />
          <div className="mg-dot mg-d2" />
        </>
      );
    case "keyframe":
      return (
        <>
          <div className="mg-track" />
          <div className="mg-diamond" style={{ left: "10%" }} />
          <div className="mg-diamond" style={{ left: "50%" }} />
          <div className="mg-diamond" style={{ left: "90%" }} />
          <div className="mg-box" />
        </>
      );
    case "stagger":
      return (
        <div className="mg-bars">
          <div className="mg-bar" />
          <div className="mg-bar" />
          <div className="mg-bar" />
          <div className="mg-bar" />
          <div className="mg-bar" />
        </div>
      );
    case "antic":
      return <div className="mg-dot" />;
    case "squash":
      return (
        <>
          <div className="mg-floor" />
          <div className="mg-dot" />
        </>
      );
    case "follow":
      return (
        <>
          <div className="mg-ghost" />
          <div className="mg-box" />
        </>
      );
    case "pan":
      return <Scene wide />;
    case "tilt":
      return <TallScene />;
    case "zoom":
      return <Scene wide={false} />;
    case "dolly":
      return (
        <>
          <div className="mg-bg" />
          <div className="mg-person" />
        </>
      );
    case "xfade":
      return (
        <>
          <div className="mg-panel mg-pa">A</div>
          <div className="mg-panel mg-pb">B</div>
        </>
      );
    case "wipe":
      return (
        <>
          <div className="mg-panel mg-pa">A</div>
          <div className="mg-panel mg-pb">B</div>
          <div className="mg-edge" />
        </>
      );
    case "parallax":
      return (
        <>
          <div className="mg-layer mg-far">
            <div
              className="mg-sun"
              style={{ left: "20%", top: "16%", width: "7%", aspectRatio: "1" }}
            />
            <div
              className="mg-sun"
              style={{ left: "70%", top: "16%", width: "7%", aspectRatio: "1" }}
            />
          </div>
          <div className="mg-layer mg-mid">
            <div
              className="mg-hill"
              style={{
                left: "2%",
                bottom: 0,
                width: "30%",
                height: "40%",
                background: "var(--mg-b)",
              }}
            />
            <div
              className="mg-hill"
              style={{
                left: "52%",
                bottom: 0,
                width: "30%",
                height: "40%",
                background: "var(--mg-b)",
              }}
            />
          </div>
          <div className="mg-layer mg-near">
            <div
              className="mg-hill"
              style={{
                left: "10%",
                bottom: "-6%",
                width: "18%",
                height: "26%",
                background: "var(--mg-a)",
              }}
            />
            <div
              className="mg-hill"
              style={{
                left: "60%",
                bottom: "-6%",
                width: "18%",
                height: "26%",
                background: "var(--mg-a)",
              }}
            />
          </div>
        </>
      );
    case "skeleton":
      return (
        <>
          <div className="mg-sk mg-av" />
          <div className="mg-sk-lines">
            <div className="mg-sk mg-l" />
            <div className="mg-sk mg-l mg-s" />
          </div>
          <div className="mg-sk mg-wide" />
        </>
      );
    case "micro":
      return (
        <div className="mg-heart">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20.5s-7.5-4.6-7.5-10.1A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" />
          </svg>
        </div>
      );
    case "toast":
      return (
        <div className="mg-phone">
          <div className="mg-ln" style={{ top: "14%", width: "60%" }} />
          <div className="mg-ln" style={{ top: "26%", width: "76%" }} />
          <div className="mg-ln" style={{ top: "38%", width: "50%" }} />
          <div className="mg-msg">保存しました</div>
        </div>
      );
    default:
      return null;
  }
}

function hillStyle(
  left: string,
  height: string,
  background: string,
): CSSProperties {
  return { left, bottom: 0, height, background };
}

/** パン・ズーム用の横長の風景(wide=trueだと横移動用に広く配置する) */
function Scene({ wide }: { wide: boolean }): ReactElement {
  return (
    <div className="mg-scene">
      <div
        className="mg-sun"
        style={{
          left: wide ? "68%" : "70%",
          top: "14%",
          width: wide ? "9%" : "16%",
          aspectRatio: "1",
        }}
      />
      <div
        className="mg-hill"
        style={{
          ...hillStyle("-5%", "38%", "var(--mg-c)"),
          width: wide ? "40%" : "70%",
        }}
      />
      <div
        className="mg-hill"
        style={{
          ...hillStyle(wide ? "30%" : "45%", "28%", "var(--mg-b)"),
          width: wide ? "45%" : "80%",
        }}
      />
      <div
        className="mg-hill"
        style={{
          ...hillStyle(wide ? "66%" : "80%", "44%", "var(--mg-a)"),
          width: wide ? "40%" : "60%",
        }}
      />
      <div
        className="mg-tree"
        style={{ left: wide ? "14%" : "20%", bottom: "30%" }}
      />
      <div
        className="mg-tree"
        style={{ left: wide ? "52%" : "62%", bottom: "22%" }}
      />
      <div
        className="mg-tree"
        style={{ left: wide ? "84%" : "88%", bottom: "36%" }}
      />
    </div>
  );
}

/** ティルト用の縦長の風景 */
function TallScene(): ReactElement {
  return (
    <div className="mg-scene">
      <div
        className="mg-sun"
        style={{ left: "60%", top: "6%", width: "16%", aspectRatio: "16/10" }}
      />
      <div
        className="mg-hill"
        style={{ ...hillStyle("-10%", "14%", "var(--mg-c)"), width: "70%" }}
      />
      <div
        className="mg-hill"
        style={{ ...hillStyle("40%", "10%", "var(--mg-a)"), width: "80%" }}
      />
      <div className="mg-tree" style={{ left: "22%", bottom: "12%" }} />
      <div
        style={{
          position: "absolute",
          left: "30%",
          top: "22%",
          width: "40%",
          height: "18%",
          borderRadius: "40px",
          background: "var(--mg-paper)",
          opacity: 0.8,
        }}
      />
    </div>
  );
}
