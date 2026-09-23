import test from 'node:test';
import assert from 'node:assert/strict';
import { studioDraft, studioContent, emptyStudio } from '../dist/quest-studio-schema.js';
import { deleteStudioEntry } from '../dist/quest-studio-delete.js';
import { studioValidationMessage } from '../dist/quest-studio-errors.js';

const fixture = () => studioContent.parse({
  questConfig: { resetHour: 6, chapters: [{ id: 'chapter', title: 'Départ', order: 1, unlockMode: 'IMMEDIATE', questIds: ['quest'] }], quests: [{
    id: 'quest', title: 'L’épreuve / été - départ', description: 'À bientôt / salut !', category: 'AVENTURE', chapterId: 'chapter', chapterTitle: 'Départ',
    kind: 'SIDE', difficulty: 'NORMAL', icon: 'minecraft:book', accent: '#aabbcc', order: 1, autoStart: false, requires: [],
    objectives: [{ source: 'cobblemon_capture', label: 'Attrape un Pokémon / ami', target: 1, unique: false, filters: {} }], rewards: [],
  }] }, npcs: [{ id: 'person', name: 'Élodie / Guide - été', enabled: true, role: 'DIALOGUE_QUEST', dialogue: 'Prêt ?',
    dialogueGraph: { start: 'hello', nodes: [{ id: 'hello', title: 'Accueil', text: 'C’est l’été / bonjour !', choices: [{ label: 'C’est parti', target: '', action: 'accept:quest' }] }] },
    questIds: ['quest'], permission: 0, repeatableDialogue: true, skin: '', nameColor: 'NONE', visualRole: 'STORY', shopOffers: '',
  }],
});

test('French accents, apostrophes, slashes and hyphens are valid in all visible text', () => {
  assert.equal(studioContent.safeParse(fixture()).success, true);
  const draft = fixture(); draft.questConfig.quests[0].id = 'quête / été';
  const result = studioDraft.safeParse(draft);
  assert.equal(result.success, false);
  assert.match(studioValidationMessage(result.error), /questConfig.quests.0.id.*Identifiant technique/);
});
test('delete a quest removes simple links, retains unrelated content and is undoable without mutation', () => {
  const original = fixture(), snapshot = structuredClone(original);
  const deleted = deleteStudioEntry(original, 'quests', 'quest');
  assert.deepEqual(original, snapshot);
  assert.equal(deleted.questConfig.quests.length, 0);
  assert.deepEqual(deleted.questConfig.chapters[0].questIds, []);
  assert.deepEqual(deleted.npcs[0].questIds, []);
  assert.deepEqual(deleted.npcs[0].dialogueGraph.nodes[0].choices, []);
  assert.deepEqual(deleted.deleted.quests, ['quest']);
  assert.equal(studioContent.safeParse(deleted).success, true);
});
test('delete NPC preserves cumulative tombstones and last quest giver is protected', () => {
  assert.throws(() => deleteStudioEntry(fixture(), 'npcs', 'person'), /Seul personnage proposant/);
  const deleted = deleteStudioEntry(deleteStudioEntry(fixture(), 'quests', 'quest'), 'npcs', 'person');
  assert.equal(deleted.npcs.length, 0);
  assert.deepEqual(deleted.deleted, { quests: ['quest'], npcs: ['person'], chapters: [] });
  assert.equal(studioContent.safeParse(deleted).success, true);
});
test('delete chapter detaches, but never deletes its quests', () => {
  const draft = fixture();
  assert.throws(() => deleteStudioEntry(draft, 'chapters', 'chapter'), /Déplace d’abord/);
  draft.questConfig.chapters[0].questIds = [];
  const deleted = deleteStudioEntry(draft, 'chapters', 'chapter');
  assert.equal(deleted.questConfig.quests.length, 1);
  assert.equal(deleted.questConfig.quests[0].chapterId, '');
  assert.equal(deleted.questConfig.chapters.length, 0);
  assert.equal(studioContent.safeParse(deleted).success, true);
});
test('story prerequisites, dialogue conditions and talk objectives block deletion by name', () => {
  const draft = fixture();
  draft.questConfig.quests.push({ ...structuredClone(draft.questConfig.quests[0]), id: 'next', title: 'La suite', requires: ['quest'] });
  assert.throws(() => deleteStudioEntry(draft, 'quests', 'quest'), /La suite/);
  draft.questConfig.quests.pop();
  draft.npcs[0].dialogueGraph.nodes[0].when = { questId: 'quest', status: 'DONE' };
  assert.throws(() => deleteStudioEntry(draft, 'quests', 'quest'), /Condition de dialogue/);
  draft.questConfig.quests[0].objectives[0] = { ...draft.questConfig.quests[0].objectives[0], source: 'story_npc_talk', filters: { npc: 'person' } };
  assert.throws(() => deleteStudioEntry(draft, 'npcs', 'person'), /étape 1/);
});
test('invalid or contradictory tombstones cannot be published; legacy drafts stay compatible', () => {
  const draft = fixture(); draft.deleted = { quests: ['quest'], npcs: [], chapters: [] };
  assert.equal(studioContent.safeParse(draft).success, false);
  draft.deleted.quests = ['../unsafe'];
  assert.equal(studioDraft.safeParse(draft).success, false);
  assert.deepEqual(studioContent.parse(emptyStudio), emptyStudio);
});
