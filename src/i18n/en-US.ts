import { foundationPagesEnUS } from './translations/foundation-pages';
import { productPagesEnUS } from './translations/product-pages';
import { shellSettingsEnUS } from './translations/shell-settings';
import { trainingUiEnUS } from './translations/training-ui';

export const enUS = {
  ...foundationPagesEnUS,
  ...productPagesEnUS,
  ...shellSettingsEnUS,
  ...trainingUiEnUS,
  'nav.dashboard': 'Dashboard',
  'language.switcherLabel': 'Language',
  'language.zhCN': 'Simplified Chinese',
  'language.enUS': 'English',
  'language.zhCNShort': 'ZH',
  'language.enUSShort': 'EN',
} as const;
