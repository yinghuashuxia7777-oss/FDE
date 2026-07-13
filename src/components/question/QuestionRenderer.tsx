import { type FormEvent, useMemo, useState } from 'react';

import type {
  CaseNode,
  ChoiceCaseNode,
  EvidenceConclusionCaseNode,
  MatchingCaseNode,
  MultipleChoiceCaseNode,
  NodeSubmission,
  OrderingCaseNode,
} from '../../domain/cases/types';
import { Button } from '../ui';

interface QuestionRendererProps {
  disabled?: boolean;
  node: CaseNode;
  onSubmit: (submission: NodeSubmission) => void;
  promptPlacement?: 'renderer' | 'external';
}

interface QuestionFormProps<Node extends CaseNode> {
  disabled: boolean;
  groupLabel: string;
  node: Node;
  onSubmit: (submission: NodeSubmission) => void;
}

function submitForm(
  event: FormEvent<HTMLFormElement>,
  complete: boolean,
  submit: () => void,
) {
  event.preventDefault();
  if (complete) {
    submit();
  }
}

function OptionLabel({
  checked,
  disabled,
  inputType,
  label,
  name,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  inputType: 'checkbox' | 'radio';
  label: string;
  name: string;
  onChange: () => void;
}) {
  return (
    <label className="question-option">
      <input
        type={inputType}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span>{label}</span>
    </label>
  );
}

function ChoiceQuestion({
  disabled,
  groupLabel,
  node,
  onSubmit,
}: QuestionFormProps<ChoiceCaseNode>) {
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const complete = selectedOptionId.length > 0;

  return (
    <form
      className="question-form"
      onSubmit={(event) =>
        submitForm(event, complete && !disabled, () => {
          onSubmit({
            type: 'choice',
            selectedOptionIds: [selectedOptionId],
          });
        })
      }
    >
      <fieldset className="question-fieldset" disabled={disabled}>
        <legend>{groupLabel}</legend>
        <div className="question-options">
          {node.options.map((option) => (
            <OptionLabel
              key={option.id}
              checked={selectedOptionId === option.id}
              disabled={disabled}
              inputType="radio"
              label={option.label}
              name={`question-${node.id}`}
              onChange={() => setSelectedOptionId(option.id)}
            />
          ))}
        </div>
      </fieldset>
      <Button type="submit" disabled={disabled || !complete}>
        Submit decision
      </Button>
    </form>
  );
}

function MultipleChoiceQuestion({
  disabled,
  groupLabel,
  node,
  onSubmit,
}: QuestionFormProps<MultipleChoiceCaseNode>) {
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const orderedSelection = node.options
    .filter((option) => selectedOptionIds.has(option.id))
    .map((option) => option.id);
  const complete = orderedSelection.length > 0;

  function toggle(optionId: string) {
    setSelectedOptionIds((current) => {
      const next = new Set(current);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
      return next;
    });
  }

  return (
    <form
      className="question-form"
      onSubmit={(event) =>
        submitForm(event, complete && !disabled, () => {
          onSubmit({ type: 'choice', selectedOptionIds: orderedSelection });
        })
      }
    >
      <fieldset className="question-fieldset" disabled={disabled}>
        <legend>{groupLabel}</legend>
        <p className="question-instruction">Select every supported option.</p>
        <div className="question-options">
          {node.options.map((option) => (
            <OptionLabel
              key={option.id}
              checked={selectedOptionIds.has(option.id)}
              disabled={disabled}
              inputType="checkbox"
              label={option.label}
              name={`question-${node.id}`}
              onChange={() => toggle(option.id)}
            />
          ))}
        </div>
      </fieldset>
      <Button type="submit" disabled={disabled || !complete}>
        Submit decision
      </Button>
    </form>
  );
}

function moveItem(values: readonly string[], from: number, to: number) {
  const next = [...values];
  const [item] = next.splice(from, 1);
  if (item !== undefined) {
    next.splice(to, 0, item);
  }
  return next;
}

function OrderingQuestion({
  disabled,
  groupLabel,
  node,
  onSubmit,
}: QuestionFormProps<OrderingCaseNode>) {
  const [orderedOptionIds, setOrderedOptionIds] = useState(() =>
    node.options.map((option) => option.id),
  );
  const [announcement, setAnnouncement] = useState('');
  const optionById = useMemo(
    () => new Map(node.options.map((option) => [option.id, option])),
    [node.options],
  );
  const complete =
    orderedOptionIds.length > 0 &&
    orderedOptionIds.length === node.options.length;

  function move(index: number, offset: -1 | 1) {
    const nextIndex = index + offset;
    const option = optionById.get(orderedOptionIds[index] ?? '');
    if (
      option === undefined ||
      nextIndex < 0 ||
      nextIndex >= orderedOptionIds.length
    ) {
      return;
    }
    setOrderedOptionIds((current) => moveItem(current, index, nextIndex));
    setAnnouncement(
      `${option.label} moved to position ${String(nextIndex + 1)}.`,
    );
  }

  return (
    <form
      className="question-form"
      onSubmit={(event) =>
        submitForm(event, complete && !disabled, () => {
          onSubmit({ type: 'ordering', orderedOptionIds });
        })
      }
    >
      <fieldset className="question-fieldset" disabled={disabled}>
        <legend>{groupLabel}</legend>
        <p className="question-instruction">
          Put the highest-information, lowest-risk action first.
        </p>
        <ol className="ordering-list" aria-label="Current action order">
          {orderedOptionIds.map((optionId, index) => {
            const option = optionById.get(optionId);
            if (option === undefined) return null;
            return (
              <li className="ordering-item" key={optionId}>
                <span className="ordering-item__position" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="ordering-item__label">{option.label}</span>
                <span className="ordering-item__actions">
                  <Button
                    aria-label={`Move ${option.label} up`}
                    disabled={disabled || index === 0}
                    onClick={() => move(index, -1)}
                    variant="secondary"
                  >
                    Move up
                  </Button>
                  <Button
                    aria-label={`Move ${option.label} down`}
                    disabled={disabled || index === orderedOptionIds.length - 1}
                    onClick={() => move(index, 1)}
                    variant="secondary"
                  >
                    Move down
                  </Button>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </fieldset>
      <Button type="submit" disabled={disabled || !complete}>
        Submit decision
      </Button>
    </form>
  );
}

function MatchingQuestion({
  disabled,
  groupLabel,
  node,
  onSubmit,
}: QuestionFormProps<MatchingCaseNode>) {
  const leftIdSet = useMemo(
    () => new Set(Object.keys(node.answer.pairs)),
    [node.answer.pairs],
  );
  const rightIdSet = useMemo(
    () => new Set(Object.values(node.answer.pairs)),
    [node.answer.pairs],
  );
  const leftOptions = node.options.filter((option) => leftIdSet.has(option.id));
  const rightOptions = node.options.filter((option) =>
    rightIdSet.has(option.id),
  );
  const tokenEntries = rightOptions.map(
    (option, index) => [`target-${String(index + 1)}`, option.id] as const,
  );
  const rightIdByToken = new Map<string, string>(tokenEntries);
  const tokenByRightId = new Map<string, string>(
    tokenEntries.map(([token, rightId]) => [rightId, token]),
  );
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const selectedTargets = Object.values(pairs).filter(Boolean);
  const duplicateTargets =
    new Set(selectedTargets).size !== selectedTargets.length;
  const complete =
    leftOptions.length > 0 &&
    leftOptions.every((option) => Boolean(pairs[option.id])) &&
    !duplicateTargets;

  return (
    <form
      className="question-form"
      onSubmit={(event) =>
        submitForm(event, complete && !disabled, () => {
          onSubmit({ type: 'matching', pairs: { ...pairs } });
        })
      }
    >
      <fieldset className="question-fieldset" disabled={disabled}>
        <legend>{groupLabel}</legend>
        <div className="matching-list">
          {leftOptions.map((leftOption) => (
            <label className="matching-row" key={leftOption.id}>
              <span>Match {leftOption.label}</span>
              <select
                value={tokenByRightId.get(pairs[leftOption.id] ?? '') ?? ''}
                disabled={disabled}
                onChange={(event) => {
                  const rightId = rightIdByToken.get(event.target.value) ?? '';
                  setPairs((current) => ({
                    ...current,
                    [leftOption.id]: rightId,
                  }));
                }}
              >
                <option value="">Choose a target</option>
                {rightOptions.map((rightOption) => (
                  <option
                    key={rightOption.id}
                    value={tokenByRightId.get(rightOption.id)}
                  >
                    {rightOption.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {duplicateTargets ? (
          <p className="question-error" role="alert">
            Each target can be matched only once.
          </p>
        ) : null}
      </fieldset>
      <Button type="submit" disabled={disabled || !complete}>
        Submit decision
      </Button>
    </form>
  );
}

function EvidenceConclusionQuestion({
  disabled,
  groupLabel,
  node,
  onSubmit,
  showPrompt,
}: QuestionFormProps<EvidenceConclusionCaseNode> & { showPrompt: boolean }) {
  const [conclusionId, setConclusionId] = useState('');
  const [evidenceIds, setEvidenceIds] = useState<Set<string>>(() => new Set());
  const orderedEvidenceIds = node.evidence
    .filter((evidence) => evidenceIds.has(evidence.id))
    .map((evidence) => evidence.id);
  const complete = conclusionId.length > 0 && orderedEvidenceIds.length > 0;

  function toggleEvidence(evidenceId: string) {
    setEvidenceIds((current) => {
      const next = new Set(current);
      if (next.has(evidenceId)) next.delete(evidenceId);
      else next.add(evidenceId);
      return next;
    });
  }

  return (
    <form
      className="question-form"
      onSubmit={(event) =>
        submitForm(event, complete && !disabled, () => {
          onSubmit({
            type: 'evidence-conclusion',
            conclusionId,
            evidenceIds: orderedEvidenceIds,
          });
        })
      }
    >
      {showPrompt ? <p className="question-prompt">{groupLabel}</p> : null}
      <fieldset className="question-fieldset" disabled={disabled}>
        <legend>Conclusion</legend>
        <div className="question-options">
          {node.options.map((option) => (
            <OptionLabel
              key={option.id}
              checked={conclusionId === option.id}
              disabled={disabled}
              inputType="radio"
              label={option.label}
              name={`conclusion-${node.id}`}
              onChange={() => setConclusionId(option.id)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="question-fieldset" disabled={disabled}>
        <legend>Supporting evidence</legend>
        <div className="question-options">
          {node.evidence.map((evidence) => (
            <OptionLabel
              key={evidence.id}
              checked={evidenceIds.has(evidence.id)}
              disabled={disabled}
              inputType="checkbox"
              label={evidence.title ?? evidence.id}
              name={`evidence-${node.id}`}
              onChange={() => toggleEvidence(evidence.id)}
            />
          ))}
        </div>
      </fieldset>
      <Button type="submit" disabled={disabled || !complete}>
        Submit decision
      </Button>
    </form>
  );
}

function UnsupportedQuestion() {
  return (
    <div className="question-error" role="alert">
      <strong>This question type is not supported.</strong>
      <p>Return to the case library and choose another case.</p>
    </div>
  );
}

export function QuestionRenderer({
  disabled = false,
  node,
  onSubmit,
  promptPlacement = 'renderer',
}: QuestionRendererProps) {
  const groupLabel =
    promptPlacement === 'renderer' ? node.prompt : 'Response options';

  switch (node.type) {
    case 'single-choice':
    case 'true-false':
    case 'log-analysis':
    case 'command-choice':
    case 'diff-review':
    case 'configuration-review':
    case 'architecture-tradeoff':
    case 'customer-response':
      return (
        <ChoiceQuestion
          key={node.id}
          disabled={disabled}
          groupLabel={groupLabel}
          node={node}
          onSubmit={onSubmit}
        />
      );
    case 'multiple-choice':
      return (
        <MultipleChoiceQuestion
          key={node.id}
          disabled={disabled}
          groupLabel={groupLabel}
          node={node}
          onSubmit={onSubmit}
        />
      );
    case 'ordering':
      return (
        <OrderingQuestion
          key={node.id}
          disabled={disabled}
          groupLabel={groupLabel}
          node={node}
          onSubmit={onSubmit}
        />
      );
    case 'matching':
      return (
        <MatchingQuestion
          key={node.id}
          disabled={disabled}
          groupLabel={groupLabel}
          node={node}
          onSubmit={onSubmit}
        />
      );
    case 'evidence-conclusion':
      return (
        <EvidenceConclusionQuestion
          key={node.id}
          disabled={disabled}
          groupLabel={groupLabel}
          node={node}
          onSubmit={onSubmit}
          showPrompt={promptPlacement === 'renderer'}
        />
      );
    default:
      return <UnsupportedQuestion />;
  }
}
