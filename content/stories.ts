export type Story = {
  slug: string;
  title: string;
  dek: string;
  country: "Thailand" | "China" | "Japan" | "Taiwan" | "Singapore" | "Asia";
  desk: "Technology" | "Manufacturing" | "Investment" | "Companies" | "Markets";
  publishedAt: string;
  readTime: string;
  kind: "News" | "Brief" | "Analysis";
  prototype?: boolean;
};

export const stories: Story[] = [
  {
    slug: "thailand-electronics-investment",
    title: "Thailand electronics investment moves deeper into components",
    dek: "New capacity in components, PCB and power electronics is widening Thailand's role in Asian electronics production.",
    country: "Thailand",
    desk: "Technology",
    publishedAt: "2026-09-25T08:30:00+07:00",
    readTime: "4 min",
    kind: "News",
    prototype: true
  },
  {
    slug: "thai-ev-supplier-cycle",
    title: "Thailand's EV supplier cycle shifts from vehicle assembly to local components",
    dek: "Battery systems, electronics and supplier investment are becoming a larger share of the country's next automotive investment cycle.",
    country: "Thailand",
    desk: "Manufacturing",
    publishedAt: "2026-09-25T08:05:00+07:00",
    readTime: "5 min",
    kind: "Analysis",
    prototype: true
  },
  {
    slug: "japan-robotics-capex",
    title: "Japanese automation suppliers prepare for another factory investment cycle",
    dek: "Robotics, machine tools and factory software remain central to the region's push toward higher-value manufacturing.",
    country: "Japan",
    desk: "Investment",
    publishedAt: "2026-09-25T07:40:00+09:00",
    readTime: "3 min",
    kind: "Brief",
    prototype: true
  },
  {
    slug: "taiwan-chip-supply-chain",
    title: "Taiwan chip suppliers keep expanding the equipment and materials stack",
    dek: "Investment around semiconductor equipment, materials and advanced packaging continues to spread through Asia.",
    country: "Taiwan",
    desk: "Technology",
    publishedAt: "2026-09-25T07:10:00+08:00",
    readTime: "4 min",
    kind: "News",
    prototype: true
  },
  {
    slug: "singapore-data-centres",
    title: "Singapore data-centre investment pushes toward higher-density infrastructure",
    dek: "AI demand is changing how regional operators think about power, cooling and new capacity.",
    country: "Singapore",
    desk: "Investment",
    publishedAt: "2026-09-25T06:50:00+08:00",
    readTime: "3 min",
    kind: "News",
    prototype: true
  },
  {
    slug: "thai-industrial-estates",
    title: "Thai industrial estates compete for the next wave of electronics projects",
    dek: "Power quality, logistics and supplier access are becoming more important as electronics investment broadens beyond final assembly.",
    country: "Thailand",
    desk: "Investment",
    publishedAt: "2026-09-25T06:20:00+07:00",
    readTime: "4 min",
    kind: "Brief",
    prototype: true
  },
  {
    slug: "thai-data-centre-buildout",
    title: "Thailand data-centre buildout draws another round of infrastructure spending",
    dek: "Cloud and AI workloads are increasing demand for large-scale digital infrastructure around Bangkok and the Eastern Economic Corridor.",
    country: "Thailand",
    desk: "Technology",
    publishedAt: "2026-09-25T05:45:00+07:00",
    readTime: "4 min",
    kind: "News",
    prototype: true
  }
];
