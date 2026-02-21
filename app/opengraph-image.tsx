import React from "react";
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "raw — a fun, slightly nostalgic notes app";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #e8e8e8 0%, #d0d0d0 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* App window */}
        <div
          style={{
            width: 780,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Title bar */}
          <div
            style={{
              height: 36,
              background: "linear-gradient(to bottom, #f4f5f5, #d6d6d6, #c2c2c2)",
              display: "flex",
              alignItems: "center",
              paddingLeft: 14,
              paddingRight: 14,
              gap: 8,
              position: "relative",
            }}
          >
            {/* Traffic lights */}
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: "linear-gradient(to bottom, #ff5f57, #e0443e)", border: "1px solid #ce3630" }} />
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: "linear-gradient(to bottom, #ffbd2e, #dea123)", border: "1px solid #d69818" }} />
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: "linear-gradient(to bottom, #28c940, #1aab29)", border: "1px solid #169d23" }} />
            {/* Window title */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                textAlign: "center",
                fontSize: 14,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              raw
            </div>
          </div>

          {/* Toolbar */}
          <div
            style={{
              height: 40,
              background: "#e0e0e0",
              borderBottom: "1px solid #bbb",
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              gap: 6,
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: 28,
                  height: 22,
                  borderRadius: 4,
                  background: "linear-gradient(to bottom, #fdfdfd, #dcdcdc)",
                  border: "1px solid #9e9e9e",
                }}
              />
            ))}
            <div style={{ flex: 1 }} />
            <div
              style={{
                width: 120,
                height: 22,
                borderRadius: 2,
                background: "white",
                border: "1px solid #9e9e9e",
                marginRight: 12,
              }}
            />
          </div>

          {/* Content area */}
          <div
            style={{
              background: "white",
              display: "flex",
              height: 340,
            }}
          >
            {/* Sidebar */}
            <div
              style={{
                width: 220,
                borderRight: "1px solid #e0e0e0",
                background: "#fdfdfd",
                display: "flex",
                flexDirection: "column",
                padding: "12px 0",
              }}
            >
              <div style={{ padding: "4px 16px", fontSize: 10, fontWeight: "bold", color: "#8e8e93", letterSpacing: 1, textTransform: "uppercase" }}>Previous 30 Days</div>
              {["Welcome to raw", "Quick Tip", "Ideas", "Shopping List"].map((t, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 16px",
                    background: i === 0 ? "linear-gradient(to bottom, #6094de, #457ad1)" : "transparent",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: "bold", color: i === 0 ? "white" : "#222" }}>{t}</div>
                  <div style={{ fontSize: 11, color: i === 0 ? "rgba(255,255,255,0.75)" : "#888" }}>Today</div>
                </div>
              ))}
            </div>

            {/* Editor pane */}
            <div style={{ flex: 1, padding: "36px 48px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 30, fontWeight: "bold", color: "#222" }}>Welcome to raw</div>
              <div style={{ fontSize: 16, color: "#555", lineHeight: 1.7 }}>Hey there, Gen Z mode on. &gt;.&lt;</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {["bold", "italic", "—"].map((tag, i) => (
                  <div key={i} style={{ padding: "4px 10px", background: "#f0f0f0", borderRadius: 4, fontSize: 12, color: "#666" }}>{tag}</div>
                ))}
              </div>
            </div>
          </div>

          {/* App name banner at bottom */}
          <div
            style={{
              background: "linear-gradient(to bottom, #d6d6d6, #c2c2c2)",
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
            }}
          >
            <div style={{ fontSize: 13, color: "#555", fontWeight: "bold" }}>raw</div>
            <div style={{ fontSize: 12, color: "#888" }}>a fun, slightly nostalgic notes app</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
