import { getSlashCommands, TOOLBAR_ITEMS, SLASH_ALIASES } from '@/lib/toolbarConfig';

// Share the actual Monaco command definitions, including user overrides.
// The visual menu shows command identifiers, not translated replacements.
export function visualCommandCatalog(customCommands: Record<string, string> = {}) {
  const monacoKinds = { languages: { CompletionItemKind: { Keyword: 17, Snippet: 15 } } };
  return getSlashCommands(monacoKinds, customCommands)
    .filter(item => item.id !== 'signature-ko')
    .map(item => ({ id: item.id as string, command: item.sortText as string,
      icon: TOOLBAR_ITEMS.find(tool => tool.id === item.id)?.icon || '',
      name: TOOLBAR_ITEMS.find(tool => tool.id === item.id)?.name || '',
      aliases: SLASH_ALIASES[item.id] || [],
      search: (item.filterText as string).normalize('NFC').toLowerCase(),
      description: item.detail as string }));
}

export function filterVisualCommands(catalog: ReturnType<typeof visualCommandCatalog>, query: string) {
  const term = query.normalize('NFC').toLowerCase();
  const exact = (item: typeof catalog[number]) => item.command.toLowerCase() === term || item.aliases.includes(term);
  return catalog.filter(item => !term || item.search.includes(term))
    .sort((a, b) => Number(exact(b)) - Number(exact(a)));
}
