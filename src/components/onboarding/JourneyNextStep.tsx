import { useId } from 'react';
import { Link } from 'react-router-dom';

interface JourneyNextStepProps {
  actionLabel: string;
  description?: string;
  lead: string;
  title: string;
  to: string;
}

export function JourneyNextStep({
  actionLabel,
  description,
  lead,
  title,
  to,
}: JourneyNextStepProps) {
  const titleId = useId();
  return (
    <section
      className="journey-next-step"
      aria-labelledby={titleId}
      data-learning-mode="true"
    >
      <p>{lead}</p>
      <h3 id={titleId}>{title}</h3>
      {description === undefined ? null : <p>{description}</p>}
      <Link className="button button--primary" to={to}>
        {actionLabel}
      </Link>
    </section>
  );
}
