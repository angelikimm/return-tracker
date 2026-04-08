import React, { useEffect, useMemo, useRef, useState } from 'react';
import { downloadJson, parseImportedBackup } from './data/backup';
import { useReceiptAppData } from './hooks/useReceiptAppData';
import type { Receipt } from './data/receiptsRepo';
import { useRegisterSW } from 'virtual:pwa-register/react';

type SortOption = 'nearestReturn' | 'newestPurchase';
type FilterOption = 'active' | 'all' | 'urgent' | 'week' | 'archived';

type EditState = {
  id: string;
  description: string;
  shop: string;
  purchaseDate: string;
} | null;

const DEFAULT_SHOP_POLICIES: Record<string, number> = {
  '& Other Stories': 28,
  'All Saints': 28,
  Arket: 30,
  Bershka: 30,
  'Charles Tyrwhitt': 180,
  Cos: 30,
  Deichmann: 366,
  Dune: 28,
  Hackett: 30,
  'H&M': 30,
  'Harvey Nichols': 14,
  'Harvie & Hudson': 30,
  'Hawes & Curtis': 28,
  'Hilditch & Key': 30,
  Hobbs: 30,
  Intimissimi: 30,
  'John Lewis': 30,
  'Jones Bootmakers': 45,
  'Levi’s': 30,
  'Marks & Spencer': 28,
  'Moss Bros': 28,
  'New & Lingwood': 30,
  Next: 28,
  Office: 28,
  Offspring: 28,
  'Oliver Bonas': 30,
  Primark: 28,
  'Pull & Bear': 30,
  Reserved: 30,
  'River Island': 28,
  Schuh: 365,
  Selfridges: 14,
  Shoezone: 365,
  'Size?': 28,
  'Sports Direct': 28,
  Suitsupply: 30,
  Superdry: 28,
  Toast: 28,
  'TK MAXX': 28,
  'Turnbull & Asser': 30,
  UNIQLO: 30,
  'Urban Outfitters': 30,
  Whistles: 28,
  Zara: 30,
};

const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  transition: 'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
};

const panelCardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  overflow: 'hidden',
  transition: 'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
};

const inputBaseStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  borderRadius: 8,
  border: '1px solid #ccc',
};

const softInputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #d1d5db',
  textAlign: 'left',
  background: '#fff',
  boxSizing: 'border-box',
};

const compactButtonStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 12,
  width: '100%',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #111827',
  background: '#111827',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #111827',
  background: 'white',
  color: '#111827',
  fontWeight: 700,
  cursor: 'pointer',
};

const neutralButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontWeight: 700,
  cursor: 'pointer',
  textAlign: 'left',
};

const dangerButtonStyle: React.CSSProperties = {
  ...neutralButtonStyle,
  background: '#b91c1c',
  border: '1px solid #b91c1c',
  color: 'white',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 800,
  textAlign: 'left',
  color: '#111827',
  letterSpacing: '-0.01em',
};

const labelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  textAlign: 'left',
  width: '100%',
};

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  border: '1px solid #d1d5db',
  fontSize: 12,
  whiteSpace: 'nowrap',
};

const tableCellStyle: React.CSSProperties = {
  padding: '8px 8px',
  border: '1px solid #e5e7eb',
  fontSize: 13,
  verticalAlign: 'top',
};

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseLocalDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayInputValue() {
  return toDateInputValue(getTodayStart());
}

function calculateDaysLeft(returnDateString: string) {
  const today = getTodayStart();
  const returnDate = parseLocalDate(returnDateString);
  return Math.ceil((returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysLabel(daysLeft: number) {
  if (daysLeft < 0) return `${Math.abs(daysLeft)} days overdue`;
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return 'Tomorrow';
  if (daysLeft === 3) return '3 days left';
  return `${daysLeft} days left`;
}

function formatUkDate(dateString: string) {
  return parseLocalDate(dateString).toLocaleDateString('en-GB');
}

function formatTodayLabel() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatWeekday(dateString: string) {
  return parseLocalDate(dateString).toLocaleDateString('en-GB', {
    weekday: 'long',
  });
}

function buildReturnDate(purchaseDate: string, shopDays: number) {
  const date = parseLocalDate(purchaseDate);
  date.setDate(date.getDate() + shopDays);
  return toDateInputValue(date);
}

function formatReceiptNumber(orderNumber: number) {
  return String(orderNumber).padStart(5, '0');
}

function moveItem<T>(list: T[], fromIndex: number, toIndex: number) {
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function normalizeShopName(input: string) {
  return input.trim().replace(/\s+/g, ' ');
}

function findExistingShopName(input: string, policies: Record<string, number>) {
  const normalized = normalizeShopName(input).toLowerCase();
  return Object.keys(policies).find((name) => name.toLowerCase() === normalized);
}

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getReceiptDaysLeft(receipt: Receipt) {
  return calculateDaysLeft(receipt.returnDate);
}

function isUrgentReceipt(receipt: Receipt) {
  if (receipt.archived) return false;
  return getReceiptDaysLeft(receipt) <= 3;
}

function matchesReceiptSearch(receipt: Receipt, searchTerm: string) {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) return true;

  const formattedNumber = formatReceiptNumber(receipt.orderNumber);
  const rawNumber = String(receipt.orderNumber);

  return (
    receipt.description.toLowerCase().includes(normalized) ||
    receipt.shop.toLowerCase().includes(normalized) ||
    formattedNumber.includes(normalized) ||
    rawNumber.includes(normalized)
  );
}

function matchesReceiptFilter(receipt: Receipt, filter: FilterOption) {
  const daysLeft = getReceiptDaysLeft(receipt);

  if (filter === 'all') return true;
  if (filter === 'archived') return receipt.archived;
  if (receipt.archived) return false;
  if (filter === 'urgent') return isUrgentReceipt(receipt);
  if (filter === 'week') return daysLeft >= 0 && daysLeft <= 7;
  return true;
}

function getUrgencyTone(daysLeft: number) {
  if (daysLeft < 0) {
    return {
      background: '#fef2f2',
      color: '#991b1b',
      borderLeft: '3px solid #dc2626',
    };
  }

  if (daysLeft <= 1) {
    return {
      background: '#fff1f2',
      color: '#be123c',
      borderLeft: '3px solid #f43f5e',
    };
  }

  if (daysLeft <= 3) {
    return {
      background: '#fffbeb',
      color: '#a16207',
      borderLeft: '3px solid #eab308',
    };
  }

  return {
    background: '#f9fafb',
    color: '#374151',
    borderLeft: '3px solid transparent',
  };
}

function Button({
  children,
  variant = 'secondary',
  style,
  ...props
  
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'neutral' | 'danger' | 'compact';
}) {
  const baseMap: Record<string, React.CSSProperties> = {
    primary: primaryButtonStyle,
    secondary: secondaryButtonStyle,
    neutral: neutralButtonStyle,
    danger: dangerButtonStyle,
    compact: compactButtonStyle,
  };

  return (
  <button
    {...props}
    onMouseEnter={(e) => {
      e.currentTarget.style.filter = 'brightness(0.96)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.filter = 'none';
    }}
    style={{
      ...baseMap[variant],
      ...style,
    }}
  >
    {children}
  </button>
);
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...softInputStyle, ...props.style }} />;
}

function AddReceiptForm({
  description,
  setDescription,
  shop,
  setShop,
  purchaseDate,
  setPurchaseDate,
  showShopSuggestions,
  setShowShopSuggestions,
  matchingShops,
  shopPolicies,
  errors,
  onSubmit,
}: {
  description: string;
  setDescription: (value: string) => void;
  shop: string;
  setShop: (value: string) => void;
  purchaseDate: string;
  setPurchaseDate: (value: string) => void;
  showShopSuggestions: boolean;
  setShowShopSuggestions: (value: boolean) => void;
  matchingShops: string[];
  shopPolicies: Record<string, number>;
  errors: {
    description?: string;
    shop?: string;
  };
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
   <form
  onSubmit={onSubmit}
  style={{
    ...cardStyle,
    padding: 18,
    marginBottom: 22,
  }}
>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <h2
            style={{
              margin: 0,
              textAlign: 'left',
              fontSize: 18,
              color: '#111827',
            }}
          >
            Add
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: '#6b7280',
            }}
          >
            Quick entry for a new purchase and return deadline.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.8fr 1.1fr 0.9fr auto',
          gap: 10,
          alignItems: 'start',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <TextInput
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value.toUpperCase())}
            style={{
              padding: '10px 12px',
              minWidth: 0,
              borderColor: errors.description ? '#dc2626' : '#d1d5db',
            }}
          />
          {errors.description && (
            <div
              style={{
                color: '#b91c1c',
                fontSize: 12,
                marginTop: 6,
                textAlign: 'left',
              }}
            >
              {errors.description}
            </div>
          )}
        </div>

        <div style={{ position: 'relative', minWidth: 0 }}>
          <TextInput
            type="text"
            value={shop}
            placeholder="Shop"
            onChange={(e) => {
              setShop(e.target.value);
              setShowShopSuggestions(true);
            }}
            onFocus={() => setShowShopSuggestions(true)}
            onBlur={() => window.setTimeout(() => setShowShopSuggestions(false), 150)}
            style={{
              padding: '10px 12px',
              borderColor: errors.shop ? '#dc2626' : '#d1d5db',
            }}
          />

          {showShopSuggestions && matchingShops.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                maxHeight: 220,
                overflowY: 'auto',
                zIndex: 20,
              }}
            >
              {matchingShops.map((shopName) => (
                <button
                  key={shopName}
                  type="button"
                  onMouseDown={() => {
                    setShop(shopName);
                    setShowShopSuggestions(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  {shopName} ({shopPolicies[shopName]} days)
                </button>
              ))}
            </div>
          )}

          {errors.shop && (
            <div
              style={{
                color: '#b91c1c',
                fontSize: 12,
                marginTop: 6,
                textAlign: 'left',
              }}
            >
              {errors.shop}
            </div>
          )}
        </div>

        <TextInput
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          style={{
            padding: '10px 12px',
          }}
        />

      <Button
  type="submit"
  style={{
    borderRadius: 10,
    whiteSpace: 'nowrap',
  }}
>
  Add receipt
</Button>
      </div>
    </form>
  );
}

function FiltersPanel({
  searchTerm,
  setSearchTerm,
  filter,
  setFilter,
  sortBy,
  setSortBy,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filter: FilterOption;
  setFilter: (value: FilterOption) => void;
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 18, textAlign: 'left' }}>
      <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
        <h3 style={labelStyle}>Search</h3>
        <TextInput
          type="text"
          placeholder="Search number, description or shop"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
  <h3 style={labelStyle}>Filter</h3>

 <select
  value={filter}
  onChange={(e) => setFilter(e.target.value as FilterOption)}
  style={{
    ...softInputStyle,
    width: '100%',
  }}
>
  <option value="all">All</option>
  <option value="active">Active</option>
  <option value="urgent">Urgent</option>
  <option value="archived">Archived</option>
</select>
</div>

      <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
        <h3 style={labelStyle}>Sort</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          style={softInputStyle}
        >
          <option value="nearestReturn">Nearest return</option>
          <option value="newestPurchase">Newest purchase</option>
        </select>
      </div>
    </div>
  );
}

function ShopPolicyManager({
  shopPolicies,
  setShopPolicies,
  shopOrder,
  setShopOrder,
  receipts,
  shop,
  setShop,
  editState,
  setEditState,
}: {
  shopPolicies: Record<string, number>;
  setShopPolicies: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  shopOrder: string[];
  setShopOrder: React.Dispatch<React.SetStateAction<string[]>>;
  receipts: Receipt[];
  shop: string;
  setShop: (value: string) => void;
  editState: EditState;
  setEditState: React.Dispatch<React.SetStateAction<EditState>>;
}) {
  const [newShopName, setNewShopName] = useState('');
  const [newShopDays, setNewShopDays] = useState(30);
  const [draggedShop, setDraggedShop] = useState<string | null>(null);
  const [dragOverShop, setDragOverShop] = useState<string | null>(null);

  const orderedShopNames = useMemo(() => shopOrder, [shopOrder]);

  const addCustomShop = () => {
    const trimmedName = normalizeShopName(newShopName);
    const normalizedDays = Number.isFinite(newShopDays) ? Math.max(1, Math.floor(newShopDays)) : 30;

    if (!trimmedName) return;

    setShopPolicies((prev) => ({
      ...prev,
      [trimmedName]: normalizedDays,
    }));

    if (!shopOrder.includes(trimmedName)) {
      setShopOrder((prev) => [...prev, trimmedName]);
    }

    setShop(trimmedName);
    setNewShopName('');
    setNewShopDays(30);
  };

  const deleteShopPolicy = (shopName: string) => {
    const inUse = receipts.some((receipt) => receipt.shop === shopName);
    if (inUse) {
      alert('This shop is already used by one or more receipts and cannot be deleted yet.');
      return;
    }

    setShopPolicies((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([name]) => name !== shopName))
    );

    setShopOrder((prev) => prev.filter((name) => name !== shopName));

    if (shop === shopName) {
      setShop('');
    }

    if (editState?.shop === shopName) {
      setEditState((prev) => (prev ? { ...prev, shop: '' } : prev));
    }
  };

  const resetShopOrder = () => {
    setShopOrder(Object.keys(shopPolicies).sort((a, b) => a.localeCompare(b, 'en-GB')));
    setDraggedShop(null);
    setDragOverShop(null);
  };

  const handleShopDrop = (shopName: string) => {
    if (!draggedShop || draggedShop === shopName) {
      setDraggedShop(null);
      setDragOverShop(null);
      return;
    }

    const currentOrder = [...shopOrder];
    const fromIndex = currentOrder.indexOf(draggedShop);
    const toIndex = currentOrder.indexOf(shopName);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedShop(null);
      setDragOverShop(null);
      return;
    }

    setShopOrder(moveItem(currentOrder, fromIndex, toIndex));
    setDraggedShop(null);
    setDragOverShop(null);
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
        <h3 style={labelStyle}>New return policy</h3>
      </div>

      <input
        type="text"
        placeholder="Shop name"
        value={newShopName}
        onChange={(e) => setNewShopName(e.target.value)}
        style={{
          ...inputBaseStyle,
          padding: 10,
        }}
      />

      <div style={{ position: 'relative' }}>
        <input
          type="number"
          value={newShopDays}
          onChange={(e) => setNewShopDays(Number(e.target.value))}
          style={{
            ...inputBaseStyle,
            padding: '10px 46px 10px 10px',
            width: '100%',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6b7280',
            fontSize: 13,
            pointerEvents: 'none',
          }}
        >
          days
        </span>
      </div>

      <Button
        type="button"
        variant="neutral"
        onClick={addCustomShop}
        style={{
          background: '#f3f4f6',
          color: '#374151',
        }}
      >
        Save shop policy
      </Button>

      <div style={{ display: 'grid', gap: 8, justifyItems: 'start', marginTop: 6 }}>
        <h3 style={{ ...labelStyle, whiteSpace: 'nowrap' }}>Manage shop policies</h3>
      </div>

      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: 8,
          background: '#f9fafb',
        }}
      >
        {orderedShopNames.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6b7280' }}>No shop policies saved.</div>
        ) : (
          orderedShopNames.map((shopName) => {
            const isBeingDragged = draggedShop === shopName;
            const isDragTarget = dragOverShop === shopName && draggedShop !== shopName;

            return (
              <div
                key={shopName}
                draggable
                onDragStart={() => setDraggedShop(shopName)}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (shopName !== dragOverShop) {
                    setDragOverShop(shopName);
                  }
                }}
                onDrop={() => handleShopDrop(shopName)}
                onDragEnd={() => {
                  setDraggedShop(null);
                  setDragOverShop(null);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: '10px 6px',
                  borderBottom: '1px solid #e5e7eb',
                  background: isDragTarget
                    ? '#e5e7eb'
                    : isBeingDragged
                      ? '#f3f4f6'
                      : 'transparent',
                  opacity: isBeingDragged ? 0.65 : 1,
                  cursor: 'grab',
                  borderRadius: 8,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 16,
                    color: '#6b7280',
                    userSelect: 'none',
                    lineHeight: 1,
                  }}
                >
                  ⋮⋮
                </span>

                <span style={{ fontSize: 13, wordBreak: 'break-word' }}>{shopName}</span>

                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {shopPolicies[shopName]} days
                </span>

                <button
                  type="button"
                  onClick={() => deleteShopPolicy(shopName)}
                  style={{
                    fontSize: 12,
                    color: '#b91c1c',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontWeight: 500,
                    userSelect: 'none',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: 0,
                  }}
                >
                  Delete
                </button>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          fontSize: 12,
          color: '#6b7280',
          lineHeight: 1.5,
          textAlign: 'left',
          marginTop: 2,
        }}
      >
        Drag shops to set your preferred dropdown order. Reset to A–Z any time.
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={resetShopOrder}
        style={{
          textAlign: 'left',
        }}
      >
        Reset to A–Z
      </Button>
    </div>
  );
}
function InfoPanel() {
  return (
    <section
      style={{
        ...panelCardStyle,
        border: '1px solid #d1d5db',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          padding: '15px 18px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
          textAlign: 'left',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.01em',
            textAlign: 'left',
          }}
        >
          Data & storage
        </h2>
      </div>

      <div
        style={{
          padding: 18,
          fontSize: 13,
          color: '#374151',
          lineHeight: 1.6,
          display: 'grid',
          gap: 10,
          textAlign: 'left',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: '#111827',
            fontSize: 14,
            marginBottom: 4,
          }}
        >
          This app runs on your device and stores data using your browser.
        </div>

        <div>Your data does not sync between devices or browsers.</div>
        <div>Switching browsers or devices will not carry your receipts over.</div>
        <div>Clearing app or browser data may remove your receipts.</div>
        <div><strong>Export backup to keep a safe copy.</strong></div>
        <div>Import backup to restore saved data.</div>
        <div>Press Reload when a new version is available.</div>
      </div> {/* ← THIS was missing */}

    </section>
  );
}
function BulkActionsPanel({
  exportData,
  importData,
}: {
  exportData: () => void;
  importData: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Button
        type="button"
        onClick={exportData}
        variant="secondary"
        style={{
          textAlign: 'left',
        }}
      >
        Export backup
      </Button>

      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        variant="secondary"
        style={{
          textAlign: 'left',
        }}
      >
        Import backup
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            importData(file);
          }
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}

function UtilityPanel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section style={panelCardStyle}>
   <div
  style={{
    padding: '15px 18px',
    borderBottom: '1px solid #e5e7eb',
    background: '#fafafa',
  }}
>
        <h2 style={sectionTitleStyle}>{title}</h2>
      </div>

      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}

function ReceiptsTable({
  title,
  receipts,
  selectedIds,
  toggleSelected,
  toggleSelectAll,
  allSelected,
  onEdit,
  onArchive,
  onRestore,
  archived,
}: {
  title: string;
  receipts: Receipt[];
  selectedIds: string[];
  toggleSelected: (id: string) => void;
  toggleSelectAll: (ids: string[]) => void;
  allSelected: boolean;
  onEdit: (receipt: Receipt) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  archived: boolean;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: 22,
        marginTop: 0,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: 16,
          textAlign: 'left',
          fontSize: 20,
          color: '#111827',
        }}
      >
        {title}
      </h2>

      {receipts.length === 0 ? (
  <div
    style={{
      padding: '24px 8px',
      textAlign: 'center',
      color: '#6b7280',
    }}
  >
    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
      {archived ? 'No archived receipts yet' : 'No receipts found'}
    </div>
    <div style={{ fontSize: 14 }}>
      {archived
        ? 'Archived items will appear here once you move them out of the active list.'
        : 'Try changing your search or filters, or add a new receipt.'}
    </div>
  </div>
) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ ...tableHeaderStyle, width: '5%' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleSelectAll(receipts.map((r) => r.id))}
                />
              </th>
              <th style={{ ...tableHeaderStyle, width: '9%' }}>No.</th>
              <th style={{ ...tableHeaderStyle, width: archived ? '18%' : '16%' }}>Shop</th>
              <th style={{ ...tableHeaderStyle, width: archived ? '22%' : '18%' }}>
                Description
              </th>
              <th style={{ ...tableHeaderStyle, width: '16%', textAlign: 'center' }}>Purchase Date</th>
              <th style={{ ...tableHeaderStyle, width: '13%', textAlign: 'center' }}>
                Return Date
              </th>
              {!archived && <th style={{ ...tableHeaderStyle, width: '14%' }}>Days Left</th>}
              <th style={{ ...tableHeaderStyle, width: archived ? '19%' : '15%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
{receipts.map((receipt, index) => {
              const daysLeft = getReceiptDaysLeft(receipt);
          const rowBackground = index % 2 === 0 ? '#ffffff' : '#fafafa';

              const urgencyTone = getUrgencyTone(daysLeft);

              return (
               <tr
  key={receipt.id}
  onMouseEnter={(e) => {
    (e.currentTarget as HTMLTableRowElement).style.background = '#f1f5f9';
  }}
  onMouseLeave={(e) => {
    (e.currentTarget as HTMLTableRowElement).style.background = rowBackground;
  }}
 style={{
  background: rowBackground,
  transition: 'background 0.15s ease, transform 0.15s ease',
}}
>
                  <td style={tableCellStyle}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(receipt.id)}
                      onChange={() => toggleSelected(receipt.id)}
                    />
                  </td>

                  <td style={{ ...tableCellStyle, fontWeight: 700 }}>
                    {formatReceiptNumber(receipt.orderNumber)}
                  </td>

                  <td
                    style={{
                      ...tableCellStyle,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      lineHeight: 1.4,
                    }}
                  >
                    {receipt.shop}
                  </td>

                  <td
                    style={{
                      ...tableCellStyle,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      lineHeight: 1.4,
                    }}
                  >
                    {receipt.description}
                  </td>

                  <td
  style={{
    ...tableCellStyle,
    textAlign: 'center',
  }}
>
  {formatUkDate(receipt.purchaseDate)}
</td>

                  <td
                    style={{
                      ...tableCellStyle,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ opacity: 0.85 }}>{formatUkDate(receipt.returnDate)}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#6b7280',
                        marginTop: 2,
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    >
                      {formatWeekday(receipt.returnDate)}
                    </div>
                  </td>

                  {!archived && (
                    <td
                      style={{
                        ...tableCellStyle,
                        whiteSpace: 'normal',
                        lineHeight: 1.4,
                        padding: 0,
                      }}
                    >
                      <div
                     style={{
  padding: '8px 10px',
  fontWeight: 800,
  ...urgencyTone,
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 0,
  fontSize: 12,
  letterSpacing: '0.01em',
}}
                      >
                        {getDaysLabel(daysLeft)}
                      </div>
                    </td>
                  )}

                  <td style={tableCellStyle}>
                    {archived ? (
                      <Button
                        type="button"
                        variant="compact"
                        onClick={() => onRestore(receipt.id)}
                        style={{
                          border: '1px solid #d1d5db',
                          background: '#f9fafb',
                          color: '#374151',
                        }}
                      >
                        Restore
                      </Button>
                    ) : (
                      <div style={{ display: 'grid', gap: 4 }}>
                        <Button
                          type="button"
                          variant="compact"
                          onClick={() => onEdit(receipt)}
                          style={{
                            border: '1px solid #d1d5db',
                            background: '#ffffff',
                            color: '#111827',
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="compact"
                          onClick={() => onArchive(receipt.id)}
                          style={{
                            border: '1px solid #d1d5db',
                            background: '#f9fafb',
                            color: '#374151',
                          }}
                        >
                          Archive
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function UrgentSummary({
  urgentReceipts,
  onArchive,
}: {
  urgentReceipts: Receipt[];
  onArchive: (id: string) => void;
}) {
  if (urgentReceipts.length === 0) {
    return (
      <div
        style={{
          ...panelCardStyle,
          padding: 16,
          marginBottom: 20,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#111827',
            marginBottom: 4,
          }}
        >
          No urgent returns
        </div>
        <div style={{ fontSize: 14, color: '#6b7280' }}>
          You do not have any receipts due in the next 3 days.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...panelCardStyle,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>
          Urgent returns
        </div>

        <div style={{ fontSize: 14, color: '#6b7280' }}>
          {urgentReceipts.length} receipt{urgentReceipts.length === 1 ? '' : 's'} need attention
          soon.
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {urgentReceipts.slice(0, 5).map((receipt) => {
          const daysLeft = getReceiptDaysLeft(receipt);
          const accent = daysLeft < 0 ? '#5f1212' : daysLeft <= 1 ? '#dc2626' : '#eab308';
          const border = daysLeft < 0 ? '#fca5a5' : daysLeft <= 1 ? '#fecaca' : '#fcd34d';

          return (
            <div
  key={receipt.id}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-1px)';
    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  }}
  style={{
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 12,
    alignItems: 'center',
    background: '#ffffff',
    border: `1px solid ${border}`,
    borderRadius: 12,
    padding: 12,
    paddingLeft: 16,
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
  }}
>
              <div
  style={{
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
    background: accent,
  }}
/>

              <div style={{ paddingLeft: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{receipt.shop}</div>

                <div
                  style={{
                    fontSize: 13,
                    color: accent,
                    fontWeight: 700,
                  }}
                >
                  {getDaysLabel(daysLeft)} • {formatUkDate(receipt.returnDate)}
                </div>

                <div style={{ fontSize: 13, color: '#6b7280' }}>{receipt.description}</div>
              </div>

              <Button
                type="button"
                variant="compact"
                onClick={() => onArchive(receipt.id)}
                style={{
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  fontSize: 12,
                }}
              >
                Archive
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SelectionActionBar({
  selectedCount,
  onArchive,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        ...cardStyle,
        marginBottom: 16,
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        borderColor: '#dbe3ea',
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#111827',
        }}
      >
        {selectedCount} selected
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Button
          type="button"
          variant="secondary"
          onClick={onArchive}
        >
          Archive selected
        </Button>

        <Button
          type="button"
          variant="danger"
          onClick={onDelete}
          style={{
            background: '#b91c1c',
            border: '1px solid #b91c1c',
          }}
        >
          Delete selected
        </Button>

        <Button
          type="button"
          variant="neutral"
          onClick={onClear}
        >
          Clear selection
        </Button>
      </div>
    </div>
  );
}

export default function App() {
  const {
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
  } = useReceiptAppData();
 
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [shopPolicies, setShopPolicies] = useState<Record<string, number>>(DEFAULT_SHOP_POLICIES);
  const [shopOrder, setShopOrder] = useState<string[]>(
    Object.keys(DEFAULT_SHOP_POLICIES).sort((a, b) => a.localeCompare(b, 'en-GB'))
  );

  const [shop, setShop] = useState('');
  const [showShopSuggestions, setShowShopSuggestions] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(getTodayInputValue());
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editState, setEditState] = useState<EditState>(null);
  const [, setTodayTick] = useState(0);
  const [formErrors, setFormErrors] = useState<{
    description?: string;
    shop?: string;
  }>({});
  useEffect(() => {
    let midnightTimeout: number | undefined;
    let dailyInterval: number | undefined;

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);

      const msUntilMidnight = nextMidnight.getTime() - now.getTime();

      midnightTimeout = window.setTimeout(() => {
        setTodayTick((value) => value + 1);

        dailyInterval = window.setInterval(() => {
          setTodayTick((value) => value + 1);
        }, 24 * 60 * 60 * 1000);
      }, msUntilMidnight);
    };

    scheduleMidnightRefresh();

    return () => {
      if (midnightTimeout) {
        window.clearTimeout(midnightTimeout);
      }

      if (dailyInterval) {
        window.clearInterval(dailyInterval);
      }
    };
  }, []);
  const orderedShopNames = useMemo(() => shopOrder, [shopOrder]);

  const matchingShops = useMemo(() => {
    const query = shop.trim().toLowerCase();
    return orderedShopNames.filter((shopName) => shopName.toLowerCase().includes(query));
  }, [orderedShopNames, shop]);

  const filteredReceipts = useMemo(() => {
    return sortedReceipts.filter(
      (receipt) => matchesReceiptSearch(receipt, searchTerm) && matchesReceiptFilter(receipt, filter)
    );
  }, [sortedReceipts, searchTerm, filter]);

  const activeReceipts = useMemo(
    () => filteredReceipts.filter((receipt) => !receipt.archived),
    [filteredReceipts]
  );

  const urgentReceipts = useMemo(() => activeReceipts.filter(isUrgentReceipt), [activeReceipts]);

  const archivedReceipts = useMemo(
    () => filteredReceipts.filter((receipt) => receipt.archived),
    [filteredReceipts]
  );

  const activeIds = useMemo(() => activeReceipts.map((receipt) => receipt.id), [activeReceipts]);
  const archivedIds = useMemo(
    () => archivedReceipts.map((receipt) => receipt.id),
    [archivedReceipts]
  );

  const allActiveSelected =
    activeIds.length > 0 && activeIds.every((id) => selectedIds.includes(id));
  const allArchivedSelected =
    archivedIds.length > 0 && archivedIds.every((id) => selectedIds.includes(id));

  const showActiveTable = filter !== 'archived';
  const showArchivedTable = filter === 'all' || filter === 'archived';

  const handleAddReceipt = async () => {
    const nextErrors: { description?: string; shop?: string } = {};

    if (!description.trim()) {
      nextErrors.description = 'Description is required.';
    }

    if (!normalizeShopName(shop)) {
      nextErrors.shop = 'Shop is required.';
    }

    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const normalizedShop = normalizeShopName(shop);
    const existingShop = findExistingShopName(normalizedShop, shopPolicies);
    const finalShop = existingShop || normalizedShop;
    const shopDays = shopPolicies[finalShop] || 30;

    if (!existingShop) {
      setShopPolicies((prev) => ({ ...prev, [finalShop]: 30 }));
      setShopOrder((prev) => (prev.includes(finalShop) ? prev : [...prev, finalShop]));
    }

    const nextOrderNumber =
      receipts.length > 0 ? Math.max(...receipts.map((receipt) => receipt.orderNumber)) + 1 : 1;

    await addReceipt({
      id: generateId(),
      orderNumber: nextOrderNumber,
      description: description.trim().toUpperCase(),
      shop: finalShop,
      purchaseDate,
      returnDate: buildReturnDate(purchaseDate, shopDays),
      archived: false,
    });

    setDescription('');
    setShop('');
    setShowShopSuggestions(false);
    setFormErrors({});
  };

  const saveEdit = async () => {
    if (!editState || !editState.description.trim()) return;

    const current = receipts.find((receipt) => receipt.id === editState.id);
    if (!current) return;

    const nextReturnDate =
      editState.purchaseDate !== current.purchaseDate || editState.shop !== current.shop
        ? buildReturnDate(editState.purchaseDate, shopPolicies[editState.shop] || 30)
        : current.returnDate;

    await updateReceipt({
      ...current,
      description: editState.description.trim().toUpperCase(),
      shop: editState.shop,
      purchaseDate: editState.purchaseDate,
      returnDate: nextReturnDate,
    });

    setEditState(null);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (ids: string[]) => {
    if (ids.length === 0) return;

    const areAllSelected = ids.every((id) => selectedIds.includes(id));

    setSelectedIds((prev) =>
      areAllSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))
    );
  };

  const handleArchiveSelected = async () => {
    if (selectedIds.length === 0) return;
    await archiveSelected(selectedIds);
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected receipt${
          selectedIds.length === 1 ? '' : 's'
        }? This cannot be undone.`
      )
    ) {
      return;
    }

    await deleteSelected(selectedIds);
    setSelectedIds([]);
  };

  const exportData = () => {
    downloadJson('return-tracker-backup.json', {
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        receipts,
        shopPolicies,
        shopOrder,
      },
    });
  };

  const importData = async (file: File) => {
    const text = await file.text();
    const parsed = parseImportedBackup(text);

    if (!parsed) {
      alert('That file could not be imported. Please choose a valid backup JSON file.');
      return;
    }

    if (!window.confirm('Import this backup? This will replace your current saved data.')) {
      return;
    }

    await replaceAllReceipts(parsed.data.receipts);
    setShopPolicies(parsed.data.shopPolicies);
    setShopOrder(parsed.data.shopOrder);
    setSelectedIds([]);
    setEditState(null);
    setFormErrors({});
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f7f7f8',
          padding: 28,
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ ...cardStyle, padding: 24, minWidth: 320, textAlign: 'center' }}>
          Loading your receipts…
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f7f8',
        padding: 24,
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
         {(offlineReady || needRefresh) && (
          <div
            style={{
              ...cardStyle,
              marginBottom: 16,
              padding: 14,
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>
              {needRefresh ? 'A new version is available.' : 'App ready to work offline.'}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {needRefresh && (
                <button
                  type="button"
                  onClick={() => updateServiceWorker(true)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #111827',
                    background: '#111827',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Reload
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setOfflineReady(false);
                  setNeedRefresh(false);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#111827',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        <header
  style={{
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 20,
  }}
>
          <div style={{ textAlign: 'left' }}>
            <h1
              style={{
                fontSize: 30,
                lineHeight: 1.1,
                margin: 0,
                color: '#111827',
                letterSpacing: '-0.02em',
              }}
            >
              Return Tracker 
            </h1>

            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Track active return windows and archived receipts in one place.
            </p>
            <div
  style={{
    marginTop: 10,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 999,
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    color: '#4b5563',
    fontSize: 12,
    fontWeight: 700,
  }}
>
  Today · {formatTodayLabel()}
</div>
          </div>

          <div
            style={{
              padding: '8px 12px',
              borderRadius: 999,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              color: '#4b5563',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {receipts.filter((receipt) => !receipt.archived).length} active •{' '}
            {receipts.filter((receipt) => receipt.archived).length} archived
          </div>
        </header>

        <AddReceiptForm
          description={description}
          setDescription={setDescription}
          shop={shop}
          setShop={setShop}
          purchaseDate={purchaseDate}
          setPurchaseDate={setPurchaseDate}
          showShopSuggestions={showShopSuggestions}
          setShowShopSuggestions={setShowShopSuggestions}
          matchingShops={matchingShops}
          shopPolicies={shopPolicies}
          errors={formErrors}
          onSubmit={(e) => {
            e.preventDefault();
            void handleAddReceipt();
          }}
        />

<div
  style={{
    display: 'grid',
    gridTemplateColumns: '300px minmax(0, 1fr)',
    gap: 24,
    alignItems: 'start',
    width: '100%',
  }}
>
         <aside
  style={{
    display: 'grid',
    gap: 16,
    minWidth: 0,
    position: 'sticky',
    top: 28,
  }}
>
            <UtilityPanel title="View options">
              <FiltersPanel
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filter={filter}
                setFilter={(value) => {
                  setSelectedIds([]);
                  setFilter(value);
                }}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </UtilityPanel>

            <UtilityPanel title="Backup">
              <BulkActionsPanel
  exportData={exportData}
  importData={(file) => void importData(file)}
/>
            </UtilityPanel>

            

            <UtilityPanel title="Shop policies">
              <ShopPolicyManager
                shopPolicies={shopPolicies}
                setShopPolicies={setShopPolicies}
                shopOrder={shopOrder}
                setShopOrder={setShopOrder}
                receipts={receipts}
                shop={shop}
                setShop={setShop}
                editState={editState}
                setEditState={setEditState}
              />
            </UtilityPanel>
            <InfoPanel />
          </aside>

          <main style={{ minWidth: 0, textAlign: 'left' }}>
  

  {filter !== 'archived' && (
    <UrgentSummary urgentReceipts={urgentReceipts} onArchive={(id) => void archiveReceipt(id)} />
  )}
  <SelectionActionBar
    selectedCount={selectedIds.length}
    onArchive={() => void handleArchiveSelected()}
    onDelete={() => void handleDeleteSelected()}
    onClear={() => setSelectedIds([])}
  />

            {editState !== null && (
              <div
                style={{
                  ...cardStyle,
                  padding: 20,
                  marginBottom: 20,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: 16,
                    textAlign: 'left',
                    fontSize: 20,
                    color: '#111827',
                  }}
                >
                  Edit receipt
                </h2>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 1fr 1fr auto auto',
                    gap: 12,
                  }}
                >
                  <input
                    type="text"
                    autoFocus
                    value={editState.description}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev ? { ...prev, description: e.target.value.toUpperCase() } : prev
                      )
                    }
                    placeholder="Description"
                    style={{
                      ...inputBaseStyle,
                      padding: 10,
                    }}
                  />

                  <select
                    value={editState.shop}
                    onChange={(e) =>
                      setEditState((prev) => (prev ? { ...prev, shop: e.target.value } : prev))
                    }
                    style={{
                      ...inputBaseStyle,
                      padding: 10,
                    }}
                  >
                    {orderedShopNames.map((shopName) => (
                      <option key={shopName} value={shopName}>
                        {shopName}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={editState.purchaseDate}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev ? { ...prev, purchaseDate: e.target.value } : prev
                      )
                    }
                    style={{
                      ...inputBaseStyle,
                      padding: 10,
                    }}
                  />

                  <Button type="button" variant="primary" onClick={() => void saveEdit()}>
                    Save
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditState(null)}
                    style={{
                      border: '1px solid #ccc',
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {showActiveTable && (
              <ReceiptsTable
                title="Active receipts"
                receipts={activeReceipts}
                selectedIds={selectedIds}
                toggleSelected={toggleSelected}
                toggleSelectAll={toggleSelectAll}
                allSelected={allActiveSelected}
                onEdit={(receipt) =>
                  setEditState({
                    id: receipt.id,
                    description: receipt.description,
                    shop: receipt.shop,
                    purchaseDate: receipt.purchaseDate,
                  })
                }
                onArchive={(id) => void archiveReceipt(id)}
                onRestore={(id) => void unarchiveReceipt(id)}
                archived={false}
              />
            )}

            {showArchivedTable && (
              <div style={{ marginTop: showActiveTable ? 20 : 0 }}>
                <ReceiptsTable
                  title="Archived receipts"
                  receipts={archivedReceipts}
                  selectedIds={selectedIds}
                  toggleSelected={toggleSelected}
                  toggleSelectAll={toggleSelectAll}
                  allSelected={allArchivedSelected}
                  onEdit={(receipt) =>
                    setEditState({
                      id: receipt.id,
                      description: receipt.description,
                      shop: receipt.shop,
                      purchaseDate: receipt.purchaseDate,
                    })
                  }
                  onArchive={(id) => void archiveReceipt(id)}
                  onRestore={(id) => void unarchiveReceipt(id)}
                  archived
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}