import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#f5f0eb",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif"
        }}
      >
        <div
          style={{
            fontSize: 72,
            color: "#1a1a1a",
            letterSpacing: "-0.02em"
          }}
        >
          Lyka Mimics
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#666",
            marginTop: 16
          }}
        >
          design · art · reviews
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
