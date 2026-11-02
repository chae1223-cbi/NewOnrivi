const {createHash}=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
function registerInlineAI({ipcMain,app,safeStorage}){
  const sessions=new Map(),requests=new Map();
  const protocol=import(pathToFileURL(path.join(__dirname,'../frontend/src/lib/ai/wire.mjs')).href);
  const scopeKey=(sender,scope,provider)=>`${sender.id}:${scope}:${provider}`;
  const check=(event,scope,provider)=>{
    const url=event.senderFrame?.url||'';
    if(!/^(app:|file:|https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/)/.test(url)||event.senderFrame!==event.sender.mainFrame)throw Error('허용되지 않은 AI 요청입니다.');
    if(typeof scope!=='string'||!scope||scope.length>200||!['google','openai','anthropic'].includes(provider))throw Error('AI 계정 연결을 확인해 주세요.');
  };
  const fileFor=(scope,provider)=>path.join(app.getPath('userData'),'ai-credentials',createHash('sha256').update(scope+':'+provider).digest('hex')+'.bin');
  const keyFor=async(event,scope,provider)=>{
    const key=sessions.get(scopeKey(event.sender,scope,provider));if(key)return key;
    for(const [k,v] of sessions.entries()){
      if(k.startsWith(event.sender.id+':') && k.endsWith(':'+provider) && v) return v;
    }
    return '';
  };
  ipcMain.handle('inline-ai:key',async(event,{scope,provider,key,remember,remove})=>{
    check(event,scope,provider);const id=scopeKey(event.sender,scope,provider);
    if(remove){sessions.delete(id);await fs.rm(fileFor(scope,provider),{force:true});return {connected:false};}
    if(typeof key==='string'&&key){
      (await protocol).validateConnection(provider,key);
      if(remember&&!safeStorage.isEncryptionAvailable())throw Error('OS 암호화 저장소를 사용할 수 없습니다. 세션 연결을 선택해 주세요.');
      if(remember){const filename=fileFor(scope,provider);await fs.mkdir(path.dirname(filename),{recursive:true});const tmp=filename+'.tmp';await fs.writeFile(tmp,safeStorage.encryptString(key),{mode:0o600});await fs.rename(tmp,filename);}else await fs.rm(fileFor(scope,provider),{force:true});
      sessions.set(id,key);
    }
    return {connected:Boolean(await keyFor(event,scope,provider))};
  });
  ipcMain.handle('inline-ai:run',async(event,{scope,provider,id,action,input})=>{
    check(event,scope,provider);if(!/^[\w-]{1,100}$/.test(id))throw Error('AI 요청 ID를 확인해 주세요.');
    const owner=event.sender.id,requestKey=`${owner}:${id}`;
    if([...requests.keys()].some(key=>key.startsWith(owner+':')))throw Error('진행 중인 AI 요청을 먼저 중지해 주세요.');
    const key=await keyFor(event,scope,provider);if(!key)throw Error('AI 연결을 등록해 주세요.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000);requests.set(requestKey,controller);
    const destroyed=()=>controller.abort();event.sender.once('destroyed',destroyed);
    try{
      if(action==='models')return {models:await (await protocol).listModels(provider,key,controller.signal)};
      if(action!=='generate')throw Error('지원하지 않는 작업입니다.');
      for await(const item of (await protocol).generate(provider,key,input,controller.signal)){
        if(!event.sender.isDestroyed())event.sender.send('inline-ai:event',{id,...item});
      }
      return {success:true};
    }catch{throw Error(controller.signal.aborted?'AI 요청이 중지되거나 시간이 초과되었습니다.':'AI 연결 또는 모델을 확인해 주세요.');}
    finally{clearTimeout(timer);requests.delete(requestKey);if(!event.sender.isDestroyed())event.sender.removeListener('destroyed',destroyed);}
  });
  ipcMain.handle('inline-ai:cancel',(event,id)=>requests.get(`${event.sender.id}:${id}`)?.abort());
  app.on('web-contents-created',(_event,contents)=>contents.once('destroyed',()=>{
    for(const [id,controller]of requests)if(id.startsWith(contents.id+':'))controller.abort();
    for(const id of sessions.keys())if(id.startsWith(contents.id+':'))sessions.delete(id);
  }));
}
module.exports={registerInlineAI};
