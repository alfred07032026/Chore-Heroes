/**
 * Web smoke test: walks the whole app (setup → child flow → parent flow) in headless
 * Chromium and saves screenshots. Usage (after `npx expo export --platform web`):
 *   node scripts/smoke/serve.js "$PWD/dist" 8089 &
 *   node scripts/smoke/flow.js /tmp/shots 820 1180 portrait
 *   node scripts/smoke/flow.js /tmp/shots 1180 820 landscape
 * Prints any page/console errors at the end.
 */
// Uses Playwright; set PLAYWRIGHT_MODULE to its path if it is installed globally.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.argv[2];
const W = Number(process.argv[3] || 820),
  H = Number(process.argv[4] || 1180),
  tag = process.argv[5] || 'portrait';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  const shot = async (name) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SHOTS}/${tag}-${name}.png` });
    console.warn('shot', name);
  };
  const tid = (id) => page.getByTestId(id).first();
  const pin = async (digits) => {
    for (const d of digits) {
      await tid(`key-${d}`).click();
      await page.waitForTimeout(80);
    }
  };
  try {
    await page.goto('http://localhost:8089/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await shot('01-welcome');
    await tid('setup-start').click();
    await pin('2580');
    await page.waitForTimeout(300);
    await pin('2580');
    await page.waitForTimeout(800);
    await shot('02-children');
    await tid('child-name').fill('Maya');
    await tid('child-save').click();
    await page.waitForTimeout(800);
    await page.getByText('Add another child').click();
    await tid('child-name').fill('Leo');
    await page.getByLabel('Robot').click();
    await page.getByLabel('Blue', { exact: true }).click();
    await tid('child-save').click();
    await page.waitForTimeout(800);
    await tid('setup-next').click();
    await shot('03-starter');
    await tid('setup-finish').click();
    await page.waitForTimeout(1500);
    await tid('setup-done').click();
    await page.waitForTimeout(1200);
    await shot('04-kids');
    await tid('kid-Maya').click();
    await page.waitForTimeout(1500);
    await shot('05-today');
    await tid('task-Make your bed').click();
    await page.waitForTimeout(600);
    await shot('06-celebration');
    await page.waitForTimeout(2500);
    if (await tid('badge-close').count()) {
      await shot('07-badge');
      await tid('badge-close').click();
      await page.waitForTimeout(600);
    }
    if (await tid('badge-close').count()) {
      await tid('badge-close').click();
      await page.waitForTimeout(600);
    }
    await tid('task-Tidy up toys').click();
    await page.waitForTimeout(3000);
    for (let i = 0; i < 3; i++)
      if (await tid('badge-close').count()) {
        await tid('badge-close').click();
        await page.waitForTimeout(600);
      }
    await shot('08-today-done');
    await tid('open-shop').click();
    await page.waitForTimeout(1500);
    await shot('09-shop');
    await page.getByTestId('back-button').first().click();
    await page.waitForTimeout(800);
    await tid('open-progress').click();
    await page.waitForTimeout(1500);
    await shot('10-progress');
    await page.getByTestId('back-button').first().click();
    await page.waitForTimeout(600);
    await tid('switch-hero').click();
    await page.waitForTimeout(800);
    await tid('parent-button').click();
    await page.waitForTimeout(800);
    await shot('11-unlock');
    await pin('2580');
    await page.waitForTimeout(1500);
    await shot('12-parent-home');
    await tid('dash-Maya').click();
    await page.waitForTimeout(1500);
    await shot('13-child-dashboard');
    await tid('adjust-reason').fill('Helped grandma');
    await tid('adjust-submit').click();
    await page.waitForTimeout(800);
    await page.getByTestId('back-button').first().click();
    await page.waitForTimeout(600);
    await tid('nav-Jobs').click();
    await page.waitForTimeout(1000);
    await shot('14-tasks');
    await tid('task-new').click();
    await page.waitForTimeout(1000);
    await page.getByLabel('Feed the pet').first().click();
    await tid('task-approval').click();
    await shot('15-task-editor');
    await tid('task-save').click();
    await page.waitForTimeout(1000);
    if (W < 900) {
      /* portrait navigates back automatically */
    }
    await page.getByTestId('back-button').first().click();
    await page.waitForTimeout(600);
    await tid('nav-Rewards').click();
    await page.waitForTimeout(1000);
    await shot('16-rewards');
    await page.getByTestId('back-button').first().click();
    await page.waitForTimeout(600);
    await tid('nav-Settings').click();
    await page.waitForTimeout(1000);
    await shot('17-gate');
    const q = await tid('math-question').innerText();
    const [a, b] = q.match(/\d+/g).map(Number);
    for (const d of String(a * b)) {
      await tid(`key-${d}`).click();
    }
    await tid('math-submit').click();
    await page.waitForTimeout(800);
    await shot('18-settings');
    await tid('setting-font').click();
    await page.waitForTimeout(600);
    await shot('19-settings-dyslexic');
    await page.getByTestId('back-button').first().click();
    await page.waitForTimeout(500);
    await tid('parent-exit').click();
    await page.waitForTimeout(800);
    await tid('kid-Maya').click();
    await page.waitForTimeout(1500);
    await shot('20-today-dyslexic');
    await tid('task-Feed the pet').click();
    await page.waitForTimeout(1500);
    await shot('21-waiting');
    // Reward request → parent approvals → erase all data
    await page.waitForTimeout(2500);
    await tid('open-shop').click();
    await page.waitForTimeout(1500);
    await tid('get-Extra bedtime story').click();
    await page.waitForTimeout(600);
    await shot('22-ask-grown-up');
    await tid('shop-yes').click();
    await page.waitForTimeout(800);
    await shot('23-request-sent');
    await tid('shop-ok').click();
    await page.getByTestId('back-button').first().click();
    await page.waitForTimeout(600);
    await tid('switch-hero').click();
    await page.waitForTimeout(800);
    await tid('parent-button').click();
    await page.waitForTimeout(800);
    await pin('2580');
    await page.waitForTimeout(1500);
    await tid('nav-Approvals').click();
    await page.waitForTimeout(1200);
    await shot('24-inbox');
    await tid('approve-Feed the pet').click();
    await page.waitForTimeout(800);
    await tid('approve-Extra bedtime story').click();
    await page.waitForTimeout(1200);
    await shot('25-inbox-empty');
    await page.getByTestId('back-button').first().click();
    await page.waitForTimeout(600);
    await tid('nav-Settings').click();
    await page.waitForTimeout(800);
    const q2 = await tid('math-question').innerText();
    const [a2, b2] = q2.match(/\d+/g).map(Number);
    for (const d of String(a2 * b2)) await tid(`key-${d}`).click();
    await tid('math-submit').click();
    await page.waitForTimeout(800);
    await tid('reset').click();
    await page.waitForTimeout(500);
    await tid('reset-confirm').fill('ERASE');
    await tid('reset-go').click();
    await page.waitForTimeout(2000);
    await shot('26-after-reset');
    if (!(await page.getByText('Welcome to Chore Heroes!').count()))
      errors.push('reset did not return to setup');
  } catch (e) {
    errors.push('FLOW FAILED: ' + e.message);
    await page.screenshot({ path: `${SHOTS}/${tag}-zz-failure.png` });
  }
  const unique = [...new Set(errors)];
  console.warn(`ERRORS (${unique.length} unique):\n` + unique.slice(0, 30).join('\n'));
  await browser.close();
})();
