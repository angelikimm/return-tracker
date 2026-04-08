import { useEffect, useState } from 'react';
import {
  clearReceipts,
  deleteReceipt,
  getAllReceipts,
  saveReceipt,
  saveReceipts,
  type Receipt,
} from '../data/receiptsRepo';

type SortOption = 'nearestReturn' | 'newestPurchase';
type FilterOption = 'active' | 'all' | 'urgent' | 'week' | 'archived';

function calculateDaysLeft(returnDateString: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const returnDate = new Date(`${returnDateString}T00:00:00`);
  return Math.ceil((returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function sortReceipts(receipts: Receipt[], sortBy: SortOption) {
  const next = [...receipts];

  if (sortBy === 'newestPurchase') {
    next.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  } else {
    next.sort((a, b) => calculateDaysLeft(a.returnDate) - calculateDaysLeft(b.returnDate));
  }

  return next;
}

export function useReceiptAppData() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState<SortOption>('nearestReturn');
  const [filter, setFilter] = useState<FilterOption>('all');

  useEffect(() => {
    const load = async () => {
      const savedReceipts = await getAllReceipts();
      setReceipts(savedReceipts);
      setLoading(false);
    };

    void load();
  }, []);

  const addReceipt = async (receipt: Receipt) => {
    await saveReceipt(receipt);
    setReceipts((prev) => [...prev, receipt]);
  };

  const updateReceipt = async (updatedReceipt: Receipt) => {
    await saveReceipt(updatedReceipt);
    setReceipts((prev) =>
      prev.map((receipt) =>
        receipt.id === updatedReceipt.id ? updatedReceipt : receipt
      )
    );
  };

  const archiveReceipt = async (id: string) => {
    const existing = receipts.find((receipt) => receipt.id === id);
    if (!existing) return;

    const updated = { ...existing, archived: true };
    await updateReceipt(updated);
  };

  const unarchiveReceipt = async (id: string) => {
    const existing = receipts.find((receipt) => receipt.id === id);
    if (!existing) return;

    const updated = { ...existing, archived: false };
    await updateReceipt(updated);
  };

  const archiveSelected = async (ids: string[]) => {
    const updatedReceipts = receipts.map((receipt) =>
      ids.includes(receipt.id) ? { ...receipt, archived: true } : receipt
    );

    await saveReceipts(updatedReceipts);
    setReceipts(updatedReceipts);
  };

  const deleteSelected = async (ids: string[]) => {
    for (const id of ids) {
      await deleteReceipt(id);
    }

    setReceipts((prev) => prev.filter((receipt) => !ids.includes(receipt.id)));
  };

  const replaceAllReceipts = async (nextReceipts: Receipt[]) => {
    const cleanedReceipts = nextReceipts.map((receipt) => ({
      id: String(receipt.id),
      orderNumber: Number.isFinite(receipt.orderNumber)
        ? Math.max(1, Math.floor(receipt.orderNumber))
        : 1,
      description: String(receipt.description).trim().toUpperCase(),
      shop: String(receipt.shop).trim(),
      purchaseDate: String(receipt.purchaseDate),
      returnDate: String(receipt.returnDate),
      archived: Boolean(receipt.archived),
    }));

    await clearReceipts();
    await saveReceipts(cleanedReceipts);
    setReceipts(cleanedReceipts);
  };

  const sortedReceipts = sortReceipts(receipts, sortBy);

  return {
    receipts,
    sortedReceipts,
    loading,
    sortBy,
    setSortBy,
    filter,
    setFilter,
    addReceipt,
    updateReceipt,
    archiveReceipt,
    unarchiveReceipt,
    archiveSelected,
    deleteSelected,
    replaceAllReceipts,
  };
}
