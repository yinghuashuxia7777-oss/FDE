import { expect, test } from '@playwright/test';

test('a first-time learner can generate a profile and see a first mission', async ({
  page,
}) => {
  await page.goto('/#/');

  await expect(
    page.getByRole('heading', { name: '生成你的 AI Engineer 成长档案' }),
  ).toBeVisible();
  await page.getByLabel(/成为 AI Engineer/).check();
  await page.getByLabel(/零基础/).check();
  await page.getByRole('button', { name: '生成我的成长档案' }).click();

  await expect(
    page.getByRole('heading', { name: '你的 AI Engineer 成长档案' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '你的第一个任务' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /开始学习/ })).toBeVisible();
});

test('the public demo is fixed presentation data and leaves local evidence untouched', async ({
  page,
}) => {
  await page.goto('/#/profile/demo');
  await page.evaluate(() => {
    localStorage.setItem(
      'fde-arena:beta:practice-completions:v1',
      JSON.stringify([{ sentinel: 'local-only' }]),
    );
  });
  await page.reload();

  await expect(page.locator('[data-demo-profile="true"]')).toBeVisible();
  await expect(page.getByRole('meter')).toHaveAttribute('aria-valuenow', '72');
  await expect(
    page.getByRole('heading', { name: 'Enterprise RAG Assistant' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Capability Evidence' }),
  ).toBeVisible();

  const storedEvidence = await page.evaluate(() =>
    localStorage.getItem('fde-arena:beta:practice-completions:v1'),
  );
  expect(storedEvidence).toBe(JSON.stringify([{ sentinel: 'local-only' }]));
});

test('the core beta presentation routes render without an application error', async ({
  page,
}) => {
  const routes = [
    ['/#/journey', 'AI Engineer Journey'],
    ['/#/practices', 'AI Engineer Practices'],
    ['/#/cases', '案件库'],
    ['/#/projects', 'AI Engineer Projects'],
    ['/#/feedback', '告诉我们哪里需要改进'],
  ] as const;

  for (const [route, title] of routes) {
    await page.goto(route);
    await expect(page.locator('h1')).toContainText(title);
    await expect(page.locator('body')).not.toContainText('Application error');
  }
});
