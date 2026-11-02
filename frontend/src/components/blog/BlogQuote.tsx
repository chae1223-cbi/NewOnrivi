import React from 'react';

type AlertType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

const aliases: Record<string, AlertType> = {
  NOTE: 'NOTE', 참고: 'NOTE', 참조: 'NOTE', 메모: 'NOTE', 알림: 'NOTE',
  TIP: 'TIP', 팁: 'TIP', 도움말: 'TIP',
  IMPORTANT: 'IMPORTANT', 중요: 'IMPORTANT', 필독: 'IMPORTANT',
  WARNING: 'WARNING', 주의: 'WARNING',
  CAUTION: 'CAUTION', 경고: 'CAUTION', 위험: 'CAUTION',
};

const alertTag = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|참고|참조|메모|알림|팁|도움말|중요|필독|주의|경고|위험)\]/i;

const styles: Record<AlertType, { box: string; title: string; icon: string; label: string }> = {
  NOTE: { box: 'border-blue-500 bg-blue-50/90 dark:border-blue-400 dark:bg-blue-950/40', title: 'text-blue-700 dark:text-blue-300', icon: 'ℹ️', label: 'Note' },
  TIP: { box: 'border-emerald-500 bg-emerald-50/90 dark:border-emerald-400 dark:bg-emerald-950/40', title: 'text-emerald-700 dark:text-emerald-300', icon: '💡', label: 'Tip' },
  IMPORTANT: { box: 'border-purple-500 bg-purple-50/90 dark:border-purple-400 dark:bg-purple-950/40', title: 'text-purple-700 dark:text-purple-300', icon: '📢', label: 'Important' },
  WARNING: { box: 'border-amber-500 bg-amber-50/90 dark:border-amber-400 dark:bg-amber-950/40', title: 'text-amber-700 dark:text-amber-300', icon: '⚠️', label: 'Warning' },
  CAUTION: { box: 'border-rose-500 bg-rose-50/90 dark:border-rose-400 dark:bg-rose-950/40', title: 'text-rose-700 dark:text-rose-300', icon: '🛑', label: 'Caution' },
};

function firstText(children: React.ReactNode): string | null {
  for (const child of React.Children.toArray(children)) {
    if (typeof child === 'string' && child.trim()) return child;
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
      const text = firstText(child.props.children);
      if (text) return text;
    }
  }
  return null;
}

// ReactMarkdown의 첫 문단 안에서만 Alert 표식을 제거하고 나머지 인라인 서식은 보존한다.
function removeFirstTag(children: React.ReactNode, removed: { value: boolean }): React.ReactNode {
  return React.Children.map(children, child => {
    if (removed.value) return child;
    if (typeof child === 'string') {
      if (!alertTag.test(child)) return child;
      removed.value = true;
      return child.replace(alertTag, '').trimStart();
    }
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
      return React.cloneElement(child, {}, removeFirstTag(child.props.children, removed));
    }
    return child;
  });
}

export function BlogQuote({ children }: { children?: React.ReactNode }) {
  const match = firstText(children)?.match(alertTag);
  const type = match && aliases[match[1].toUpperCase()];
  if (!match || !type) return <blockquote>{children}</blockquote>;

  const style = styles[type];
  const label = /[가-힣]/.test(match[1]) ? match[1] : style.label;
  const content = removeFirstTag(children, { value: false });
  return (
    <div className={`blog-alert-box my-4 rounded-r-lg border-l-4 p-4 shadow-xs ${style.box}`}>
      <div className={`blog-alert-title mb-1.5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${style.title}`}>
        <span className="text-base">{style.icon}</span><span>{label}</span>
      </div>
      <div className="blog-alert-content text-[0.95em] font-medium leading-relaxed text-zinc-800 dark:text-zinc-100 [&>p:first-child]:!mt-0 [&>p:last-child]:!mb-0">
        {content}
      </div>
    </div>
  );
}
