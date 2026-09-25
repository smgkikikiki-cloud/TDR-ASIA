import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata = { title: "Newsroom Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminPage(){return <div className="adminPage"><div className="shell"><AdminConsole/></div></div>}
