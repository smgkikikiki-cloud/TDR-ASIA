import Link from "next/link";

export default function SubscribePage() {
  return <main className="page subscribePage"><div className="shell">
    <div className="newsKicker">TDR ASIA SUBSCRIPTIONS</div>
    <h1>Tracker Pro</h1>
    <p className="subscribeLead">The journalism stays open. Subscribe for monitoring, alerts, history and export tools.</p>
    <div className="pricingNewsGrid">
      <section className="pricingNewsCard featuredPlan"><span>INDIVIDUAL</span><h2>Tracker Pro</h2><div className="priceLine"><strong>฿990</strong><small>/ month</small></div><ul><li>Company tracking</li><li>Tag and combined-tag radars</li><li>Instant / daily / weekly alerts</li><li>Full historical search</li><li>CSV / XLSX export</li></ul><a href="#" className="subscribeButton">Start subscription</a></section>
      <section className="pricingNewsCard"><span>TEAM</span><h2>Tracker Team</h2><div className="priceLine"><strong>฿4,900</strong><small>/ month</small></div><ul><li>Everything in Pro</li><li>Up to 10 users</li><li>Shared watchlists</li><li>Larger exports</li><li>Priority support</li></ul><a href="#" className="subscribeButton secondary">Contact TDR Asia</a></section>
    </div>
    <p className="pricingNote">Prototype pricing for product testing. Public news, company pages and individual investment records remain open.</p>
    <Link href="/tracker" className="backToTracker">← Back to Tracker</Link>
  </div></main>;
}
