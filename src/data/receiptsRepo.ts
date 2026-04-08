import { dbPromise } from './db';

export type Receipt = {
  id: string;
  orderNumber: number;
  description: string;
  shop: string;
  purchaseDate: string;
  returnDate: string;
  archived: boolean;
};

const STORE_NAME = 'receipts';

export async function getAllReceipts(): Promise<Receipt[]> {
  return (await dbPromise).getAll(STORE_NAME);
}

export async function saveReceipt(receipt: Receipt) {
  return (await dbPromise).put(STORE_NAME, receipt);
}

export async function saveReceipts(receipts: Receipt[]) {
  const db = await dbPromise;
  const tx = db.transaction(STORE_NAME, 'readwrite');

  for (const receipt of receipts) {
    tx.store.put(receipt);
  }

  await tx.done;
}

export async function deleteReceipt(id: string) {
  return (await dbPromise).delete(STORE_NAME, id);
}

export async function clearReceipts() {
  return (await dbPromise).clear(STORE_NAME);
}