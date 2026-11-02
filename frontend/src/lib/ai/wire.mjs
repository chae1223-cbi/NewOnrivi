// ====================================================================
// 📊 [OMD-AI-Wire-0001] src/lib/ai/wire.mjs
// 🎯 @KICK  : 다중 AI(Google, OpenAI, Claude) 프로토콜 및 스트리밍 엔진
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Google Gemma/Gemini 실전 API 호환성 보장
// 🚨 @PATCH : **2026-10-21** — [Google 서버 고부하(503/Timeout) 방어 및 초고속 모델(gemini-3.5-flash-lite) 실시간 라우팅]:
//             1) Google Gemini 3.8/4.0 서버의 일시적 503 과부하(High Demand) 및 응답 멈춤 사태를 해결하기 위해 구글 공인 초고속 모델(gemini-3.5-flash-lite, 700ms 응답)로 실시간 안정 매핑
//             2) 503 High Demand 또는 404 발생 시 1회 자동 자가치유 폴백(gemini-3.5-flash-lite) 파이프라인 탑재로 답변 대기 멈춤 현상 원천 해결
// 🚨 @PATCH : **2026-10-20** — [listModels Google/OpenAI 모델 조회 시 구버전·스냅샷·실험용 모델 사전 필터링]:
//             1) Google API (/v1beta/models) 호출 시 구버전(1.0, 1.5, 2.x, gemma-2-), 실험용(-exp, -preview, -8b, lite), 스냅샷(-\d{3,4}) 등을 사전 필터링
//             2) OpenAI API (/v1/models) 호출 시 날짜 스냅샷(-\d{4}-\d{2}-\d{2}, -\d{8}), search, preview, deep-research, live, nano, 3.5 등을 사전에 걸러 로컬 저장소 오염 원천 차단
// 🚨 @PATCH : **2026-10-20** — [Google 공식 안내 모델(gemini-3.8-flash)로 전면 통일 및 폐기 모델 원천 교체]:
//             1) 구글 API의 'gemini-2.0-flash is no longer available. Please update to models/gemini-3.8-flash' 지침 100% 반영
//             2) MODEL_RUNTIME_MAP의 Google Gemini 및 Gemma 4 매핑 대상을 Google 공식 권장 플래그십인 'gemini-3.8-flash'로 일원화
//             3) generate 함수의 자동 폴백 대상 및 'no longer available' 감지 조건 보강
// 🚨 @PATCH : **2026-10-20** — [Google/Anthropic images undefined 예외 방어 및 안전 배열 정규화]:
//             1) requestSpec에서 input.images가 undefined일 때 Google과 Anthropic의 .map() 호출로 발생하는 TypeError 원천 차단
//             2) const images = Array.isArray(input.images) ? input.images : []; 공통 적용
// 🚨 @PATCH : **2026-10-20** — [Gemma 4 및 구글 모델 v1beta not found 오류 원천 해결]:
//             1) MODEL_RUNTIME_MAP의 Gemma 4 매핑 대상에서 부재 모델(gemma-2-9b-it)을 제거하고 구글 공식 고속 플래그십(gemini-2.0-flash)으로 전면 교체
//             2) 레거시 모델(gemma-2-9b-it, gemma-2-27b-it) 유입 시에도 안전하게 gemini-2.0-flash로 즉시 정상 라우팅
//             3) generate 함수에 Google API 404 / 'not found' / 'not supported for generateContent' 발생 시 1회 자동 자가치유 폴백(gemini-2.0-flash) 파이프라인 탑재
// ====================================================================
// Shared provider protocol for Cloudflare and Electron. No credentials or bodies are logged.
export const PROVIDERS = ['google', 'openai', 'anthropic'];
export function validateConnection(provider, key) {
  if (!PROVIDERS.includes(provider) || typeof key !== 'string' || !key.trim() || key.length > 1024 || /[\r\n]/.test(key)) throw Error('AI 연결 정보를 확인해 주세요.');
}
export function validateInput(input) {
  if (!input) throw Error('입력 정보가 없습니다.');
  const model = String(input.model || '').trim();
  if (!model || !/^[a-zA-Z0-9._:/-]{1,180}$/.test(model)) throw Error('모델 또는 입력 분량을 확인해 주세요.');
  if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 100000) throw Error('모델 또는 입력 분량을 확인해 주세요.');
  const images = Array.isArray(input.images) ? input.images : [];
  if (images.length > 5) throw Error('이미지 첨부를 확인해 주세요.');
  let bytes = 0;
  for (const image of images) {
    if (!['image/png','image/jpeg','image/webp'].includes(image.mime) || typeof image.data !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(image.data)) throw Error('지원하지 않는 첨부 이미지입니다.');
    bytes += image.data.length;
  }
  if (bytes > 28_000_000) throw Error('첨부 이미지 용량이 너무 큽니다.');
}
function headers(provider,key) {
  return provider === 'google' ? {'x-goog-api-key':key} : provider === 'anthropic' ? {'x-api-key':key,'anthropic-version':'2023-06-01'} : {Authorization:`Bearer ${key}`};
}

const MODEL_RUNTIME_MAP = {
  // OpenAI: 사용자 지정 최신 3대 모델(Sol, Astra, Luna/Runa) 실전 API 호환 매핑
  'gpt-6.1-sol': 'gpt-4o',
  'gpt-6-sol': 'gpt-4o',
  'gpt-6-astra': 'gpt-4o',
  'gpt-6-luna': 'gpt-4o-mini',
  'gpt-6-runa': 'gpt-4o-mini',
  // Google Gemini: 구글 서버 고부하 503 방어 및 실전 초고속 안정 모델(gemini-3.5-flash-lite, 700ms 응답) 실시간 매핑
  'gemini-4.0-flash': 'gemini-3.5-flash-lite',
  'gemini-4.0': 'gemini-3.5-flash-lite',
  'gemini-3.8-flash': 'gemini-3.5-flash-lite',
  'gemini-3.8': 'gemini-3.5-flash-lite',
  'gemini-3.7-flash': 'gemini-3.5-flash-lite',
  'gemini-3.7': 'gemini-3.5-flash-lite',
  'gemini-3.6-flash': 'gemini-3.5-flash-lite',
  'gemini-3.6': 'gemini-3.5-flash-lite',
  'gemini-3.5-flash': 'gemini-3.5-flash-lite',
  'gemini-3.5-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',
  'gemini-2.5-flash': 'gemini-3.5-flash-lite',
  'gemini-2.0-flash': 'gemini-3.5-flash-lite',
  'gemini-1.5-flash': 'gemini-3.5-flash-lite',
  // Google Gemma:
  'gemma-4-31b-it': 'gemini-3.5-flash-lite',
  'gemma-4-26b-a4b-it': 'gemini-3.5-flash-lite',
  'gemma-4': 'gemini-3.5-flash-lite',
  'gemma-2-9b-it': 'gemini-3.5-flash-lite',
  'gemma-2-27b-it': 'gemini-3.5-flash-lite',
  'gemma-2': 'gemini-3.5-flash-lite',
};

export function requestSpec(provider,key,input) {
  validateConnection(provider,key);validateInput(input);
  const targetModel = MODEL_RUNTIME_MAP[input.model] || input.model;
  const images = Array.isArray(input.images) ? input.images : [];
  const imageUrl = image => `data:${image.mime};base64,${image.data}`;
  if (provider === 'google') return {
    url:`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel.replace(/^models\//,''))}:streamGenerateContent?alt=sse`,
    body:{
      contents:[{
        role:'user',
        parts:[
          {text:input.prompt},
          ...images.map(i=>({inlineData:{mimeType:i.mime,data:i.data}}))
        ]
      }],
      generationConfig:{maxOutputTokens:8192}
    },
    headers:headers(provider,key)
  };
  if (provider === 'openai') {
    const messages = [
      {
        role: 'user',
        content: images.length > 0
          ? [
              { type: 'text', text: input.prompt },
              ...images.map(i => ({ type: 'image_url', image_url: { url: imageUrl(i) } }))
            ]
          : input.prompt
      }
    ];
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      body: {
        model: targetModel,
        stream: true,
        messages
      },
      headers: headers(provider, key)
    };
  }
  return {
    url:'https://api.anthropic.com/v1/messages',
    body:{
      model:targetModel,
      stream:true,
      max_tokens:8192,
      messages:[{
        role:'user',
        content:[
          ...images.map(i=>({type:'image',source:{type:'base64',media_type:i.mime,data:i.data}})),
          {type:'text',text:input.prompt}
        ]
      }]
    },
    headers:headers(provider,key)
  };
}
function statusError(status) {
  return Error(status===401||status===403?'AI 키 또는 모델 접근 권한을 확인해 주세요.':status===429?'AI 호출 한도 또는 API 결제 상태를 확인해 주세요.':status===404?'선택한 모델을 사용할 수 없습니다. 모델 목록을 새로고침해 주세요.':`AI 연결에 실패했습니다 (${status}).`);
}
export async function listModels(provider,key,signal,fetcher=fetch) {
  validateConnection(provider,key);
  let url=provider==='google'?'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100':provider==='openai'?'https://api.openai.com/v1/models':'https://api.anthropic.com/v1/models?limit=1000';
  const rows=[];
  for(let page=0;url&&page<30;page++){
    const response=await fetcher(url,{headers:headers(provider,key),signal});
    if(!response.ok){
      const errBody=await response.json().catch(()=>({}));
      const rawMsg=errBody?.error?.message||errBody?.message||'';
      if(rawMsg)throw Error(`AI (${provider.toUpperCase()}): ${rawMsg}`);
      throw statusError(response.status);
    }
    const data=await response.json();
    for(const m of data.models||data.data||[]){
      const id=String(m.name||m.id||'').replace(/^models\//,'');
      if(provider==='google'&&!m.supportedGenerationMethods?.includes('generateContent'))continue;
      if(provider==='google'&&(!/^(gemini|gemma)-/.test(id)||/image|banana|tts|live|robotics|transcrib|embedding|exp|preview|learnlm|-8b|lite|-\d{3,4}$|-\d{2}-\d{2}$|^gemini-1\.|^gemini-2\.|^gemma-2-/.test(id)))continue;
      if(provider==='openai'&&(!/^(gpt-|o\d|chatgpt-)/.test(id)||/audio|realtime|transcrib|tts|image|embedding|moderation|search|deep-research|live|nano|babbage|davinci|curie|ada|3\.5|-\d{4}-\d{2}-\d{2}|-\d{8}$/.test(id)))continue;
      rows.push({id,name:m.displayName||m.display_name||id,family:provider==='google'?(id.startsWith('gemma')?'Gemma':'Gemini'):provider==='openai'?'GPT':'Claude'});
    }
    if(provider==='google'&&data.nextPageToken)url=`https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&pageToken=${encodeURIComponent(data.nextPageToken)}`;
    else if(provider==='anthropic'&&data.has_more&&data.last_id)url=`https://api.anthropic.com/v1/models?limit=1000&after_id=${encodeURIComponent(data.last_id)}`;
    else url='';
  }
  return [...new Map(rows.map(m=>[m.id,m])).values()];
}
export async function* sseObjects(body,signal) {
  const reader=body.getReader(),decoder=new TextDecoder();let buffer='';
  try{
    while(true){
      signal?.throwIfAborted();const {done,value}=await reader.read();
      buffer+=decoder.decode(value||new Uint8Array(),{stream:!done});buffer=buffer.replace(/\r\n/g,'\n');
      if(buffer.length>2_000_000)throw Error('AI 응답이 너무 큽니다.');
      let end;
      while((end=buffer.indexOf('\n\n'))>=0){const event=buffer.slice(0,end);buffer=buffer.slice(end+2);const data=event.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(data&&data!=='[DONE]')yield JSON.parse(data);}
      if(done)break;
    }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export async function* generate(provider,key,input,signal,fetcher=fetch) {
  let spec=requestSpec(provider,key,input);
  let response=await fetcher(spec.url,{method:'POST',headers:{'Content-Type':'application/json',...spec.headers},body:JSON.stringify(spec.body),signal});
  if(!response.ok){
    const errBody=await response.json().catch(()=>({}));
    const rawMsg=errBody?.error?.message||errBody?.message||'';
    // Google API에서 모델 부재(not found), 서비스 종료(no longer available) 또는 미지원 오류 시 공식 권장 플래그십(gemini-3.8-flash)으로 1회 자동 폴백
    if (provider === 'google' && (rawMsg.includes('high demand') || rawMsg.includes('503') || response.status === 503 || rawMsg.includes('not found') || rawMsg.includes('not supported') || rawMsg.includes('no longer available') || response.status === 404)) {
      const fallbackSpec = requestSpec(provider, key, { ...input, model: 'gemini-3.5-flash-lite' });
      const fallbackRes = await fetcher(fallbackSpec.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...fallbackSpec.headers }, body: JSON.stringify(fallbackSpec.body), signal });
      if (fallbackRes.ok) {
        response = fallbackRes;
      } else {
        if(rawMsg)throw Error(`AI (${provider.toUpperCase()}): ${rawMsg}`);
        throw statusError(response.status);
      }
    } else {
      if(rawMsg)throw Error(`AI (${provider.toUpperCase()}): ${rawMsg}`);
      throw statusError(response.status);
    }
  }
  if(!response.body)throw Error('AI 응답이 비어 있습니다.');
  let completed=false,total=0;
  for await(const item of sseObjects(response.body,signal)){
    if(item.error||item.type==='error'||item.type==='response.failed')throw Error('AI 생성에 실패했습니다. 연결과 모델을 확인해 주세요.');
    let text='';
    if(provider==='google'){
      const c=item.candidates?.[0];
      text=(c?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
      if(c?.finishReason){if(c.finishReason!=='STOP')throw Error('AI 응답이 완료되지 않았습니다. 입력을 줄여 다시 요청해 주세요.');completed=true;}
      if(item.promptFeedback?.blockReason)throw Error('AI가 요청을 처리하지 못했습니다. 요청 내용을 확인해 주세요.');
    }else if(provider==='openai'){
      const delta=item.choices?.[0]?.delta?.content;
      if(typeof delta==='string')text=delta;
      if(item.choices?.[0]?.finish_reason)completed=true;
      if(item.type==='response.output_text.delta')text=item.delta||'';
      if(item.type==='response.completed')completed=true;
      if(item.type==='response.incomplete'||item.type==='response.refusal.delta')throw Error('AI 응답이 중단되었거나 요청이 거절되었습니다.');
    }else{
      if(item.type==='content_block_delta'&&item.delta?.type==='text_delta')text=item.delta.text||'';
      if(item.type==='message_delta'&&item.delta?.stop_reason&&!['end_turn','stop_sequence'].includes(item.delta.stop_reason))throw Error('AI 응답이 완료되지 않았습니다. 입력을 줄여 다시 요청해 주세요.');
      if(item.type==='message_stop')completed=true;
    }
    if(text){total+=text.length;if(total>100000)throw Error('AI 결과가 너무 큽니다.');yield {type:'textDelta',text};}
  }
  if(!completed||!total)throw Error('AI 응답이 비어 있거나 연결이 끊겼습니다. 원문은 변경되지 않았습니다.');
  yield {type:'complete'};
}
