"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MegaProject } from "@/lib/mega-store";

const WATCHLIST_KEY = "tdr-mega-watchlist-v1";
const STAGE_ORDER = ["announced", "approved", "tendering", "awarded", "construction", "completed"];

function normalize(value: string | null | undefined) {
  return (value || "").toLowerCase().trim();
}

function formatThb(value: number) {
  if (value >= 1e12) return `฿${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `฿${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `฿${(value / 1e6).toFixed(0)}M`;
  return `฿${value.toLocaleString()}`;
}

export function MegaProjectExplorer({ projects, base }: { projects: MegaProject[]; base: string }) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [stage, setStage] = useState("all");
  const [province, setProvince] = useState("all");
  const [valueFloor, setValueFloor] = useState(0);
  const [sort, setSort] = useState("value-desc");
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [watched, setWatched] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(WATCHLIST_KEY) || "[]");
      if (Array.isArray(saved)) setWatched(saved.map(String));
    } catch {
      setWatched([]);
    }
  }, []);

  function toggleWatch(slug: string) {
    setWatched((current) => {
      const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
      window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  }

  const sectors = useMemo(() => [...new Set(projects.map((project) => project.sector).filter(Boolean))].sort(), [projects]);
  const provinces = useMemo(() => [...new Set(projects.map((project) => project.province).filter((value): value is string => Boolean(value)))].sort(), [projects]);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    const watchedSet = new Set(watched);
    return projects
      .filter((project) => {
        if (needle) {
          const haystack = normalize([project.name, project.owner, project.sector, project.province, project.location].filter(Boolean).join(" "));
          if (!haystack.includes(needle)) return false;
        }
        if (sector !== "all" && project.sector !== sector) return false;
        if (stage !== "all" && project.stage !== stage) return false;
        if (province !== "all" && project.province !== province) return false;
        if (project.valueThb < valueFloor) return false;
        if (watchedOnly && !watchedSet.has(project.slug)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "value-asc") return a.valueThb - b.valueThb;
        if (sort === "stage") return STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || b.valueThb - a.valueThb;
        if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
        return b.valueThb - a.valueThb;
      });
  }, [projects, query, sector, stage, province, valueFloor, sort, watchedOnly, watched]);

  const totalValue = filtered.reduce((sum, project) => sum + project.valueThb, 0);
  const preAward = filtered.filter((project) => ["announced", "approved", "tendering"].includes(project.stage)).length;
  const construction = filtered.filter((project) => project.stage === "construction").length;
  const watchedSet = new Set(watched);

  function reset() {
    setQuery("");
    setSector("all");
    setStage("all");
    setProvince("all");
    setValueFloor(0);
    setSort("value-desc");
    setWatchedOnly(false);
  }

  return (
    <div className="megaExplorer">
      <div className="megaExplorerStats">
        <div><b>{filtered.length}</b><span>projects shown</span></div>
        <div><b>{formatThb(totalValue)}</b><span>filtered value</span></div>
        <div><b>{preAward}</b><span>pre-award pipeline</span></div>
        <div><b>{construction}</b><span>under construction</span></div>
      </div>

      <div className="megaFilterPanel">
        <div className="megaFilterPrimary">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project, owner, province…" aria-label="Search projects" />
          <button type="button" className={`megaWatchToggle ${watchedOnly ? "active" : ""}`} onClick={() => setWatchedOnly((value) => !value)}>
            ★ Watchlist {watched.length ? `(${watched.length})` : ""}
          </button>
        </div>
        <div className="megaFilterGrid">
          <label><span>Sector</span><select value={sector} onChange={(event) => setSector(event.target.value)}><option value="all">All sectors</option>{sectors.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>Stage</span><select value={stage} onChange={(event) => setStage(event.target.value)}><option value="all">All stages</option>{STAGE_ORDER.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>Province</span><select value={province} onChange={(event) => setProvince(event.target.value)}><option value="all">All provinces</option>{provinces.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>Minimum value</span><select value={valueFloor} onChange={(event) => setValueFloor(Number(event.target.value))}><option value={0}>Any value</option><option value={1e9}>฿1B+</option><option value={10e9}>฿10B+</option><option value={50e9}>฿50B+</option><option value={100e9}>฿100B+</option></select></label>
          <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="value-desc">Value: high to low</option><option value="value-asc">Value: low to high</option><option value="stage">Project stage</option><option value="updated">Recently updated</option></select></label>
          <button type="button" className="megaReset" onClick={reset}>Reset filters</button>
        </div>
      </div>

      <div className="megaPipeline" aria-label="Project stage pipeline">
        {STAGE_ORDER.map((value) => {
          const count = filtered.filter((project) => project.stage === value).length;
          return <button type="button" key={value} className={stage === value ? "active" : ""} onClick={() => setStage((current) => current === value ? "all" : value)}><b>{count}</b><span>{value}</span></button>;
        })}
      </div>

      {filtered.length ? (
        <div className="megaTableWrap">
          <table className="megaTable megaProjectTable">
            <thead><tr><th>Watch</th><th>Project</th><th>Sector</th><th>Province</th><th>Stage</th><th>Value</th></tr></thead>
            <tbody>{filtered.map((project) => (
              <tr key={project.slug}>
                <td><button type="button" className={`megaStar ${watchedSet.has(project.slug) ? "active" : ""}`} onClick={() => toggleWatch(project.slug)} aria-label={`${watchedSet.has(project.slug) ? "Remove" : "Add"} ${project.name} ${watchedSet.has(project.slug) ? "from" : "to"} watchlist`}>★</button></td>
                <td><Link href={`${base}/projects/${project.slug}`}>{project.name}</Link><div className="megaMuted">{project.owner || "Owner not recorded"}</div></td>
                <td>{project.sector}</td>
                <td>{project.province || "—"}</td>
                <td><span className="megaStageBadge">{project.stage}</span></td>
                <td><b>{formatThb(project.valueThb)}</b></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div className="megaEmpty"><b>No projects match these filters.</b><button type="button" onClick={reset}>Clear filters</button></div>
      )}
    </div>
  );
}
