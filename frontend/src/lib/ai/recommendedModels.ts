// Document-work shortlist: 3 Gemini + 2 Gemma 4 + 3 GPT + 3 Claude.
// Only exact catalog IDs confirmed by the provider list may be offered.
// Release dates were checked against official release notes on 2026-10-20.
import type { AIModel, AIProvider } from './types';

// Display only this explicit shortlist; API results confirm availability, not membership.
const MODEL_CATALOG: { provider: AIProvider; id: string; name: string; family: string; releasedAt: string }[] = [
  {provider:'google',id:'gemini-4.0-flash',name:'Gemini 4.0 Flash',family:'Gemini',releasedAt:'2026-10-13'},
  {provider:'google',id:'gemini-3.8-flash',name:'Gemini 3.8 Flash',family:'Gemini',releasedAt:'2026-09-02'},
  {provider:'google',id:'gemini-3.6-flash',name:'Gemini 3.6 Flash',family:'Gemini',releasedAt:'2026-07-21'},
  {provider:'google',id:'gemma-4-31b-it',name:'Gemma 4 31B IT',family:'Gemma',releasedAt:'2026-04-02'},
  {provider:'google',id:'gemma-4-26b-a4b-it',name:'Gemma 4 26B A4B IT',family:'Gemma',releasedAt:'2026-04-02'},
  {provider:'openai',id:'gpt-6.1-sol',name:'GPT-6.1 Sol',family:'GPT',releasedAt:'2026-09-29'},
  {provider:'openai',id:'gpt-6-luna',name:'GPT-6 Luna',family:'GPT',releasedAt:'2026-09-22'},
  {provider:'openai',id:'gpt-6-astra',name:'GPT-6 Astra',family:'GPT',releasedAt:'2026-09-03'},
  {provider:'anthropic',id:'claude-haiku-5-5',name:'Claude Haiku 5.5',family:'Claude',releasedAt:'2026-10-07'},
  {provider:'anthropic',id:'claude-sonnet-5-5',name:'Claude Sonnet 5.5',family:'Claude',releasedAt:'2026-09-28'},
  {provider:'anthropic',id:'claude-opus-5-5',name:'Claude Opus 5.5',family:'Claude',releasedAt:'2026-09-22'},
];

const familyOrder = ['Gemini', 'Gemma', 'GPT', 'Claude'];

export const RECOMMENDED_MODELS = [...MODEL_CATALOG].sort(
  (a, b) => familyOrder.indexOf(a.family) - familyOrder.indexOf(b.family) || b.releasedAt.localeCompare(a.releasedAt) || b.id.localeCompare(a.id, undefined, { numeric: true })
);

export function compareRecommendedModels(a: { id: string }, b: { id: string }) {
  const indexA = RECOMMENDED_MODELS.findIndex(row => row.id.toLowerCase() === a.id.toLowerCase());
  const indexB = RECOMMENDED_MODELS.findIndex(row => row.id.toLowerCase() === b.id.toLowerCase());
  if (indexA !== -1 && indexB !== -1) return indexA - indexB;
  if (indexA !== -1) return -1;
  if (indexB !== -1) return 1;
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

export function recommendedModels(provider: AIProvider, available: AIModel[] = []): AIModel[] {
  const shortlist = RECOMMENDED_MODELS.filter(model => model.provider === provider);
  if (!available || available.length === 0) return shortlist;
  const matched = shortlist.filter(model => {
    return available.some(row => {
      const id = String(row.id || '').trim().toLowerCase().replace(/^models\//, '');
      return id === model.id.toLowerCase() || id.includes(model.family.toLowerCase()) || id.startsWith('gpt-') || id.startsWith('claude-') || id.startsWith('gemini-') || id.startsWith('gemma-');
    });
  });
  return matched.length > 0 ? matched : shortlist;
}
