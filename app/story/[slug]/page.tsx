import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {getStory} from "@/lib/content";
import {getCmsArticleBySlug,readCms} from "@/lib/cms-store";
import {site} from "@/content/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const live=await getCmsArticleBySlug(slug);
  if(live)return{title:live.title,description:live.subheadline,openGraph:{title:live.title,description:live.subheadline,type:"article",images:live.imageUrl?[live.imageUrl]:undefined}};
  const s=getStory(slug);if(!s)return{};return{title:s.title,description:s.dek,openGraph:{title:s.title,description:s.dek,type:"article"}};
}

export default async function StoryPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const live=await getCmsArticleBySlug(slug);
  if(live){
    const state=await readCms();
    const tagNames=live.tagIds.map(id=>state.tags.find(t=>t.id===id)?.name).filter(Boolean) as string[];
    const published=live.publishedAt||live.updatedAt;
    const jsonLd={"@context":"https://schema.org","@type":"NewsArticle",headline:live.title,description:live.subheadline,datePublished:published,author:{"@type":"Organization",name:"TDR Asia"},publisher:{"@type":"Organization",name:"TDR Asia"},mainEntityOfPage:`${site.url}/story/${live.slug}`,about:tagNames,image:live.imageUrl?[live.imageUrl]:undefined};
    return <div className="shell page"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/><div className="eyebrow">Thailand · {live.section}</div><h1>{live.title}</h1><p style={{fontSize:20,lineHeight:1.5,maxWidth:820,color:'#4b525b'}}>{live.subheadline}</p><div className="meta">{new Date(published).toLocaleString("en-GB")} · TDR Asia</div>{tagNames.length>0&&<div className="trackerTags" style={{marginTop:14}}>{tagNames.map(t=><span key={t}>{t}</span>)}</div>}{live.imageUrl&&<figure className="articleHero"><img src={live.imageUrl} alt={live.imageAlt||live.title}/>{live.imageCredit&&<figcaption>{live.imageCredit}</figcaption>}</figure>}<div className="prose" style={{marginTop:32}}>{live.body.split(/\n\n+/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</div>{live.sourceUrls.length>0&&<div className="articleSources"><b>Source</b>{live.sourceUrls.map((u,i)=><a key={u+i} href={u} target="_blank" rel="noreferrer">{u}</a>)}</div>}</div>
  }
  const s=getStory(slug);if(!s)notFound();const jsonLd={"@context":"https://schema.org","@type":"NewsArticle",headline:s.title,description:s.dek,datePublished:s.publishedAt,author:{"@type":"Organization",name:"TDR Asia"},publisher:{"@type":"Organization",name:"TDR Asia"},mainEntityOfPage:`${site.url}/story/${s.slug}`,about:[s.country,s.desk]};return <div className="shell page"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/><div className="eyebrow">{s.country} · {s.desk}</div><h1>{s.title}</h1><p style={{fontSize:20,lineHeight:1.5,maxWidth:820,color:'#4b525b'}}>{s.dek}</p><div className="meta">{new Date(s.publishedAt).toLocaleString("en-GB")} · {s.readTime}</div><div className="prose" style={{marginTop:32}}><p>This is demo content for the TDR Asia news skeleton.</p></div></div>
}
