import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';

export type BibEntry = { key:string; type:string; title:string; author:string; year:string; publisher:string; journal:string; url:string; doi:string };
export function parseBibliography(content:string): {entries:BibEntry[]; duplicates:string[]; error:string} {
  if (!content.trim()) return {entries:[],duplicates:[],error:''};
  try {
    const seen=new Set<string>(),duplicates=new Set<string>();
    const entries=new Cite(content).data.map(item=>{
      const key=String(item['citation-key'] || item.id);
      if(seen.has(key.toLowerCase()))duplicates.add(key);seen.add(key.toLowerCase());
      return {key,type:item.type||'',title:item.title||'',author:(item.author||[]).map((a:any)=>a.literal||[a.family,a.given].filter(Boolean).join(', ')).join(' · '),
        year:String(item.issued?.['date-parts']?.[0]?.[0]||''),publisher:item.publisher||'',journal:item['container-title']||'',url:item.URL||'',doi:item.DOI||''};
    });
    return {entries,duplicates:Array.from(duplicates),error:''};
  }catch{return {entries:[],duplicates:[],error:'BibTeX 형식을 확인해 주세요. 중괄호, 따옴표 또는 필드 구분이 올바르지 않습니다.'};}
}
export const citationPattern=new RegExp('\\[@([\\p{L}\\p{N}_:\\-.+]+)\\]|(?<![\\p{L}\\p{N}_@])@([\\p{L}\\p{N}_:\\-.+]+)','gu');
export function citedKeys(source:string):string[]{
  const clean=source.replace(/^(?:```|~~~)[\s\S]*?^(?:```|~~~)[^\n]*$/gm,'').replace(/`[^`]*`/g,'');
  return Array.from(new Set(Array.from(clean.matchAll(citationPattern),m=>m[1]||m[2])));
}
export function citationLabel(entry:BibEntry):string { return [entry.author||entry.key,entry.year].filter(Boolean).join(', '); }

/** Runs after footnotes so the reference list is always last. Text nodes only:
 * code, links and HTML attributes are never rewritten by a global regex. */
export function rehypeBibliography(options:{content:string;suppressList?:boolean}){
  return (tree:any)=>{
    const parsed=parseBibliography(options.content||'');
    const map=new Map(parsed.entries.filter(e=>!parsed.duplicates.some(k=>k.toLowerCase()===e.key.toLowerCase())).map(e=>[e.key.toLowerCase(),e]));
    const used=new Map<string,BibEntry>();
    const text=(value:string)=>({type:'text',value});
    const element=(tagName:string,properties:any,children:any[])=>({type:'element',tagName,properties,children});
    const visit=(node:any)=>{
      if(['code','pre','a','script','style'].includes(node.tagName)||node.properties?.id==='refs')return;
      if(!node.children)return;
      node.children=node.children.flatMap((child:any)=>{
        if(child.type!=='text'){visit(child);return [child];}
        const parts:any[]=[];let offset=0;
        for(const match of child.value.matchAll(citationPattern)){
          if(match.index>offset)parts.push(text(child.value.slice(offset,match.index)));
          const key=match[1]||match[2],entry=map.get(key.toLowerCase());
          if(entry){used.set(entry.key,entry);parts.push(element('a',{href:'#bib-'+encodeURIComponent(entry.key),className:['citation'],title:entry.title},[text('('+citationLabel(entry)+')')]));}
          else parts.push(element('span',{className:['citation-missing'],title:'등록된 문헌을 찾을 수 없습니다. 참조문헌 관리에서 확인해 주세요.'},[text(match[0]+' (문헌 없음)')]));
          offset=match.index+match[0].length;
        }
        if(!offset)return [child];if(offset<child.value.length)parts.push(text(child.value.slice(offset)));return parts;
      });
    };visit(tree);
    if(!used.size || options.suppressList)return;
    const entries=Array.from(used.values()).sort((a,b)=>(a.author||a.key).localeCompare(b.author||b.key,'ko'));
    tree.children.push(element('section',{id:'refs',className:['references','csl-bib-body']},[
      element('h2',{},[text('참고문헌')]),...entries.map(e=>element('p',{id:'bib-'+encodeURIComponent(e.key),className:['csl-entry']},[text([e.author,e.year&&`(${e.year}).`,e.title,e.journal||e.publisher,e.doi?`https://doi.org/${e.doi}`:e.url].filter(Boolean).join(' '))]))
    ]));
  };
}
