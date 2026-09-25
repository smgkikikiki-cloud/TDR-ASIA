"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MakeStoryButton({ candidateId, disabled = false }: { candidateId: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function makeStory() {
    if (disabled || busy) return;
    let token = sessionStorage.getItem("tdr-admin-token") || "";
    if (!token) {
      token = window.prompt("Admin token") || "";
      if (!token) return;
      sessionStorage.setItem("tdr-admin-token", token);
    }

    setBusy(true);
    setMessage("");
    const res = await fetch("/api/newsroom/stories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({ candidateId }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (res.status === 401) {
      sessionStorage.removeItem("tdr-admin-token");
      setMessage("Wrong admin token");
      return;
    }
    if (!res.ok) {
      setMessage(json.error || "Could not create story");
      return;
    }

    setMessage("Story created");
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10 }}>
      <button
        type="button"
        onClick={makeStory}
        disabled={disabled || busy}
        style={{
          border: "1px solid #111",
          background: disabled ? "#eee" : "#111",
          color: disabled ? "#777" : "#fff",
          padding: "7px 10px",
          fontSize: 11,
          fontWeight: 800,
          cursor: disabled || busy ? "default" : "pointer",
        }}
      >
        {disabled ? "Story exists" : busy ? "Creating…" : "Make Story"}
      </button>
      {message ? <small style={{ color: "#666" }}>{message}</small> : null}
    </span>
  );
}
