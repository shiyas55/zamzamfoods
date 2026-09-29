import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';
import { routeService } from '../../services/routeService';
import { paymentService } from '../../services/paymentService';
import { reportService } from '../../services/reportService';
import { Customer, Product, Route, Driver, Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  Plus,
  AlertCircle,
  CheckCircle2,
  Save,
  Search,
  RotateCcw,
  Check,
  X,
  UserPlus,
  Store,
  Trash2,
  RefreshCw,
  Truck,
  CheckCheck,
  Sun,
  Sunrise,
  Lock,
  ExternalLink,
  Smartphone,
  Edit,
  AlertTriangle,
  MessageCircle,
  Columns3,
  Table,
} from 'lucide-react';
import { RealWhatsAppWebView } from '../../components/RealWhatsAppWebView';
import { useSettings } from '../../context/SettingsContext';

export interface WhatsAppCustomerContext {
  id: string;
  name: string;
  owner?: string;
  phone?: string;
  route?: string;
  balance?: string;
}

export interface OrderRow {
  rowId: string;
  customerId: string;
  customerName: string;
  customerOwner?: string;
  customerRouteId?: string;
  customerRoute?: string;
  customerBalance?: string;
  driverId?: string;
  driverName?: string;
  kubbusQty: string;
  romaliQty: string;
  cashAmount: string;
  gpayAmount: string;
  status: 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR' | 'LOCKED';
  orderId?: string;
  orderNumber?: string;
  errorMessage?: string;
  isCustomRow?: boolean;
  orderSource?: string;
  enteredByName?: string;
  enteredByRole?: string;
}

export const CreateOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isWhatsAppEnabled, isSelfOrderEnabled } = useSettings();

  // Master Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Date Option (Defaults to today YYYY-MM-DD)
  const [orderDate, setOrderDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Day Opening & Closing Status for current date
  const [dayStatus, setDayStatus] = useState<{ is_opened: boolean; is_closed: boolean; opening_cash?: string } | null>(null);

  // Day Opening Modal State (Blocks wholesale entry until opened)
  const [isOpenDayModalOpen, setIsOpenDayModalOpen] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('500.00');
  const [openingNotesInput, setOpeningNotesInput] = useState('');
  const [submittingDayOpen, setSubmittingDayOpen] = useState(false);
  const [dayOpenError, setDayOpenError] = useState<string | null>(null);

  // Filter & Search Controls
  const [routeFilter, setRouteFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'CUSTOMER_LINK' | 'MANAGER'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [whatsAppNavToken, setWhatsAppNavToken] = useState<number>(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Selected Customer for WhatsApp Panel
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Workspace Mode: 'split' | 'billing_only' | 'whatsapp_only'
  const [workspaceMode, setWorkspaceMode] = useState<'split' | 'billing_only' | 'whatsapp_only'>(() => {
    const saved = localStorage.getItem('workspace_mode');
    if (saved === 'billing_only' || saved === 'whatsapp_only' || saved === 'split') return saved;
    return 'split';
  });

  // WhatsApp Panel Visible
  const [whatsappVisible, setWhatsappVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem('whatsapp_visible');
    return saved !== 'false';
  });

  // Fixed WhatsApp Panel Width: 385px Phone Viewport
  const whatsappWidthPx = 385;

  // Mobile Tab & Modal State
  const [mobileTab, setMobileTab] = useState<'billing' | 'whatsapp'>('billing');
  const [mobileWhatsAppOpen, setMobileWhatsAppOpen] = useState(false);

  // Derived effective values respecting global isWhatsAppEnabled setting
  const showSplitWhatsAppPanel = isWhatsAppEnabled && whatsappVisible && workspaceMode === 'split';

  // Handle ?view=whatsapp query parameter from navigation
  useEffect(() => {
    if (!isWhatsAppEnabled) return;
    const params = new URLSearchParams(location.search);
    if (params.get('view') === 'whatsapp' || params.get('tab') === 'whatsapp') {
      setWorkspaceMode('whatsapp_only');
      setWhatsappVisible(true);
    }
  }, [location.search, isWhatsAppEnabled]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('workspace_mode', workspaceMode);
  }, [workspaceMode]);

  useEffect(() => {
    localStorage.setItem('whatsapp_visible', String(whatsappVisible));
  }, [whatsappVisible]);

  // Option: Auto-Confirm & Dispatch to Route Driver on Submit
  const [autoConfirmDriver, setAutoConfirmDriver] = useState<boolean>(true);

  // Customer-Specific Pricing Cache: customerId -> { kubbusPrice: number, romaliPrice: number }
  const [pricingCache, setPricingCache] = useState<Record<string, { kubbusPrice: number; romaliPrice: number }>>({});

  // Rows State (All shops pre-populated)
  const [rows, setRows] = useState<OrderRow[]>([]);

  // Submitting State
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<{ current: number; total: number } | null>(null);

  // Customer Self-Order Edit Confirmation Popup Modal State
  const [selfOrderModalRow, setSelfOrderModalRow] = useState<OrderRow | null>(null);
  const [selfOrderPendingField, setSelfOrderPendingField] = useState<'kubbus' | 'romali' | 'cash' | 'gpay' | null>(null);
  const [unlockedSelfOrderIds, setUnlockedSelfOrderIds] = useState<Set<string>>(new Set());

  // New Customer Modal
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustOwner, setNewCustOwner] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustRoute, setNewCustRoute] = useState('');
  const [quickRouteName, setQuickRouteName] = useState('');
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [newCustKubbusPrice, setNewCustKubbusPrice] = useState('35.00');
  const [newCustRomaliPrice, setNewCustRomaliPrice] = useState('45.00');
  const [newCustSubmitting, setNewCustSubmitting] = useState(false);
  const [newCustError, setNewCustError] = useState<string | null>(null);

  // Input references for keyboard navigation
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Products Identification
  const kubbusProduct = products.find((p) => p.code === 'KUB' || p.name.toLowerCase().includes('kubbus'));
  const romaliProduct = products.find((p) => p.code === 'ROM' || p.name.toLowerCase().includes('romali'));

  const defaultKubbusPrice = parseFloat(kubbusProduct?.unit_price || '35.00');
  const defaultRomaliPrice = parseFloat(romaliProduct?.unit_price || '45.00');

  // Load existing orders & payments from database for the selected date
  const loadOrdersForDate = useCallback(
    async (targetDate: string, currentCustomers: Customer[], currentDrivers: Driver[]) => {
      if (currentCustomers.length === 0) {
        setRows([]);
        return;
      }
      setOrdersLoading(true);
      setError(null);

      try {
        const [existingOrders, payments, closingRes] = await Promise.all([
          orderService.getOrders({ date: targetDate }),
          paymentService.getPayments({ date: targetDate }),
          reportService.getDailyClosing(targetDate).catch(() => null),
        ]);

        if (closingRes) {
          const isOpened = Boolean(closingRes.is_opened);
          const isClosed = Boolean(closingRes.is_closed);
          setDayStatus({
            is_opened: isOpened,
            is_closed: isClosed,
            opening_cash: closingRes.opening_record?.opening_cash,
          });
          // Removed auto popup of Open Day modal to prevent annoyance
        } else {
          setDayStatus({ is_opened: false, is_closed: false });
        }

        // Map customerId -> Order
        const orderMap = new Map<string, Order>();
        existingOrders.forEach((ord) => {
          const custId = ord.customer;
          if (custId) {
            orderMap.set(custId, ord);
          }
        });

        // Map customerId -> Cash and GPay totals
        const cashMap = new Map<string, number>();
        const gpayMap = new Map<string, number>();
        payments.forEach((p) => {
          const custId = p.customer;
          const amt = parseFloat(p.amount) || 0;
          if (p.payment_method === 'CASH') {
            cashMap.set(custId, (cashMap.get(custId) || 0) + amt);
          } else if (p.payment_method === 'GPAY_UPI') {
            gpayMap.set(custId, (gpayMap.get(custId) || 0) + amt);
          }
        });

        // Build spreadsheet rows populated from database
        const populatedRows: OrderRow[] = currentCustomers.map((cust) => {
          const existingOrder = orderMap.get(cust.id);
          let kQty = '';
          let rQty = '';

          if (existingOrder && existingOrder.items) {
            existingOrder.items.forEach((item) => {
              const pCode = item.product_details?.code || '';
              const pName = (item.product_details?.name || '').toLowerCase();
              if (pCode === 'KUB' || pName.includes('kubbus')) {
                kQty = item.quantity > 0 ? String(item.quantity) : '';
              }
              if (pCode === 'ROM' || pName.includes('romali')) {
                rQty = item.quantity > 0 ? String(item.quantity) : '';
              }
            });
          }

          const cAmt = cashMap.get(cust.id);
          const gAmt = gpayMap.get(cust.id);

          const custRouteId = cust.route || cust.route_details?.id || '';
          const custRouteName = cust.route_details?.name || '';

          const routeDriver = currentDrivers.find(
            (d) =>
              (d.assigned_route === custRouteId ||
                d.assigned_route_details?.id === custRouteId ||
                (custRouteName && d.assigned_route_details?.name && d.assigned_route_details.name.toLowerCase() === custRouteName.toLowerCase())) &&
              d.is_active
          );

          const driverDisplay =
            existingOrder?.driver_name ||
            (routeDriver
              ? routeDriver.user_details?.first_name
                ? `${routeDriver.user_details.first_name} ${routeDriver.user_details.last_name || ''}`
                : routeDriver.driver_name
              : undefined);

          const isLocked = existingOrder && ['BILLING', 'DELIVERY_CREATED', 'COMPLETED', 'CANCELLED'].includes(existingOrder.status);

          return {
            rowId: `shop_${cust.id}`,
            customerId: cust.id,
            customerName: cust.name,
            customerOwner: cust.owner_name || '',
            customerRouteId: custRouteId,
            customerRoute: custRouteName,
            customerBalance: cust.current_balance,
            driverId: existingOrder?.driver || routeDriver?.id,
            driverName: driverDisplay,
            kubbusQty: kQty,
            romaliQty: rQty,
            cashAmount: cAmt ? cAmt.toFixed(2) : '',
            gpayAmount: gAmt ? gAmt.toFixed(2) : '',
            status: isLocked ? 'LOCKED' : (existingOrder ? 'SAVED' : 'IDLE'),
            orderId: existingOrder?.id,
            orderNumber: existingOrder?.order_number,
            orderSource: existingOrder?.source,
            enteredByName: existingOrder?.entered_by_name,
            enteredByRole: existingOrder?.entered_by_role,
          };
        });

        setUnlockedSelfOrderIds(new Set());
        setRows(populatedRows);
      } catch (err: unknown) {
        console.error('Failed to load orders for date', targetDate, err);
        setError(`Failed to load existing orders for date ${targetDate}.`);
      } finally {
        setOrdersLoading(false);
      }
    },
    []
  );

  // Initial Data Load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [custList, prodList, routeList, driverList] = await Promise.all([
          customerService.getCustomers(),
          productService.getProducts(),
          routeService.getRoutes(),
          routeService.getDrivers(),
        ]);
        setCustomers(custList);
        setProducts(prodList);
        setRoutes(routeList);
        setDrivers(driverList);

        if (routeList.length > 0) {
          setNewCustRoute(routeList[0].id);
        }

        const kProd = prodList.find((p) => p.code === 'KUB' || p.name.toLowerCase().includes('kubbus'));
        const rProd = prodList.find((p) => p.code === 'ROM' || p.name.toLowerCase().includes('romali'));
        if (kProd) setNewCustKubbusPrice(kProd.unit_price);
        if (rProd) setNewCustRomaliPrice(rProd.unit_price);

        // Load existing orders from database for today's date
        await loadOrdersForDate(orderDate, custList, driverList);
      } catch (err: unknown) {
        console.error(err);
        setError('Failed to load customers and product catalog.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [loadOrdersForDate]);

  // When orderDate changes, automatically re-query database for that date!
  const handleDateChange = (newDate: string) => {
    setOrderDate(newDate);
    setSuccessBanner(null);
    setUnlockedSelfOrderIds(new Set());
    if (customers.length > 0) {
      loadOrdersForDate(newDate, customers, drivers);
    }
  };

  // Open Business Day Handler
  const handleOpenDay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingDayOpen(true);
      setDayOpenError(null);
      await reportService.openDay({
        date: orderDate,
        opening_cash: openingCashInput,
        notes: openingNotesInput,
      });
      setDayStatus({
        is_opened: true,
        is_closed: false,
        opening_cash: openingCashInput,
      });
      setIsOpenDayModalOpen(false);
      setSuccessBanner(`Business Day (${orderDate}) opened successfully with opening float of ₹${openingCashInput}! You can now enter wholesale orders.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      // Auto-focus first input
      setTimeout(() => {
        if (rows.length > 0) {
          focusCell(0, 'kubbus');
        }
      }, 150);
    } catch (err: unknown) {
      if (err instanceof Error) setDayOpenError(err.message);
      else setDayOpenError('Failed to open business day.');
    } finally {
      setSubmittingDayOpen(false);
    }
  };

  // Fetch and cache custom pricing for customer
  const fetchCustomerPricing = async (custId: string) => {
    if (pricingCache[custId]) return pricingCache[custId];

    try {
      const pricingList = await customerService.getCustomerPricing(custId);
      let kPrice = defaultKubbusPrice;
      let rPrice = defaultRomaliPrice;

      pricingList.forEach((item) => {
        if (kubbusProduct && item.product_id === kubbusProduct.id) {
          kPrice = parseFloat(item.effective_price);
        }
        if (romaliProduct && item.product_id === romaliProduct.id) {
          rPrice = parseFloat(item.effective_price);
        }
      });

      const entry = { kubbusPrice: kPrice, romaliPrice: rPrice };
      setPricingCache((prev) => ({ ...prev, [custId]: entry }));
      return entry;
    } catch {
      const fallback = { kubbusPrice: defaultKubbusPrice, romaliPrice: defaultRomaliPrice };
      setPricingCache((prev) => ({ ...prev, [custId]: fallback }));
      return fallback;
    }
  };

  // Keyboard navigation helper
  const focusCell = (visibleIndex: number, col: 'kubbus' | 'romali' | 'cash' | 'gpay') => {
    setTimeout(() => {
      const el = inputRefs.current[`${visibleIndex}_${col}`];
      if (el) {
        el.focus();
        el.select();
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }, 25);
  };

  // Visible rows filtered by Route & Search Query
  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (routeFilter !== 'ALL') {
        const selectedRouteObj = routes.find((r) => r.id === routeFilter);
        const matchesRoute =
          row.customerRouteId === routeFilter ||
          (selectedRouteObj && row.customerRouteId === selectedRouteObj.id) ||
          (row.customerRoute &&
            selectedRouteObj?.name &&
            selectedRouteObj.name.toLowerCase() === row.customerRoute.toLowerCase());
        if (!matchesRoute && !row.isCustomRow) return false;
      }

      if (sourceFilter !== 'ALL') {
        if (sourceFilter === 'CUSTOMER_LINK' && row.orderSource !== 'CUSTOMER_LINK') return false;
        if (sourceFilter === 'MANAGER' && row.orderSource === 'CUSTOMER_LINK') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const custObj = customers.find((c) => c.id === row.customerId);
        const matchesName = row.customerName.toLowerCase().includes(q);
        const matchesOwner = (row.customerOwner || '').toLowerCase().includes(q);
        const matchesRouteName = (row.customerRoute || '').toLowerCase().includes(q);
        const matchesPhone = Boolean(custObj?.phone && custObj.phone.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, '')));
        if (!matchesName && !matchesOwner && !matchesRouteName && !matchesPhone) return false;
      }

      return true;
    });
  }, [rows, routeFilter, sourceFilter, searchQuery, routes, customers]);

  // Synchronize single shared search state: auto-highlight matching customer across billing and WhatsApp
  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matched = visibleRows.find((r) => {
        const custObj = customers.find((c) => c.id === r.customerId);
        return (
          r.customerName.toLowerCase().includes(q) ||
          (r.customerOwner || '').toLowerCase().includes(q) ||
          Boolean(custObj?.phone && custObj.phone.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, '')))
        );
      });
      if (matched && matched.customerId) {
        setSelectedCustomerId(matched.customerId);
      }
    }
  }, [searchQuery, visibleRows, customers]);

  // Count customer self-orders submitted online
  const selfOrdersCount = useMemo(() => {
    return rows.filter((r) => r.orderSource === 'CUSTOMER_LINK').length;
  }, [rows]);

  // Active Customer for WhatsApp Panel - Single Source of Truth from Billing Search & Table
  const activeCustomer: WhatsAppCustomerContext | null = useMemo(() => {
    // 1. If Billing search has text, find matching customer immediately
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchedRow = visibleRows.find(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          (r.customerOwner || '').toLowerCase().includes(q)
      );
      if (matchedRow) {
        const custObj = customers.find((c) => c.id === matchedRow.customerId);
        return {
          id: matchedRow.customerId,
          name: matchedRow.customerName,
          owner: matchedRow.customerOwner || custObj?.owner_name || '',
          phone: custObj?.phone || 'No phone registered',
          route: matchedRow.customerRoute || custObj?.route_details?.name || '',
          balance: matchedRow.customerBalance || custObj?.current_balance || '0.00',
        };
      }
      const matchedCust = customers.find(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.owner_name || '').toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
      );
      if (matchedCust) {
        return {
          id: matchedCust.id,
          name: matchedCust.name,
          owner: matchedCust.owner_name || '',
          phone: matchedCust.phone || 'No phone registered',
          route: matchedCust.route_details?.name || '',
          balance: matchedCust.current_balance || '0.00',
        };
      }
      return null;
    }

    // 2. If no search text, use the customer selected by clicking or focusing a row
    if (selectedCustomerId) {
      const custObj = customers.find((c) => c.id === selectedCustomerId);
      const rowObj = rows.find((r) => r.customerId === selectedCustomerId);
      if (custObj || rowObj) {
        return {
          id: selectedCustomerId,
          name: rowObj?.customerName || custObj?.name || '',
          owner: rowObj?.customerOwner || custObj?.owner_name || '',
          phone: custObj?.phone || 'No phone registered',
          route: rowObj?.customerRoute || custObj?.route_details?.name || '',
          balance: rowObj?.customerBalance || custObj?.current_balance || '0.00',
        };
      }
    }

    return null;
  }, [searchQuery, visibleRows, selectedCustomerId, customers, rows]);

  // Handle cell value change (resets SAVED status to IDLE so edited row can be saved/updated!)
  const handleCellChange = (rowId: string, field: keyof OrderRow, value: string) => {
    if (!dayStatus?.is_opened) {
      setIsOpenDayModalOpen(true);
      return;
    }

    const targetRow = rows.find((r) => r.rowId === rowId);
    if (targetRow && targetRow.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(rowId)) {
      setSelfOrderModalRow(targetRow);
      setSelfOrderPendingField(field === 'romaliQty' ? 'romali' : field === 'cashAmount' ? 'cash' : field === 'gpayAmount' ? 'gpay' : 'kubbus');
      return;
    }

    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId === rowId) {
          return {
            ...r,
            [field]: value,
            // If user changes quantity on a saved row, mark as IDLE so it can be submitted and updated!
            status: 'IDLE',
          };
        }
        return r;
      })
    );
  };

  // Apply quantities from WhatsApp chat directly into the billing row
  const handleApplyWhatsAppOrder = (customerId: string, kubbus: string, romali: string) => {
    if (!dayStatus?.is_opened) {
      setIsOpenDayModalOpen(true);
      return;
    }
    setRows((prev) =>
      prev.map((r) => {
        if (r.customerId === customerId) {
          return {
            ...r,
            kubbusQty: kubbus || r.kubbusQty,
            romaliQty: romali || r.romaliQty,
            status: 'IDLE',
          };
        }
        return r;
      })
    );
    setSelectedCustomerId(customerId);
  };

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching customers for instant search dropdown (by shop name, owner, and phone)
  const matchingSearchCustomers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const digitsQ = q.replace(/[^0-9]/g, '');

    return customers.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchOwner = (c.owner_name || '').toLowerCase().includes(q);
      const matchRoute = (c.route_details?.name || '').toLowerCase().includes(q);
      const matchPhone = digitsQ.length >= 2 && c.phone && c.phone.replace(/[^0-9]/g, '').includes(digitsQ);
      const matchRawPhone = Boolean(c.phone && c.phone.toLowerCase().includes(q));
      return matchName || matchOwner || matchRoute || matchPhone || matchRawPhone;
    }).slice(0, 10);
  }, [searchQuery, customers]);

  // Click Customer/Shop from Search Result -> Immediately Open WhatsApp Chat
  const handleSelectCustomerForWhatsApp = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setWhatsAppNavToken(Date.now());
    setShowSearchDropdown(false);
    // Note: searchQuery is intentionally preserved so search state is never lost!
  };

  // Remove a specific row
  const handleRemoveRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  // Restore removed shops
  const handleRestoreAllShops = () => {
    const existingIds = new Set(rows.map((r) => r.customerId).filter(Boolean));
    const missing = customers.filter((c) => !existingIds.has(c.id));
    if (missing.length === 0) return;

    const restoredRows: OrderRow[] = missing.map((cust) => {
      const custRouteId = cust.route || cust.route_details?.id || '';
      const custRouteName = cust.route_details?.name || routes.find((r) => r.id === custRouteId)?.name || '';
      const routeDriver = drivers.find(
        (d) =>
          (d.assigned_route === custRouteId ||
            d.assigned_route_details?.id === custRouteId ||
            (custRouteName && d.assigned_route_details?.name && d.assigned_route_details.name.toLowerCase() === custRouteName.toLowerCase())) &&
          d.is_active
      );

      return {
        rowId: `shop_${cust.id}`,
        customerId: cust.id,
        customerName: cust.name,
        customerOwner: cust.owner_name || '',
        customerRouteId: custRouteId,
        customerRoute: custRouteName,
        customerBalance: cust.current_balance,
        driverId: routeDriver?.id,
        driverName: routeDriver?.user_details?.first_name
          ? `${routeDriver.user_details.first_name} ${routeDriver.user_details.last_name || ''}`
          : routeDriver?.driver_name,
        kubbusQty: '',
        romaliQty: '',
        shopExpense: '',
        cashAmount: '',
        gpayAmount: '',
        status: 'IDLE',
      };
    });

    setRows((prev) => [...prev, ...restoredRows]);
  };

  // Calculate financials for a row
  const getRowFinancials = (row: OrderRow) => {
    const kQty = parseInt(row.kubbusQty, 10) || 0;
    const rQty = parseInt(row.romaliQty, 10) || 0;

    const kPrice = pricingCache[row.customerId]?.kubbusPrice ?? defaultKubbusPrice;
    const rPrice = pricingCache[row.customerId]?.romaliPrice ?? defaultRomaliPrice;

    const rowTotal = kQty * kPrice + rQty * rPrice;
    const cash = parseFloat(row.cashAmount) || 0;
    const gpay = parseFloat(row.gpayAmount) || 0;
    const rowPaid = cash + gpay;
    const prevDue = parseFloat(row.customerBalance || '0') || 0;
    // Current Outstanding Balance = Previous Due + Today's Order Bill - Today's Payments (Cash + GPay)
    const rowBalance = prevDue + rowTotal - rowPaid;

    return {
      kQty,
      rQty,
      kPrice,
      rPrice,
      rowTotal,
      cash,
      gpay,
      rowPaid,
      prevDue,
      rowBalance,
      hasOrder: kQty > 0 || rQty > 0,
      isValid: Boolean(row.customerId) && (kQty > 0 || rQty > 0 || cash > 0 || gpay > 0),
    };
  };

  // KPI Summary Statistics
  const sheetStats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const fin = getRowFinancials(row);
        if (fin.hasOrder || fin.cash > 0 || fin.gpay > 0) {
          acc.validShopsCount += 1;
          acc.totalKubbus += fin.kQty;
          acc.totalRomali += fin.rQty;
          acc.totalBill += fin.rowTotal;
          acc.totalCash += fin.cash;
          acc.totalGPay += fin.gpay;
          acc.totalDue += fin.rowBalance;
        }
        return acc;
      },
      {
        validShopsCount: 0,
        totalKubbus: 0,
        totalRomali: 0,
        totalBill: 0,
        totalCash: 0,
        totalGPay: 0,
        totalDue: 0,
      }
    );
  }, [rows, pricingCache, defaultKubbusPrice, defaultRomaliPrice]);

  // Count unsubmitted / modified orders ready to submit
  const pendingOrdersCount = useMemo(() => {
    return rows.filter((r) => {
      const fin = getRowFinancials(r);
      return (fin.hasOrder || fin.cash > 0 || fin.gpay > 0) && (r.status === 'IDLE' || r.status === 'SAVING');
    }).length;
  }, [rows]);

  // Count removed shops that could be restored
  const removedCount = useMemo(() => {
    const existingIds = new Set(rows.map((r) => r.customerId).filter(Boolean));
    return customers.filter((c) => !existingIds.has(c.id)).length;
  }, [rows, customers]);

  /**
   * Ultra-Fast Keyboard Entry Logic:
   * 1. Kubbus -> Enter -> Romali Roti (same shop)
   * 2. Romali Roti -> Enter -> Next Shop's Kubbus
   * 3. Cash -> Enter -> GPay
   * 4. GPay -> Enter -> Next Shop's Kubbus
   * 5. Tab / Shift+Tab moves left / right
   * 6. Arrow Up / Down jumps vertically between shops
   */
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    visibleIndex: number,
    col: 'kubbus' | 'romali' | 'cash' | 'gpay'
  ) => {
    if (!dayStatus?.is_opened) {
      e.preventDefault();
      setIsOpenDayModalOpen(true);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (col === 'kubbus') {
        focusCell(visibleIndex, 'romali');
      } else if (col === 'romali') {
        if (visibleIndex < visibleRows.length - 1) {
          focusCell(visibleIndex + 1, 'kubbus');
        }
      } else if (col === 'cash') {
        focusCell(visibleIndex, 'gpay');
      } else if (col === 'gpay') {
        if (visibleIndex < visibleRows.length - 1) {
          focusCell(visibleIndex + 1, 'kubbus');
        }
      }
      return;
    }

    if (e.key === 'Tab' && !e.shiftKey) {
      if (col === 'romali') {
        e.preventDefault();
        focusCell(visibleIndex, 'cash');
      } else if (col === 'cash') {
        e.preventDefault();
        focusCell(visibleIndex, 'gpay');
      } else if (col === 'gpay') {
        if (visibleIndex < visibleRows.length - 1) {
          e.preventDefault();
          focusCell(visibleIndex + 1, 'kubbus');
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      if (visibleIndex < visibleRows.length - 1) {
        e.preventDefault();
        focusCell(visibleIndex + 1, col);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      if (visibleIndex > 0) {
        e.preventDefault();
        focusCell(visibleIndex - 1, col);
      }
      return;
    }
  };

  // Add 1 Custom Row
  const handleAddCustomRow = () => {
    const newRow: OrderRow = {
      rowId: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customerId: '',
      customerName: '',
      customerRoute: 'Walk-in / Custom',
      kubbusQty: '',
      romaliQty: '',
      cashAmount: '',
      gpayAmount: '',
      status: 'IDLE',
      isCustomRow: true,
    };
    setRows((prev) => [newRow, ...prev]);
    setTimeout(() => {
      focusCell(0, 'kubbus');
    }, 40);
  };

  // Reset inputs
  const handleResetInputs = () => {
    if (window.confirm('Clear all entered quantities and payments back to blank?')) {
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          kubbusQty: '',
          romaliQty: '',
          cashAmount: '',
          gpayAmount: '',
          status: 'IDLE',
          errorMessage: undefined,
        }))
      );
      setSuccessBanner(null);
      setError(null);
    }
  };

  // Submit All Orders (Creates new orders or updates existing ones, with auto-confirm to driver!)
  const handleSubmitAllOrders = async () => {
    const ordersToSubmit = rows
      .map((r) => ({ row: r, fin: getRowFinancials(r) }))
      .filter((item) => (item.fin.hasOrder || item.fin.cash > 0 || item.fin.gpay > 0) && (item.row.status === 'IDLE' || item.row.status === 'SAVING'));

    if (ordersToSubmit.length === 0) {
      setError('No new or modified orders to submit. Type quantities in a shop row first.');
      return;
    }

    setIsSubmittingAll(true);
    setError(null);
    setSuccessBanner(null);
    setSubmitProgress({ current: 0, total: ordersToSubmit.length });

    let successCount = 0;

    for (let i = 0; i < ordersToSubmit.length; i++) {
      const { row, fin } = ordersToSubmit[i];
      setSubmitProgress({ current: i + 1, total: ordersToSubmit.length });

      setRows((prev) =>
        prev.map((r) => (r.rowId === row.rowId ? { ...r, status: 'SAVING', errorMessage: undefined } : r))
      );

      try {
        const cust = customers.find((c) => c.id === row.customerId);
        const routeDriver = drivers.find(
          (d) =>
            (d.assigned_route === cust?.route ||
              d.assigned_route_details?.id === cust?.route ||
              d.assigned_route_details?.name === cust?.route_details?.name) &&
            d.is_active
        );

        const assignedDriverId = autoConfirmDriver ? routeDriver?.id || null : null;

        const items: Array<{ product_id: string; quantity: number; unit_price: string }> = [];
        if (fin.kQty > 0 && kubbusProduct) {
          items.push({
            product_id: kubbusProduct.id,
            quantity: fin.kQty,
            unit_price: fin.kPrice.toFixed(2),
          });
        }
        if (fin.rQty > 0 && romaliProduct) {
          items.push({
            product_id: romaliProduct.id,
            quantity: fin.rQty,
            unit_price: fin.rPrice.toFixed(2),
          });
        }

        let order: Order | undefined;

        // Create or update order in database if line items exist
        if (items.length > 0) {
          if (row.orderId) {
            order = await orderService.updateOrder(row.orderId, {
              items,
              driver_id: assignedDriverId,
              notes: 'Fast wholesale daily entry (updated)',
            });
          } else {
            order = await orderService.createOrder({
              customer_id: row.customerId,
              driver_id: assignedDriverId,
              order_date: orderDate,
              items,
              notes: 'Fast wholesale daily entry',
            });
          }
        }

        // Record Cash Payment if entered
        if (fin.cash > 0) {
          await paymentService.recordPayment({
            customer_id: row.customerId,
            amount: fin.cash.toFixed(2),
            payment_method: 'CASH',
            order_id: order?.id || row.orderId,
            notes: order ? `Cash collection for Order #${order.order_number}` : 'Wholesale counter cash payment',
          });
        }

        // Record GPay Payment if entered
        if (fin.gpay > 0) {
          await paymentService.recordPayment({
            customer_id: row.customerId,
            amount: fin.gpay.toFixed(2),
            payment_method: 'GPAY_UPI',
            order_id: order?.id || row.orderId,
            notes: order ? `GPay collection for Order #${order.order_number}` : 'Wholesale counter GPay payment',
          });
        }

        setRows((prev) =>
          prev.map((r) =>
            r.rowId === row.rowId
              ? {
                  ...r,
                  status: 'SAVED',
                  orderId: order?.id || r.orderId,
                  orderNumber: order?.order_number || r.orderNumber,
                  driverId: order?.driver || assignedDriverId || r.driverId || undefined,
                  driverName: order?.driver_name || routeDriver?.driver_name || r.driverName || undefined,
                }
              : r
          )
        );

        successCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Order creation failed';
        setRows((prev) =>
          prev.map((r) =>
            r.rowId === row.rowId
              ? {
                  ...r,
                  status: 'ERROR',
                  errorMessage: msg,
                }
              : r
          )
        );
      }
    }

    setIsSubmittingAll(false);
    setSubmitProgress(null);

    if (successCount > 0) {
      setSuccessBanner(
        `Successfully saved ${successCount} order(s) for ${orderDate}! ${
          autoConfirmDriver ? 'Confirmed & dispatched to route delivery drivers.' : ''
        }`
      );
    }
  };

  // Quick Route Creation Handler
  const handleQuickCreateRoute = async () => {
    if (!quickRouteName.trim()) return;
    try {
      setIsCreatingRoute(true);
      const code = quickRouteName.trim().substring(0, 3).toUpperCase();
      const newRoute = await routeService.createRoute({
        name: quickRouteName.trim(),
        code,
        description: `Route for ${quickRouteName.trim()}`,
      });
      setRoutes((prev) => [...prev, newRoute]);
      setNewCustRoute(newRoute.id);
      setQuickRouteName('');
    } catch (err: unknown) {
      setNewCustError(err instanceof Error ? err.message : 'Failed to create route');
    } finally {
      setIsCreatingRoute(false);
    }
  };

  // Direct Customer Creation Handler
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone || !newCustAddress || !newCustRoute) {
      setNewCustError('Please fill in shop name, phone, address, and select a route.');
      return;
    }

    try {
      setNewCustSubmitting(true);
      setNewCustError(null);

      const product_prices = [];
      if (kubbusProduct && newCustKubbusPrice) {
        product_prices.push({ product_id: kubbusProduct.id, price: newCustKubbusPrice });
      }
      if (romaliProduct && newCustRomaliPrice) {
        product_prices.push({ product_id: romaliProduct.id, price: newCustRomaliPrice });
      }

      const created = await customerService.createCustomer({
        name: newCustName,
        owner_name: newCustOwner || undefined,
        phone: newCustPhone,
        address: newCustAddress,
        route: newCustRoute,
        product_prices: product_prices.length > 0 ? product_prices : undefined,
      });

      setCustomers((prev) => [created, ...prev]);

      const kP = parseFloat(newCustKubbusPrice) || defaultKubbusPrice;
      const rP = parseFloat(newCustRomaliPrice) || defaultRomaliPrice;
      setPricingCache((prev) => ({ ...prev, [created.id]: { kubbusPrice: kP, romaliPrice: rP } }));

      const createdRouteId = created.route || created.route_details?.id || '';
      const createdRouteName = created.route_details?.name || routes.find((r) => r.id === createdRouteId)?.name || '';

      const routeDriver = drivers.find(
        (d) =>
          (d.assigned_route === createdRouteId ||
            d.assigned_route_details?.id === createdRouteId ||
            (createdRouteName && d.assigned_route_details?.name && d.assigned_route_details.name.toLowerCase() === createdRouteName.toLowerCase())) &&
          d.is_active
      );

      const driverDisplay =
        routeDriver?.user_details?.first_name
          ? `${routeDriver.user_details.first_name} ${routeDriver.user_details.last_name || ''}`
          : routeDriver?.driver_name;

      const newShopRow: OrderRow = {
        rowId: `shop_${created.id}`,
        customerId: created.id,
        customerName: created.name,
        customerOwner: created.owner_name || '',
        customerRouteId: createdRouteId,
        customerRoute: createdRouteName,
        customerBalance: created.current_balance,
        driverId: routeDriver?.id,
        driverName: driverDisplay,
        kubbusQty: '',
        romaliQty: '',
        cashAmount: '',
        gpayAmount: '',
        status: 'IDLE',
      };

      setRows((prev) => [newShopRow, ...prev]);

      setIsNewCustModalOpen(false);
      setNewCustName('');
      setNewCustOwner('');
      setNewCustPhone('');
      setNewCustAddress('');

      setTimeout(() => {
        focusCell(0, 'kubbus');
      }, 50);
    } catch (err: unknown) {
      setNewCustError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setNewCustSubmitting(false);
    }
  };

  return (
    <div
      className="billing-page-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Page Header (Single-line compact) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.65rem',
          flexShrink: 0,
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Fast Wholesale Order Entry
          </h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Enter: Kubbus &rarr; Romali Roti &rarr; Next Shop
          </span>
          {ordersLoading && (
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <div className="spinner" style={{ width: 12, height: 12 }} />
              Loading database orders...
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Driver Confirmation Toggle */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: autoConfirmDriver ? '#dc2626' : 'var(--text-secondary)',
              background: autoConfirmDriver ? '#fee2e2' : 'var(--bg-card)',
              border: autoConfirmDriver ? '1.5px solid #dc2626' : '1px solid var(--border)',
              padding: '0 0.65rem',
              borderRadius: '8px',
              height: '34px',
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
            title="Automatically assign and confirm orders to route drivers on submit"
          >
            <input
              type="checkbox"
              checked={autoConfirmDriver}
              onChange={(e) => setAutoConfirmDriver(e.target.checked)}
              style={{ accentColor: '#dc2626', width: '15px', height: '15px', cursor: 'pointer' }}
            />
            <Truck size={15} color={autoConfirmDriver ? '#dc2626' : 'var(--text-muted)'} />
            <span>Confirm to Driver</span>
          </label>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (!dayStatus?.is_opened) {
                setIsOpenDayModalOpen(true);
                return;
              }
              setIsNewCustModalOpen(true);
            }}
            style={{ height: '34px', padding: '0 0.75rem' }}
          >
            <UserPlus size={15} />
            <span>New Shop</span>
          </button>

          {!dayStatus?.is_opened ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsOpenDayModalOpen(true)}
              style={{
                height: '34px',
                padding: '0 1rem',
                fontWeight: 800,
                background: '#dc2626',
                borderColor: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Sunrise size={15} />
              <span>Open Day to Enter Orders</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={isSubmittingAll || pendingOrdersCount === 0}
              onClick={handleSubmitAllOrders}
              style={{ height: '34px', padding: '0 1rem', fontWeight: 800 }}
            >
              <Save size={15} />
              <span>
                {isSubmittingAll
                  ? `Submitting (${submitProgress?.current}/${submitProgress?.total})...`
                  : pendingOrdersCount > 0
                  ? `Submit Orders (${pendingOrdersCount}) • ${formatCurrency(sheetStats.totalBill)}`
                  : 'All Orders Saved'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.82rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successBanner && (
        <div className="alert alert-success" style={{ marginBottom: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.82rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} />
          <span>{successBanner}</span>
        </div>
      )}

      {/* 2. Compact 4 KPI Cards */}
      <div
        className="billing-stat-grid"
        style={{
          gap: '0.65rem',
          marginBottom: '0.65rem',
          flexShrink: 0,
        }}
      >
        {/* Card 1: Red border stripe */}
        <div className="card" style={{ padding: '0.5rem 0.85rem', borderLeft: '4px solid #dc2626' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', letterSpacing: '0.03em' }}>
            Dispatch Orders ({orderDate})
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', marginTop: '0.1rem', lineHeight: 1.15 }}>
            {sheetStats.validShopsCount} Shops
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            {formatCurrency(sheetStats.totalBill)} total bill
          </div>
        </div>

        {/* Card 2: Amber border stripe */}
        <div className="card" style={{ padding: '0.5rem 0.85rem', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', letterSpacing: '0.03em' }}>
            Total Kubbus
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309', marginTop: '0.1rem', lineHeight: 1.15 }}>
            {sheetStats.totalKubbus} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>ps</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Single pieces (ps)
          </div>
        </div>

        {/* Card 3: Red border stripe */}
        <div className="card" style={{ padding: '0.5rem 0.85rem', borderLeft: '4px solid #dc2626' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', letterSpacing: '0.03em' }}>
            Total Romali
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', marginTop: '0.1rem', lineHeight: 1.15 }}>
            {sheetStats.totalRomali} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>ps</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Wholesale single pieces
          </div>
        </div>

        {/* Card 4: Green border stripe */}
        <div className="card" style={{ padding: '0.5rem 0.85rem', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', letterSpacing: '0.03em' }}>
            Collections & Balance
          </span>
          <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Collected:</span>
              <strong style={{ color: '#10b981' }}>{formatCurrency(sheetStats.totalCash + sheetStats.totalGPay)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Balance Due:</span>
              <strong style={{ color: '#dc2626' }}>{formatCurrency(sheetStats.totalDue)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Compact Filter Bar */}
      <div
        className="billing-filter-bar"
        style={{
          gap: '0.5rem',
          marginBottom: '0.65rem',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {/* Route Select */}
        <select
          className="form-select"
          style={{ minWidth: '180px', flex: '0 0 200px', height: '34px', padding: '0.25rem 0.65rem', fontSize: '0.84rem' }}
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
        >
          <option value="ALL">All Routes ({customers.length} Shops)</option>
          {routes.map((r) => {
            const count = customers.filter(
              (c) =>
                c.route === r.id ||
                c.route_details?.id === r.id ||
                (c.route_details?.name && c.route_details.name.toLowerCase() === r.name.toLowerCase())
            ).length;
            const displayName = r.name.charAt(0).toUpperCase() + r.name.slice(1);
            return (
              <option key={r.id} value={r.id}>
                {displayName} ({count} Shops)
              </option>
            );
          })}
        </select>

        {/* Date Selector (Changing this re-queries the database for that date!) */}
        <input
          type="date"
          className="form-input"
          style={{ width: '145px', flex: '0 0 145px', height: '34px', padding: '0.25rem 0.65rem', fontSize: '0.84rem' }}
          value={orderDate}
          onChange={(e) => handleDateChange(e.target.value)}
          title="Select dispatch date to load or enter orders"
        />

        {/* Refresh Orders Button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => loadOrdersForDate(orderDate, customers, drivers)}
          disabled={ordersLoading}
          style={{ height: '34px', padding: '0 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          title="Refresh orders from database to see newly submitted Customer Self-Orders"
        >
          <RefreshCw size={14} className={ordersLoading ? 'spinner' : ''} />
          <span>Refresh</span>
        </button>

        {/* Customer Self-Orders Quick Filter Pill */}
        <button
          type="button"
          onClick={() => {
            if (selfOrdersCount > 0 || sourceFilter === 'CUSTOMER_LINK') {
              setSourceFilter((prev) => (prev === 'CUSTOMER_LINK' ? 'ALL' : 'CUSTOMER_LINK'));
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            height: '34px',
            padding: '0 0.8rem',
            borderRadius: 'var(--radius)',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: selfOrdersCount > 0 || sourceFilter === 'CUSTOMER_LINK' ? 'pointer' : 'default',
            background: sourceFilter === 'CUSTOMER_LINK' ? '#059669' : selfOrdersCount > 0 ? '#ecfdf5' : '#f8fafc',
            color: sourceFilter === 'CUSTOMER_LINK' ? '#ffffff' : selfOrdersCount > 0 ? '#047857' : '#64748b',
            border: sourceFilter === 'CUSTOMER_LINK' ? '1.5px solid #059669' : selfOrdersCount > 0 ? '1.5px solid #10b981' : '1px solid #cbd5e1',
            boxShadow: sourceFilter === 'CUSTOMER_LINK' ? '0 2px 8px rgba(16, 185, 129, 0.35)' : '0 1px 3px rgba(0,0,0,0.05)',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
          title={selfOrdersCount > 0 ? "Click to filter table to Customer Self-Orders placed online" : "No self-orders placed online yet for this date"}
        >
          <Smartphone size={15} color={sourceFilter === 'CUSTOMER_LINK' ? '#ffffff' : selfOrdersCount > 0 ? '#059669' : '#94a3b8'} />
          <span>{selfOrdersCount} Self-Order{selfOrdersCount === 1 ? '' : 's'}</span>
          {sourceFilter === 'CUSTOMER_LINK' ? (
            <X size={13} />
          ) : selfOrdersCount > 0 ? (
            <span style={{ fontSize: '0.7rem', opacity: 0.85, background: '#10b981', color: '#fff', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>Filter</span>
          ) : null}
        </button>

        {/* Day Status Indicator */}
        {dayStatus && (
          <button
            type="button"
            onClick={() => navigate('/manager/daily-closing')}
            title="Click to view Daily Closing & Cash Drawer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0 0.65rem',
              height: '34px',
              borderRadius: 'var(--radius)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: dayStatus.is_closed ? '#fef2f2' : dayStatus.is_opened ? '#f0fdf4' : '#fffbeb',
              color: dayStatus.is_closed ? '#b91c1c' : dayStatus.is_opened ? '#166534' : '#b45309',
              border: `1px solid ${dayStatus.is_closed ? '#fca5a5' : dayStatus.is_opened ? '#86efac' : '#fcd34d'}`,
            }}
          >
            {dayStatus.is_closed ? (
              <span>🔒 Day Closed</span>
            ) : dayStatus.is_opened ? (
              <span>☀️ Day Open (₹{dayStatus.opening_cash || '0'})</span>
            ) : (
              <span>⚠️ Day Not Opened</span>
            )}
          </button>
        )}

        {/* Customer/Shop Search Input with Connected WhatsApp Dropdown List */}
        <div ref={searchContainerRef} style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '30px', height: '34px', paddingRight: '28px', fontSize: '0.84rem', width: '100%' }}
            placeholder="Search by shop name, customer, or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => {
              if (searchQuery.trim()) setShowSearchDropdown(true);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSearchDropdown(false);
              }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                zIndex: 2,
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}

          {/* Search Result Dropdown List */}
          {showSearchDropdown && searchQuery.trim() && (
            <div
              className="card"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                minWidth: '320px',
                maxHeight: '360px',
                overflowY: 'auto',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                padding: '0.35rem 0',
              }}
            >
              <div
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Matching Shops ({matchingSearchCustomers.length})</span>
                {isWhatsAppEnabled && (
                  <span style={{ fontSize: '0.68rem', color: '#059669', textTransform: 'none', fontWeight: 600 }}>
                    Click to open WhatsApp
                  </span>
                )}
              </div>

              {matchingSearchCustomers.length === 0 ? (
                <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No customer or shop matches "{searchQuery}"
                </div>
              ) : (
                matchingSearchCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (isWhatsAppEnabled) {
                        handleSelectCustomerForWhatsApp(c.id);
                      } else {
                        setSearchQuery(c.name);
                        setShowSearchDropdown(false);
                      }
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-light, #f1f5f9)',
                      gap: '0.5rem',
                      transition: 'background 0.12s ease',
                      background: (isWhatsAppEnabled && selectedCustomerId === c.id) ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = (isWhatsAppEnabled && selectedCustomerId === c.id) ? 'rgba(16, 185, 129, 0.1)' : 'transparent')}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {c.owner_name && <span>{c.owner_name}</span>}
                        {c.phone && (
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            📞 {c.phone}
                          </span>
                        )}
                        {c.route_details?.name && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            ({c.route_details.name})
                          </span>
                        )}
                      </div>
                    </div>

                    {isWhatsAppEnabled && (
                      <div
                        style={{
                          background: '#ecfdf5',
                          color: '#047857',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          flexShrink: 0,
                          border: '1px solid #a7f3d0',
                        }}
                      >
                        <MessageCircle size={12} />
                        <span>Open Chat</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {(routeFilter !== 'ALL' || searchQuery) && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setRouteFilter('ALL');
              setSearchQuery('');
            }}
            style={{ height: '34px', padding: '0 0.65rem', fontSize: '0.8rem' }}
          >
            Clear Filters
          </button>
        )}

        {/* Mobile WhatsApp Panel Trigger */}
        {isWhatsAppEnabled && (
          <button
            type="button"
            className="billing-whatsapp-mobile-trigger btn btn-sm"
            onClick={() => setMobileWhatsAppOpen(true)}
            style={{
              height: '34px',
              padding: '0 0.65rem',
              background: '#ecfdf5',
              border: '1.5px solid #10b981',
              color: '#047857',
              fontWeight: 700,
              fontSize: '0.8rem',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
            }}
            title="Open WhatsApp Customer Chat"
          >
            <MessageCircle size={15} color="#059669" />
            <span>WhatsApp{activeCustomer ? ` (${activeCustomer.name.slice(0, 10)})` : ''}</span>
          </button>
        )}
      </div>

      {/* Day Status Action Alert Banner */}
      {dayStatus && !dayStatus.is_opened && !dayStatus.is_closed && (
        <div
          style={{
            padding: '0.5rem 0.85rem',
            background: '#fffbeb',
            border: '1.5px solid #fcd34d',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
            flexShrink: 0,
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#92400e' }}>
            <Sun size={20} color="#b45309" />
            <div>
              <span style={{ fontSize: '0.86rem', fontWeight: 800 }}>
                Business Day ({orderDate}) is NOT OPENED.
              </span>
              <span style={{ fontSize: '0.78rem', color: '#b45309', display: 'block' }}>
                Wholesale data entry is locked. You must record the opening cash float to begin entering orders.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsOpenDayModalOpen(true)}
            style={{
              background: '#dc2626',
              borderColor: '#dc2626',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              height: '32px',
              fontSize: '0.82rem',
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            <Sunrise size={15} />
            <span>Open Business Day Now</span>
          </button>
        </div>
      )}

      {dayStatus?.is_closed && (
        <div
          style={{
            padding: '0.5rem 0.85rem',
            background: '#fef2f2',
            border: '1.5px solid #fca5a5',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#991b1b' }}>
            <Lock size={20} color="#dc2626" />
            <div>
              <span style={{ fontSize: '0.86rem', fontWeight: 800 }}>
                Business Day ({orderDate}) is CLOSED.
              </span>
              <span style={{ fontSize: '0.78rem', color: '#b91c1c', display: 'block' }}>
                Financial records for this day are locked and cannot be edited. Only the Owner can reopen.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/manager/daily-closing')}
            style={{ height: '32px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
          >
            View Daily Closing
          </button>
        </div>
      )}

      {/* ── TOP WORKSPACE TOOLBAR ── */}
      {isWhatsAppEnabled && (
        <div
          className="workspace-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '0.4rem 0.75rem',
            marginBottom: '0.65rem',
            flexShrink: 0,
            gap: '0.65rem',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Left: WhatsApp Cloud API Status & Responsive View Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.28rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
                height: '30px',
              }}
            >
              <MessageCircle size={14} color="#059669" />
              <span>WhatsApp Cloud API</span>
              <span
                style={{
                  fontSize: '0.66rem',
                  background: '#dcfce7',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  color: '#15803d',
                  fontWeight: 800,
                }}
              >
                ● Connected
              </span>
            </div>

            {/* Responsive Layout Controls */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--bg-subtle, #f1f5f9)',
                borderRadius: '7px',
                padding: '2px',
                border: '1px solid var(--border)',
                height: '30px',
                boxSizing: 'border-box',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setWorkspaceMode('split');
                  setWhatsappVisible(true);
                }}
                style={{
                  background: whatsappVisible && workspaceMode === 'split' ? '#008069' : 'transparent',
                  color: whatsappVisible && workspaceMode === 'split' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease',
                }}
                title="Side-by-side: WhatsApp phone (385px) on left + Billing on right"
              >
                <span>◧ Split View</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWorkspaceMode('billing_only');
                  setWhatsappVisible(false);
                }}
                style={{
                  background: !whatsappVisible || workspaceMode === 'billing_only' ? '#0f172a' : 'transparent',
                  color: !whatsappVisible || workspaceMode === 'billing_only' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease',
                }}
                title="Full Billing Table: Hide WhatsApp to get 100% wide grid columns"
              >
                <span>⛶ Full Table</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileWhatsAppOpen(true)}
                style={{
                  background: mobileWhatsAppOpen ? '#008069' : 'transparent',
                  color: mobileWhatsAppOpen ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease',
                }}
                title="Floating Phone: Open WhatsApp in floating modal"
              >
                <span>📱 Floating</span>
              </button>
            </div>
          </div>

          {/* Right: Customer WhatsApp Connection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flexWrap: 'wrap' }}>
            {activeCustomer ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'rgba(37, 211, 102, 0.08)',
                  border: '1px solid rgba(37, 211, 102, 0.35)',
                  borderRadius: '7px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.78rem',
                  height: '30px',
                  boxSizing: 'border-box',
                }}
              >
                <Store size={14} color="#059669" />
                <strong style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  {activeCustomer.name}
                </strong>
                {activeCustomer.phone && activeCustomer.phone !== 'No phone registered' && (
                  <span style={{ color: '#047857', fontFamily: 'monospace', fontWeight: 600 }}>
                    {activeCustomer.phone}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (activeCustomer.phone && activeCustomer.phone !== 'No phone registered') {
                      const digits = activeCustomer.phone.replace(/[^0-9+]/g, '');
                      navigator.clipboard.writeText(digits || activeCustomer.phone);
                    }
                  }}
                  style={{
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    color: '#15803d',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                  title="Copy phone number"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId(null);
                    if (searchQuery) setSearchQuery('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 2px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                  title="Clear selection"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                No shop selected &bull; Click any row or search
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Responsive Split Workspace: Real WhatsApp Web (Left) + Billing (Right) */}
      <div
        className="billing-workspace-grid"
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          gap: '0.65rem',
          alignItems: 'stretch',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: Dedicated Real WhatsApp Web Workspace Panel (Fixed Phone Size: 385px) */}
        {showSplitWhatsAppPanel && (
          <div
            className="billing-whatsapp-desktop-wrapper"
            style={{
              width: '385px',
              minWidth: '385px',
              maxWidth: '385px',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              flexShrink: 0,
              boxSizing: 'border-box',
            }}
          >
            <RealWhatsAppWebView
              customer={activeCustomer}
              targetCustomerId={selectedCustomerId}
              openChatTimestamp={whatsAppNavToken}
              allCustomers={customers}
              orderRows={rows}
              onSelectCustomer={(customerId) => handleSelectCustomerForWhatsApp(customerId)}
              onApplyQuantities={handleApplyWhatsAppOrder}
              onHide={() => {
                setWhatsappVisible(false);
                setWorkspaceMode('billing_only');
              }}
            />
          </div>
        )}

        {/* Right: Existing Billing Table Container */}
        <div
          className="table-container card billing-table-wrapper"
            style={{
              flex: '1 1 0%',
              minWidth: 0,
              maxWidth: '100%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              marginBottom: 0,
              boxSizing: 'border-box',
            }}
          >
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
              <tr>
                <th style={{ width: '38px', minWidth: '38px', textAlign: 'center', padding: '0.5rem 0.35rem' }}>#</th>
                <th style={{ minWidth: '180px', maxWidth: '240px', padding: '0.5rem 0.65rem' }}>Shop Name</th>
                <th style={{ minWidth: '120px', padding: '0.5rem 0.65rem' }}>Route & Driver</th>
                <th style={{ minWidth: '85px', textAlign: 'right', padding: '0.5rem 0.65rem', whiteSpace: 'nowrap' }}>Prev. Due</th>
                <th style={{ minWidth: '88px', textAlign: 'right', padding: '0.5rem 0.45rem', whiteSpace: 'nowrap' }}>Kubbus (ps)</th>
                <th style={{ minWidth: '88px', textAlign: 'right', padding: '0.5rem 0.45rem', whiteSpace: 'nowrap' }}>Romali (ps)</th>
                <th style={{ minWidth: '88px', textAlign: 'right', padding: '0.5rem 0.45rem', whiteSpace: 'nowrap' }}>Cash (₹)</th>
                <th style={{ minWidth: '88px', textAlign: 'right', padding: '0.5rem 0.45rem', whiteSpace: 'nowrap' }}>GPay (₹)</th>
                <th style={{ minWidth: '90px', textAlign: 'right', padding: '0.5rem 0.65rem', whiteSpace: 'nowrap' }}>Bill Total</th>
                <th style={{ minWidth: '95px', textAlign: 'right', padding: '0.5rem 0.65rem', whiteSpace: 'nowrap' }} title="Total Balance = Prev. Due + Today's Bill - Today's Payments">Balance</th>
                <th style={{ width: '90px', minWidth: '85px', textAlign: 'center', padding: '0.5rem 0.45rem' }}>Status</th>
                <th style={{ width: '44px', minWidth: '40px', textAlign: 'center', padding: '0.5rem 0.35rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading || ordersLoading ? (
                <tr>
                  <td colSpan={12} style={{ padding: '3rem', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 0.5rem' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Loading orders for {orderDate}...
                    </span>
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ maxWidth: '420px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                      <Store size={40} color="var(--primary)" style={{ opacity: 0.8 }} />
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {customers.length === 0 ? 'No Customer Shops in Database' : 'No Shops Found'}
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                        {customers.length === 0
                          ? 'All sample data has been removed. Register your first shop to start entering real daily wholesale orders.'
                          : 'No shops match your current search query or route filter.'}
                      </p>
                      {customers.length === 0 && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setIsNewCustModalOpen(true)}
                          style={{ marginTop: '0.4rem', padding: '0.45rem 1.25rem', fontWeight: 700 }}
                        >
                          <UserPlus size={16} />
                          <span>+ Register First Shop</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, index) => {
                  const fin = getRowFinancials(row);
                  const isRowActive = fin.hasOrder || fin.cash > 0 || fin.gpay > 0;

                  return (
                    <tr
                      key={row.rowId}
                      onClick={() => {
                        if (isWhatsAppEnabled && row.customerId) handleSelectCustomerForWhatsApp(row.customerId);
                      }}
                      style={{
                        cursor: (isWhatsAppEnabled && row.customerId) ? 'pointer' : 'default',
                        background:
                          (isWhatsAppEnabled && activeCustomer?.id === row.customerId)
                            ? 'rgba(16, 185, 129, 0.12)'
                            : row.orderSource === 'CUSTOMER_LINK'
                            ? '#f0fdf4'
                            : row.status === 'SAVED'
                            ? 'var(--success-bg)'
                            : row.status === 'ERROR'
                            ? 'var(--danger-bg)'
                            : isRowActive
                            ? '#f8fafc'
                            : undefined,
                        borderLeft:
                          (isWhatsAppEnabled && activeCustomer?.id === row.customerId)
                            ? '4px solid #059669'
                            : row.orderSource === 'CUSTOMER_LINK'
                            ? '4px solid #10b981'
                            : undefined,
                      }}
                    >
                      {/* Index */}
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.76rem', padding: '0.35rem 0.25rem' }}>
                        {index + 1}
                      </td>

                      {/* Shop Name */}
                      <td style={{ padding: '0.4rem 0.65rem', minWidth: '180px', maxWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.86rem', lineHeight: 1.25, wordBreak: 'break-word' }}>
                              {row.customerName || 'Walk-in Customer'}
                            </div>
                            {isWhatsAppEnabled && activeCustomer?.id === row.customerId && (
                              <span
                                title="Active in WhatsApp panel"
                                style={{
                                  fontSize: '0.64rem',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '0.08rem 0.35rem',
                                  borderRadius: '4px',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  border: '1px solid #86efac',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                💬 WhatsApp
                              </span>
                            )}
                          </div>
                          {row.customerId && isSelfOrderEnabled && (
                            <a
                              href={`/customer/${row.customerId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Customer Self-Order Screen"
                              style={{
                                color: '#059669',
                                fontSize: '0.67rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.15rem',
                                textDecoration: 'none',
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                padding: '0.08rem 0.35rem',
                                borderRadius: '4px',
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <ExternalLink size={10} />
                              <span>Self-Order</span>
                            </a>
                          )}
                        </div>
                        {row.orderSource === 'CUSTOMER_LINK' && (
                          <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span
                              className="badge badge-success"
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.12rem 0.45rem',
                                background: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #86efac',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Smartphone size={10} />
                              <span>Customer Self-Order</span>
                            </span>

                            {unlockedSelfOrderIds.has(row.rowId) ? (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '0.12rem 0.45rem',
                                  background: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Edit size={10} />
                                <span>Unlocked</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelfOrderModalRow(row);
                                  setSelfOrderPendingField('kubbus');
                                }}
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '0.12rem 0.45rem',
                                  background: '#ffffff',
                                  color: '#047857',
                                  border: '1px solid #10b981',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                  whiteSpace: 'nowrap',
                                }}
                                title="Click to unlock and edit this customer self-order"
                              >
                                <Edit size={10} />
                                <span>Edit Order</span>
                              </button>
                            )}
                          </div>
                        )}
                        {row.customerOwner && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.1, marginTop: '0.15rem' }}>
                            {row.customerOwner}
                          </div>
                        )}
                      </td>

                      {/* Route & Driver Badge */}
                      <td style={{ padding: '0.4rem 0.65rem', minWidth: '120px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '0.12rem 0.45rem', alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>
                            {row.customerRoute || 'Pandikkad'}
                          </span>
                          {row.driverName && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: autoConfirmDriver ? '#047857' : 'var(--text-muted)',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap',
                              }}
                              title={`Driver assigned for delivery: ${row.driverName}`}
                            >
                              <Truck size={11} />
                              {row.driverName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Previous Due */}
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          padding: '0.4rem 0.65rem',
                          minWidth: '85px',
                          whiteSpace: 'nowrap',
                          color: parseFloat(row.customerBalance || '0') > 0 ? '#dc2626' : 'var(--text-secondary)',
                        }}
                      >
                        {formatCurrency(row.customerBalance || '0')}
                      </td>

                      {/* Kubbus Input */}
                      <td style={{ textAlign: 'right', padding: '0.25rem 0.45rem', minWidth: '88px' }}>
                        <input
                          ref={(el) => {
                            inputRefs.current[`${index}_kubbus`] = el;
                          }}
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          className="form-input"
                          value={row.kubbusQty}
                          readOnly={
                            !dayStatus?.is_opened ||
                            (row.status === 'LOCKED' && !unlockedSelfOrderIds.has(row.rowId)) ||
                            (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId))
                          }
                          onClick={() => {
                            if (!dayStatus?.is_opened) {
                              setIsOpenDayModalOpen(true);
                              return;
                            }
                            if (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId)) {
                              setSelfOrderModalRow(row);
                              setSelfOrderPendingField('kubbus');
                            }
                          }}
                          onFocus={() => {
                            if (!dayStatus?.is_opened) {
                              setIsOpenDayModalOpen(true);
                              return;
                            }
                            if (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId)) {
                              setSelfOrderModalRow(row);
                              setSelfOrderPendingField('kubbus');
                              return;
                            }
                            if (row.customerId) fetchCustomerPricing(row.customerId);
                          }}
                          onChange={(e) => handleCellChange(row.rowId, 'kubbusQty', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'kubbus')}
                          style={{
                            width: '78px',
                            height: '32px',
                            textAlign: 'right',
                            fontWeight: 800,
                            padding: '0.2rem 0.4rem',
                            fontSize: '0.88rem',
                            display: 'inline-block',
                            cursor: (
                              !dayStatus?.is_opened ||
                              (row.status === 'LOCKED' && !unlockedSelfOrderIds.has(row.rowId)) ||
                              (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId))
                            ) ? 'pointer' : 'text',
                            borderColor: row.kubbusQty ? '#f59e0b' : undefined,
                            backgroundColor: (
                              !dayStatus?.is_opened ||
                              (row.status === 'LOCKED' && !unlockedSelfOrderIds.has(row.rowId)) ||
                              (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId))
                            ) ? '#f9fafb' : row.kubbusQty ? '#fffbeb' : undefined,
                          }}
                          title={
                            !dayStatus?.is_opened
                              ? 'Business Day is not opened. Click to open day first.'
                              : (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId))
                              ? 'Customer Self-Order. Click to unlock and edit.'
                              : row.status === 'LOCKED'
                              ? 'Order is locked and cannot be edited. Use Reopen to modify.'
                              : undefined
                          }
                        />
                      </td>

                      {/* Romali Roti Input */}
                      <td style={{ textAlign: 'right', padding: '0.25rem 0.45rem', minWidth: '88px' }}>
                        <input
                          ref={(el) => {
                            inputRefs.current[`${index}_romali`] = el;
                          }}
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          className="form-input"
                          value={row.romaliQty}
                          readOnly={
                            !dayStatus?.is_opened ||
                            (row.status === 'LOCKED' && !unlockedSelfOrderIds.has(row.rowId)) ||
                            (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId))
                          }
                          onClick={() => {
                            if (!dayStatus?.is_opened) {
                              setIsOpenDayModalOpen(true);
                              return;
                            }
                            if (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId)) {
                              setSelfOrderModalRow(row);
                              setSelfOrderPendingField('romali');
                            }
                          }}
                          onFocus={() => {
                            if (!dayStatus?.is_opened) {
                              setIsOpenDayModalOpen(true);
                              return;
                            }
                            if (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId)) {
                              setSelfOrderModalRow(row);
                              setSelfOrderPendingField('romali');
                              return;
                            }
                            if (row.customerId) fetchCustomerPricing(row.customerId);
                          }}
                          onChange={(e) => handleCellChange(row.rowId, 'romaliQty', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'romali')}
                          style={{
                            width: '78px',
                            height: '32px',
                            textAlign: 'right',
                            fontWeight: 800,
                            padding: '0.2rem 0.4rem',
                            fontSize: '0.88rem',
                            display: 'inline-block',
                            cursor: (
                              !dayStatus?.is_opened ||
                              (row.status === 'LOCKED' && !unlockedSelfOrderIds.has(row.rowId)) ||
                              (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId))
                            ) ? 'pointer' : 'text',
                            borderColor: row.romaliQty ? '#f97316' : undefined,
                            backgroundColor: (
                              !dayStatus?.is_opened ||
                              (row.status === 'LOCKED' && !unlockedSelfOrderIds.has(row.rowId)) ||
                              (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId))
                            ) ? '#f9fafb' : row.romaliQty ? '#fff7ed' : undefined,
                          }}
                          title={
                            !dayStatus?.is_opened
                              ? 'Business Day is not opened. Click to open day first.'
                              : (row.orderSource === 'CUSTOMER_LINK' && !unlockedSelfOrderIds.has(row.rowId))
                              ? 'Customer Self-Order. Click to unlock and edit.'
                              : row.status === 'LOCKED'
                              ? 'Order is locked and cannot be edited. Use Reopen to modify.'
                              : undefined
                          }
                        />
                      </td>

                      {/* Cash Input */}
                      <td style={{ textAlign: 'right', padding: '0.25rem 0.45rem', minWidth: '88px' }}>
                        <input
                          ref={(el) => {
                            inputRefs.current[`${index}_cash`] = el;
                          }}
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          className="form-input"
                          value={row.cashAmount}
                          readOnly={!dayStatus?.is_opened}
                          onClick={() => {
                            if (!dayStatus?.is_opened) setIsOpenDayModalOpen(true);
                          }}
                          onFocus={() => {
                            if (!dayStatus?.is_opened) {
                              setIsOpenDayModalOpen(true);
                              return;
                            }
                          }}
                          onChange={(e) => handleCellChange(row.rowId, 'cashAmount', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'cash')}
                          style={{
                            width: '78px',
                            height: '32px',
                            textAlign: 'right',
                            fontWeight: 800,
                            padding: '0.2rem 0.4rem',
                            fontSize: '0.86rem',
                            display: 'inline-block',
                            cursor: !dayStatus?.is_opened ? 'pointer' : 'text',
                            borderColor: row.cashAmount ? '#10b981' : undefined,
                            backgroundColor: !dayStatus?.is_opened ? '#f9fafb' : undefined,
                          }}
                          title={!dayStatus?.is_opened ? 'Business Day is not opened. Click to open day first.' : undefined}
                        />
                      </td>

                      {/* GPay Input */}
                      <td style={{ textAlign: 'right', padding: '0.25rem 0.45rem', minWidth: '88px' }}>
                        <input
                          ref={(el) => {
                            inputRefs.current[`${index}_gpay`] = el;
                          }}
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          className="form-input"
                          value={row.gpayAmount}
                          readOnly={!dayStatus?.is_opened}
                          onClick={() => {
                            if (!dayStatus?.is_opened) setIsOpenDayModalOpen(true);
                          }}
                          onFocus={() => {
                            if (!dayStatus?.is_opened) {
                              setIsOpenDayModalOpen(true);
                              return;
                            }
                          }}
                          onChange={(e) => handleCellChange(row.rowId, 'gpayAmount', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'gpay')}
                          style={{
                            width: '78px',
                            height: '32px',
                            textAlign: 'right',
                            fontWeight: 800,
                            padding: '0.2rem 0.4rem',
                            fontSize: '0.86rem',
                            display: 'inline-block',
                            cursor: !dayStatus?.is_opened ? 'pointer' : 'text',
                            borderColor: row.gpayAmount ? '#dc2626' : undefined,
                            backgroundColor: !dayStatus?.is_opened ? '#f9fafb' : undefined,
                          }}
                          title={!dayStatus?.is_opened ? 'Business Day is not opened. Click to open day first.' : undefined}
                        />
                      </td>

                      {/* Bill Total */}
                      <td
                        style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626', fontSize: '0.92rem', padding: '0.4rem 0.65rem', minWidth: '90px', whiteSpace: 'nowrap' }}
                        title={`Bill: ${formatCurrency(fin.rowTotal)}`}
                      >
                        <div>{formatCurrency(fin.rowTotal)}</div>
                      </td>

                      {/* Balance (Prev. Due + Bill - Paid) */}
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          padding: '0.4rem 0.65rem',
                          minWidth: '95px',
                          whiteSpace: 'nowrap',
                        }}
                        title={`Prev Due: ${formatCurrency(fin.prevDue)} + Bill: ${formatCurrency(fin.rowTotal)} - Paid: ${formatCurrency(fin.rowPaid)} = ${formatCurrency(fin.rowBalance)}`}
                      >
                        {(fin.prevDue > 0 || fin.rowTotal > 0) && fin.rowBalance === 0 ? (
                          <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                            ✓ Cleared
                          </span>
                        ) : fin.rowBalance < 0 ? (
                          <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }} title="Advance Credit">
                            Adv {formatCurrency(Math.abs(fin.rowBalance))}
                          </span>
                        ) : fin.rowBalance > 0 ? (
                          <span style={{ color: '#dc2626', fontWeight: 800 }}>
                            {formatCurrency(fin.rowBalance)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>₹0.00</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center', padding: '0.35rem 0.35rem' }}>
                        {row.orderSource === 'CUSTOMER_LINK' ? (
                          unlockedSelfOrderIds.has(row.rowId) ? (
                            <span
                              className="badge badge-warning"
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.15rem 0.45rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                fontWeight: 700,
                              }}
                              title="Customer Self-Order unlocked for editing"
                            >
                              <Edit size={11} />
                              <span>Editing</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelfOrderModalRow(row);
                                setSelfOrderPendingField('kubbus');
                              }}
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.15rem 0.45rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title={`Online Self-Order #${row.orderNumber || ''} placed by customer. Click to edit.`}
                            >
                              <Smartphone size={11} />
                              <span>Self-Order</span>
                            </button>
                          )
                        ) : row.status === 'SAVED' ? (
                          <span
                            className="badge badge-success"
                            style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title={`Order #${row.orderNumber || ''} (Saved in Database)`}
                          >
                            <CheckCheck size={12} strokeWidth={2.5} />
                            <span>{row.orderNumber?.split('-').slice(-1)[0] || 'Saved'}</span>
                          </span>
                        ) : row.status === 'SAVING' ? (
                          <div className="spinner" style={{ width: 13, height: 13, margin: '0 auto' }} />
                        ) : row.status === 'ERROR' ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }} title={row.errorMessage}>
                            Error
                          </span>
                        ) : isRowActive ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>Ready</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      {/* Action: Remove Row Button */}
                      <td style={{ textAlign: 'center', padding: '0.35rem 0.25rem' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.rowId)}
                          title={`Remove ${row.customerName || 'row'} from list`}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            color: 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#dc2626';
                            e.currentTarget.style.backgroundColor = 'var(--danger-bg)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Controls Bar (Permanently docked inside table container) */}
        <div
          style={{
            padding: '0.45rem 1rem',
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddCustomRow}
              style={{ height: '28px', padding: '0 0.55rem', fontSize: '0.75rem' }}
            >
              <Plus size={13} />
              <span>+ Custom Row</span>
            </button>

            {removedCount > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRestoreAllShops}
                style={{ height: '28px', padding: '0 0.55rem', fontSize: '0.75rem', color: 'var(--primary)' }}
                title="Restore all removed shops back to the spreadsheet"
              >
                <RefreshCw size={12} />
                <span>Restore Removed ({removedCount})</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetInputs}
              style={{ height: '28px', padding: '0 0.55rem', fontSize: '0.75rem' }}
              title="Reset all entered numbers"
            >
              <RotateCcw size={12} />
              <span>Clear Quantities</span>
            </button>
          </div>

          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span>
              <kbd style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                Enter
              </kbd>{' '}
              Kubbus &rarr; Romali &rarr; Next Shop
            </span>
            <span>
              <kbd style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                Tab
              </kbd>{' '}
              Move right
            </span>
            <span>
              <kbd style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                &uarr; &darr;
              </kbd>{' '}
              Move between shops
            </span>
          </div>
        </div>
      </div>
      </div>

      {/* 5. New Shop Modal */}
      {isNewCustModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              padding: '1.5rem',
              width: '100%',
              maxWidth: '500px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Store size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Register New Shop
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCustModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {newCustError && (
              <div className="alert alert-error" style={{ marginBottom: '0.75rem', fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}>
                {newCustError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Shop Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Al-Madina Bakery"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    style={{ height: '34px', padding: '0.25rem 0.5rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Proprietor / Contact</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rasheed"
                    value={newCustOwner}
                    onChange={(e) => setNewCustOwner(e.target.value)}
                    style={{ height: '34px', padding: '0.25rem 0.5rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    style={{ height: '34px', padding: '0.25rem 0.5rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Assigned Route *</label>
                  {routes.length === 0 ? (
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <input
                        type="text"
                        placeholder="Route name (e.g. Town)"
                        className="form-input"
                        value={quickRouteName}
                        onChange={(e) => setQuickRouteName(e.target.value)}
                        style={{ height: '34px', fontSize: '0.82rem', flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleQuickCreateRoute}
                        disabled={!quickRouteName.trim() || isCreatingRoute}
                        style={{ height: '34px', whiteSpace: 'nowrap' }}
                      >
                        {isCreatingRoute ? 'Adding...' : '+ Route'}
                      </button>
                    </div>
                  ) : (
                    <select
                      required
                      className="form-select"
                      value={newCustRoute}
                      onChange={(e) => setNewCustRoute(e.target.value)}
                      style={{ height: '34px', padding: '0.25rem 0.5rem' }}
                    >
                      <option value="">Select Route</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Shop Address / Location *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Near Bus Stand, Main Road"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  style={{ height: '34px', padding: '0.25rem 0.5rem' }}
                />
              </div>

              {/* Wholesale Rates */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Agreed Wholesale Rates (₹)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.35rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>
                      Kubbus Rate (₹/ps)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={newCustKubbusPrice}
                      onChange={(e) => setNewCustKubbusPrice(e.target.value)}
                      style={{ height: '32px', padding: '0.2rem 0.45rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>
                      Romali Rate (₹/ps)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={newCustRomaliPrice}
                      onChange={(e) => setNewCustRomaliPrice(e.target.value)}
                      style={{ height: '32px', padding: '0.2rem 0.45rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsNewCustModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={newCustSubmitting}
                >
                  {newCustSubmitting ? 'Saving...' : 'Add to Spreadsheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day Open Modal */}
      {isOpenDayModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#dc2626', marginBottom: '0.5rem' }}>
              <Sunrise size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Open Business Day ({orderDate})
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Formally open today's business day and record the register cash float before entering wholesale orders.
            </p>

            {dayOpenError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}>
                <AlertCircle size={16} />
                <span>{dayOpenError}</span>
              </div>
            )}

            <form onSubmit={handleOpenDay}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Opening Cash Float in Register (₹) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-muted)' }}>₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="form-input"
                    style={{ paddingLeft: '1.75rem', fontSize: '1.15rem', fontWeight: 800 }}
                    placeholder="500.00"
                    value={openingCashInput}
                    onChange={(e) => setOpeningCashInput(e.target.value)}
                    autoFocus
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Petty cash available for change/counter expenses at start of day.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Opening Notes / Shift Remarks (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Morning float verified by Manager, counter cash ready"
                  value={openingNotesInput}
                  onChange={(e) => setOpeningNotesInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsOpenDayModalOpen(false)}
                  disabled={submittingDayOpen}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingDayOpen || !openingCashInput}
                  style={{ background: '#dc2626', borderColor: '#dc2626', fontWeight: 800 }}
                >
                  <Sun size={16} />
                  <span>{submittingDayOpen ? 'Opening Day...' : 'Confirm & Open Day'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Self-Order Edit Confirmation Popup Modal */}
      {selfOrderModalRow && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d97706',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Edit Customer Self-Order?
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Smartphone size={12} /> Placed Online by Customer
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  setSelfOrderModalRow(null);
                  setSelfOrderPendingField(null);
                }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Customer / Shop:</span>
                <span style={{ fontWeight: 700 }}>{selfOrderModalRow.customerName}</span>
              </div>
              {selfOrderModalRow.orderNumber && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Order ID:</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>#{selfOrderModalRow.orderNumber}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Kubbus Ordered:</span>
                <span style={{ fontWeight: 800, color: '#f59e0b' }}>
                  {selfOrderModalRow.kubbusQty ? `${selfOrderModalRow.kubbusQty} pkts` : '0 pkts'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Romali Ordered:</span>
                <span style={{ fontWeight: 800, color: '#f97316' }}>
                  {selfOrderModalRow.romaliQty ? `${selfOrderModalRow.romaliQty} pkts` : '0 pkts'}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '1.25rem' }}>
              This order was submitted directly online by the customer. Changing these quantities will overwrite what the client requested.
              <br /><br />
              Do you want to unlock this row for manual editing?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSelfOrderModalRow(null);
                  setSelfOrderPendingField(null);
                }}
              >
                Cancel (Keep Original)
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (!selfOrderModalRow) return;
                  const rowId = selfOrderModalRow.rowId;
                  const pendingField = selfOrderPendingField || 'kubbus';

                  // Mark row as unlocked
                  setUnlockedSelfOrderIds((prev) => new Set(prev).add(rowId));

                  // Set row status to IDLE so changes can be saved
                  setRows((prev) =>
                    prev.map((r) => (r.rowId === rowId ? { ...r, status: 'IDLE' } : r))
                  );

                  setSuccessBanner(`Self-Order for "${selfOrderModalRow.customerName}" is unlocked for editing. Make your changes and click "Save Wholesale Orders" when done.`);
                  setTimeout(() => setSuccessBanner(null), 6000);

                  const targetIndex = visibleRows.findIndex((r) => r.rowId === rowId);
                  setSelfOrderModalRow(null);
                  setSelfOrderPendingField(null);

                  if (targetIndex >= 0) {
                    setTimeout(() => focusCell(targetIndex, pendingField), 120);
                  }
                }}
                style={{
                  background: '#059669',
                  borderColor: '#059669',
                  color: '#ffffff',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Edit size={15} />
                <span>Unlock & Edit Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Mobile WhatsApp Panel Modal Drawer */}
      {isWhatsAppEnabled && mobileWhatsAppOpen && (
        <div
          className="billing-whatsapp-mobile-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileWhatsAppOpen(false);
          }}
        >
          <div style={{ width: '100%', maxWidth: '385px', height: '620px', maxHeight: '90vh' }}>
            <RealWhatsAppWebView
              customer={activeCustomer}
              targetCustomerId={selectedCustomerId}
              openChatTimestamp={whatsAppNavToken}
              allCustomers={customers}
              orderRows={rows}
              onSelectCustomer={(customerId) => handleSelectCustomerForWhatsApp(customerId)}
              onApplyQuantities={handleApplyWhatsAppOrder}
              onClose={() => setMobileWhatsAppOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Floating Quick Access WhatsApp Button when Side Panel is Hidden */}
      {isWhatsAppEnabled && (!whatsappVisible || workspaceMode === 'billing_only') && !mobileWhatsAppOpen && (
        <button
          type="button"
          onClick={() => {
            setWorkspaceMode('split');
            setWhatsappVisible(true);
          }}
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            left: '16.5rem',
            zIndex: 90,
            background: '#008069',
            color: '#ffffff',
            border: 'none',
            borderRadius: '24px',
            padding: '0.5rem 1.1rem',
            fontWeight: 800,
            fontSize: '0.82rem',
            boxShadow: '0 4px 16px rgba(0, 128, 105, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
          }}
          title="Open WhatsApp Panel (Split Screen)"
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#25d366',
              boxShadow: '0 0 8px #25d366',
            }}
          />
          <MessageCircle size={17} />
          <span>Open WhatsApp Feed</span>
        </button>
      )}
    </div>
  );
};

