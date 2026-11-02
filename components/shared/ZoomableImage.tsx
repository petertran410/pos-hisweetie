"use client";

import { useEffect, useRef, useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformComponent,
  type ReactZoomPanPinchContentRef,
} from "react-zoom-pan-pinch";
import {
  ExternalLink,
  ImageOff,
  Loader2,
  Maximize,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const BUTTON_STEP = 0.5;

const toolbarButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent sm:h-9 sm:w-9";

function ZoomToolbar({ src, onRotate }: { src: string; onRotate: () => void }) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const scale = useTransformComponent(({ state }) => state.scale);

  return (
    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-1 shadow-lg backdrop-blur">
      <button
        type="button"
        title="Thu nhỏ (-)"
        aria-label="Thu nhỏ"
        disabled={scale <= MIN_SCALE}
        onClick={() => zoomOut(BUTTON_STEP)}
        className={toolbarButtonClass}>
        <ZoomOut className="h-5 w-5" />
      </button>
      <span className="w-12 text-center text-xs tabular-nums text-white/90">
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        title="Phóng to (+)"
        aria-label="Phóng to"
        disabled={scale >= MAX_SCALE}
        onClick={() => zoomIn(BUTTON_STEP)}
        className={toolbarButtonClass}>
        <ZoomIn className="h-5 w-5" />
      </button>
      <span className="mx-1 h-5 w-px bg-white/25" />
      <button
        type="button"
        title="Vừa màn hình (0)"
        aria-label="Vừa màn hình"
        onClick={() => resetTransform()}
        className={toolbarButtonClass}>
        <Maximize className="h-5 w-5" />
      </button>
      <button
        type="button"
        title="Xoay 90° (R)"
        aria-label="Xoay ảnh 90 độ"
        onClick={onRotate}
        className={toolbarButtonClass}>
        <RotateCw className="h-5 w-5" />
      </button>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        title="Mở ảnh gốc ở tab mới"
        aria-label="Mở ảnh gốc ở tab mới"
        className={toolbarButtonClass}>
        <ExternalLink className="h-5 w-5" />
      </a>
    </div>
  );
}

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
};

/**
 * Ảnh xem được kỹ: lăn chuột / pinch để zoom, kéo để di chuyển, double-click
 * để phóng to nhanh, xoay 90°. Ảnh tự vừa khung cha — cha cần có kích thước
 * cố định (ví dụ `flex-1 min-h-0`). Đổi ảnh thì truyền `key={src}` để reset.
 */
export function ZoomableImage({
  src,
  alt = "",
}: {
  src: string;
  alt?: string;
}) {
  const controlsRef = useRef<ReactZoomPanPinchContentRef>(null);
  const [rotation, setRotation] = useState(0);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  const rotate = () => {
    controlsRef.current?.resetTransform(0);
    setRotation((current) => (current + 90) % 360);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const controls = controlsRef.current;
      if (!controls) return;
      switch (event.key) {
        case "+":
        case "=":
          controls.zoomIn(BUTTON_STEP);
          break;
        case "-":
        case "_":
          controls.zoomOut(BUTTON_STEP);
          break;
        case "0":
          controls.resetTransform();
          break;
        case "r":
        case "R":
          controls.resetTransform(0);
          setRotation((current) => (current + 90) % 360);
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Khi xoay 90°/270°, khung ảnh đổi chiều rộng ↔ cao để ảnh vẫn vừa màn hình.
  const sideways = rotation % 180 !== 0;

  return (
    <div
      className="relative h-full w-full select-none"
      style={{ containerType: "size" }}>
      <TransformWrapper
        ref={controlsRef}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        // 1 nấc chuột (deltaY≈100) ≈ +0.8; trackpad cho delta nhỏ nên vẫn mượt.
        wheel={{ step: 0.008 }}
        doubleClick={{ mode: "toggle", step: 1.5 }}>
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{
            width: "100%",
            height: "100%",
            position: "relative",
            cursor: "grab",
          }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
            className="absolute left-1/2 top-1/2 object-contain transition-transform duration-200 ease-out"
            style={{
              width: sideways ? "100cqh" : "100cqw",
              height: sideways ? "100cqw" : "100cqh",
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            }}
          />
        </TransformComponent>
        {status !== "error" && <ZoomToolbar src={src} onRotate={rotate} />}
      </TransformWrapper>

      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/70" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-white/80">
          <ImageOff className="h-10 w-10 text-white/50" />
          Không tải được ảnh
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white/15 px-4 py-2 text-white hover:bg-white/25">
            Mở ảnh gốc
          </a>
        </div>
      )}
    </div>
  );
}
