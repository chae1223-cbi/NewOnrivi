import React from 'react';
import { citedKeys, parseBibliography } from '@/lib/bibliography';
export default function BibliographySummary({source,content}:{source:string;content:string}){
  const parsed=React.useMemo(()=>parseBibliography(content),[content]);
  const keys=citedKeys(source), used=new Set(keys.map(k=>k.toLowerCase()));
  const entries=parsed.entries.filter(e=>used.has(e.key.toLowerCase())).sort((a,b)=>(a.author||a.key).localeCompare(b.author||b.key,'ko'));
  const missing=keys.filter(k=>!parsed.entries.some(e=>e.key.toLowerCase()===k.toLowerCase()));
  if(!keys.length)return null;
  return <section className="references mt-8 border-t pt-4" aria-label="참고문헌" contentEditable={false}>
    <h2 className="font-bold text-xl mb-4">참고문헌</h2>
    {parsed.error&&<p role="alert">{parsed.error}</p>}
    {parsed.duplicates.length>0&&<p role="alert">중복 인용키: {parsed.duplicates.join(', ')}</p>}
    {missing.length>0&&<p role="alert">등록된 문헌 없음: {missing.join(', ')}. 참조문헌 관리에서 등록해 주세요.</p>}
    {entries.filter(e=>!parsed.duplicates.some(k=>k.toLowerCase()===e.key.toLowerCase())).map(e=><p id={'bib-'+encodeURIComponent(e.key)} key={e.key} className="mb-3">{[e.author,e.year&&`(${e.year}).`,e.title,e.journal||e.publisher,e.doi?`https://doi.org/${e.doi}`:e.url].filter(Boolean).join(' ')}</p>)}
  </section>;
}
