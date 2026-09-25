"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { InvestmentRecord } from "@/content/investments";

export function InvestmentTable({ records }: { records: InvestmentRecord[] }) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All sectors");
  const [province, setProvince] = useState("All locations");
  const [status, setStatus] = useState("All statuses");

  const sectors = ["All sectors", ...Array.from(new Set(records.map((r) => r.sector)))];
  const provinces = ["All locations", ...Array.from(new Set(records.map((r) => r.province)))];
  const statuses = ["All statuses", ...Array.from(new Set(records.map((r) => r.status)))];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      const haystack = `${record.company} ${record.action} ${record.location} ${record.sector}`.toLowerCase();
      return (!q || haystack.includes(q)) &&
        (sector === "All sectors" || record.sector === sector) &&
        (province === "All locations" || record.province === province) &&
        (status === "All statuses" || record.status === status);
    });
  }, [records, query, sector, province, status]);

  return <>
    <div className="terminalFilters">
      <label className="searchField"><span>Search</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Company, project, location…" /></label>
      <label><span>Sector</span><select value={sector} onChange={(e) => setSector(e.target.value)}>{sectors.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Location</span><select value={province} onChange={(e) => setProvince(e.target.value)}>{provinces.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
    </div>

    <div className="resultLine"><b>{filtered.length}</b> matching investments <span>Demo dataset</span></div>

    <div className="terminalTableWrap">
      <table className="terminalTable">
        <thead><tr><th>Date</th><th>Company</th><th>What they are doing</th><th>Investment</th><th>Location</th><th>Sector</th><th>Status</th></tr></thead>
        <tbody>{filtered.map((record) => <tr key={record.id}>
          <td className="monoCell">{record.date.slice(5)}</td>
          <td><Link className="companyLink" href={`/data/company/${record.companySlug}`}>{record.company}</Link></td>
          <td><Link href={`/data/project/${record.id}`} className="projectLink">{record.action}</Link><small>{record.sourceType}</small></td>
          <td className="valueCell">{record.valueLabel}</td>
          <td>{record.location}<small>{record.province}</small></td>
          <td>{record.sector}</td>
          <td><span className={`statusPill status-${record.status.toLowerCase()}`}>{record.status}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}
