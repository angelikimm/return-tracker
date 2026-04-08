import type { Receipt } from './receiptsRepo';

export type BackupData = {
  version: number;
  exportedAt: string;
  data: {
    receipts: Receipt[];
    shopPolicies: Record<string, number>;
    shopOrder: string[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeReceipt(receipt: Receipt): Receipt {
  return {
    id: String(receipt.id),
    orderNumber: Number.isFinite(receipt.orderNumber)
      ? Math.max(1, Math.floor(receipt.orderNumber))
      : 1,
    description: String(receipt.description).trim().toUpperCase(),
    shop: String(receipt.shop).trim(),
    purchaseDate: String(receipt.purchaseDate),
    returnDate: String(receipt.returnDate),
    archived: Boolean(receipt.archived),
  };
}

export function parseImportedBackup(text: string): BackupData | null {
  try {
    const parsed = JSON.parse(text) as unknown;

    if (!isRecord(parsed)) return null;
    if (typeof parsed.version !== 'number') return null;
    if (typeof parsed.exportedAt !== 'string') return null;
    if (!isRecord(parsed.data)) return null;
    if (!Array.isArray(parsed.data.receipts)) return null;
    if (!isRecord(parsed.data.shopPolicies)) return null;
    if (!Array.isArray(parsed.data.shopOrder)) return null;

    const receipts = (parsed.data.receipts as Receipt[]).map(normalizeReceipt);

    const shopPolicies: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed.data.shopPolicies)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        shopPolicies[String(key).trim()] = Math.floor(value);
      }
    }

    const shopOrder = (parsed.data.shopOrder as unknown[])
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);

    return {
      version: parsed.version,
      exportedAt: parsed.exportedAt,
      data: {
        receipts,
        shopPolicies,
        shopOrder,
      },
    };
  } catch {
    return null;
  }
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}