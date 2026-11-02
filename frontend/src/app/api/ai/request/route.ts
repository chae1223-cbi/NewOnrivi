import {handleAIRequest} from '@/lib/ai/server.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleAIRequest(request,process.env);}
