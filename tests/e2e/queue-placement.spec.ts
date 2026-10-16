import { test, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { unzipSync, strFromU8 } from "fflate";
import { readPsd } from "ag-psd";
import { renderProductionSticker } from "../../src/lib/image/artwork";
import type { QueueManagerData } from "../../src/types/stickers";
const db = new PrismaClient({
  datasourceUrl:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:local-test-only@127.0.0.1:55432/autoprintflow_test?schema=public",
});
const runId = `queue-${randomUUID()}`;
const users = Array.from({ length: 4 }, () => randomUUID());
const ids = Array.from({ length: 6 }, () => randomUUID());
const origin = { Origin: "http://localhost:3000" };
let initialGrouping = true;
async function getQueue(request: APIRequestContext): Promise<QueueManagerData> {
  const response = await request.get("/api/admin/queue/layout");
  expect(response.status()).toBe(200);
  return response.json();
}
async function change(
  request: APIRequestContext,
  state: QueueManagerData,
  input: object,
) {
  return request.post("/api/admin/queue/layout", {
    headers: origin,
    data: { revision: state.revision, ...input },
  });
}
const locate = (state: QueueManagerData, id: string) =>
  state.stripes.find((stripe) =>
    stripe.slots.some((sticker) => sticker?.id === id),
  )!;
test.beforeAll(async () => {
  expect(
    await db.sticker.count({ where: { status: "APPROVED", printedAt: null } }),
    "E2E requires an isolated database with an empty print queue",
  ).toBe(0);
  initialGrouping = (
    await db.systemSettings.findUniqueOrThrow({ where: { id: 1 } })
  ).separateCustomerStripes;
  await db.systemSettings.update({
    where: { id: 1 },
    data: { separateCustomerStripes: true },
  });
  await mkdir(path.join("storage/originals", runId), { recursive: true });
  await mkdir(path.join("storage/final-stickers", runId), { recursive: true });
  for (const [index, userId] of users.entries()) {
    await db.user.create({
      data: {
        id: userId,
        name: `Заказчик ${String.fromCharCode(65 + index)}`,
        email: `${runId}-${index}@example.test`,
        passwordHash: "not-an-authentication-fixture",
      },
    });
    const png = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: index === 1 ? "#2563eb" : "#ef4444",
      },
    })
      .png()
      .toBuffer();
    const final = await renderProductionSticker({
      sourceBuffer: png,
      mimeType: "image/png",
      originalWidth: 100,
      originalHeight: 100,
      state: {
        x: 248,
        y: 248,
        scaleX: 3,
        scaleY: 3,
        rotation: 0,
        cutShape: "square",
        borderMm: 2,
        cutSizeMm: 42,
      },
    });
    await writeFile(path.join("storage/originals", runId, `${index}.png`), png);
    await writeFile(
      path.join("storage/final-stickers", runId, `${index}.png`),
      final,
    );
  }
  for (const [index, id] of ids.entries()) {
    const owner = index < 3 ? 0 : index - 2;
    await db.sticker.create({
      data: {
        id,
        userId: users[owner],
        originalFilePath: `originals/${runId}/${owner}.png`,
        finalFilePath: `final-stickers/${runId}/${owner}.png`,
        previewFilePath: `final-stickers/${runId}/${owner}.png`,
        originalWidth: 100,
        originalHeight: 100,
        editorStateJson: {
          x: 248,
          y: 248,
          scaleX: 3,
          scaleY: 3,
          rotation: 0,
          cutShape: "square",
          borderMm: 2,
          cutSizeMm: 42,
        },
        status: index === 5 ? "SUBMITTED" : "APPROVED",
        approvedAt: index === 5 ? null : new Date(Date.now() + index),
        submittedAt: new Date(),
      },
    });
  }
});
test.afterAll(async () => {
  const stripes = await db.printStripe.findMany({
    where: { stickers: { some: { id: { in: ids } } } },
    select: { id: true },
  });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.printStripe.deleteMany({
    where: {
      id: { in: stripes.map((stripe) => stripe.id) },
      stickers: { none: {} },
    },
  });
  await db.systemSettings.update({
    where: { id: 1 },
    data: { separateCustomerStripes: initialGrouping },
  });
  await Promise.all([
    rm(path.join("storage/originals", runId), { recursive: true, force: true }),
    rm(path.join("storage/final-stickers", runId), {
      recursive: true,
      force: true,
    }),
  ]);
  await db.$disconnect();
});
test("customer stripes, manual shipping splits, swaps, persistence, grouping and spatial exports", async ({
  page,
  context,
  browser,
}) => {
  const guest = await browser.newContext();
  expect((await guest.request.get("/api/admin/queue/layout")).status()).toBe(
    403,
  );
  expect(
    (
      await guest.request.post("/api/admin/queue/layout", {
        headers: origin,
        data: {},
      })
    ).status(),
  ).toBe(403);
  await guest.close();
  expect(
    (
      await context.request.post("/api/auth/login", {
        headers: origin,
        data: { email: "admin@autoprintflow.local", password: "admin12345" },
      })
    ).status(),
  ).toBe(200);
  let state = await getQueue(context.request);
  expect(state.separateCustomers).toBe(true);
  expect(state.stripes).toHaveLength(3);
  expect(state.totalSheets).toBe(1);
  for (const stripe of state.stripes)
    expect(
      new Set(stripe.slots.filter(Boolean).map((sticker) => sticker!.userId))
        .size,
    ).toBe(1);
  expect(
    (
      await context.request.post(`/api/admin/stickers/${ids[5]}/approve`, {
        headers: origin,
      })
    ).status(),
  ).toBe(200);
  state = await getQueue(context.request);
  expect(state.stripes).toHaveLength(4);
  expect(state.totalSheets).toBe(2);
  expect(state.stripes[3].sheetIndex).toBe(2);
  expect(state.stripes[3].positionInSheet).toBe(0);
  const stats = await (await context.request.get("/api/queue/stats")).json();
  expect(stats.totalStripes).toBe(4);
  expect(stats.totalSheets).toBe(2);
  const sourceStripe = locate(state, ids[0]).id;
  await context.addCookies([
    { name: "apf_locale", value: "ru", domain: "localhost", path: "/" },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin?view=production");
  const manager = page.getByTestId("queue-placement-manager");
  await expect(manager.getByRole("checkbox")).toBeChecked();
  await manager.locator(`[data-sticker-id="${ids[0]}"]`).click();
  await manager.getByLabel("Название отправления").fill("Почта — Москва");
  await manager.getByLabel("Целевой слот").selectOption({ value: "5" });
  await manager.getByRole("button", { name: "Перенести", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await db.sticker.findUniqueOrThrow({ where: { id: ids[0] } }))
          .printSlot,
    )
    .toBe(5);
  state = await getQueue(context.request);
  const shipment = locate(state, ids[0]);
  expect(shipment.id).not.toBe(sourceStripe);
  expect(shipment.label).toBe("Почта — Москва");
  expect(shipment.isManual).toBe(true);
  expect(shipment.slots[5]?.id).toBe(ids[0]);
  const original = state.stripes.find((stripe) => stripe.id === sourceStripe)!;
  expect(original.slots[0]).toBeNull();
  expect(original.slots[1]?.id).toBe(ids[1]);
  expect(original.slots[2]?.id).toBe(ids[2]);
  await page.reload();
  expect((await getQueue(context.request)).revision).toBe(state.revision);
  const oldSheet = state.sheetSnapshots[shipment.sheetIndex - 1];
  const moved = await change(context.request, state, {
    action: "move",
    stickerIds: [ids[0]],
    targetStripeId: shipment.id,
    targetSlot: 7,
  });
  expect(moved.status()).toBe(200);
  state = await moved.json();
  expect(state.sheetSnapshots[shipment.sheetIndex - 1].stickerIds).toEqual(
    oldSheet.stickerIds,
  );
  expect(
    (
      await context.request.get(
        `/api/admin/production/sheet/${shipment.sheetIndex}?format=psd&ids=${encodeURIComponent(oldSheet.stickerIds.join(","))}&layout=${encodeURIComponent(oldSheet.layout)}`,
      )
    ).status(),
  ).toBe(409);
  expect(
    (
      await context.request.post(
        `/api/admin/sheets/${shipment.sheetIndex}/printed`,
        {
          headers: origin,
          data: { stickerIds: oldSheet.stickerIds, layout: oldSheet.layout },
        },
      )
    ).status(),
  ).toBe(409);
  const bStripe = locate(state, ids[3]);
  const swapped = await change(context.request, state, {
    action: "move",
    stickerIds: [ids[0]],
    targetStripeId: bStripe.id,
    targetSlot: 0,
    swap: true,
  });
  expect(swapped.status()).toBe(200);
  state = await swapped.json();
  expect(locate(state, ids[3]).id).toBe(shipment.id);
  expect(locate(state, ids[3]).slots[7]?.id).toBe(ids[3]);
  expect(locate(state, ids[0]).id).toBe(bStripe.id);
  const revisionBeforeRace = state.revision;
  const race = await Promise.all(
    [3, 4].map((targetSlot) =>
      change(context.request, state, {
        action: "move",
        stickerIds: [ids[1]],
        targetStripeId: sourceStripe,
        targetSlot,
      }),
    ),
  );
  expect(race.map((response) => response.status()).sort()).toEqual([200, 409]);
  state = await getQueue(context.request);
  expect(state.revision).not.toBe(revisionBeforeRace);
  const manualBefore = state.stripes
    .filter((stripe) => stripe.isManual)
    .map((stripe) => [
      stripe.id,
      stripe.slots.map((sticker) => sticker?.id ?? null),
    ]);
  const off = await change(context.request, state, {
    action: "grouping",
    separateCustomers: false,
  });
  expect(off.status()).toBe(200);
  state = await off.json();
  expect(state.separateCustomers).toBe(false);
  expect(
    state.stripes
      .filter((stripe) => stripe.isManual)
      .map((stripe) => [
        stripe.id,
        stripe.slots.map((sticker) => sticker?.id ?? null),
      ]),
  ).toEqual(manualBefore);
  expect(
    state.stripes
      .find((stripe) => stripe.slots.some((sticker) => sticker?.id === ids[4]))
      ?.slots.some((sticker) => sticker?.id === ids[5]),
  ).toBe(true);
  const on = await change(context.request, state, {
    action: "grouping",
    separateCustomers: true,
  });
  expect(on.status()).toBe(200);
  state = await on.json();
  expect(locate(state, ids[4]).id).not.toBe(locate(state, ids[5]).id);
  const auto = await change(context.request, state, {
    action: "automatic",
    stickerIds: [ids[0]],
  });
  expect(auto.status()).toBe(200);
  state = await auto.json();
  expect(locate(state, ids[0]).isManual).toBe(false);
  const finalShipment = locate(state, ids[3]);
  const snapshot = state.sheetSnapshots[finalShipment.sheetIndex - 1];
  const exported = await context.request.get(
    `/api/admin/production/sheet/${snapshot.index}?format=zip&ids=${encodeURIComponent(snapshot.stickerIds.join(","))}&layout=${encodeURIComponent(snapshot.layout)}`,
  );
  expect(exported.status()).toBe(200);
  const files = unzipSync(await exported.body());
  const placements = JSON.parse(strFromU8(files["placements.json"]));
  const placement = placements.placements.find(
    (item: { stickerId: string }) => item.stickerId === ids[3],
  );
  expect(placement.stripeId).toBe(shipment.id);
  expect(placement.shipmentLabel).toBe("Почта — Москва");
  expect(placement.slot).toBe(8);
  expect(placement.sheetPixels.left).toBe(
    [37, 1194, 2351][finalShipment.positionInSheet] + 580,
  );
  expect(placement.sheetPixels.top).toBe(1685);
  const psd = readPsd(files[`sheet-${snapshot.index}.psd`], {
    skipLayerImageData: true,
    skipCompositeImageData: true,
    skipThumbnail: true,
  });
  const layer = psd.children!.find((layer) => layer.name!.endsWith(ids[3]))!;
  expect(layer.left).toBe(placement.sheetPixels.left);
  expect(layer.top).toBe(placement.sheetPixels.top);
  const pixel = await sharp(files[`sheet-${snapshot.index}.png`])
    .extract({
      left: placement.sheetPixels.left + 248,
      top: placement.sheetPixels.top + 248,
      width: 1,
      height: 1,
    })
    .removeAlpha()
    .raw()
    .toBuffer();
  expect([...pixel]).toEqual([37, 99, 235]);
  await page.goto("/admin?view=production");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/queue-placement-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "test-results/queue-placement-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
});
