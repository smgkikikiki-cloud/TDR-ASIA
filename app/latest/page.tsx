import Link from "next/link";
import {stories} from "@/content/stories";
import {getPublishedCmsArticles} from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function Latest(){
  const cms=await getPublishedCmsArticles();
  const live=cms.map(a=>({slug:a.slug,title:a.title,dek:a.subheadline,country:"Thailand",desk:a.section,publishedAt:a.publishedAt||a.updatedAt,readTime:`${Math.max(1,Math.ceil(a.body.split(/\s+/).length/220))} min`}));
  const all=[...live,...stories].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
  return <div className="shell page"><div className="eyebrow">News</div><h1>Latest News</h1><div className="list">{all.map(s=><Link href={`/story/${s.slug}`} className="row" key={`${s.slug}-${s.publishedAt}`}><div className="meta">{s.country}<br/>{s.desk}<br/>{s.readTime}</div><div><h2>{s.title}</h2><p>{s.dek}</p></div></Link>)}</div></div>
}
