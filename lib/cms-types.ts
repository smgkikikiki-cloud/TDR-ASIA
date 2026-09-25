export type ArticleStatus = "draft" | "published" | "archived";
export type ArticleSection = "News" | "Investment" | "Companies";

export type TagType = "technology" | "industry" | "action" | "country" | "location" | "general";

export type CmsTag = {
  id: string;
  name: string;
  slug: string;
  type: TagType;
  active: boolean;
  createdAt: string;
};

export type CmsSource = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  priority: number;
  notes?: string;
};

export type Candidate = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt?: string;
  discoveredAt: string;
  suggestedTags: string[];
  selected?: boolean;
  generated?: boolean;
  ignored?: boolean;
  originType?: "discovery" | "breakout_followup";
  followupParentStoryId?: string;
  followupParentDistributionItemId?: string;
  followupAngleKey?: string;
};

export type CmsArticle = {
  id: string;
  slug: string;
  title: string;
  subheadline: string;
  section: ArticleSection;
  body: string;
  imageUrl: string;
  imageAlt: string;
  imageCredit: string;
  tagIds: string[];
  sourceUrls: string[];
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  candidateId?: string;
};

export type CmsState = {
  articles: CmsArticle[];
  tags: CmsTag[];
  sources: CmsSource[];
  candidates: Candidate[];
  lastDiscoveryAt?: string;
};
