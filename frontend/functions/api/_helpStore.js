export const prefix = '_help-center/';
export async function listHelp(bucket, area) {
  const listing = await bucket.list({prefix:prefix+area+'/',limit:1000});
  if (listing.truncated) throw new Error('도움말 문서 조회 한도를 초과했습니다.');
  const docs = await Promise.all(listing.objects.map(async item => (await bucket.get(item.key))?.json()));
  return docs.filter(Boolean).sort((a,b)=>a.order-b.order || a.title.localeCompare(b.title));
}
export function json(data,status=200) { return Response.json(data,{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}}); }
