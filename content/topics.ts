export type Topic = { slug: string; name: string; kicker: string; description: string; country?: string };
export const topics: Topic[] = [
  { slug: "thailand-electronics", name: "Thailand Electronics", kicker: "TECHNOLOGY", description: "Electronics, PCB, storage, power electronics and component investment in Thailand.", country: "Thailand" },
  { slug: "thailand-automotive", name: "Thailand Automotive", kicker: "MANUFACTURING", description: "Vehicle production, EV investment, suppliers, components and factory strategy in Thailand.", country: "Thailand" },
  { slug: "thailand-data-centres", name: "Thailand Data Centres", kicker: "TECHNOLOGY", description: "Cloud, AI infrastructure, hyperscale projects and digital investment in Thailand.", country: "Thailand" },
  { slug: "asian-semiconductors", name: "Asian Semiconductors", kicker: "TECHNOLOGY", description: "Foundries, packaging, equipment, materials and chip investment across Asia." },
  { slug: "asian-factory-investment", name: "Asian Factory Investment", kicker: "INVESTMENT", description: "New plants, expansions, industrial estates and manufacturing capex across Asia." },
  { slug: "asian-data-centres", name: "Asian Data Centres", kicker: "INVESTMENT", description: "Cloud infrastructure, hyperscale capacity and AI-related data-centre projects across Asia." }
];
