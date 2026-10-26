import { runTest } from "./auth";

runTest("anonymous read-only calendar preview", async helper => {
  const { page } = helper;
  await page.setViewportSize({ width: 1600, height: 900 });
  await helper.goto("/dashboard");

  await page.getByRole("heading", { name: "Work due dates" }).waitFor();
  const desktopFrame = await page.locator(".calendar-window").boundingBox();
  if (!desktopFrame || desktopFrame.width > 1321 || desktopFrame.height > 877) {
    throw new Error(
      `The desktop calendar should stay within its centered width/height cap: ${JSON.stringify(desktopFrame)}`,
    );
  }
  if (page.url().includes("/login")) {
    throw new Error("The preview should open without a sign-in screen.");
  }
  if ((await page.locator('input[type="password"]').count()) > 0) {
    throw new Error("The preview should not ask visitors for a password.");
  }

  await page
    .locator('section[aria-label="month calendar"] .calendar-task')
    .first()
    .waitFor({ timeout: 60_000 });

  await page.getByRole("tab", { name: "Client Due Dates" }).click();
  await page
    .locator('a.calendar-report[href*="/tblOUMt8gNOiGnZVZ/"]')
    .first()
    .waitFor({ timeout: 60_000 });

  await page.getByRole("button", { name: "week", exact: true }).click();
  if ((await page.locator(".week-day").count()) !== 7) {
    throw new Error("The public preview's week view should show seven days.");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "month", exact: true }).click();
  await page.waitForTimeout(250);
  const mobileLayout = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (mobileLayout.pageWidth > mobileLayout.clientWidth) {
    throw new Error(
      `The mobile calendar should not overflow horizontally: ${JSON.stringify(mobileLayout)}`,
    );
  }
  if (
    !(await page
      .locator('section[aria-label="month calendar"] .calendar-frame')
      .nth(1)
      .isVisible())
  ) {
    throw new Error("The month view should use its mobile agenda layout.");
  }
  await page.getByRole("button", { name: "week", exact: true }).click();
  const weekColumns = await page
    .locator(".week-grid")
    .evaluate(
      element =>
        getComputedStyle(element).gridTemplateColumns.split(" ").length,
    );
  if (weekColumns !== 1) {
    throw new Error("The mobile week view should stack its seven days.");
  }

  console.log(
    "Verified the read-only calendar, desktop bounds, and responsive mobile month/week layouts.",
  );
}).catch(error => {
  console.error(error);
  process.exit(1);
});
