/**
 * Zamzam Foods — Order Draft Persistence Utility
 *
 * Persists in-progress order rows locally so that if a manager or owner
 * enters quantities (Kubbus, Romali, cash, gpay) and the page is refreshed or
 * hard-refreshed before submitting, their entered data is NOT lost.
 *
 * Drafts are keyed by orderDate and customerId:
 *   zamzam_order_draft_<date>_<customerId>
 *
 * Lifecycle:
 *   1. User edits quantity/cash/gpay in a row -> saveDraft()
 *   2. Page loads/refreshes -> loadOrdersForDate() checks drafts and restores unsubmitted values
 *   3. User submits order -> API confirms 201/200 DB commit -> clearDraft()
 *   4. If submission fails -> draft remains in storage for retry
 */

export interface OrderDraft {
  customerId: string;
  orderDate: string;
  kubbusQty?: string;
  romaliQty?: string;
  productQuantities?: Record<string, string>;
  cashAmount: string;
  gpayAmount: string;
  discountAmount?: string;
  updatedAt: number;
}

const DRAFT_PREFIX = 'zamzam_order_draft_';

export const draftOrderStorage = {
  getDraft(date: string, customerId: string): OrderDraft | null {
    try {
      const raw = localStorage.getItem(`${DRAFT_PREFIX}${date}_${customerId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  getAllDraftsForDate(date: string): Record<string, OrderDraft> {
    const result: Record<string, OrderDraft> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${DRAFT_PREFIX}${date}_`)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const draft = JSON.parse(raw) as OrderDraft;
            if (draft.customerId) {
              result[draft.customerId] = draft;
            }
          }
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return result;
  },

  saveDraft(draft: OrderDraft): void {
    try {
      const kQty = parseInt(draft.kubbusQty || '0', 10) || 0;
      const rQty = parseInt(draft.romaliQty || '0', 10) || 0;
      const hasProdQtys = Object.values(draft.productQuantities || {}).some((q) => (parseInt(q, 10) || 0) > 0);
      const cAmt = parseFloat(draft.cashAmount || '0') || 0;
      const gAmt = parseFloat(draft.gpayAmount || '0') || 0;

      const hasContent = kQty > 0 || rQty > 0 || hasProdQtys || cAmt > 0 || gAmt > 0;
      const key = `${DRAFT_PREFIX}${draft.orderDate}_${draft.customerId}`;

      if (hasContent) {
        localStorage.setItem(key, JSON.stringify(draft));
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // Storage quota or private browsing exceptions
    }
  },

  clearDraft(date: string, customerId: string): void {
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${date}_${customerId}`);
    } catch {
      // Ignore
    }
  },

  clearAllDraftsForDate(date: string): void {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${DRAFT_PREFIX}${date}_`)) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  },
};
