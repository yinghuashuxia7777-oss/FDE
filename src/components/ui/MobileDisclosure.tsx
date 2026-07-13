import type { ReactNode } from 'react';

interface MobileDisclosureProps {
  children: ReactNode;
  defaultOpen?: boolean;
  summary: string;
}

export function MobileDisclosure({
  children,
  defaultOpen = false,
  summary,
}: MobileDisclosureProps) {
  return (
    <details className="mobile-disclosure" open={defaultOpen || undefined}>
      <summary>{summary}</summary>
      <div className="mobile-disclosure__content">{children}</div>
    </details>
  );
}
