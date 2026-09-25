import { stories } from "@/content/stories";import { openFacts } from "@/content/facts";
export const dynamic="force-static";
export function GET(){return Response.json({version:"0.1",publication:"TDR Asia",generatedAt:new Date().toISOString(),stories,openFacts},{headers:{"Cache-Control":"public, max-age=300"}})}
