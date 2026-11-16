// ====================================================================
// 📊 [OMD-AI-Types-0001] src/lib/ai/types.ts
// 🎯 @KICK  : 다중 AI 제공자, 모델, 입력 및 편집 대상 공통 타입 정의
// 🛡️ @GUARD : Rule 1(단일 주석 관리)
// 🚨 @PATCH : 2026-11-16 — [직접 연결(OpenAI 호환 · Custom) 지원] AIProvider에 'custom' 추가, CustomAIProviderConfig 신설 및 AIInput에 baseUrl/customId 추가
// 🚨 @PATCH : 2026-11-16 — [LG K-EXAONE 2.5 지원] AIProvider 유니온 타입에 'exaone' 추가
// ====================================================================
export type AIProvider = 'google'|'openai'|'anthropic'|'exaone'|'custom';
export type AIEditScope = 'selection'|'paragraph'|'document'|'reference'|'auto';
export interface AIModel {id:string;name:string;family:string}
export interface CustomAIProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  models?: AIModel[];
  updatedAt?: string;
}
export interface AIInput {model:string;prompt:string;images:{mime:string;data:string}[];baseUrl?:string;customId?:string}
export interface AITarget {
  documentId:string;label:string;text:string;rect:{top:number;left:number;bottom:number};
  getRect?:()=>{top:number;left:number;bottom:number};
  focus?:()=>void;
  valid:()=>boolean;
  apply:(result:string,mode:'replace'|'append')=>boolean;
  release:()=>void;
  sections?:{id:string;text:string}[];
  applySections?:(results:Record<string,string>)=>boolean;
}
export interface AIAttachment {id:string;name:string;size:number;text?:string;mime?:string;data?:string}
