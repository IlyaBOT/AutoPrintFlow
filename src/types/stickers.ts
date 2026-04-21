import type { StickerStatus } from "@prisma/client";

export type StickerEditorState = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

export type StickerAssetVariant = "original" | "preview" | "final";

export type QueueStickerSummary = {
  id: string;
  updatedAt?: Date;
  createdAt: Date;
  approvedAt: Date | null;
  submittedAt: Date | null;
  printedAt: Date | null;
  originalFilePath?: string;
  originalWidth?: number;
  originalHeight?: number;
  editorStateJson?: unknown;
  finalFilePath: string | null;
  previewFilePath: string | null;
  status: StickerStatus;
  userId: string;
};

export type QueueStripe = {
  index: number;
  sheetIndex: number;
  positionInSheet: number;
  stickers: QueueStickerSummary[];
  slots: Array<QueueStickerSummary | null>;
  stickerCount: number;
};

export type QueueSheet = {
  index: number;
  stripes: QueueStripe[];
  stripeCount: number;
  stickerCount: number;
};

export type QueueStats = {
  totalApprovedStickers: number;
  totalStripes: number;
  totalSheets: number;
  submittedCount: number;
  approvedWaitingCount: number;
  printedCount: number;
};
