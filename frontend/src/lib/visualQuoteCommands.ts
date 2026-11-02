import {Fragment,Node as DocumentNode} from 'prosemirror-model';
import {Command,EditorState,TextSelection,Transaction} from 'prosemirror-state';
import {closeHistory} from 'prosemirror-history';
import {visualSchema} from './visualDocumentCodec';

const isList=(node:DocumentNode)=>['bullet_list','ordered_list'].includes(node.type.name);
const bounded=(value:number)=>Math.max(0,Math.min(4096,Math.round(value*100)/100));

function quoteStep(view?:any){
  if(!view)return 28;
  const css=getComputedStyle(view.dom),value=css.getPropertyValue('--list-indent').trim();
  const font=Number.parseFloat(css.fontSize)||16;
  return value.endsWith('px')?Number.parseFloat(value):value.endsWith('em')?Number.parseFloat(value)*font:font*2;
}

function restoreSelection(tr:Transaction,state:EditorState){
  const locate=(position:any)=>{
    let found:number|undefined;
    tr.doc.descendants((node,pos)=>{if(node===position.parent && found===undefined)found=pos+1+position.parentOffset;});
    return found;
  };
  const anchor=locate(state.selection.$anchor),head=locate(state.selection.$head);
  if(anchor!==undefined && head!==undefined)tr.setSelection(TextSelection.create(tr.doc,anchor,head));
}

/** Split only the active list at its quote boundaries. Quotes retain their
 * existing physical indentation, but no longer belong to a movable list item. */
function detachQuotes(state:EditorState,view?:any):Transaction|null{
  const {$from,$to}=state.selection;
  let depth=0;
  for(let d=1;d<$from.depth;d++)if(isList($from.node(d))){depth=d;break;}
  if(!depth || $to.depth<depth || $to.node(depth)!==$from.node(depth))return null;
  const root=$from.node(depth),rootPos=$from.before(depth);
  let found=false;root.descendants(node=>{if(node.type===visualSchema.nodes.blockquote){found=true;return false;}});
  if(!found)return null;
  type Part={node:DocumentNode;quote:boolean};
  const rootDom=view?.nodeDOM(rootPos) as HTMLElement|undefined;
  const split=(list:DocumentNode,listPos:number,level:number):Part[]=>{
    const output:Part[]=[],items:DocumentNode[]=[];let firstIndex=0;
    const flush=()=>{
      if(!items.length)return;
      const attrs={...list.attrs,...(list.type===visualSchema.nodes.ordered_list?{order:(list.attrs.order||1)+firstIndex}:{})};
      output.push({node:list.type.create(attrs,Fragment.fromArray([...items])),quote:false});items.length=0;
    };
    list.forEach((item,itemOffset,itemIndex)=>{
      let children:DocumentNode[]=[],afterQuote=false;
      const flushItem=()=>{
        if(!children.length)return;
        if(afterQuote){flush();output.push(...children.map(node=>({node,quote:false})));}
        else {if(!items.length)firstIndex=itemIndex;items.push(item.copy(Fragment.fromArray(children)));}
        children=[];
      };
      item.forEach((child,childOffset)=>{
        const pos=listPos+1+itemOffset+1+childOffset;
        let parts:Part[];
        if(isList(child))parts=split(child,pos,level+1);
        else if(child.type===visualSchema.nodes.blockquote){
          const dom=view?.nodeDOM(pos) as HTMLElement|undefined;
          const offset=dom && rootDom?dom.getBoundingClientRect().left-rootDom.getBoundingClientRect().left:level*quoteStep(view)+(Number(child.attrs.indentPx)||0);
          parts=[{node:child.type.create({...child.attrs,indentPx:bounded(offset)},child.content,child.marks),quote:true}];
        }else parts=[{node:child,quote:false}];
        for(const part of parts){
          if(part.quote){flushItem();flush();output.push(part);afterQuote=true;}
          else children.push(part.node);
        }
      });
      flushItem();
    });
    flush();return output;
  };
  const parts=split(root,rootPos,1);
  const tr=state.tr.replaceWith(rootPos,rootPos+root.nodeSize,parts.map(part=>part.node));
  restoreSelection(tr,state);return tr;
}

export function withIndependentQuotes(command:Command):Command{
  return (state,dispatch,view)=>{
    const tr=detachQuotes(state,view);
    if(!tr)return command(state,dispatch,view);
    const prepared=state.apply(tr);
    let changed:Transaction|undefined;
    const handled=command(prepared,dispatch?next=>{changed=next;}:undefined,view);
    if(!handled)return false;
    if(dispatch){
      if(changed){for(const step of changed.steps)tr.step(step);tr.setSelection(TextSelection.create(tr.doc,changed.selection.anchor,changed.selection.head));}
      dispatch(closeHistory(tr).scrollIntoView());
    }
    return true;
  };
}

/** Tab changes this quote's margin, never the list or quote preceding it. */
export function quoteIndent(backward=false):Command{
  const command=withIndependentQuotes((state,dispatch,view)=>{
    const {$from}=state.selection;let depth=0;
    for(let d=1;d<$from.depth;d++)if($from.node(d).type===visualSchema.nodes.blockquote){depth=d;break;}
    if(!depth)return false;
    if(dispatch){
      const node=$from.node(depth),dom=view?.nodeDOM($from.before(depth)) as HTMLElement|undefined;
      const current=node.attrs.indentPx ?? (dom?Number.parseFloat(getComputedStyle(dom).marginLeft)||0:0);
      const indentPx=bounded(current+(backward?-1:1)*quoteStep(view));
      dispatch(closeHistory(state.tr.setNodeMarkup($from.before(depth),undefined,{...node.attrs,indentPx})).scrollIntoView());
    }
    return true;
  });
  return (state,dispatch,view)=>{
    let quoteDepth=0,itemDepth=0;
    const {$from}=state.selection;
    for(let d=1;d<$from.depth;d++){
      if($from.node(d).type===visualSchema.nodes.blockquote)quoteDepth=d;
      if($from.node(d).type===visualSchema.nodes.list_item)itemDepth=d;
    }
    if(!quoteDepth || itemDepth>quoteDepth)return false;
    return command(state,dispatch,view);
  };
}

/** Do not let generic joinForward turn a quote into the next list item. */
export const protectQuoteBoundary:Command=(state)=>{
  const {$from,empty}=state.selection;
  if(!empty || !$from.parent.isTextblock || $from.parentOffset!==$from.parent.content.size)return false;
  let inList=false,inQuote=false;
  for(let d=1;d<$from.depth;d++){inList ||= $from.node(d).type===visualSchema.nodes.list_item;inQuote ||= $from.node(d).type===visualSchema.nodes.blockquote;}
  for(let d=$from.depth;d>0;d--){
    const parent=$from.node(d-1),index=$from.index(d-1)+1;
    if(index>=parent.childCount)continue;
    const next=parent.child(index);
    return (inList && (next.type===visualSchema.nodes.blockquote || (next.type===visualSchema.nodes.list_item && next.firstChild?.type===visualSchema.nodes.blockquote)))
      || (inQuote && isList(next));
  }
  return false;
};
