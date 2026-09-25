import Link from "next/link";
import { InvestmentTable } from "@/components/terminal/InvestmentTable";
import { investmentRecords } from "@/content/investments";

export default function ProjectsPage() {
  return <main className="terminalPage">
    <div className="terminalTop shell">
      <div>
        <div className="terminalEyebrow">Thailand Investment Monitor</div>
        <h1>Search Database</h1>
        <p>Search tracked foreign corporate investment projects in Thailand.</p>
      </div>
      <div className="terminalActions"><Link href="/data">Live Deals</Link><button type="button">Export CSV</button></div>
    </div>
    <div className="shell"><InvestmentTable records={investmentRecords} /></div>
  </main>;
}
