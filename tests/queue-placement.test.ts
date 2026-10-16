import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQueueLayout, buildQueueStats } from "../src/lib/queue";
import {
  planStickerMove,
  QueuePlacementError,
} from "../src/lib/queue-placement";
import {
  matchesSheetSnapshot,
  sheetLayoutToken,
  sheetStickerIds,
} from "../src/lib/queue-snapshot";
import type { QueueStickerSummary } from "../src/types/stickers";
const sticker = (
  id: string,
  userId = "A",
  placement?: [string, number],
): QueueStickerSummary => ({
  id,
  userId,
  createdAt: new Date(0),
  approvedAt: new Date(0),
  submittedAt: null,
  printedAt: null,
  finalFilePath: null,
  previewFilePath: null,
  status: "APPROVED",
  printStripeId: placement?.[0],
  printSlot: placement?.[1],
});
const definitions = [
  { id: "manual", position: 1, isManual: true, label: "Mail", customerId: "A" },
  { id: "auto-B", position: 2, isManual: false, label: null, customerId: "B" },
];
test("default auto placement separates accounts and leaves their partial stripes separate", () => {
  const layout = buildQueueLayout([
    sticker("a"),
    sticker("b", "B"),
    sticker("c"),
  ]);
  assert.equal(layout.stripes.length, 2);
  assert.deepEqual(
    layout.stripes[0].stickers.map((s) => s.id),
    ["a", "c"],
  );
  assert.deepEqual(
    layout.stripes[1].stickers.map((s) => s.id),
    ["b"],
  );
});
test("nine stickers of one account overflow to a second stripe", () => {
  const layout = buildQueueLayout(
    Array.from({ length: 9 }, (_, index) => sticker(String(index))),
  );
  assert.deepEqual(
    layout.stripes.map((row) => row.stickerCount),
    [8, 1],
  );
});
test("every fourth stripe starts a new A4 sheet, even with partial customer stripes", () => {
  const layout = buildQueueLayout(
    ["A", "B", "C", "D", "E", "F", "G"].map((user) => sticker(user, user)),
  );
  assert.deepEqual(
    layout.sheets.map((sheet) => sheet.stripeCount),
    [3, 3, 1],
  );
  assert.deepEqual(
    layout.stripes.map((row) => row.positionInSheet),
    [0, 1, 2, 0, 1, 2, 0],
  );
  const stats = buildQueueStats({
    approvedCount: 7,
    submittedCount: 0,
    printedCount: 0,
    layout,
  });
  assert.equal(stats.totalStripes, 7);
  assert.equal(stats.totalSheets, 3);
});
test("disabling account separation packs automatic stickers together", () => {
  assert.equal(
    buildQueueLayout([sticker("a"), sticker("b", "B")], {
      separateCustomers: false,
    }).stripes.length,
    1,
  );
});
test("manual gaps and shipping splits survive new approvals and grouping changes", () => {
  const input = [
    sticker("a", "A", ["manual", 6]),
    sticker("b", "B", ["auto-B", 2]),
    sticker("new", "A"),
  ];
  for (const separateCustomers of [true, false]) {
    const layout = buildQueueLayout(input, {
      separateCustomers,
      stripes: definitions,
    });
    assert.equal(layout.stripes[0].slots[6]?.id, "a");
    assert.equal(layout.stripes[0].slots[0], null);
    assert.equal(layout.stripes[0].stickerCount, 1);
    assert.equal(layout.stripes[1].slots[2]?.id, "b");
    assert.notEqual(
      layout.stripes.find((row) => row.stickers.some((s) => s.id === "new"))
        ?.id,
      "manual",
    );
  }
});
test("batch moves fill available slots in selection order without overwriting", () => {
  const layout = buildQueueLayout(
    [
      sticker("a", "A", ["manual", 0]),
      sticker("b", "A", ["manual", 1]),
      sticker("c", "B", ["auto-B", 2]),
    ],
    { stripes: definitions },
  );
  const plan = planStickerMove(layout.stripes, ["b", "a"], "auto-B", 1);
  assert.deepEqual(plan.moves, [
    { id: "b", stripeId: "auto-B", slot: 1 },
    { id: "a", stripeId: "auto-B", slot: 3 },
  ]);
});
test("occupied slots require an explicit swap and send the displaced sticker back", () => {
  const layout = buildQueueLayout(
    [sticker("a", "A", ["manual", 6]), sticker("b", "B", ["auto-B", 0])],
    { stripes: definitions },
  );
  assert.throws(
    () => planStickerMove(layout.stripes, ["a"], "auto-B", 0),
    QueuePlacementError,
  );
  assert.deepEqual(
    planStickerMove(layout.stripes, ["a"], "auto-B", 0, true).moves,
    [
      { id: "b", stripeId: "manual", slot: 6 },
      { id: "a", stripeId: "auto-B", slot: 0 },
    ],
  );
});
test("new stripe moves preserve the selected starting section and reject overflow", () => {
  const layout = buildQueueLayout([sticker("a"), sticker("b")]);
  assert.deepEqual(
    planStickerMove(layout.stripes, ["a", "b"], null, 6).moves.map(
      (move) => move.slot,
    ),
    [6, 7],
  );
  assert.throws(() => planStickerMove(layout.stripes, ["a", "b"], null, 7));
  assert.throws(() => planStickerMove(layout.stripes, ["a", "a"], null, 0));
  assert.throws(() => planStickerMove(layout.stripes, ["missing"], null, 0));
});
test("spatial sheet snapshots reject a moved sticker even when the ID list is unchanged", () => {
  const before = buildQueueLayout([sticker("a", "A", ["manual", 0])], {
    stripes: definitions,
  }).sheets[0];
  const after = buildQueueLayout([sticker("a", "A", ["manual", 7])], {
    stripes: definitions,
  }).sheets[0];
  assert.deepEqual(sheetStickerIds(before), sheetStickerIds(after));
  assert.equal(
    matchesSheetSnapshot(
      after,
      sheetStickerIds(before),
      sheetLayoutToken(before),
    ),
    false,
  );
});
