import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            width: 20,
            height: 20,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 8,
              height: 20,
              background: "white",
              borderRadius: 4,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 20,
              height: 8,
              background: "white",
              borderRadius: 4,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
