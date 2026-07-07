const { test, expect } = require("@playwright/test");

test("renders palette and painted canvas", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Ayvatullu Ev Boya" })).toBeVisible();
  await page.waitForFunction(() => document.querySelectorAll(".swatch").length > 1000);
  await expect(page.locator("#areaToggles")).toContainText(/Boya alan/);

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

  await expect(page.locator("#editMaskToggle")).toBeHidden();
  await expect(page.locator("#opacityRange")).toBeDisabled();

  await page.screenshot({ path: "test-results/smoke.png", fullPage: true });
});

test("protects admin panel and opens the selected image after login", async ({ page }) => {
  test.skip(!process.env.MONGODB_URI, "Admin API requires MONGODB_URI");

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/admin", { waitUntil: "networkidle" });

  await expect(page.locator("#adminOverlay")).toBeVisible();
  await expect(page.locator("#adminPanel")).toBeHidden();

  await page.locator("#loginUsername").fill("admin");
  await page.locator("#loginPassword").fill("evrenk2026");
  await page.locator("#loginForm").getByRole("button").click();

  await expect(page.locator("#adminOverlay")).toBeHidden();
  await expect(page.locator("#adminPanel")).toBeVisible();
  await expect(page.locator('#imageList [data-image-id="ev"]')).toBeVisible();
  await expect(page.locator("#opacityRange")).toBeEnabled();
  await expect(page.locator("body")).toHaveClass(/is-admin/);

  await page.locator("#publicLinkButton").click();
  await expect(page).toHaveURL(/\/ev$/);
  await expect(page.locator("body")).not.toHaveClass(/is-admin/);
  expect(pageErrors).toEqual([]);
});
