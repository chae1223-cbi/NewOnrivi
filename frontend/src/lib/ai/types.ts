export type AIProvider = 'google'|'openai'|'anthropic';
export type AIEditScope = 'selection'|'paragraph'|'document'|'reference'|'auto';
export interface AIModel {id:string;name:string;family:string}
export interface AIInput {model:string;prompt:string;images:{mime:string;data:string}[]}
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
