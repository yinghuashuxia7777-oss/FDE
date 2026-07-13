/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Scrollable evidence regions must be reachable without a pointer. */
import { useId } from 'react';

import type { Evidence, EvidenceType } from '../../domain/cases/types';
import { useI18n } from '../../i18n';

const evidenceLabelKeys: Record<EvidenceType, string> = {
  text: 'training.evidence.type.text',
  log: 'training.evidence.type.log',
  terminal: 'training.evidence.type.terminal',
  http: 'training.evidence.type.http',
  json: 'training.evidence.type.json',
  diff: 'training.evidence.type.diff',
  config: 'training.evidence.type.config',
  metric: 'training.evidence.type.metric',
  diagram: 'training.evidence.type.diagram',
  'customer-message': 'training.evidence.type.customerMessage',
};

interface BlockProps {
  content: string;
  title: string;
  typeLabel?: string;
}

export function CodeBlock({ content, title, typeLabel }: BlockProps) {
  const { t } = useI18n();
  const captionId = useId();
  const resolvedTypeLabel = typeLabel ?? t('training.evidence.code');

  return (
    <figure className="evidence-block" aria-label={title}>
      <figcaption id={captionId} className="evidence-caption">
        <span>{title}</span>
        <span className="evidence-caption__type">{resolvedTypeLabel}</span>
      </figcaption>
      <pre
        className="evidence-scroll"
        role="region"
        aria-labelledby={captionId}
        tabIndex={0}
      >
        <code>{content}</code>
      </pre>
    </figure>
  );
}

export function LogBlock({ content, title, typeLabel }: BlockProps) {
  const { t } = useI18n();
  return (
    <CodeBlock
      content={content}
      title={title}
      typeLabel={typeLabel ?? t('training.evidence.type.log')}
    />
  );
}

interface DiffLineProps {
  content: string;
  index: number;
  labels: Record<'added' | 'context' | 'metadata' | 'removed', string>;
}

function DiffLine({ content, index, labels }: DiffLineProps) {
  const kind = /^(?:\+\+\+|---)(?:\s|$)/.test(content)
    ? 'metadata'
    : content.startsWith('+')
      ? 'added'
      : content.startsWith('-')
        ? 'removed'
        : 'context';
  const label = labels[kind];

  return (
    <span
      className={`diff-line diff-line--${kind}`}
      key={`${String(index)}-${content}`}
    >
      <span className="diff-line__label">{label}</span>
      <span>{content}</span>
      {'\n'}
    </span>
  );
}

export function DiffBlock({ content, title }: Omit<BlockProps, 'typeLabel'>) {
  const { t } = useI18n();
  const captionId = useId();
  const labels = {
    metadata: t('training.evidence.diff.metadata'),
    added: t('training.evidence.diff.added'),
    removed: t('training.evidence.diff.removed'),
    context: t('training.evidence.diff.context'),
  };

  return (
    <figure className="evidence-block" aria-label={title}>
      <figcaption id={captionId} className="evidence-caption">
        <span>{title}</span>
        <span className="evidence-caption__type">
          {t('training.evidence.type.diff')}
        </span>
      </figcaption>
      <pre
        className="evidence-scroll evidence-scroll--diff"
        role="region"
        aria-labelledby={captionId}
        tabIndex={0}
      >
        <code>
          {content.split('\n').map((line, index) => (
            <DiffLine
              key={`${String(index)}-${line}`}
              content={line}
              index={index}
              labels={labels}
            />
          ))}
        </code>
      </pre>
    </figure>
  );
}

function TextBlock({ content, title, typeLabel }: Required<BlockProps>) {
  return (
    <figure className="evidence-block evidence-block--text" aria-label={title}>
      <figcaption className="evidence-caption">
        <span>{title}</span>
        <span className="evidence-caption__type">{typeLabel}</span>
      </figcaption>
      <p className="evidence-text">{content}</p>
    </figure>
  );
}

interface EvidenceRendererProps {
  evidence: Evidence;
}

export function EvidenceRenderer({ evidence }: EvidenceRendererProps) {
  const { t } = useI18n();
  const typeLabel = t(evidenceLabelKeys[evidence.type]);
  const title = evidence.title ?? t('training.evidence.untitled');

  switch (evidence.type) {
    case 'log':
      return (
        <LogBlock
          content={evidence.content}
          title={title}
          typeLabel={typeLabel}
        />
      );
    case 'terminal':
      return (
        <LogBlock
          content={evidence.content}
          title={title}
          typeLabel={typeLabel}
        />
      );
    case 'diff':
      return <DiffBlock content={evidence.content} title={title} />;
    case 'http':
    case 'json':
    case 'config':
      return (
        <CodeBlock
          content={evidence.content}
          title={title}
          typeLabel={typeLabel}
        />
      );
    case 'text':
    case 'metric':
    case 'diagram':
    case 'customer-message':
      return (
        <TextBlock
          content={evidence.content}
          title={title}
          typeLabel={typeLabel}
        />
      );
  }
}
