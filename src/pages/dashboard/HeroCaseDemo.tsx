import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useI18n } from '../../i18n';
import type { ChallengeSignal } from './DashboardVisuals';

const DEMO_LINES = [
  '> loading case evidence … OK',
  '> drafting controlled recovery …',
  '> submitting for review …',
] as const;

const TYPE_MS = 26;
const LINE_PAUSE_MS = 420;
const LIT_PAUSE_MS = 3600;
const RESET_PAUSE_MS = 900;

interface HeroCaseDemoProps {
  challenge: ChallengeSignal;
}

/**
 * BLACK BOX 案例演示卡（V4 定稿动效）：
 * 终端打字机循环 → 能力证据徽章点亮发光 → 重置。
 * 案例标题/难度/用时/技能为真实数据，徽章状态文案为现有 i18n。
 */
export function HeroCaseDemo({ challenge }: HeroCaseDemoProps) {
  const { t } = useI18n();
  const [typed, setTyped] = useState('');
  const [lit, setLit] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(DEMO_LINES.join('\n'));
      setLit(true);
      return;
    }
    let line = 0;
    let char = 0;
    let buffer = '';
    let cancelled = false;
    let timer = 0;

    const schedule = (fn: () => void, ms: number) => {
      timer = window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const tick = () => {
      if (line < DEMO_LINES.length) {
        const current: string = DEMO_LINES[line] ?? '';
        if (char < current.length) {
          buffer += current[char];
          char += 1;
          setTyped(buffer);
          schedule(tick, TYPE_MS);
        } else {
          buffer += '\n';
          line += 1;
          char = 0;
          schedule(tick, LINE_PAUSE_MS);
        }
        return;
      }
      schedule(() => {
        setLit(true);
        schedule(() => {
          setLit(false);
          buffer = '';
          line = 0;
          char = 0;
          setTyped('');
          schedule(tick, RESET_PAUSE_MS);
        }, LIT_PAUSE_MS);
      }, 500);
    };

    schedule(tick, RESET_PAUSE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <aside className="bb-demo">
      <div className="bb-demo__frame">
        <div aria-hidden="true" className="bb-demo__bar">
          <i />
          <i />
          <i />
          <span>case-challenge.md</span>
          <b>LIVE</b>
        </div>
        <div className="bb-demo__body">
          <span className="bb-demo__tag">
            CHALLENGE · {challenge.difficulty} · {challenge.estimatedTime}
          </span>
          <h3 className="bb-demo__title">{challenge.title}</h3>
          <p className="bb-demo__reason">{challenge.reason}</p>
          <pre aria-hidden="true" className="bb-demo__typing">
            {typed}
          </pre>
          <div className="bb-demo__evidence" data-lit={lit || undefined}>
            <span className="bb-demo__evidence-dot" />
            <span className="bb-demo__evidence-copy">
              <strong>{t('dashboard.journey.step.evidence')}</strong>
              <span>
                {lit
                  ? t('product.common.completed')
                  : t('dashboard.capability.status.notVerified')}
              </span>
            </span>
          </div>
          <div className="bb-demo__foot">
            <Link to={challenge.to}>{t('dashboard.challenge.action')} →</Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
