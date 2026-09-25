export type InvestmentRecord = {
  id: string;
  date: string;
  company: string;
  companySlug: string;
  action: string;
  valueThbBn: number;
  valueLabel: string;
  location: string;
  province: string;
  sector: string;
  status: "Announced" | "Confirmed" | "Construction" | "Operating";
  sourceType: "Primary filing" | "Company" | "Government" | "Secondary";
  sourceLabel: string;
  sourceUrl: string;
  note: string;
};

// Demo records for the product skeleton. Replace with verified live records before production use.
export const investmentRecords: InvestmentRecord[] = [
  {
    id: "TH-2026-0001",
    date: "2026-09-25",
    company: "Kinetra Electronics",
    companySlug: "kinetra-electronics",
    action: "Builds high-density PCB production plant",
    valueThbBn: 8.2,
    valueLabel: "฿8.2bn",
    location: "Amata City Chonburi",
    province: "Chonburi",
    sector: "Electronics",
    status: "Announced",
    sourceType: "Primary filing",
    sourceLabel: "Exchange disclosure",
    sourceUrl: "#",
    note: "New manufacturing capacity for high-density printed circuit boards."
  },
  {
    id: "TH-2026-0002",
    date: "2026-09-25",
    company: "NexCore Data Systems",
    companySlug: "nexcore-data-systems",
    action: "Expands hyperscale data-centre campus",
    valueThbBn: 12.0,
    valueLabel: "฿12.0bn",
    location: "Bang Na corridor",
    province: "Samut Prakan",
    sector: "Data centres",
    status: "Confirmed",
    sourceType: "Company",
    sourceLabel: "Investor relations release",
    sourceUrl: "#",
    note: "Second-phase expansion of an existing digital infrastructure campus."
  },
  {
    id: "TH-2026-0003",
    date: "2026-09-24",
    company: "Aster Motion",
    companySlug: "aster-motion",
    action: "Adds EV power-electronics line",
    valueThbBn: 3.6,
    valueLabel: "฿3.6bn",
    location: "Eastern Seaboard Industrial Estate",
    province: "Rayong",
    sector: "Automotive",
    status: "Construction",
    sourceType: "Government",
    sourceLabel: "BOI / government record",
    sourceUrl: "#",
    note: "Expansion covering inverters and power modules for regional vehicle programs."
  },
  {
    id: "TH-2026-0004",
    date: "2026-09-22",
    company: "Lumina Materials",
    companySlug: "lumina-materials",
    action: "Builds specialty chemicals facility",
    valueThbBn: 5.4,
    valueLabel: "฿5.4bn",
    location: "Map Ta Phut",
    province: "Rayong",
    sector: "Chemicals",
    status: "Announced",
    sourceType: "Primary filing",
    sourceLabel: "Exchange disclosure",
    sourceUrl: "#",
    note: "New specialty material capacity for electronics and industrial customers."
  },
  {
    id: "TH-2026-0005",
    date: "2026-09-20",
    company: "Shinsei Robotics",
    companySlug: "shinsei-robotics",
    action: "Opens industrial automation assembly hub",
    valueThbBn: 1.8,
    valueLabel: "฿1.8bn",
    location: "Bang Pa-in",
    province: "Ayutthaya",
    sector: "Automation",
    status: "Operating",
    sourceType: "Company",
    sourceLabel: "Company release",
    sourceUrl: "#",
    note: "Assembly and service base for industrial robots and motion-control systems."
  },
  {
    id: "TH-2026-0006",
    date: "2026-09-18",
    company: "Vertex Semiconductor",
    companySlug: "vertex-semiconductor",
    action: "Expands power-module packaging capacity",
    valueThbBn: 6.9,
    valueLabel: "฿6.9bn",
    location: "Hi-Tech Industrial Estate",
    province: "Ayutthaya",
    sector: "Semiconductors",
    status: "Confirmed",
    sourceType: "Primary filing",
    sourceLabel: "Exchange disclosure",
    sourceUrl: "#",
    note: "Additional packaging and test capacity for automotive and industrial devices."
  },
  {
    id: "TH-2026-0007",
    date: "2026-09-16",
    company: "Northstar Cloud",
    companySlug: "northstar-cloud",
    action: "Commits new cloud region infrastructure",
    valueThbBn: 19.5,
    valueLabel: "฿19.5bn",
    location: "Eastern Bangkok metropolitan area",
    province: "Chachoengsao",
    sector: "Data centres",
    status: "Announced",
    sourceType: "Company",
    sourceLabel: "Company announcement",
    sourceUrl: "#",
    note: "Multi-building cloud infrastructure program with phased commissioning."
  },
  {
    id: "TH-2026-0008",
    date: "2026-09-14",
    company: "Epsilon Food Systems",
    companySlug: "epsilon-food-systems",
    action: "Adds automated food-processing capacity",
    valueThbBn: 2.3,
    valueLabel: "฿2.3bn",
    location: "Rojana Industrial Park",
    province: "Ayutthaya",
    sector: "Food & bio",
    status: "Construction",
    sourceType: "Government",
    sourceLabel: "Government investment record",
    sourceUrl: "#",
    note: "New production and cold-chain automation for export-oriented processing."
  }
];

export const terminalStats = {
  announcedValue: 59.7,
  projectCount: investmentRecords.length,
  companyCount: new Set(investmentRecords.map((record) => record.company)).size,
  updatedAt: "25 Sep 2026 · 16:00 Bangkok"
};

export function getCompanyRecords(slug: string) {
  return investmentRecords.filter((record) => record.companySlug === slug);
}
