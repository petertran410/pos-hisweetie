"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  html: string;
  paperSize?: string;
}

export function PrintPreviewPane({ html, paperSize = "A5" }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            html, body { margin: 0; padding: 0; }
            body {
              font-family: Arial, sans-serif;
              font-size: 13px;
              padding: 16px;
              color: #000;
            }
            table { width: 100%; border-collapse: collapse; }
            td, th { padding: 4px 8px; }
            h1, h2, h3 { margin: 2px 0; }
            * { box-sizing: border-box; }
            @page { size: ${paperSize}; margin: 0; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    doc.close();

    // Auto-resize iframe theo nội dung
    const resize = () => {
      if (!iframe.contentDocument?.body) return;
      const newHeight = iframe.contentDocument.body.scrollHeight + 32;
      setHeight(Math.max(newHeight, 600));
    };

    // Đợi render xong
    setTimeout(resize, 50);
  }, [html, paperSize]);

  return (
    <iframe
      ref={iframeRef}
      style={{
        width: "100%",
        height: `${height}px`,
        border: 0,
        background: "#fff",
      }}
      title="Print preview"
    />
  );
}
