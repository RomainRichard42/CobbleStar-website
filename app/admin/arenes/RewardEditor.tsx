"use client";

import { ChoiceField, NumberField } from "./Fields";
import type { Catalog, RewardSpec } from "./model";
import s from "./arenas.module.css";

export function RewardEditor({ rewards, catalog, onChange, champion = false, league = false }: { rewards: RewardSpec; catalog: Catalog | null; onChange: (rewards: RewardSpec) => void; champion?: boolean; league?: boolean }) {
  return <section><div className={s.sectionHeading}><div><h3>La victoire mérite son souvenir.</h3><p>Récompenses de première victoire, par joueur. Les rejouer ne permet pas de les obtenir à nouveau.</p></div></div>
    {champion && <div className={s.badgeReward}><span>✦</span><div><b>{league ? "Progression de Ligue automatique" : "Badge d’épreuve automatique"}</b><p>{league ? "La victoire valide l’étape ; vaincre le Maître complète la Ligue." : "Le badge est validé après la vraie victoire contre ce champion. Il ne peut pas être retiré de ses récompenses."}</p></div><small>TOUJOURS INCLUS</small></div>}
    <div className={s.grid}><NumberField label="CobbleCoins offerts" max={1000000} value={rewards.cobbleCoins} onChange={cobbleCoins => onChange({ ...rewards, cobbleCoins })}/><NumberField label="Points d’expérience Minecraft" max={100000} value={rewards.experiencePoints} onChange={experiencePoints => onChange({ ...rewards, experiencePoints })}/></div>
    <section className={s.subsection}><div className={s.sectionHeading}><h4>Objets offerts</h4><span className={s.pill}>{rewards.items.length} / 8</span></div>{!rewards.items.length && <p className={s.hint}>Aucun objet supplémentaire. Tu peux offrir des Poké Balls, objets de soin ou tout autre objet enregistré sur le serveur.</p>}
      <div className={s.rewardRows}>{rewards.items.map((reward, i) => <div key={i}><ChoiceField label={`Objet offert ${i + 1}`} choices={catalog?.items} value={reward.item} onChange={item => onChange({ ...rewards, items: rewards.items.map((r, j) => j === i ? { ...r, item } : r) })}/><NumberField label={`Quantité ${i + 1}`} min={1} max={64} value={reward.count} onChange={count => onChange({ ...rewards, items: rewards.items.map((r, j) => j === i ? { ...r, count } : r) })}/><button className={s.danger} type="button" aria-label={`Retirer l’objet ${i + 1}`} onClick={() => onChange({ ...rewards, items: rewards.items.filter((_, j) => j !== i) })}>Retirer</button></div>)}</div>
      <button type="button" disabled={rewards.items.length >= 8 || !catalog?.items.length} onClick={() => onChange({ ...rewards, items: [...rewards.items, { item: catalog!.items[0].id, count: 1 }] })}>＋ Ajouter un objet</button>
    </section>
  </section>;
}
