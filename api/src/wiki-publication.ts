import {isDeepStrictEqual} from 'node:util';
type Article = {id:string; published:boolean; modifiedAt?:string};
type Document<T extends Article> = {articles:T[]};

// Dates belong to published content, never to draft saves or a site's build time.
export function stampWikiPublication<T extends Article>(draft:Document<T>, previous:Document<T>, now:string):T[] {
  const old=new Map(previous.articles.map(a=>[a.id,a]));
  const content=(a:T)=>Object.fromEntries(Object.entries(a).filter(([key])=>!['modifiedAt','order','published'].includes(key)));
  return draft.articles.map(article=>{
    const before=old.get(article.id);
    const clean={...article}; delete clean.modifiedAt;
    const changed=article.published&&(!before?.published||!isDeepStrictEqual(content(article),content(before)));
    const modifiedAt=changed?now:before?.modifiedAt;
    return {...clean,...(modifiedAt?{modifiedAt}:{})} as T;
  });
}
