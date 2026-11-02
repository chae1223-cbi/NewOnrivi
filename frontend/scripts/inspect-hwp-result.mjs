import fs from 'node:fs';
const html=fs.readFileSync(process.argv[2],'utf8');
const body=html.slice(html.indexOf('<body'));
const sources=[...body.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(m=>m[1]);
const mimes={};let payload=0;
for(const src of sources){const match=src.match(/^data:([^;]+);base64,(.*)$/s);if(match){payload+=match[2].length;mimes[match[1]]=(mimes[match[1]]||0)+1;}}
const index=body.indexOf('onrivi-empty-row');
console.log({htmlBytes:Buffer.byteLength(html),placements:sources.length,uniqueSources:new Set(sources).size,base64Characters:payload,mimes,tables:(body.match(/<table\b/g)||[]).length});
if(index>=0)console.log('Internal marker context:',body.slice(index-80,index+100));
