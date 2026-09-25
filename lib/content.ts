import { stories } from "@/content/stories";
import { topics } from "@/content/topics";
export const getStory = (slug: string) => stories.find((s) => s.slug === slug);
export const getTopic = (slug: string) => topics.find((t) => t.slug === slug);
