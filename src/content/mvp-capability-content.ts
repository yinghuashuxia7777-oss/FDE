import catalogJson from '../../content/skill-graph/v2/releases/0.2.0/catalog.json';
import attributionJson from '../../content/skill-attribution/mvp/map.v1.json';

import type {
  MvpCaseAttribution,
  MvpLeafSkill,
} from '../application/product/mvp-capability-projection';

export const mvpLeafSkills: readonly MvpLeafSkill[] = catalogJson.leaves.map(
  ({ id, name, parentSkillId }) => ({ id, name, parentSkillId }),
);

export const mvpCaseAttributions: readonly MvpCaseAttribution[] =
  attributionJson.entries.map(
    ({ caseId, caseVersion, leafSkillId, role, evidenceType }) => ({
      caseId,
      caseVersion,
      leafSkillId,
      role: role as 'primary' | 'secondary',
      evidenceType,
    }),
  );
