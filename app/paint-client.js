"use client";

import { useEffect } from "react";

export default function PaintClient() {
  useEffect(() => {
    import("../src/app.js");
  }, []);

  return null;
}
