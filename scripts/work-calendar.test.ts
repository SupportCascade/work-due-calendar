import { runTest } from "./auth";

runTest("Airtable calendar views", async helper => {
  const { page } = helper;
  await page.setViewportSize({ width: 1600, height: 900 });
  await helper.goto("/dashboard");

  await page.getByRole("heading", { name: "Work due dates" }).waitFor();

  const clientDueDatesTab = page.getByRole("tab", {
    name: "Client Due Dates",
  });
  const deliverablesTab = page.getByRole("tab", {
    name: "Deliverables",
  });
  if ((await deliverablesTab.getAttribute("aria-selected")) !== "true") {
    throw new Error("Deliverables should be the default calendar view.");
  }

  const calendar = page.locator('section[aria-label="month calendar"]');
  await calendar.locator(".calendar-task").first().waitFor({
    timeout: 60_000,
  });
  const deliverablesAside = page.locator(
    'aside[aria-label="Upcoming deliverables and undated work"]',
  );
  const summaryIsBelowCalendar = await deliverablesAside.evaluate(element => {
    const calendarSection = element.parentElement?.querySelector(
      'section[aria-label="month calendar"]',
    );
    return Boolean(
      calendarSection && calendarSection.compareDocumentPosition(element) & 4,
    );
  });
  if (!summaryIsBelowCalendar) {
    throw new Error("Summary cards should appear below the calendar.");
  }

  const summaryFilter = page.getByLabel("Filter summary cards");
  const chooseSummaryFilter = async (label: string) => {
    await summaryFilter.click();
    await page.getByRole("option", { name: label, exact: true }).click();
  };
  if ((await summaryFilter.innerText()).trim() !== "This & next week") {
    throw new Error("The summary filter should default to This & next week.");
  }
  const initialPanels = page.locator(".sidebar-disclosure-toggle");
  if ((await initialPanels.count()) !== 2) {
    throw new Error("Deliverables should show this week and next week cards.");
  }
  for (const toggle of await initialPanels.all()) {
    if ((await toggle.getAttribute("aria-expanded")) !== "false") {
      throw new Error("Summary panels should start collapsed.");
    }
  }
  if ((await calendar.locator(".calendar-report").count()) !== 0) {
    throw new Error(
      "Client report schedules should not appear in Deliverables.",
    );
  }

  await chooseSummaryFilter("No date");
  const noDateToggle = page.getByRole("button", { name: /No date/ });
  await noDateToggle.click();
  if ((await noDateToggle.getAttribute("aria-expanded")) !== "true") {
    throw new Error("The no-date summary panel should open when clicked.");
  }
  const noDateItem = page.getByRole("link", {
    name: /Open Black Hat GBP Verification in Airtable/,
  });
  await noDateItem.waitFor({ timeout: 60_000 });
  const noDateHref = await noDateItem.getAttribute("href");
  if (!noDateHref?.includes("rec5MfWyPZIRVdTYi")) {
    throw new Error(`Expected an Airtable work-item link, got ${noDateHref}`);
  }
  const ownerAndStatus = await noDateItem.innerText();
  if (
    !ownerAndStatus.includes("Gail") ||
    !ownerAndStatus.includes("In Progress")
  ) {
    throw new Error(
      `Owner/status missing from the Airtable item: ${ownerAndStatus}`,
    );
  }

  await clientDueDatesTab.click();
  if ((await clientDueDatesTab.getAttribute("aria-selected")) !== "true") {
    throw new Error("Client Due Dates tab should become active when selected.");
  }
  if ((await page.getByRole("button", { name: "Show Done" }).count()) !== 0) {
    throw new Error("The Done filter should be limited to Deliverables.");
  }
  if ((await summaryFilter.innerText()).trim() !== "Reports due") {
    throw new Error("Changing tabs should reset the card filter.");
  }
  const clientCalendar = page.locator('section[aria-label="month calendar"]');
  if ((await clientCalendar.locator(".calendar-task").count()) !== 0) {
    throw new Error("Deliverables should not appear in Client Due Dates.");
  }
  const reportCards = clientCalendar.locator(
    'a.calendar-report[href*="/tblOUMt8gNOiGnZVZ/"]',
  );
  await reportCards.first().waitFor({ timeout: 60_000 });
  const reportCard = await reportCards.first().innerText();
  if (
    !reportCard.includes("Monthly report") ||
    !reportCard.includes("Strategist:") ||
    !reportCard.includes("Due")
  ) {
    throw new Error(
      `Client due date details missing from the calendar: ${reportCard}`,
    );
  }
  const clientRecordHref = await reportCards.first().getAttribute("href");
  if (!clientRecordHref?.includes("tblOUMt8gNOiGnZVZ")) {
    throw new Error(
      `Expected an Airtable client link, got ${clientRecordHref}`,
    );
  }
  await page.screenshot({
    path: "tmp/work-calendar-client-due-dates-month.png",
    fullPage: false,
  });

  await chooseSummaryFilter("No report day set");
  const noReportDayToggle = page.getByRole("button", {
    name: /No report day set/,
  });
  await noReportDayToggle.click();
  await page
    .locator('a.upcoming-report[aria-label*="No report due day is set"]')
    .waitFor({ timeout: 60_000 });

  await chooseSummaryFilter("All cards");
  if ((await page.locator(".sidebar-disclosure-toggle").count()) !== 2) {
    throw new Error(
      "All cards in Client Due Dates should show schedules and missing-day cards.",
    );
  }

  await deliverablesTab.click();
  if ((await summaryFilter.innerText()).trim() !== "This & next week") {
    throw new Error("The Deliverables tab should reset its card filter.");
  }
  const countLabel = page.locator("text=/\\d+ shown · \\d+ total/");
  await countLabel.waitFor();
  const initialCount = (await countLabel.innerText()).match(
    /(\d+) shown · (\d+) total/,
  );
  if (!initialCount) {
    throw new Error("The deliverable count did not render.");
  }
  if (initialCount[1] === initialCount[2]) {
    throw new Error("Done items should be hidden by default.");
  }

  await helper.screenshot("work-calendar-month.png");

  await page.getByRole("button", { name: "week", exact: true }).click();
  if ((await page.locator(".week-day").count()) !== 7) {
    throw new Error("Week view should show seven days.");
  }
  await page.screenshot({
    path: "tmp/work-calendar-week-monitor.png",
    fullPage: false,
  });
  console.log(
    "📸 Monitor-sized week view saved to tmp/work-calendar-week-monitor.png",
  );
  await page.getByRole("button", { name: "month", exact: true }).click();

  const doneToggle = page.getByRole("button", { name: "Show Done" });
  await doneToggle.click();
  const fullCount = (await countLabel.innerText()).match(
    /(\d+) shown · (\d+) total/,
  );
  if (!fullCount || fullCount[1] !== fullCount[2]) {
    throw new Error("Enabling Show Done should reveal all deliverables.");
  }

  if (Number(initialCount[1]) < Number(initialCount[2])) {
    await page
      .getByRole("link", { name: /Open Piper checkin in Airtable/ })
      .first()
      .waitFor();
  }

  console.log(
    `Verified live Airtable data: ${initialCount[1]} deliverables shown by default; ${fullCount[2]} with Done included.`,
  );
}).catch(error => {
  console.error(error);
  process.exit(1);
});
