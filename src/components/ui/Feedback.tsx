import {
  CheckCircle,
  Info,
  Warning,
  WarningCircle,
} from '@phosphor-icons/react';
import type { ReactNode } from 'react';

export type FeedbackTone =
  'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'critical';

interface StatusBadgeProps {
  children: ReactNode;
  tone?: FeedbackTone;
}

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span className="status-badge" data-tone={tone}>
      {children}
    </span>
  );
}

interface AlertProps {
  children: ReactNode;
  title: string;
  tone?: Exclude<FeedbackTone, 'neutral'>;
}

const alertIcons = {
  info: Info,
  success: CheckCircle,
  warning: Warning,
  danger: WarningCircle,
  critical: WarningCircle,
} as const;

export function Alert({ children, title, tone = 'info' }: AlertProps) {
  const Icon = alertIcons[tone];
  const role = tone === 'danger' || tone === 'critical' ? 'alert' : 'status';

  return (
    <div className="alert" data-tone={tone} role={role}>
      <Icon aria-hidden="true" size={20} />
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </div>
  );
}
