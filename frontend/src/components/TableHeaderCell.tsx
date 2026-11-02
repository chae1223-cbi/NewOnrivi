import React from 'react';

/** Headers align independently from Markdown's body-column alignment. */
export default function TableHeaderCell({ node: _node, style, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { node?: unknown }) {
  return <th {...props} align="center" style={{...style,textAlign:'center'}}
    ref={element => element?.style.setProperty('text-align','center','important')} />;
}
