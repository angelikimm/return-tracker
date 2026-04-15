import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

function useIsMobile(maxWidth = 900) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= maxWidth : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= maxWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [maxWidth]);

  return isMobile;
}
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
  COS: 30,
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
  border: '1px solid #f1f5f9',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  transition:
    'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
};

const panelCardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: 'none',
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  overflow: 'hidden',
  transition:
    'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
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
  width: 'auto',
};

const selectionTextButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  margin: 0,
  fontSize: 12,
  fontWeight: 400,
  color: '#374151', // 👈 slightly darker base so contrast works
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
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
  border: '1px solid #f1f5f9',
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
  fontSize: 14,
  fontWeight: 700,
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
  padding: '10px 10px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#4b5563',
  background: '#f9fafb',
  borderBottom: '1px solid #f3f4f6',
};

const tableCellStyle: React.CSSProperties = {
  padding: '12px 10px',
  borderBottom: '1px solid #f3f4f6',
  fontSize: 13,
  color: '#111827',
  textAlign: 'left',
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
  return Math.ceil(
    (returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function getDaysLabel(daysLeft: number) {
  if (daysLeft < 0) {
    const days = Math.abs(daysLeft);
    return `${days} Day${days === 1 ? '' : 's'} Overdue`;
  }

  if (daysLeft === 0) return 'Due Today';
  if (daysLeft === 1) return 'Due Tomorrow';

  return `Due In ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
}

function formatUkDate(dateString: string) {
  return parseLocalDate(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatBackupTimestamp(value: string | null) {
  if (!value) return 'No Backup Yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Backup date unavailable';

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

function hasExactNormalizedShopName(
  input: string,
  policies: Record<string, number>
) {
  const normalized = normalizeShopName(input);
  return Object.prototype.hasOwnProperty.call(policies, normalized);
}

function findExistingShopName(
  input: string,
  policies: Record<string, number>
) {
  const normalized = normalizeShopName(input).toLowerCase();
  return Object.keys(policies).find(
    (name) => name.toLowerCase() === normalized
  );
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
  const daysLeft = getReceiptDaysLeft(receipt);
  return daysLeft <= 7;
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
      background: '#f3e3e3',
      color: '#5f1212',
    };
  }

  if (daysLeft <= 3) {
    return {
      background: '#fff1f2',
      color: '#be123c',
    };
  }

  if (daysLeft <= 7) {
    return {
      background: '#fffbeb',
      color: '#a16207',
    };
  }

  return {
    background: '#f0fdf4',
    color: '#166534',
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

function SelectionLinkButton({
  children,
  style,
  disabled,
  onMouseEnter,
  onMouseLeave,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const baseColor =
    typeof style?.color === 'string' ? style.color : '#374151';

  return (
    <button
      {...props}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.color = '#111827'; // darker only
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = baseColor;
        onMouseLeave?.(e);
      }}
      style={{
        ...selectionTextButtonStyle,
        ...style,
        fontWeight: style?.fontWeight || 400, // 👈 lock weight so it never shifts
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'color 0.15s ease, opacity 0.15s ease',
      }}
    >
      {children}
    </button>
  );
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
  setShowShopSuggestions: (value: boolean) => void; matchingShops: string[];
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
        padding: 0,
        marginBottom: 22,
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <div
        style={{
          marginBottom: 10,
          fontSize: 13,
          color: '#4b5563',
          fontWeight: 600,
          textAlign: 'left',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Add purchase information
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.8fr 1.1fr 0.9fr auto',
          gap: 10,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            minWidth: 0,
            display: 'grid',
            gridTemplateRows: '40px 18px',
            gap: 6,
          }}
        >
          <TextInput
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value.toUpperCase())}
            style={{
              padding: '10px 12px',
              minWidth: 0,
              height: 40,
              borderColor: errors.description ? '#dc2626' : '#d1d5db',
            }}
          />

          <div
            style={{
              color: '#b91c1c',
              fontSize: 12,
              textAlign: 'left',
              lineHeight: 1.2,
              opacity: errors.description ? 1 : 0,
              transition: 'opacity 0.18s ease',
              pointerEvents: 'none',
            }}
          >
            {errors.description || ' '}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            minWidth: 0,
            display: 'grid',
            gridTemplateRows: '40px 18px',
            gap: 6,
          }}
        >
          <TextInput
            type="text"
            value={shop}
            placeholder="Shop"
            onChange={(e) => {
              setShop(e.target.value);
              setShowShopSuggestions(true);
            }}
            onFocus={() => setShowShopSuggestions(true)}
            onBlur={() =>
              window.setTimeout(() => setShowShopSuggestions(false), 150)
            }
            style={{
              padding: '10px 12px',
              height: 40,
              borderColor: errors.shop ? '#dc2626' : '#d1d5db',
            }}
          />

          {showShopSuggestions && matchingShops.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 46,
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
                  {shopName} ({shopPolicies[shopName]} Days)
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              color: '#b91c1c',
              fontSize: 12,
              textAlign: 'left',
              lineHeight: 1.2,
              opacity: errors.shop ? 1 : 0,
              transition: 'opacity 0.18s ease',
              pointerEvents: 'none',
            }}
          >
            {errors.shop || ' '}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateRows: '40px 18px',
            gap: 6,
          }}
        >
          <TextInput
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            style={{
              padding: '10px 12px',
              height: 40,
            }}
          />
          <div aria-hidden="true">{' '}</div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateRows: '40px 18px',
            gap: 6,
          }}
        >
          <Button
            type="submit"
            style={{
              borderRadius: 10,
              whiteSpace: 'nowrap',
              height: 40,
            }}
          >
            Add receipt
          </Button>
          <div aria-hidden="true">{' '}</div>
        </div>
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

  const orderedShopNames = shopOrder;

  const addCustomShop = () => {
    const trimmedName = normalizeShopName(newShopName);
    const normalizedDays = Number.isFinite(newShopDays)
      ? Math.max(1, Math.floor(newShopDays))
      : 30;

    if (!trimmedName) return;

    if (hasExactNormalizedShopName(trimmedName, shopPolicies)) {
      setShop(trimmedName);
      setNewShopName('');
      setNewShopDays(shopPolicies[trimmedName] || 30);
      return;
    }

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
      alert(
        'This shop is already used by one or more receipts and cannot be deleted yet.'
      );
      return;
    }

    setShopPolicies((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([name]) => name !== shopName)
      )
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
    setShopOrder(
      Object.keys(shopPolicies).sort((a, b) => a.localeCompare(b, 'en-GB'))
    );
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
          Days
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="button"
          variant="neutral"
          onClick={addCustomShop}
          style={{
            textAlign: 'center',
            padding: '6px 10px',
            fontSize: 12,
            border: '1px solid #d1d5db',
            background: '#f9fafb',
            color: '#374151',
            width: 'auto',
          }}
        >
          Save Shop Policy
        </Button>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 8,
          justifyItems: 'start',
          marginTop: 6,
        }}
      >
        <h3 style={{ ...labelStyle, whiteSpace: 'nowrap' }}>
          Manage shop policies
        </h3>
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
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            No shop policies saved.
          </div>
        ) : (
          orderedShopNames.map((shopName) => {
            const isBeingDragged = draggedShop === shopName;
            const isDragTarget =
              dragOverShop === shopName && draggedShop !== shopName;

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

                <span style={{ fontSize: 13, wordBreak: 'break-word' }}>
                  {shopName}
                </span>

                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {shopPolicies[shopName]} Days
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
          width: 235,
          fontSize: 13,
          color: '#6b7280',
          lineHeight: 1.45,
          textAlign: 'justify',
          textAlignLast: 'left',
          marginTop: 2,
        }}
      >
        Drag shops to set your preferred dropdown order.{' '}
        <span
          onClick={resetShopOrder}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#991b1b')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#b91c1c')}
          style={{
            color: '#b91c1c',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontWeight: 600,
          }}
        >
          Click here
        </span>{' '}
        to reset to alphabetical order any time.
      </div>

    </div>
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
    <div
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <Button
        type="button"
        onClick={exportData}
        variant="neutral"
        style={{
          textAlign: 'center',
          padding: '5px 10px',
          fontSize: 12,
          border: '1px solid #d1d5db',
          background: '#ffffff',
          color: '#374151',
          width: 'auto',
        }}
      >
        Export
      </Button>

      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        variant="neutral"
        style={{
          textAlign: 'center',
          padding: '5px 10px',
          fontSize: 12,
          border: '1px solid #d1d5db',
          background: '#ffffff',
          color: '#374151',
          width: 'auto',
        }}
      >
        Import
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
function DescriptionCell({
  description,
}: {
  description: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const textRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const collapsedMaxHeight = 4.2 * 16; // about 3 lines at line-height 1.4

    const updateOverflow = () => {
      setCanExpand(element.scrollHeight > collapsedMaxHeight + 1);
    };

    updateOverflow();

    const resizeObserver = new ResizeObserver(() => {
      updateOverflow();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [description]);

  return (
    <button
      type="button"
      onClick={() => {
        if (canExpand) {
          setIsExpanded((prev) => !prev);
        }
      }}
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        margin: 0,
        font: 'inherit',
        color: 'inherit',
        textAlign: 'left',
        width: '100%',
        cursor: canExpand ? 'pointer' : 'default',
        lineHeight: 1.4,
      }}
      title={
        canExpand
          ? isExpanded
            ? 'Click to collapse'
            : 'Click to expand'
          : description
      }
    >
      <div
        ref={textRef}
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: isExpanded ? 'unset' : 3,
          overflow: 'hidden',
        }}
      >
        {description}
      </div>

      {canExpand && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: '#9ca3af',
            fontWeight: 600,
          }}
        >
          {isExpanded ? 'Less' : 'More'}
        </div>
      )}
    </button>
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
  headerActions,
}: {
  title?: string;
  receipts: Receipt[];
  selectedIds: string[];
  toggleSelected: (id: string) => void;
  toggleSelectAll: (ids: string[]) => void;
  allSelected: boolean;
  onEdit: (receipt: Receipt) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  archived: boolean;
  headerActions?: React.ReactNode;
}) {

  return (
    <div
      style={{
        ...cardStyle,
        padding: 0,
        marginTop: 0,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',

        border: '1px solid #f1f5f9',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#ffffff',
      }}
    >
      {(title || headerActions) && (
        <div
          style={{
            padding: 18,
            display: 'grid',
            gridTemplateColumns: title ? '1fr auto' : '1fr',
            alignItems: 'start',
            gap: 12,
          }}
        >
          {title && (
            <h2
              style={{
                margin: 0,
                textAlign: 'left',
                fontSize: 18,
                color: '#111827',
              }}
            >
              {title}
            </h2>
          )}

          {headerActions && (
            <div
              style={{
                display: 'grid',
                justifyItems: 'end',
                gap: 8,
                minWidth: 0,
              }}
            >
              {headerActions}
            </div>
          )}
        </div>
      )}

      {receipts.length === 0 ? (
        <div
          style={{
            padding: '24px 18px 18px',
            textAlign: 'center',
            color: '#6b7280',
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#111827',
              marginBottom: 6,
            }}
          >
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
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ ...tableHeaderStyle, width: '5%', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleSelectAll(receipts.map((r) => r.id))}
                />
              </th>
              <th style={{ ...tableHeaderStyle, width: '7%' }}>No.</th>
              <th style={{ ...tableHeaderStyle, width: '16%' }}>
                Shop
              </th>
              <th style={{ ...tableHeaderStyle, width: '18%' }}>
                Description
              </th>
              <th
                style={{
                  ...tableHeaderStyle,
                  width: '16%',
                }}
              >
                Purchase Date
              </th>
              <th
                style={{
                  ...tableHeaderStyle,
                  width: '13%',
                  textAlign: 'left',
                }}
              >
                Return Date
              </th>
              <th
                style={{
                  ...tableHeaderStyle,
                  width: '13%',
                  textAlign: 'left',
                }}
              >
                Due In
              </th>
              <th style={{ ...tableHeaderStyle, width: '15%' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt, index) => {
              const daysLeft = getReceiptDaysLeft(receipt);
              const rowBackground = index % 2 === 0 ? '#ffffff' : '#f9fafb';
              const urgencyTone = getUrgencyTone(daysLeft);

              return (
                <tr
                  key={receipt.id}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      rowBackground;
                  }}
                  style={{
                    background: rowBackground,
                    transition: 'background 0.15s ease, transform 0.15s ease',
                  }}
                >
                  <td style={{ ...tableCellStyle, textAlign: 'center' }}>
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
                      overflowWrap: 'anywhere',
                      lineHeight: 1.4,
                      verticalAlign: 'middle',
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
                    <DescriptionCell
                      description={receipt.description}
                    />
                  </td>
                  <td
                    style={{
                      ...tableCellStyle,
                    }}
                  >
                    {formatUkDate(receipt.purchaseDate)}
                  </td>

                  <td
                    style={{
                      ...tableCellStyle,
                      padding: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        padding: '8px 0',
                        minHeight: 38,
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatUkDate(receipt.returnDate)}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: '#6b7280',
                          fontWeight: 500,
                          lineHeight: 1.2,
                        }}
                      >
                        {formatWeekday(receipt.returnDate)}
                      </div>


                    </div>
                  </td>

                  <td
                    style={{
                      ...tableCellStyle,
                      whiteSpace: 'normal',
                      lineHeight: 1.4,
                      padding: 0,
                      textAlign: 'center',
                    }}
                  >
                    {daysLeft <= 7 ? (
                      <div
                        style={{
                          padding: '6px 10px',
                          fontWeight: 700,
                          ...urgencyTone,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 8,
                          fontSize: 12,
                          letterSpacing: '0.01em',
                          margin: '4px 8px',
                          width: 'calc(100% - 16px)',
                          boxSizing: 'border-box',
                          textAlign: 'center',
                          lineHeight: 1.15,
                          minHeight: 38,
                        }}
                      >
                        {daysLeft < 0 ? (
                          <>
                            <div style={{ fontWeight: 700 }}>Overdue</div>
                            <div style={{ fontWeight: 600 }}>
                              {Math.abs(daysLeft)} Day{Math.abs(daysLeft) === 1 ? '' : 's'}
                            </div>
                          </>
                        ) : daysLeft === 0 ? (
                          <div style={{ fontWeight: 700 }}>Due Today</div>
                        ) : daysLeft === 1 ? (
                          <div style={{ fontWeight: 700 }}>Due Tomorrow</div>
                        ) : (
                          <>
                            <div style={{ fontWeight: 600 }}>Due In</div>
                            <div style={{ fontWeight: 700 }}>
                              {daysLeft} day{daysLeft === 1 ? '' : 's'}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '6px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          fontSize: 12,
                          fontWeight: 700,
                          background: '#f0fdf4',
                          color: '#166534',
                          borderRadius: 8,
                          margin: '4px 8px',
                          width: 'calc(100% - 16px)',
                          boxSizing: 'border-box',
                          textAlign: 'center',
                          lineHeight: 1.15,
                          minHeight: 38,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>Due In</div>
                        <div style={{ fontWeight: 700 }}>
                          {daysLeft} day{daysLeft === 1 ? '' : 's'}
                        </div>
                      </div>
                    )}
                  </td>

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
                          width: '100%',
                          padding: '6px 0px',
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
          You do not have any receipts due in the next 7 days.
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
          {urgentReceipts.length} receipt{urgentReceipts.length === 1 ? '' : 's'} need
          attention.
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 8,
          maxHeight: 520,
          overflowY: 'auto',
          paddingRight: 2,
        }}
      >
        {urgentReceipts.map((receipt) => {
          const daysLeft = getReceiptDaysLeft(receipt);
          const accent =
            daysLeft < 0 ? '#5f1212' : daysLeft <= 3 ? '#dc2626' : '#eab308';

          const border =
            daysLeft < 0 ? '#e5c7c7' : daysLeft <= 3 ? '#fecaca' : '#fef3c7';

          return (
            <div
              key={receipt.id}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 10,
                alignItems: 'center',
                background: '#fcfcfc',
                border: `1px solid ${border}`,
                borderRadius: 10,
                padding: '8px 12px',
                position: 'relative',
                overflow: 'hidden',
                transition:
                  'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
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

              <div
                style={{
                  paddingLeft: 10,
                  minWidth: 0,
                  display: 'grid',
                  gridTemplateRows: 'auto auto',
                  gap: 2,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, auto) auto minmax(0, 1fr)',
                    alignItems: 'center',
                    columnGap: 6,
                    minWidth: 0,
                    fontSize: 13,
                    lineHeight: 1.35,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: '#111827',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={receipt.shop}
                  >
                    {receipt.shop}
                  </span>

                  <span style={{ color: '#9ca3af', flexShrink: 0 }}>|</span>

                  <span
                    style={{
                      color: accent,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={`${getDaysLabel(daysLeft)} (${formatUkDate(receipt.returnDate)})`}
                  >
                    {getDaysLabel(daysLeft)} ({formatUkDate(receipt.returnDate)})
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={receipt.description}
                >
                  {receipt.description}
                </div>
              </div>

              <Button
                type="button"
                variant="compact"
                onClick={() => onArchive(receipt.id)}
                style={{
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  fontSize: 12,
                  width: 'auto',
                  padding: '6px 10px',
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


export default function App() {
  const isMobile = useIsMobile();
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

  const [shopPolicies, setShopPolicies] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('return-tracker-shop-policies');
      if (!stored) return DEFAULT_SHOP_POLICIES;

      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return DEFAULT_SHOP_POLICIES;
      }

      const cleaned = Object.fromEntries(
        Object.entries(parsed).filter(
          ([key, value]) =>
            typeof key === 'string' &&
            typeof value === 'number' &&
            Number.isFinite(value) &&
            value >= 1
        )
      ) as Record<string, number>;

      return Object.keys(cleaned).length > 0
        ? cleaned
        : DEFAULT_SHOP_POLICIES;
    } catch {
      return DEFAULT_SHOP_POLICIES;
    }
  });

  const [shopOrder, setShopOrder] = useState<string[]>(() => {
    try {
      const storedOrder = localStorage.getItem('return-tracker-shop-order');
      if (!storedOrder) {
        return Object.keys(DEFAULT_SHOP_POLICIES).sort((a, b) =>
          a.localeCompare(b, 'en-GB')
        );
      }

      const parsed = JSON.parse(storedOrder);
      if (!Array.isArray(parsed)) {
        return Object.keys(DEFAULT_SHOP_POLICIES).sort((a, b) =>
          a.localeCompare(b, 'en-GB')
        );
      }

      return parsed.filter((value): value is string => typeof value === 'string');
    } catch {
      return Object.keys(DEFAULT_SHOP_POLICIES).sort((a, b) =>
        a.localeCompare(b, 'en-GB')
      );
    }
  });

  const [shop, setShop] = useState('');
  const [showShopSuggestions, setShowShopSuggestions] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(getTodayInputValue());
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActiveIds, setSelectedActiveIds] = useState<string[]>([]);
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<string[]>([]);

  const [editState, setEditState] = useState<EditState>(null);
  const [showArchivedReceipts, setShowArchivedReceipts] = useState(false);
  const [showShopPolicies, setShowShopPolicies] = useState(false);
  const [, setTodayTick] = useState(0);
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => {
    return localStorage.getItem('return-tracker-last-backup');
  });
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

  useEffect(() => {
    localStorage.setItem(
      'return-tracker-shop-policies',
      JSON.stringify(shopPolicies)
    );
  }, [shopPolicies]);

  useEffect(() => {
    const validNames = new Set(Object.keys(shopPolicies));

    const mergedOrder = [
      ...shopOrder.filter((name) => validNames.has(name)),
      ...Object.keys(shopPolicies).filter((name) => !shopOrder.includes(name)),
    ];

    if (
      mergedOrder.length !== shopOrder.length ||
      mergedOrder.some((name, index) => name !== shopOrder[index])
    ) {
      setShopOrder(mergedOrder);
      return;
    }

    localStorage.setItem(
      'return-tracker-shop-order',
      JSON.stringify(mergedOrder)
    );
  }, [shopOrder, shopPolicies]);

  useEffect(() => {
    if (filter === 'archived') {
      setShowArchivedReceipts(true);
    }
  }, [filter]);

  const orderedShopNames = useMemo(() => shopOrder, [shopOrder]);

  const matchingShops = useMemo(() => {
    const query = shop.trim().toLowerCase();
    return orderedShopNames.filter((shopName) =>
      shopName.toLowerCase().includes(query)
    );
  }, [orderedShopNames, shop]);

  const filteredReceipts = useMemo(() => {
    return sortedReceipts.filter(
      (receipt) =>
        matchesReceiptSearch(receipt, searchTerm) &&
        matchesReceiptFilter(receipt, filter)
    );
  }, [sortedReceipts, searchTerm, filter]);

  const activeReceipts = useMemo(
    () => filteredReceipts.filter((receipt) => !receipt.archived),
    [filteredReceipts]
  );

  const urgentReceipts = useMemo(
    () => activeReceipts.filter(isUrgentReceipt),
    [activeReceipts]
  );

  const archivedReceipts = useMemo(
    () => filteredReceipts.filter((receipt) => receipt.archived),
    [filteredReceipts]
  );

  const activeIds = useMemo(
    () => activeReceipts.map((receipt) => receipt.id),
    [activeReceipts]
  );

  const overdueActiveIds = useMemo(
    () =>
      activeReceipts
        .filter((receipt) => getReceiptDaysLeft(receipt) < 0)
        .map((receipt) => receipt.id),
    [activeReceipts]
  );

  const archivedIds = useMemo(
    () => archivedReceipts.map((receipt) => receipt.id),
    [archivedReceipts]
  );

  const allActiveSelected =
    activeIds.length > 0 &&
    activeIds.every((id) => selectedActiveIds.includes(id));

  const allArchivedSelected =
    archivedIds.length > 0 &&
    archivedIds.every((id) => selectedArchivedIds.includes(id));

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
      setShopOrder((prev) =>
        prev.includes(finalShop) ? prev : [...prev, finalShop]
      );
    }

    const nextOrderNumber =
      receipts.length > 0
        ? Math.max(...receipts.map((receipt) => receipt.orderNumber)) + 1
        : 1;

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
      editState.purchaseDate !== current.purchaseDate ||
        editState.shop !== current.shop
        ? buildReturnDate(
          editState.purchaseDate,
          shopPolicies[editState.shop] || 30
        )
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

  const toggleSelectedActive = (id: string) => {
    setSelectedActiveIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectedArchived = (id: string) => {
    setSelectedArchivedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAllActive = (ids: string[]) => {
    if (ids.length === 0) return;

    setSelectedActiveIds((prev) =>
      ids.every((id) => prev.includes(id)) ? [] : ids
    );
  };

  const toggleSelectAllArchived = (ids: string[]) => {
    if (ids.length === 0) return;

    setSelectedArchivedIds((prev) =>
      ids.every((id) => prev.includes(id)) ? [] : ids
    );
  };

  const handleArchiveSelectedActive = async () => {
    if (selectedActiveIds.length === 0) return;
    await archiveSelected(selectedActiveIds);
    setSelectedActiveIds([]);
  };

  const handleDeleteSelectedActive = async () => {
    if (selectedActiveIds.length === 0) return;

    if (
      !window.confirm(
        `Delete ${selectedActiveIds.length} selected receipt${selectedActiveIds.length === 1 ? '' : 's'
        }? This cannot be undone.`
      )
    ) {
      return;
    }

    await deleteSelected(selectedActiveIds);
    setSelectedActiveIds([]);
  };

  const handleSelectActiveArchived = () => {
    const activeArchivedIds = archivedReceipts
      .filter((receipt) => getReceiptDaysLeft(receipt) >= 0)
      .map((receipt) => receipt.id);

    setSelectedArchivedIds(activeArchivedIds);
  };

  const handleRestoreSelectedArchived = async () => {
    if (selectedArchivedIds.length === 0) return;

    await Promise.all(selectedArchivedIds.map((id) => unarchiveReceipt(id)));
    setSelectedArchivedIds([]);
  };

  const handleDeleteSelectedArchived = async () => {
    if (selectedArchivedIds.length === 0) return;

    if (
      !window.confirm(
        `Delete ${selectedArchivedIds.length} selected receipt${selectedArchivedIds.length === 1 ? '' : 's'
        }? This cannot be undone.`
      )
    ) {
      return;
    }

    await deleteSelected(selectedArchivedIds);
    setSelectedArchivedIds([]);
  };

  const handleSelectAllOverdueActive = () => {
    if (overdueActiveIds.length === 0) return;

    setSelectedActiveIds(overdueActiveIds);
  };

  const exportData = () => {
    const exportedAt = new Date().toISOString();

    downloadJson('return-tracker-backup.json', {
      version: 2,
      exportedAt,
      data: {
        receipts,
        shopPolicies,
        shopOrder,
      },
    });

    setLastBackupAt(exportedAt);
    localStorage.setItem('return-tracker-last-backup', exportedAt);
  };

  const importData = async (file: File) => {
    const text = await file.text();
    const parsed = parseImportedBackup(text);

    if (!parsed) {
      alert('That file could not be imported. Please choose a valid backup JSON file.');
      return;
    }

    if (
      !window.confirm(
        'Import this backup? This will replace your current saved data.'
      )
    ) {
      return;
    }

    await replaceAllReceipts(parsed.data.receipts);
    setShopPolicies(parsed.data.shopPolicies);
    setShopOrder(parsed.data.shopOrder);
    setSelectedActiveIds([]);
    setSelectedArchivedIds([]);
    setEditState(null);
    setFormErrors({});

    const importedAt = new Date().toISOString();
    setLastBackupAt(importedAt);
    localStorage.setItem('return-tracker-last-backup', importedAt);
  };

  if (isMobile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f7f7f8',
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            ...cardStyle,
            maxWidth: 460,
            width: '100%',
            padding: 24,
            textAlign: 'left',
            boxShadow: 'none',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#92400e',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            Desktop only
          </div>

          <h1
            style={{
              margin: '0 0 10px',
              fontSize: 22,
              color: '#111827',
              lineHeight: 1.3,
              letterSpacing: '0',
              fontWeight: 700,
              maxWidth: 320,
            }}
          >
            Please open this app on a desktop browser
          </h1>

          <div
            style={{
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.6,
              maxWidth: 380,
            }}
          >
            Return Tracker is designed for desktop use and is not available on
            mobile devices. If you are seeing this message on a desktop browser,
            your window may be reduced. Please expand it for the best experience.
          </div>
        </div>
      </div>
    );
  }

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
              border: '1px solid #f1f5f9',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>
              {needRefresh
                ? 'A new version is available.'
                : 'App ready to work offline.'}
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
            marginBottom: 20,
            padding: '4px 0 16px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  color: '#6b7280',
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Today · {formatTodayLabel()}
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: 'Georgia, serif',
                  color: '#111827',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.1,
                }}
              >
                Return Tracker
              </h1>

              <p
                style={{
                  margin: '6px 0 0',
                  color: '#6b7280',
                  fontSize: 14,
                }}
              >
                Track active return windows and archived receipts in one place.
              </p>
            </div>

            <div
              style={{
                color: '#4b5563',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                paddingTop: 2,
              }}
            >
              {receipts.filter((receipt) => !receipt.archived).length} active •{' '}
              {receipts.filter((receipt) => receipt.archived).length} archived
            </div>
          </div>
        </header>

        <div
          style={{
            ...cardStyle,
            padding: '12px 16px',
            marginBottom: 20,
            background: '#fffdf5',
            border: '1px solid #f1f5f9',
            boxShadow: 'none',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#92400e',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
              textAlign: 'left',
            }}
          >
            Important — Read before use
          </div>

          <div
            style={{
              fontSize: 13,
              color: '#374151',
              lineHeight: 1.55,
              textAlign: 'left',
            }}
          >
            This app can only be installed through <strong>Chrome</strong>. If you are using it in a browser, <strong>Chrome</strong> is recommended, but other browsers are also supported. Add new shop return policies in <strong>Edit Shop Policies</strong>. Archive receipts when they are no longer needed. Please read the <strong>Backup &amp; Data Safety</strong> section carefully. <strong>Many happy returns!</strong>
          </div>
        </div>

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
            gridTemplateColumns: '280px minmax(0, 1fr)',
            gap: 20,
            alignItems: 'start',
            width: '100%',
          }}
        >
          <aside
            style={{
              minWidth: 0,
            }}
          >
            <section style={panelCardStyle}>
              <div style={{ padding: 18 }}>
                <section
                  style={{
                    paddingBottom: 16,
                    marginBottom: 16,

                  }}
                >
                  <div
                    style={{
                      marginBottom: 14,
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: 10,
                    }}
                  >
                    <h2 style={sectionTitleStyle}>View Options</h2>
                  </div>

                  <FiltersPanel
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filter={filter}
                    setFilter={(value) => {
                      setSelectedActiveIds([]);
                      setSelectedArchivedIds([]);

                      setFilter(value);
                    }}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                  />
                </section>

                <section
                  style={{
                    paddingBottom: 16,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      marginBottom: 10,
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <h2 style={sectionTitleStyle}>Backup</h2>

                    <BulkActionsPanel
                      exportData={exportData}
                      importData={(file) => void importData(file)}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: '#9ca3af',
                      textAlign: 'left',
                      padding: '0 4px',
                    }}
                  >
                    Last backup: {formatBackupTimestamp(lastBackupAt)}
                  </div>
                </section>

                <section
                  style={{
                    paddingBottom: 16,
                    marginBottom: 16,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowShopPolicies((prev) => !prev)}
                    style={{
                      width: '100%',
                      padding: 0,
                      margin: 0,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        marginBottom: showShopPolicies ? 14 : 0,
                        padding: '10px 12px',
                        background: '#f9fafb',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <h2 style={sectionTitleStyle}>Edit Shop Policies</h2>

                      <span
                        style={{
                          fontSize: 12,
                          color: '#6b7280',
                          fontWeight: 700,
                        }}
                      >
                        {showShopPolicies ? 'Hide' : 'Show'}
                      </span>
                    </div>
                  </button>

                  {showShopPolicies && (
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
                  )}
                </section>

                <section>
                  <button
                    type="button"
                    onClick={() => setShowStorageInfo((prev) => !prev)}
                    style={{
                      width: '100%',
                      padding: 0,
                      margin: 0,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        marginBottom: showStorageInfo ? 14 : 0,
                        padding: '10px 12px',
                        background: '#f9fafb',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <h2 style={sectionTitleStyle}>Backup & Data Safety</h2>

                      <span
                        style={{
                          fontSize: 12,
                          color: '#6b7280',
                          fontWeight: 700,
                        }}
                      >
                        {showStorageInfo ? 'Hide' : 'Show'}
                      </span>
                    </div>
                  </button>

                  {showStorageInfo && (
                    <div
                      style={{
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

                      <div>
                        <strong>Export backup to keep a safe copy.</strong>
                      </div>

                      <div>Your data does not sync between devices or browsers.</div>
                      <div>Switching browsers or devices will not carry your receipts over.</div>
                      <div>Clearing app or browser data may remove your receipts.</div>
                      <div>Import backup to restore saved data.</div>
                      <div>Press Reload when a new version is available.</div>
                    </div>
                  )}
                </section>
              </div>
            </section>
          </aside>

          <main style={{ minWidth: 0, textAlign: 'left' }}>
            {filter !== 'archived' && (
              <UrgentSummary
                urgentReceipts={urgentReceipts}
                onArchive={(id) => void archiveReceipt(id)}
              />
            )}



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
                        prev
                          ? {
                            ...prev,
                            description: e.target.value.toUpperCase(),
                          }
                          : prev
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
                      setEditState((prev) =>
                        prev ? { ...prev, shop: e.target.value } : prev
                      )
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

                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => void saveEdit()}
                  >
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
                selectedIds={selectedActiveIds}
                toggleSelected={toggleSelectedActive}
                toggleSelectAll={toggleSelectAllActive}
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
                headerActions={
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 14,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      minWidth: 0,
                    }}
                  >
                    <SelectionLinkButton
                      type="button"
                      onClick={() => setSelectedActiveIds([])}
                      disabled={selectedActiveIds.length === 0}
                    >
                      Clear Selection
                    </SelectionLinkButton>

                    <SelectionLinkButton
                      type="button"
                      onClick={() => toggleSelectAllActive(activeReceipts.map((r) => r.id))}
                    >
                      Select All
                    </SelectionLinkButton>

                    <SelectionLinkButton
                      type="button"
                      onClick={handleSelectAllOverdueActive}
                      disabled={overdueActiveIds.length === 0}
                    >
                      Select Overdue
                    </SelectionLinkButton>

                    <SelectionLinkButton
                      type="button"
                      onClick={() => void handleArchiveSelectedActive()}
                      disabled={selectedActiveIds.length === 0}
                      style={{
                        color: '#111827',
                        fontWeight: 700,
                      }}
                    >
                      Archive
                    </SelectionLinkButton>

                    <SelectionLinkButton
                      type="button"
                      onClick={() => void handleDeleteSelectedActive()}
                      disabled={selectedActiveIds.length === 0}
                      style={{
                        color: '#dc2626',
                        fontWeight: 700,
                      }}
                    >
                      Delete
                    </SelectionLinkButton>
                  </div>
                }
              />
            )}

            {showArchivedTable && (
              <div style={{ marginTop: showActiveTable ? 20 : 0 }}>
                <div
                  style={{
                    ...cardStyle,
                    padding: 0,
                    width: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    border: '1px solid #f1f5f9',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#ffffff',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowArchivedReceipts((prev) => !prev)}
                    style={{
                      width: '100%',
                      padding: '18px',
                      border: 'none',
                      background: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        textAlign: 'left',
                        fontSize: 18,
                        color: '#111827',
                      }}
                    >
                      Archived Receipts
                    </h2>

                    <span
                      style={{
                        fontSize: 12,
                        color: '#6b7280',
                        fontWeight: 600,
                      }}
                    >
                      {showArchivedReceipts ? 'Hide' : 'Show'}
                    </span>
                  </button>
                </div>

                {showArchivedReceipts && (
                  <div style={{ marginTop: 12 }}>
                    <ReceiptsTable
                      title=""
                      receipts={archivedReceipts}
                      selectedIds={selectedArchivedIds}
                      toggleSelected={toggleSelectedArchived}
                      toggleSelectAll={toggleSelectAllArchived}
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
                      headerActions={
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 14,
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            minWidth: 0,
                          }}
                        >


                          {showArchivedReceipts && (
                            <>
                              <SelectionLinkButton
                                type="button"
                                onClick={() => setSelectedArchivedIds([])}
                                disabled={selectedArchivedIds.length === 0}
                              >
                                Clear
                              </SelectionLinkButton>

                              <SelectionLinkButton
                                type="button"
                                onClick={() =>
                                  toggleSelectAllArchived(archivedReceipts.map((r) => r.id))
                                }
                              >
                                Select All
                              </SelectionLinkButton>

                              <SelectionLinkButton
                                type="button"
                                onClick={handleSelectActiveArchived}
                                disabled={archivedIds.length === 0}
                              >
                                Select Active
                              </SelectionLinkButton>

                              <SelectionLinkButton
                                type="button"
                                onClick={() => void handleRestoreSelectedArchived()}
                                disabled={selectedArchivedIds.length === 0}
                                style={{
                                  color: '#111827',
                                  fontWeight: 700,
                                }}
                              >
                                Restore
                              </SelectionLinkButton>

                              <SelectionLinkButton
                                type="button"
                                onClick={() => void handleDeleteSelectedArchived()}
                                disabled={selectedArchivedIds.length === 0}
                                style={{
                                  color: '#dc2626',
                                  fontWeight: 700,
                                }}
                              >
                                Delete
                              </SelectionLinkButton>
                            </>
                          )}
                        </div>
                      }
                    />
                  </div>
                )}
              </div>
            )}


          </main>
        </div>

        <footer
          style={{
            paddingTop: 28,
          }}
        >
          <div style={{ height: 16 }} />
        </footer>
      </div>
    </div>
  );
}