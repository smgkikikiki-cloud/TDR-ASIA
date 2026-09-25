import Link from "next/link";
import { stories } from "@/content/stories";
import { topics } from "@/content/topics";

function StoryMeta({story}:{story:(typeof stories)[number]}){return <div className="storyMeta"><span>{story.desk}</span><span>{story.country}</span><span>{story.readTime}</span></div>}

export default function Home(){
  const [lead,...rest]=stories;
  const side=rest.slice(0,2);
  const latest=stories.slice(1,7);
  const tech=stories.filter(s=>s.desk==="Technology"||s.desk==="Manufacturing").slice(0,3);
  const investment=stories.filter(s=>s.desk==="Investment").slice(0,3);
  return <>
    <div className="breaking"><div className="shell breakingInner"><b>BREAKING</b><span>Thailand electronics investment moves deeper into components</span><span>Japanese automation suppliers prepare for another factory cycle</span></div></div>
    <div className="shell home">
      <section className="leadGrid newsroomLead">
        <Link href={`/story/${lead.slug}`} className="leadStory">
          <div className="leadImage newsroomImage"><span>TDR ASIA FILE</span></div>
          <StoryMeta story={lead}/>
          <h1>{lead.title}</h1>
          <p>{lead.dek}</p>
        </Link>
        <aside className="headlineRail">
          <div className="blockTitle">Top Stories</div>
          {side.map((s,i)=><Link href={`/story/${s.slug}`} className="railStory" key={s.slug}><div className={`railImage railTone${i+1}`}></div><StoryMeta story={s}/><h2>{s.title}</h2><p>{s.dek}</p></Link>)}
        </aside>
      </section>

      <section className="newsSection newsroomLatest">
        <div className="sectionBar"><h2>Latest News</h2><Link href="/latest">ALL LATEST →</Link></div>
        <div className="latestLayout"><div className="latestList">{latest.map(s=><Link href={`/story/${s.slug}`} className="newsRow" key={s.slug}><div className="thumb"></div><div><StoryMeta story={s}/><h3>{s.title}</h3><p>{s.dek}</p></div></Link>)}</div><aside className="marketBox newspaperSide"><div className="blockTitle">Investment Monitor</div><div className="sideStat"><strong>THAILAND</strong><span>Tracked corporate investment</span></div><Link href="/data/projects" className="sideLink">Open investment database →</Link><div className="sideRule"></div><div className="blockTitle compactTitle">Popular Tags</div><div className="tagCloud"><Link href="/topic/robotics">ROBOTICS</Link><Link href="/topic/semiconductor">SEMICONDUCTOR</Link><span>JAPAN</span><span>DATA CENTER</span><span>PCB</span><span>NEW PLANT</span></div><Link href="/tracker" className="trackerPromo"><small>PRO</small><b>Track companies & tags</b><span>Build a personal monitoring feed →</span></Link></aside></div>
      </section>

      <section className="newsSection"><div className="sectionBar"><h2>Technology & Manufacturing</h2><Link href="/technology">VIEW ALL →</Link></div><div className="cardGrid newspaperCards">{tech.map((s,i)=><Link href={`/story/${s.slug}`} className="newsCard" key={s.slug}><div className={`cardImage tone${i+1}`}></div><StoryMeta story={s}/><h3>{s.title}</h3><p>{s.dek}</p></Link>)}</div></section>

      <section className="newsSection"><div className="sectionBar"><h2>Investment</h2><Link href="/investment">VIEW ALL →</Link></div><div className="cardGrid newspaperCards">{investment.map((s,i)=><Link href={`/story/${s.slug}`} className="newsCard" key={s.slug}><div className={`cardImage tone${i+2}`}></div><StoryMeta story={s}/><h3>{s.title}</h3><p>{s.dek}</p></Link>)}</div></section>

      <section className="newsSection"><div className="sectionBar"><h2>Topics</h2></div><div className="topicGrid">{topics.map(t=><Link href={`/topic/${t.slug}`} className="topicLink" key={t.slug}><small>{t.kicker}</small><b>{t.name}</b></Link>)}</div></section>
    </div>
  </>;
}
