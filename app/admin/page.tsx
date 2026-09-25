import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata = { title: "Newsroom Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminPage(){return <div className="adminPage"><div className="shell"><div style={{display:"flex",justifyContent:"flex-end",paddingTop:16}}><a href="/admin/quick" style={{fontSize:13,fontWeight:700,textDecoration:"none"}}>Quick generate from URL →</a></div><AdminConsole/></div></div>}
