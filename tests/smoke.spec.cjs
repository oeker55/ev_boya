const { test, expect, devices } = require("@playwright/test");

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

test("mobile color picker stays on top of the preview", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });

  const mobileLayout = await page.evaluate(() => {
    const canvas = document.querySelector("#paintCanvas");
    const preview = document.querySelector(".preview-panel");
    const current = document.querySelector(".current-section");
    const palette = document.querySelector(".palette-section");
    const canvasBox = canvas.getBoundingClientRect();
    const previewBox = preview.getBoundingClientRect();
    const currentBox = current.getBoundingClientRect();
    const hitTarget = document.elementFromPoint(
      currentBox.left + currentBox.width / 2,
      currentBox.top + Math.min(24, currentBox.height / 2)
    );

    return {
      canvasBottom: canvasBox.bottom,
      previewBottom: previewBox.bottom,
      currentTop: currentBox.top,
      currentVisible: currentBox.height > 0 && currentBox.bottom > 0,
      currentHit: Boolean(hitTarget?.closest(".current-section")),
      paletteDisplay: window.getComputedStyle(palette).display,
    };
  });

  expect(mobileLayout.currentVisible).toBe(true);
  expect(mobileLayout.currentHit).toBe(true);
  expect(mobileLayout.currentTop).toBeGreaterThanOrEqual(mobileLayout.previewBottom - 1);
  expect(mobileLayout.canvasBottom).toBeLessThanOrEqual(mobileLayout.previewBottom + 1);
  expect(mobileLayout.paletteDisplay).toBe("none");

  await page.locator("#currentColor").tap();
  await expect(page.locator(".color-popup-overlay")).toBeVisible();
  await page.waitForFunction(() => document.querySelectorAll(".color-popup-grid .swatch").length > 1000);

  const layout = await page.evaluate(() => {
    const overlay = document.querySelector(".color-popup-overlay");
    const popup = document.querySelector(".color-popup");
    const grid = document.querySelector(".color-popup-grid");
    const swatch = grid.querySelector(".swatch");
    const footer = document.querySelector(".mobile-download-footer");
    const overlayBox = overlay.getBoundingClientRect();
    const popupBox = popup.getBoundingClientRect();
    const gridBox = grid.getBoundingClientRect();
    const swatchBox = swatch.getBoundingClientRect();
    const hitTarget = document.elementFromPoint(
      swatchBox.left + swatchBox.width / 2,
      swatchBox.top + swatchBox.height / 2
    );

    return {
      viewportHeight: window.innerHeight,
      overlayTop: overlayBox.top,
      overlayBottom: overlayBox.bottom,
      popupBottom: popupBox.bottom,
      gridHeight: gridBox.height,
      gridScrollHeight: grid.scrollHeight,
      overlayZ: Number(window.getComputedStyle(overlay).zIndex),
      htmlHasModal: document.documentElement.classList.contains("has-modal"),
      bodyHasModal: document.body.classList.contains("has-modal"),
      footerDisplay: window.getComputedStyle(footer).display,
      hitPopupSwatch: Boolean(hitTarget?.closest(".color-popup-grid .swatch")),
    };
  });

  expect(layout.htmlHasModal).toBe(true);
  expect(layout.bodyHasModal).toBe(true);
  expect(layout.footerDisplay).toBe("none");
  expect(layout.overlayZ).toBeGreaterThanOrEqual(1000);
  expect(layout.overlayTop).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.overlayBottom - layout.viewportHeight)).toBeLessThanOrEqual(2);
  expect(Math.abs(layout.popupBottom - layout.viewportHeight)).toBeLessThanOrEqual(2);
  expect(layout.gridScrollHeight).toBeGreaterThan(layout.gridHeight);
  expect(layout.hitPopupSwatch).toBe(true);
  expect(pageErrors).toEqual([]);

  await page.screenshot({ path: "test-results/mobile-color-popup.png", fullPage: true });
  await context.close();
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
