import { investmentRecords } from "@/content/investments";

export type CompanyEntity = {
  slug: string;
  name: string;
  aliases: string[];
  ticker?: string;
  tags: string[];
  summary: string;
};

export const companies: CompanyEntity[] = [
  {
    slug: "kinetra-electronics",
    name: "Kinetra Electronics",
    aliases: ["Kinetra", "Kinetra Electronics Co."],
    ticker: "KNE",
    tags: ["Electronics", "PCB", "New Plant", "Chonburi"],
    summary: "Electronics manufacturer with tracked Thailand PCB investment activity."
  },
  {
    slug: "nexcore-data-systems",
    name: "NexCore Data Systems",
    aliases: ["NexCore"],
    ticker: "NCDS",
    tags: ["Data Center", "Cloud", "Expansion", "Samut Prakan"],
    summary: "Digital infrastructure operator with tracked Thailand data-centre expansion activity."
  },
  {
    slug: "aster-motion",
    name: "Aster Motion",
    aliases: ["Aster"],
    tags: ["Automotive", "EV", "Power Electronics", "Rayong"],
    summary: "Automotive electronics manufacturer with tracked EV power-electronics investment."
  },
  {
    slug: "lumina-materials",
    name: "Lumina Materials",
    aliases: ["Lumina"],
    tags: ["Chemicals", "Advanced Materials", "New Plant", "Rayong"],
    summary: "Specialty materials producer with tracked Thailand manufacturing investment."
  },
  {
    slug: "shinsei-robotics",
    name: "Shinsei Robotics",
    aliases: ["Shinsei"],
    ticker: "SRS",
    tags: ["Robotics", "Automation", "Machinery", "Ayutthaya"],
    summary: "Industrial automation company with tracked Thailand robot assembly and service activity."
  },
  {
    slug: "vertex-semiconductor",
    name: "Vertex Semiconductor",
    aliases: ["Vertex Semi", "Vertex"],
    ticker: "VTXS",
    tags: ["Semiconductor", "Power Module", "Electronics", "Ayutthaya"],
    summary: "Semiconductor company with tracked Thailand packaging and test investment."
  },
  {
    slug: "northstar-cloud",
    name: "Northstar Cloud",
    aliases: ["Northstar"],
    tags: ["Data Center", "Cloud", "AI Infrastructure", "Chachoengsao"],
    summary: "Cloud infrastructure operator with tracked Thailand capacity commitments."
  },
  {
    slug: "epsilon-food-systems",
    name: "Epsilon Food Systems",
    aliases: ["Epsilon Food"],
    tags: ["Food", "Automation", "Cold Chain", "Ayutthaya"],
    summary: "Food-processing company with tracked Thailand production automation investment."
  }
];

export function getCompany(slug: string) {
  return companies.find((company) => company.slug === slug);
}

export function getCompanySummary(slug: string) {
  const company = getCompany(slug);
  const records = investmentRecords.filter((record) => record.companySlug === slug);
  return {
    company,
    records,
    trackedValue: records.reduce((sum, record) => sum + record.valueThbBn, 0),
    latestDate: records[0]?.date ?? null
  };
}
