"""Deterministic public battle catalogue from the exact Cobblemon jar and CobbleStar sources."""
import json, zipfile, hashlib, sys
from pathlib import Path

mod=Path(sys.argv[1]); site=Path(__file__).resolve().parent.parent
jar=mod/'.tmp/cobblemon-1.8-audit/Cobblemon-fabric-1.8.0+1.21.1.jar'
z=zipfile.ZipFile(jar)
lang=json.loads(z.read('assets/cobblemon/lang/fr_fr.json'))
for p in sorted((mod/'src/main/resources/assets').glob('*/lang/fr_fr.json')):
    lang.update(json.loads(p.read_text(encoding='utf-8-sig')))
species={}
for name in z.namelist():
    if name.startswith('data/cobblemon/species/') and name.endswith('.json'):
        species[Path(name).stem]=json.loads(z.read(name))
overrides=[]
for path in sorted((mod/'src/main/resources/data').glob('*/species_additions/**/*.json')):
    data=json.loads(path.read_text(encoding='utf-8-sig')); key=data.get('target','').split(':')[-1]
    if key not in species: continue
    overrides.append({'file':path.relative_to(mod).as_posix(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    original=species[key]
    for k,v in data.items():
        if k not in ('target','forms'): original[k]=v
    forms={f['name'].lower():f for f in original.get('forms',[])}
    for f in data.get('forms',[]): forms[f['name'].lower()]={**forms.get(f['name'].lower(),{}),**f}
    original['forms']=list(forms.values())
keys={'hp':'hp','attack':'atk','defence':'def','special_attack':'spa','special_defence':'spd','speed':'spe'}
catalog=json.loads((site/'api/dex.catalog.json').read_text(encoding='utf-8-sig'))['entries']
internal={e['species'] for e in catalog if e['collection']=='Créations CobbleStar'}
rows=[]
for key,base in sorted(species.items()):
    if key in internal or key=='cobblestar_egg' or 'admin_only' in base.get('labels',[]): continue
    for form in [{'name':'Normal','aspects':[]},*base.get('forms',[])]:
        f={**base,**form}
        if 'admin_only' in f.get('labels',[]):continue
        if not all(k in f.get('baseStats',{}) for k in keys):continue
        formid=form['name'].lower().replace(' ','-'); label='' if formid=='normal' else ' · '+form['name'].replace('Asteria','Astéria').replace('Nebelia','Nébélia')
        display=lang.get('cobblemon.species.'+key+'.name',base.get('name',key))
        abilities=[{'id':a.split(':')[-1],'name':lang.get('cobblemon.ability.'+a.split(':')[-1],a.split(':')[-1]),'hidden':a.startswith('h:')} for a in f.get('abilities',[]) if isinstance(a,str)]
        rows.append({'id':key+'--'+formid,'species':key,'name':display+label,'englishName':base.get('name',key),'form':form['name'],'aspects':form.get('aspects',[]),'types':[x.title() for x in [f.get('primaryType'),f.get('secondaryType')] if x],'baseStats':{v:f['baseStats'][k] for k,v in keys.items()},'weightkg':f.get('weight',1)/10,'nfe':bool(f.get('evolutions')),'abilities':abilities,'moves':sorted({s.split(':',1)[-1] for s in f.get('moves',[]) if ':' in s}),'number':base.get('nationalPokedexNumber',0),'custom':any(a.startswith('cobblestar_') for a in form.get('aspects',[]))})
out=site/'api/pokecalc';out.mkdir(exist_ok=True)
item_ids=sorted({Path(name).stem for name in z.namelist() if name.startswith('assets/cobblemon/models/item/') and name.endswith('.json')})
(out/'catalog.json').write_text(json.dumps({'source':{'cobblemon':'1.8.0','mod':next(l.split('=',1)[1] for l in (mod/'gradle.properties').read_text().splitlines() if l.startswith('mod_version=')),'jarSha256':hashlib.sha256(jar.read_bytes()).hexdigest(),'overrides':overrides},'pokemon':rows,'itemIds':item_ids,'labels':{k:v for k,v in lang.items() if k.startswith(('cobblemon.move.','cobblemon.nature.','cobblemon.ability.','item.cobblemon.')) and not k.endswith('.desc')}},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'forms':len(rows),'customForms':sum(p['custom'] for p in rows),'output':str(out/'catalog.json')}))
