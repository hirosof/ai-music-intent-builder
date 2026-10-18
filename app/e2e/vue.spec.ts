import { test, expect } from '@playwright/test'

// U0 の時点では実行しない（ブラウザ本体が未導入。U4 から使う）。画面に合わせて期待値だけ直してある
test('visits the app root url', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('AI Music Intent Builder')
})
