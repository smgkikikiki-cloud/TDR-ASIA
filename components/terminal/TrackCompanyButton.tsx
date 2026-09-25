"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tdr-asia-tracked-companies";

function readTracked() {
  if (typeof window === "undefined") return [] as string[];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function TrackCompanyButton({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    setTracked(readTracked().includes(slug));
  }, [slug]);

  function toggle() {
    const current = readTracked();
    const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setTracked(next.includes(slug));
    window.dispatchEvent(new Event("tdr-tracker-change"));
  }

  return <button type="button" className={`${compact ? "trackButton compact" : "trackButton"} ${tracked ? "isTracked" : ""}`} onClick={toggle}>
    {tracked ? "✓ Tracking" : "+ Track company"}
  </button>;
}
