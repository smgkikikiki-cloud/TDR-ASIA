export type MegaStage = 'announced'|'approved'|'tendering'|'awarded'|'construction'|'completed';
export type MegaProject = { slug:string; name:string; sector:string; province:string; stage:MegaStage; valueThb:number; owner:string; summary:string; updated:string; };

export const megaProjects: MegaProject[] = [
  {slug:'eec-hsr',name:'High-Speed Rail Linking Three Airports',sector:'Rail',province:'Bangkok–Chonburi–Rayong',stage:'approved',valueThb:224544000000,owner:'State Railway of Thailand',summary:'Strategic rail link connecting Don Mueang, Suvarnabhumi and U-Tapao. Prototype record for the Mega interface.',updated:'2026-09-25'},
  {slug:'one-bangkok',name:'One Bangkok',sector:'Mixed-use',province:'Bangkok',stage:'construction',valueThb:120000000000,owner:'TCC Assets / Frasers Property',summary:'Large mixed-use district used here as a prototype private-development record.',updated:'2026-09-25'},
  {slug:'landbridge',name:'Southern Land Bridge Programme',sector:'Port & Logistics',province:'Ranong–Chumphon',stage:'announced',valueThb:1000000000000,owner:'Ministry of Transport',summary:'Strategic logistics programme represented as a prototype record; production data must be source-verified before launch.',updated:'2026-09-25'},
  {slug:'google-data-center',name:'Google Data Center Thailand',sector:'Data Center',province:'Chonburi',stage:'approved',valueThb:32800000000,owner:'Google / Alphabet',summary:'BOI-backed data-center investment used to demonstrate industrial-project coverage.',updated:'2026-09-25'}
];

export const megaCompanies = [
  {key:'srt',name:'State Railway of Thailand',type:'Project owner',projects:1},
  {key:'tcc-assets',name:'TCC Assets',type:'Developer',projects:1},
  {key:'frasers-property',name:'Frasers Property',type:'Developer',projects:1},
  {key:'google',name:'Google / Alphabet',type:'Investor',projects:1}
];

export const fmtThb = (n:number) => n >= 1e12 ? `฿${(n/1e12).toFixed(2)}T` : n >= 1e9 ? `฿${(n/1e9).toFixed(1)}B` : `฿${(n/1e6).toFixed(0)}M`;
