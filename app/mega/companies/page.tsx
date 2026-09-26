import { getMegaCompanies } from '@/lib/mega-store';

export default async function CompaniesPage(){
  const companies=await getMegaCompanies();
  return <section className="megaSection"><div className="megaShell">
    <div className="megaSectionHead"><div><div className="megaEyebrow">Entity graph</div><h2>Companies & authorities</h2><p className="megaMuted megaSectionIntro">Entities are linked to projects by explicit roles. The graph starts with verified owners and can expand into developers, concessionaires, contractors, EPCs, consultants, suppliers and operators.</p></div><span className="megaMuted">{companies.length} entities</span></div>
    <div className="megaGrid">{companies.map(company=><div className="megaCompany" key={company.id}><div className="megaMeta">{company.roles.map(role=><span className="megaPill" key={role}>{role.replaceAll('_',' ')}</span>)}</div><b>{company.name}</b><span>{company.companyType||'Entity'}</span><span>{company.projects} linked project{company.projects===1?'':'s'}</span>{company.website?<a className="megaLink" href={company.website} target="_blank" rel="noreferrer">Website ↗</a>:null}</div>)}</div>
  </div></section>;
}
