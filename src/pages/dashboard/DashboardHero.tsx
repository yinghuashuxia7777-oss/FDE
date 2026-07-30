import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useI18n } from '../../i18n';
import type { ChallengeSignal } from './DashboardVisuals';
import { HeroCaseDemo } from './HeroCaseDemo';

interface DashboardHeroProps {
  caseCount: number;
  challenge: ChallengeSignal | undefined;
}

/**
 * BLACK BOX 首页 Hero（V4 定稿方向）。
 * 文案全部来自 i18n：大标题为用户批准的 dashboard.hero.title*，
 * 按钮复用现有 dashboard.challenge.action / dashboard.capability.openGraph。
 */
export function DashboardHero({ caseCount, challenge }: DashboardHeroProps) {
  const { language, t } = useI18n();
  const bootLines = [
    '> fde-arena … ONLINE',
    `> loading incident archive … ${caseCount} CASES`,
    '> capability archive sync … OK',
    '> dossier declassification … READY',
  ];
  const [visibleLines, setVisibleLines] = useState(bootLines.length);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    setVisibleLines(0);
    const timer = window.setInterval(() => {
      setVisibleLines((current) => {
        if (current >= bootLines.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 420);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseCount]);

  const primaryTo = challenge?.to ?? '/cases';

  return (
    <header className="bb-hero">
      <div className="bb-hero__left">
        <div aria-hidden="true" className="bb-hero__boot">
          {bootLines.slice(0, visibleLines).map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
        <p className="bb-hero__eyebrow">{t('dashboard.hero.eyebrow')}</p>
        <h2 className="bb-hero__title">
          {t('dashboard.hero.titleLead')}
          <em>{t('dashboard.hero.titleAccent')}</em>
          {t('dashboard.hero.titleTail')}
        </h2>
        <p className="bb-hero__description">
          {t('dashboard.hero.description')}
        </p>
        <div className="bb-hero__actions">
          {language === 'zh-CN' ? (
            <Link className="bb-btn bb-btn--academy" to="/academy">
              进入 {t('nav.academy')}
            </Link>
          ) : null}
          <Link className="bb-btn bb-btn--primary" to={primaryTo}>
            {t('dashboard.challenge.action')} →
          </Link>
          <Link className="bb-btn bb-btn--ghost" to="/skills">
            {t('dashboard.capability.openGraph')}
          </Link>
          {language === 'zh-CN' ? (
            <Link className="bb-btn bb-btn--delivery" to="/delivery">
              {t('delivery.studio.title')}
            </Link>
          ) : null}
        </div>
      </div>

      {challenge === undefined ? null : <HeroCaseDemo challenge={challenge} />}
    </header>
  );
}
