"use client";

import { useEffect, useRef, useState } from "react";

export function useElementSize<T extends HTMLElement>(fallback = {
  width: 900,
  height: 600,
}): {
  ref: React.RefObject<T | null>;
  size: { width: number; height: number };
} {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 120 && rect.height > 120) {
        setSize({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
