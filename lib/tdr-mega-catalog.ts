import "server-only";

export type MegaCatalogProject = { slug:string; name:string };
export type MegaProjectMatch = { project:MegaCatalogProject; score:number; matchedAlias:string };

function normalize(value:string){return value.toLowerCase().normalize("NFKC").replace(/[–—-]/g," ").replace(/[^a-z0-9ก-๙]+/g," ").replace(/\s+/g," ").trim();}

const catalog: Array<MegaCatalogProject & {aliases:string[]}> = [
  {slug:"high-speed-rail-three-airports",name:"High-Speed Rail Linking Three Airports",aliases:["high speed rail linking three airports","three airports high speed rail","3 airports high speed rail","don mueang suvarnabhumi utapao","รถไฟความเร็วสูงเชื่อมสามสนามบิน","รถไฟความเร็วสูงเชื่อม 3 สนามบิน"]},
  {slug:"utapao-airport-eastern-aviation-city",name:"U-Tapao Airport and Eastern Aviation City",aliases:["u tapao airport eastern aviation city","utapao airport","สนามบินอู่ตะเภา","เมืองการบินภาคตะวันออก"]},
  {slug:"laem-chabang-port-phase-3",name:"Laem Chabang Port Phase 3",aliases:["laem chabang port phase 3","ท่าเรือแหลมฉบัง ระยะที่ 3","ท่าเรือแหลมฉบัง เฟส 3"]},
  {slug:"map-ta-phut-industrial-port-phase-3",name:"Map Ta Phut Industrial Port Phase 3",aliases:["map ta phut industrial port phase 3","ท่าเรือมาบตาพุด ระยะที่ 3","ท่าเรืออุตสาหกรรมมาบตาพุด ระยะที่ 3"]},
  {slug:"eeciti-central-infrastructure-ppp",name:"EECiti Central Infrastructure PPP",aliases:["eeciti central infrastructure","eec business center livable smart city","ศูนย์ธุรกิจ eec","เมืองใหม่น่าอยู่อัจฉริยะ"]},
  {slug:"quartz-computing-google-hyperscale-chonburi",name:"Quartz Computing / Google Hyperscale Data Center",aliases:["quartz computing","google hyperscale data center chonburi","google data center thailand","google data center chonburi","ศูนย์ข้อมูล google","ดาต้าเซ็นเตอร์ google"]},
  {slug:"beijing-haoyang-cloud-data-rayong",name:"Beijing Haoyang Cloud Data Center",aliases:["beijing haoyang cloud data","haoyang data center rayong","haoyang cloud data"]},
  {slug:"stellar-dc-bangkok",name:"Stellar DC Bangkok",aliases:["stellar dc bangkok","stellar data center bangkok"]},
  {slug:"datasection-ai-hosting-bangkok-pathumthani",name:"Datasection AI Hosting Infrastructure",aliases:["datasection thailand","datasection ai hosting"]}
];

export function resolveTdrMegaProject(headline:string,summary?:string|null):MegaProjectMatch|null{
  const text=normalize(`${headline} ${summary||""}`); if(!text)return null;
  const matches=catalog.flatMap((project)=>{
    const aliases=[project.name,project.slug.replace(/-/g," "),...project.aliases].map(normalize).filter(Boolean);
    const hit=aliases.map((alias)=>({alias,score:alias.length})).filter(({alias})=>text.includes(alias)).sort((a,b)=>b.score-a.score)[0];
    return hit?[{project:{slug:project.slug,name:project.name},score:hit.score,matchedAlias:hit.alias} satisfies MegaProjectMatch]:[];
  }).sort((a,b)=>b.score-a.score);
  if(!matches.length)return null; if(matches[1]&&matches[0].score-matches[1].score<4)return null; return matches[0];
}
