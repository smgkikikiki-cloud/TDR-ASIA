import { CompanyTrackerDashboard } from "@/components/terminal/CompanyTrackerDashboard";
import { companies } from "@/content/companies";
import { investmentRecords } from "@/content/investments";

export default function TrackerPage() {
  return <main className="trackerPage newsroomTracker">
    <div className="trackerSectionBand"><div className="shell"><strong>TRACKER</strong><span>Companies · Tags · Alerts</span></div></div>
    <div className="shell trackerShell"><CompanyTrackerDashboard companies={companies} records={investmentRecords} /></div>
  </main>;
}
