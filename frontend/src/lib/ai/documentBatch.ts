import {buildAIPrompt} from './attachments';
import type {AIAttachment} from './types';
export type AISection={id:string;text:string};
// Character-based grouping is a guardrail, not a model-specific token estimate.
export function groupAISections(sections:AISection[],maxChars=5000){
  const batches:AISection[][]=[];let current:AISection[]=[],size=0;
  for(const section of sections){const length=JSON.stringify(section).length;
    if(current.length&&(size+length>maxChars||current.length>=40)){batches.push(current);current=[];size=0;}
    current.push(section);size+=length;
  }
  if(current.length)batches.push(current);return batches;
}
export function buildDocumentPrompt(instruction:string,sections:AISection[],attachments:AIAttachment[],task:string){
  return buildAIPrompt(instruction,JSON.stringify(sections),attachments,task)+
    '\n[문서 수정 응답 규칙]\n대상 자료는 문단 배열입니다. 문단 순서와 구조를 유지하여 함께 검토하세요. 수정이 필요한 문단만 [{"id":"원본 id","text":"수정된 일반 텍스트"}] JSON 배열로 반환하세요. 수정이 없으면 []를 반환하세요. 원본 id를 바꾸거나 문단을 합치거나 나누지 마세요. JSON 바깥 설명·코드 펜스를 출력하지 마세요.';
}
export function readDocumentChanges(response:string,sections:AISection[]):Record<string,string>{
  let rows:unknown;try{rows=JSON.parse(response.trim().replace(/^```(?:json)?\s*\n/i,'').replace(/\n```\s*$/,''));}catch{throw Error('전체 문서 수정안 형식을 확인하지 못했습니다. 원문은 유지됩니다.');}
  if(!Array.isArray(rows))throw Error('문단별 수정안 배열이 필요합니다. 원문은 유지됩니다.');
  const allowed=new Set(sections.map(section=>section.id)),changes:Record<string,string>=Object.create(null);
  for(const row of rows){if(!row||typeof row.id!=='string'||!allowed.has(row.id)||Object.prototype.hasOwnProperty.call(changes,row.id)||typeof row.text!=='string'||!row.text.trim())throw Error('수정안의 문단 정보가 맞지 않습니다. 원문은 유지됩니다.');changes[row.id]=row.text;}
  return changes;
}
