import { openDB } from 'idb';

export const dbPromise = openDB('receipt-tracker-db', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('receipts')) {
      db.createObjectStore('receipts', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('meta')) {
      db.createObjectStore('meta');
    }
  },
});