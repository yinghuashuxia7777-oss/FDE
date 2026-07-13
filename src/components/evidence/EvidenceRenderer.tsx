/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Scrollable evidence regions must be reachable without a pointer. */
import { useId } from 'react';

import type { Evidence, EvidenceType } from '../../domain/cases/types';

const evidenceLabels: Record<EvidenceType, string> = {
  text: 'Text evidence',
  log: 'Log',
  terminal: 'Terminal output',
  http: 'HTTP exchange',
  json: 'JSON',
  diff: 'Diff',
  config: 'Configuration',
  metric: 'Metric',
  diagram: 'Diagram description',
  'customer-message': 'Customer message',
};

interface BlockProps {
  content: string;
  title: string;
  typeLabel?: string;
}

export function CodeBlock({ content, title, typeLabel = 'Code' }: BlockProps) {
  const captionId = useId();

  return (
    <figure className="evidence-block" aria-label={title}>
      <figcaption id={captionId} className="evidence-caption">
        <span>{title}</span>
        <span className="evidence-caption__type">{typeLabel}</span>
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

export function LogBlock({ content, title, typeLabel = 'Log' }: BlockProps) {
  return <CodeBlock content={content} title={title} typeLabel={typeLabel} />;
}

interface DiffLineProps {
  content: string;
  index: number;
}

function DiffLine({ content, index }: DiffLineProps) {
  const kind = /^(?:\+\+\+|---)(?:\s|$)/.test(content)
    ? 'metadata'
    : content.startsWith('+')
      ? 'added'
      : content.startsWith('-')
        ? 'removed'
        : 'context';
  const label =
    kind === 'metadata'
      ? 'Metadata'
      : kind === 'added'
        ? 'Added'
        : kind === 'removed'
          ? 'Removed'
          : 'Context';

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
  const captionId = useId();

  return (
    <figure className="evidence-block" aria-label={title}>
      <figcaption id={captionId} className="evidence-caption">
        <span>{title}</span>
        <span className="evidence-caption__type">Diff</span>
      </figcaption>
      <pre
        className="evidence-scroll evidence-scroll--diff"
        role="region"
        aria-labelledby={captionId}
        tabIndex={0}
      >
        <code>
          {content
            .split('\n')
            .map((line, index) => DiffLine({ content: line, index }))}
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
  const title = evidence.title ?? evidenceLabels[evidence.type];
  const typeLabel = evidenceLabels[evidence.type];

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
