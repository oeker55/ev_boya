"use client";

import { useEffect } from "react";

export default function PaintClient() {
  useEffect(() => {
    import("../src/app.js").catch((error) => {
      console.error("Boya uygulaması yüklenemedi", error);
    });
  }, []);

  return null;
}
