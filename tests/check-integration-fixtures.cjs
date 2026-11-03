const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const folder=path.join(root,'docs/testing/integration-60min');
const fixtures=path.join(folder,'fixtures');
const MarkdownIt=require('../frontend/node_modules/markdown-it');
const parser=new MarkdownIt({html:true});

function csv(text) {
  const records=[];let record=[],field='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(char==='"') {
      if(quoted && text[i+1]==='"'){field+='"';i++;}
      else quoted=!quoted;
    } else if(char===',' && !quoted){record.push(field);field='';}
    else if(char==='\n' && !quoted){record.push(field.replace(/\r$/,''));records.push(record);record=[];field='';}
    else field+=char;
  }
  assert.equal(quoted,false,'Unclosed CSV quote');
  if(field || record.length){record.push(field);records.push(record);}
  return records;
}
const [header,...rows]=csv(fs.readFileSync(path.join(folder,'결과기록.csv'),'utf8'));
assert.equal(rows.length,27);
assert.equal(header.length,13);
let next=0,total=0;
const ids=new Set();
for(const row of rows) {
  assert.equal(row.length,header.length,row[0]);
  assert.ok(!ids.has(row[0]));ids.add(row[0]);
  assert.equal(Number(row[2]),next);
  assert.equal(Number(row[4]),Number(row[3])-Number(row[2]));
  assert.ok(Number(row[4])>0);
  assert.ok(['P0','P1','P2'].includes(row[5]));
  assert.ok(['NOT RUN','PASS','FAIL','BLOCKED'].includes(row[8]));
  next=Number(row[3]);total+=Number(row[4]);
}
assert.equal(next,60);assert.equal(total,60);
const examples=fs.readdirSync(fixtures).filter(name=>/^\d{2}-.+\.md$/.test(name));
assert.equal(examples.length,10);
for(const name of examples) {
  const source=fs.readFileSync(path.join(fixtures,name),'utf8');
  const body=source.replace(/^---\n[\s\S]*?\n---\n/,'');
  assert.ok(parser.render(body).length,name);
  for(const token of parser.parse(body,{})) {
    if(token.type==='fence')assert.ok(body.split('\n')[token.map[1]-1].startsWith(token.markup),'Unclosed fence: '+name);
    for(const child of token.children || []) {
      if(child.type!=='link_open')continue;
      const href=child.attrGet('href');
      if(href?.endsWith('.md') && !/^https?:/.test(href))assert.ok(fs.existsSync(path.join(fixtures,decodeURIComponent(href))),name+' -> '+href);
    }
  }
}
const source=fs.readFileSync(path.join(fixtures,'04-코드와다이어그램.md'),'utf8');
assert.ok(source.split('\n').some(line=>line.length>600 && line.endsWith('END-OF-LONG-LINE')));
assert.equal((fs.readFileSync(path.join(fixtures,'08-스크롤과장문.md'),'utf8').match(/^## ANCHOR-/gm)||[]).length,60);
const manifest=[];
for(const kind of ['qa-photo.png','qa-video.webm']) {
  const files=[];
  for(const version of ['original','replacement']) {
    const relative='assets/'+version+'/'+kind;
    const buffer=fs.readFileSync(path.join(fixtures,relative));files.push(buffer);
    if(kind.endsWith('.png')) {
      assert.equal(buffer.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
      assert.equal(buffer.readUInt32BE(16),640);assert.equal(buffer.readUInt32BE(20),360);
    } else {
      assert.equal(buffer.subarray(0,4).toString('hex'),'1a45dfa3');assert.ok(buffer.length>1000);
    }
    manifest.push({file:relative,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex')});
  }
  assert.ok(!files[0].equals(files[1]),kind+' revisions must differ');
}
fs.writeFileSync(path.join(fixtures,'media-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('PASS: 27 cases totaling 60 minutes, 10 Markdown examples, 60 scroll anchors, distinct PNG/WebM revisions and SHA-256 manifest');
