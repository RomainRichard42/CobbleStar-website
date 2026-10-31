import catalog from '../../public-site/static/crates/catalog.json';
import directories from '../../api/vote-sites.json';
import VoteDashboard from './VoteDashboard';
export default function VotePage() {
  const machine=catalog.crates.find(c=>c.id==='vote')!;
  return <VoteDashboard initialSites={directories.sites.map(s=>({id:s.id,name:s.name,intervalMinutes:s.intervalMinutes,enabled:s.enabled,verificationEnabled:false,url:s.url.replace('{username}',''),availableAt:null}))} tiers={machine.tiers.map(t=>({name:t.name,chance:t.chance,ball:t.ball,total:t.rewards.length,rewards:t.rewards.slice(0,6).map(r=>({label:r.label.replace(/^Clé (Vote|Nova|Pulsar|Quasar)(?=\s|$)/i,'Jeton $1'),icon:r.icon,chance:r.chance}))}))}/>;
}
