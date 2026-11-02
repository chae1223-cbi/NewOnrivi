/** Preserve the complete fence information before remark-rehype reduces it to a language class. */
export function remarkCodeBlockMetadata() {
  return (tree: any) => {
    const visit = (node: any) => {
      if (node.type === 'code') {
        const rawInfo = [node.lang, node.meta].filter(Boolean).join(' ');
        const explicitTitle = rawInfo.match(/(?:^|\s)title="([^"]*)"/);
        const title = explicitTitle ? explicitTitle[1] : rawInfo || '코드';
        node.data = { ...node.data, hProperties: {
          ...node.data?.hProperties,
          'data-code-block': 'true',
          'data-code-info': rawInfo,
          'data-code-title': title,
          'data-code-text': node.value || '',
        } };
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
