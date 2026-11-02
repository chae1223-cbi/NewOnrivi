const fs=require('node:fs'),path=require('node:path');
const destination=path.join(__dirname,'public','pagedjs');
fs.mkdirSync(destination,{recursive:true});
for(const [source,target] of [['dist/paged.polyfill.js','paged.polyfill.js'],['LICENSE.md','LICENSE.md']]){
 const file=path.join(__dirname,'node_modules','pagedjs',source);
 if(fs.existsSync(file)){
   if(target==='paged.polyfill.js'){
     let content=fs.readFileSync(file,'utf-8');
     // 🛡️ PagedJS 가상요소(::before) 선택자 querySelectorAll 크래시 방어 패치
     content=content.replace(/let selected = Array\.from\(fragment\.querySelectorAll\(set\.selector\)\);/g, 
       'let selected = []; try { selected = Array.from(fragment.querySelectorAll(set.selector)); } catch(e) { try { selected = Array.from(fragment.querySelectorAll(set.selector.replace(/::[a-zA-Z_-]+/g, "").trim())); } catch(e2) { selected = []; } }');
     content=content.replace(/let selected = fragment\.querySelectorAll\(set\.selector\);/g, 
       'let selected = []; try { selected = fragment.querySelectorAll(set.selector); } catch(e) { try { selected = fragment.querySelectorAll(set.selector.replace(/::[a-zA-Z_-]+/g, "").trim()); } catch(e2) { selected = []; } }');
     fs.writeFileSync(path.join(destination,target),content,'utf-8');
   }else{
     fs.copyFileSync(file,path.join(destination,target));
   }
 }
}
