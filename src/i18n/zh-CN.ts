import { foundationPagesZhCN } from './translations/foundation-pages';
import { productPagesZhCN } from './translations/product-pages';
import { shellSettingsZhCN } from './translations/shell-settings';
import { trainingUiZhCN } from './translations/training-ui';

export const zhCN = {
  ...foundationPagesZhCN,
  ...productPagesZhCN,
  ...shellSettingsZhCN,
  ...trainingUiZhCN,
  'nav.dashboard': '首页',
  'language.switcherLabel': '语言',
  'language.zhCN': '简体中文',
  'language.enUS': 'English',
  'language.zhCNShort': '中',
  'language.enUSShort': 'EN',
} as const;
