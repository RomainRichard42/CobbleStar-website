import type { StudioContent } from './quest-studio-schema.js';

export type StudioSection = 'quests' | 'npcs' | 'chapters';

/** Explicit deletions only: an incomplete draft must never erase local game content. */
export function deleteStudioEntry(content: StudioContent, section: StudioSection, id: string): StudioContent {
  const draft = structuredClone(content);
  const entries = section === 'npcs' ? draft.npcs : draft.questConfig[section];
  if (!entries.some(entry => entry.id === id)) throw new Error('Cette fiche n’existe plus. Actualise le Studio.');
  const blockers: string[] = [];
  if (section === 'chapters') {
    const chapter = draft.questConfig.chapters.find(entry => entry.id === id)!;
    for (const quest of draft.questConfig.quests) if (chapter.questIds.includes(quest.id)) blockers.push(`Déplace d’abord « ${quest.title} » dans un autre chapitre, ou supprime cette quête`);
  }
  if (section === 'quests') {
    for (const quest of draft.questConfig.quests) if (quest.id !== id && quest.requires.includes(id)) blockers.push(`Prérequis de « ${quest.title} »`);
    for (const npc of draft.npcs) for (const node of npc.dialogueGraph.nodes) if (node.when?.questId === id) blockers.push(`Condition de dialogue : ${npc.name} / ${node.title}`);
  }
  if (section === 'npcs') for (const quest of draft.questConfig.quests) {
    quest.objectives.forEach((objective, index) => {
      if (objective.source === 'story_npc_talk' && objective.filters.npc === id) blockers.push(`« ${quest.title} », étape ${index + 1} : parler à ce personnage`);
    });
    const gives = (npc: StudioContent['npcs'][number]) => npc.enabled && ['DIALOGUE_QUEST', 'TURN_IN', 'SHOP'].includes(npc.role) && npc.questIds.includes(quest.id);
    if (!quest.autoStart && draft.npcs.some(npc => npc.id === id && gives(npc)) && !draft.npcs.some(npc => npc.id !== id && gives(npc))) blockers.push(`Seul personnage proposant « ${quest.title} » : choisis un autre personnage ou supprime d’abord cette quête`);
  }
  if (blockers.length) throw new Error(`Suppression bloquée pour ne pas casser les histoires. Modifie ces liens d’abord :\n${blockers.join('\n')}`);
  if (section === 'quests') {
    draft.questConfig.quests = draft.questConfig.quests.filter(quest => quest.id !== id);
    draft.questConfig.chapters.forEach(chapter => { chapter.questIds = chapter.questIds.filter(key => key !== id); });
    draft.npcs.forEach(npc => {
      npc.questIds = npc.questIds.filter(key => key !== id);
      npc.dialogueGraph.nodes.forEach(node => { node.choices = node.choices.filter(choice => choice.action !== `accept:${id}`); });
    });
  } else if (section === 'npcs') draft.npcs = draft.npcs.filter(npc => npc.id !== id);
  else {
    draft.questConfig.chapters = draft.questConfig.chapters.filter(chapter => chapter.id !== id);
    draft.questConfig.quests.forEach(quest => { if (quest.chapterId === id) { quest.chapterId = ''; quest.chapterTitle = ''; } });
  }
  draft.deleted ??= { quests: [], npcs: [], chapters: [] };
  draft.deleted[section] = [...new Set([...draft.deleted[section], id])];
  return draft;
}
