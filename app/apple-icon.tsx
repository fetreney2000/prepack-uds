import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#575279",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            width: 100,
            height: 100,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 40,
              height: 100,
              background: "white",
              borderRadius: 20,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 100,
              height: 40,
              background: "white",
              borderRadius: 20,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
