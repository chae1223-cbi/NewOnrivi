import { handleAIRequest } from '../../src/lib/ai/server.mjs';
export const onRequestPost = context => handleAIRequest(context.request, context.env);
