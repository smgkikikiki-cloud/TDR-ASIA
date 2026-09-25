import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { stories } from "@/content/stories";
import { topics } from "@/content/topics";
import { companies } from "@/content/companies";
import { investmentRecords } from "@/content/investments";

export default function sitemap(): MetadataRoute.Sitemap {
  const fixed = ["", "/latest", "/technology", "/investment", "/companies", "/markets", "/data", "/data/projects", "/tracker", "/subscribe", "/features", "/research", "/open", "/media", "/about"]
    .map((path) => ({ url: `${site.url}${path}`, lastModified: new Date() }));
  return [
    ...fixed,
    ...stories.map((story) => ({ url: `${site.url}/story/${story.slug}`, lastModified: new Date(story.publishedAt) })),
    ...topics.map((topic) => ({ url: `${site.url}/topic/${topic.slug}`, lastModified: new Date() })),
    ...companies.map((company) => ({ url: `${site.url}/data/company/${company.slug}`, lastModified: new Date() })),
    ...investmentRecords.map((record) => ({ url: `${site.url}/data/project/${record.id}`, lastModified: new Date(record.date) }))
  ];
}
