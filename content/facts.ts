export type OpenFact = {
  id: string;
  country: string;
  sector: string;
  subject: string;
  claim: string;
  capability: string[];
  status: "prototype" | "verified";
  sourceUrls: string[];
  updatedAt: string;
};

export const openFacts: OpenFact[] = [
  {
    id: "TDRASIA-TH-SYSTEM-0001",
    country: "Thailand",
    sector: "Publishing infrastructure",
    subject: "TDR Asia Open",
    claim: "TDR Asia stores source-backed industrial facts as reusable machine-readable records.",
    capability: ["structured data", "RSS", "JSON-LD", "AI retrieval"],
    status: "prototype",
    sourceUrls: [],
    updatedAt: "2026-09-25"
  }
];
