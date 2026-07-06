const { test, expect } = require("@playwright/test");

test("renders palette and painted canvas", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Ev Renk Simülatörü" })).toBeVisible();
  await page.waitForFunction(() => document.querySelectorAll(".swatch").length > 1000);

  const canvasStats = await page.locator("#paintCanvas").evaluate((canvas) => {
    const context = canvas.getContext("2d");
    const { width, height } = canvas;
    const imageData = context.getImageData(0, 0, width, height).data;
    let visiblePixels = 0;
    let coloredPixels = 0;

    for (let index = 0; index < imageData.length; index += 64) {
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const a = imageData[index + 3];
      if (a > 0) visiblePixels += 1;
      if (a > 0 && Math.max(r, g, b) - Math.min(r, g, b) > 8) coloredPixels += 1;
    }

    return { width, height, visiblePixels, coloredPixels };
  });

  expect(canvasStats.width).toBeGreaterThan(500);
  expect(canvasStats.height).toBeGreaterThan(700);
  expect(canvasStats.visiblePixels).toBeGreaterThan(1000);
  expect(canvasStats.coloredPixels).toBeGreaterThan(100);
  expect(pageErrors).toEqual([]);

  await page.screenshot({ path: "test-results/smoke.png", fullPage: true });
});
