import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { readPsd } from "ag-psd";
import { unzipSync, strFromU8 } from "fflate";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({
  datasourceUrl:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:local-test-only@127.0.0.1:55432/autoprintflow_test?schema=public",
});
test.describe.configure({ mode: "serial" });
let stickerId: string;
const testEmail = `qa-${Date.now()}@example.test`;
let png: Buffer;
test.beforeAll(async () => {
  expect(
    await prisma.sticker.count({
      where: { status: "APPROVED", printedAt: null },
    }),
    "E2E requires an isolated database with an empty print queue",
  ).toBe(0);
  png = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><path d="M400 50 L700 500 L100 500 Z" fill="#0ea5e9"/><circle cx="400" cy="340" r="70" fill="white"/></svg>',
    ),
  )
    .png()
    .toBuffer();
});
test.afterAll(async () => {
  const user = await prisma.user.findUnique({
    where: { email: testEmail },
    select: { id: true },
  });
  if (user) {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.printStripe.deleteMany({ where: { stickers: { none: {} } } });
    await Promise.all(
      ["originals", "final-stickers", "previews"].map((directory) =>
        rm(path.join("storage", directory, user.id), {
          recursive: true,
          force: true,
        }),
      ),
    );
  }
  await prisma.$disconnect();
});
test("complete user and production workflow, permissions, mobile and exports", async ({
  page,
  context,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.addCookies([
    { name: "apf_locale", value: "ru", domain: "localhost", path: "/" },
  ]);
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(page.locator("header summary")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
    animations: "disabled",
  });
  const register = await context.request.post("/api/auth/register", {
    headers: { Origin: "http://localhost:3000" },
    data: {
      name: "Тестовый заказчик",
      email: testEmail,
      password: "Qa-password-2026",
    },
  });
  expect(register.status()).toBe(200);
  const fake = await context.request.post("/api/stickers/upload", {
    headers: { Origin: "http://localhost:3000" },
    multipart: {
      file: {
        name: "fake.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
        ),
      },
    },
  });
  expect(fake.status()).toBe(422);
  const oriented = await sharp({
    create: { width: 120, height: 60, channels: 3, background: "red" },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const jpegUpload = await context.request.post("/api/stickers/upload", {
    headers: { Origin: "http://localhost:3000" },
    multipart: {
      file: { name: "rotated.jpg", mimeType: "image/jpeg", buffer: oriented },
    },
  });
  expect(jpegUpload.status()).toBe(200);
  const normalized = await prisma.sticker.findUniqueOrThrow({
    where: { id: (await jpegUpload.json()).stickerId },
  });
  expect(normalized.originalWidth).toBe(60);
  expect(normalized.originalHeight).toBe(120);
  expect(normalized.originalFilePath).toMatch(/\.png$/);
  await page.goto("/editor/new");
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "arch.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: /Продолжить|редактор/i }).click();
  await page.waitForURL(/\/editor\/[0-9a-f-]{36}$/);
  stickerId = page.url().split("/").pop()!;
  await expect(
    page.getByTestId("editor-stage").locator("canvas"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Сохранить", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-editor.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Повернуть вправо на 90°" }).click();
  await page.getByRole("button", { name: "Отразить горизонтально" }).click();
  await page.getByRole("button", { name: "Обрезка исходника" }).click();
  await page.getByText("Ширина %", { exact: true }).locator("input").fill("75");
  await page.getByRole("button", { name: "Применить обрезку" }).click();
  await page.getByLabel("Форма реза").selectOption("contour");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(
    page.getByText("Все изменения сохранены", { exact: true }),
  ).toBeVisible();
  const stored = await prisma.sticker.findUniqueOrThrow({
    where: { id: stickerId },
  });
  expect((stored.editorStateJson as any).crop.width).toBe(0.75);
  expect((stored.editorStateJson as any).cutShape).toBe("contour");
  await page.getByText("Финальное превью стикера", { exact: true }).click();
  const localPixels = await page
    .locator("aside canvas")
    .evaluate((canvas: HTMLCanvasElement) => [
      ...canvas.getContext("2d")!.getImageData(0, 0, 496, 496).data,
    ]);
  const final = await context.request.get(
    `/api/stickers/${stickerId}/asset?variant=final`,
  );
  expect(final.status()).toBe(200);
  const serverPixels = await sharp(await final.body())
    .ensureAlpha()
    .raw()
    .toBuffer();
  let different = 0;
  for (let i = 0; i < serverPixels.length; i++)
    if (Math.abs(serverPixels[i] - localPixels[i]) > 15) different++;
  expect(different / serverPixels.length).toBeLessThan(0.025);
  const version = stored.updatedAt.toISOString();
  const firstSave = await context.request.post(
    `/api/stickers/${stickerId}/state`,
    {
      headers: { Origin: "http://localhost:3000" },
      data: { editorState: stored.editorStateJson, version },
    },
  );
  expect(firstSave.status()).toBe(200);
  const staleSave = await context.request.post(
    `/api/stickers/${stickerId}/state`,
    {
      headers: { Origin: "http://localhost:3000" },
      data: { editorState: stored.editorStateJson, version },
    },
  );
  expect(staleSave.status()).toBe(409);
  await page.reload();
  await page.getByRole("button", { name: "На печать", exact: true }).click();
  await page.waitForURL("**/dashboard");
  const locked = await context.request.post(
    `/api/stickers/${stickerId}/state`,
    {
      headers: { Origin: "http://localhost:3000" },
      data: {
        editorState: stored.editorStateJson,
        version: (
          await prisma.sticker.findUniqueOrThrow({ where: { id: stickerId } })
        ).updatedAt.toISOString(),
      },
    },
  );
  expect(locked.status()).toBe(422);
  const unauthorized = await context.request.get(
    `/api/admin/production/sticker/${stickerId}`,
  );
  expect(unauthorized.status()).toBe(403);
  const stranger = await browser.newContext();
  const inaccessible = await stranger.request.get(
    `/api/stickers/${stickerId}/asset`,
  );
  expect(inaccessible.status()).toBe(401);
  await stranger.close();
  const csrf = await context.request.post("/api/account/profile", {
    headers: { Origin: "https://attacker.example" },
    data: {},
  });
  expect(csrf.status()).toBe(403);
  const login = await context.request.post("/api/auth/login", {
    headers: { Origin: "http://localhost:3000" },
    data: { email: "admin@autoprintflow.local", password: "admin12345" },
  });
  expect(login.status()).toBe(200);
  await page.goto("/admin");
  await expect(
    page.getByText("Тестовый заказчик", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Одобрить", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await prisma.sticker.findUniqueOrThrow({ where: { id: stickerId } }))
          .status,
    )
    .toBe("APPROVED");
  await page.goto("/admin?view=production");
  await expect(
    page.getByRole("button", { name: "Печать + резка", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-production.png",
    fullPage: true,
    animations: "disabled",
  });
  const queueSnapshot = (
    await (await context.request.get("/api/admin/queue/layout")).json()
  ).sheetSnapshots[0];
  const snapshot = `ids=${encodeURIComponent(stickerId)}&layout=${encodeURIComponent(queueSnapshot.layout)}`;
  const exported = await context.request.get(
    `/api/admin/production/sheet/1?format=zip&${snapshot}`,
    { timeout: 120_000 },
  );
  expect(exported.status(), await exported.text().catch(() => "")).toBe(200);
  const files = unzipSync(await exported.body());
  expect(files["sheet-1.psd"]).toBeTruthy();
  expect(files["sheet-1.png"]).toBeTruthy();
  const svg = strFromU8(
    files[Object.keys(files).find((key) => key.endsWith(".svg"))!],
  );
  expect(svg).toContain('width="80mm"');
  expect(svg).toContain("translate(19 19)");
  expect(svg).toContain('fill="none"');
  expect(svg).not.toContain("<image");
  const psd = readPsd(files["sheet-1.psd"], {
    skipLayerImageData: true,
    skipCompositeImageData: true,
    skipThumbnail: true,
  });
  expect(psd.width).toBe(3508);
  expect(psd.children?.length).toBe(2);
  expect(psd.children?.[1].left).toBe(81);
  expect(psd.children?.[1].top).toBe(77);
  await mkdir("test-results/exports", { recursive: true });
  await import("node:fs/promises").then((fs) =>
    Promise.all(
      Object.entries(files)
        .filter(([name]) => !name.includes("/"))
        .map(([name, buffer]) =>
          fs.writeFile(`test-results/exports/${name}`, buffer),
        ),
    ),
  );
  const wrongSheet = await context.request.post("/api/admin/sheets/1/printed", {
    headers: { Origin: "http://localhost:3000" },
    data: { stickerIds: ["stale-id"] },
  });
  expect(wrongSheet.status()).toBe(409);
  const staleExport = await context.request.get(
    "/api/admin/production/sheet/1?ids=stale-id",
  );
  expect(staleExport.status()).toBe(409);
  const printed = await context.request.post("/api/admin/sheets/1/printed", {
    headers: { Origin: "http://localhost:3000" },
    data: { stickerIds: [stickerId], layout: queueSnapshot.layout },
  });
  expect(printed.status()).toBe(200);
  expect(
    (await prisma.sticker.findUniqueOrThrow({ where: { id: stickerId } }))
      .status,
  ).toBe("PRINTED");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin");
  await page.screenshot({
    path: "test-results/desktop-admin.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/admin/system-settings");
  await expect(page.getByRole("tab", { name: "Оформление" })).toBeVisible();
  await page.getByRole("tab", { name: "Пользователи", exact: true }).click();
  await expect(page.getByPlaceholder("Найти имя или email")).toBeVisible();
  await page.getByRole("button", { name: /тёмную|темную/i }).click();
  await page.screenshot({
    path: "test-results/desktop-settings-dark.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});

test("a full sheet exports 24 independent cuts and rejects a shifted queue", async ({
  request,
}) => {
  const source = await prisma.sticker.findUniqueOrThrow({
    where: { id: stickerId },
  });
  const ids = Array.from({ length: 25 }, () => crypto.randomUUID());
  try {
    await prisma.sticker.createMany({
      data: ids.map((id, index) => ({
        id,
        userId: source.userId,
        originalFilePath: source.originalFilePath,
        originalWidth: source.originalWidth,
        originalHeight: source.originalHeight,
        editorStateJson: source.editorStateJson!,
        finalFilePath: source.finalFilePath,
        previewFilePath: source.previewFilePath,
        status: "APPROVED",
        approvedAt: new Date(Date.now() + index),
      })),
    });
    const login = await request.post("/api/auth/login", {
      headers: { Origin: "http://localhost:3000" },
      data: { email: "admin@autoprintflow.local", password: "admin12345" },
    });
    expect(login.status()).toBe(200);
    const fullSnapshot = (
      await (await request.get("/api/admin/queue/layout")).json()
    ).sheetSnapshots[0];
    const exported = await request.get(
      `/api/admin/production/sheet/1?format=zip&ids=${encodeURIComponent(ids.slice(0, 24).join(","))}&layout=${encodeURIComponent(fullSnapshot.layout)}`,
      { timeout: 120000 },
    );
    expect(exported.status()).toBe(200);
    const files = unzipSync(await exported.body());
    expect(
      Object.keys(files).filter(
        (name) => name.startsWith("cuts/") && name.endsWith(".svg"),
      ),
    ).toHaveLength(24);
    const psd = readPsd(files["sheet-1.psd"], {
      skipLayerImageData: true,
      skipCompositeImageData: true,
      skipThumbnail: true,
    });
    expect(psd.children).toHaveLength(25);
    const last = psd.children![24];
    expect(last.left).toBe(2931);
    expect(last.top).toBe(1685);
    const pngMeta = await sharp(files["sheet-1.png"]).metadata();
    expect(pngMeta.density).toBe(300);
    const placements = JSON.parse(strFromU8(files["placements.json"]));
    expect(placements.placements).toHaveLength(24);
    await prisma.sticker.update({
      where: { id: ids[0] },
      data: {
        status: "PRINTED",
        printedAt: new Date(),
        printStripeId: null,
        printSlot: null,
      },
    });
    const stale = await request.post("/api/admin/sheets/1/printed", {
      headers: { Origin: "http://localhost:3000" },
      data: { stickerIds: ids.slice(0, 24), layout: fullSnapshot.layout },
    });
    expect(stale.status()).toBe(409);
    expect(
      await prisma.sticker.count({
        where: { id: { in: ids.slice(1) }, status: "APPROVED" },
      }),
    ).toBe(24);
  } finally {
    await prisma.sticker.deleteMany({ where: { id: { in: ids } } });
  }
});

test("compact layouts, translations, reduced motion and dark theme", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "apf_locale", value: "ru", domain: "localhost", path: "/" },
  ]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const width of [320, 375, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/home-mobile-final.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: /тёмную|темную/i }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: "test-results/home-dark-final.png",
    fullPage: true,
    animations: "disabled",
  });
  await context.addCookies([
    { name: "apf_locale", value: "en", domain: "localhost", path: "/" },
  ]);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Your ideas/ })).toBeVisible();
  await page.locator("header summary").click();
  await page.locator('header details a[href="/register"]').click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.locator("header details")).not.toHaveAttribute("open");
  const health = await context.request.get("/api/health");
  expect(health.status()).toBe(200);
});
