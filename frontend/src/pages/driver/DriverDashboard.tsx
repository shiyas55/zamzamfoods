import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { deliveryService } from '../../services/deliveryService';
import { reportService } from '../../services/reportService';
import { paymentService } from '../../services/paymentService';
import { Delivery, DashboardSummary, PaymentMethod } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { openWhatsApp, generatePaymentReceiptMessage } from '../../utils/whatsappUtils';
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  HandCoins,
  RefreshCw,
  X,
  XCircle,
  Phone,
  Navigation,
  ChevronDown,
  ChevronUp,
  Receipt,
  Search,
  Check,
  Banknote,
  QrCode,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  Sparkles,
  Sunrise,
  Sun,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  Package,
  AlertCircle,
  ShoppingBag,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { driverShiftService, DriverShift } from '../../services/driverShiftService';
import { useSettings } from '../../context/SettingsContext';

const NOT_DELIVERED_REASONS = [
  'Shop Closed',
  'Owner Not Available',
  'Customer Refused Order',
  'Stock Already Sufficient',
  'Damaged In Transit',
  'Rescheduled to Tomorrow',
  'Other Reason',
];

export const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isWhatsAppEnabled } = useSettings();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<{ total_collected: string; cash_total: string; upi_total: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED' | 'NOT_DELIVERED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Driver Shift (Day Open / Day Close)
  const [shift, setShift] = useState<DriverShift | null>(null);

  // Day Open State
  const [checkKubbus, setCheckKubbus] = useState(true);
  const [checkRomali, setCheckRomali] = useState(true);
  const [kubbusTakeInput, setKubbusTakeInput] = useState('');
  const [romaliTakeInput, setRomaliTakeInput] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [submittingOpenDay, setSubmittingOpenDay] = useState(false);
  const [openDayError, setOpenDayError] = useState<string | null>(null);

  // Day Close Modal State
  const [isDayCloseModalOpen, setIsDayCloseModalOpen] = useState(false);
  const [kubbusReturnInput, setKubbusReturnInput] = useState('0');
  const [romaliReturnInput, setRomaliReturnInput] = useState('0');
  const [closeNotes, setCloseNotes] = useState('');
  const [submittingCloseDay, setSubmittingCloseDay] = useState(false);
  const [closeDayError, setCloseDayError] = useState<string | null>(null);

  // Expanded card tracking: set of delivery IDs currently expanded
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // 1. Standalone Payment Collection Modal
  const [paymentDelivery, setPaymentDelivery] = useState<Delivery | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>('CASH');
  const [collectRef, setCollectRef] = useState('');
  const [collectNotes, setCollectNotes] = useState('');

  // 2. Delivery Completion Modal
  const [completeDelivery, setCompleteDelivery] = useState<Delivery | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [includePayment, setIncludePayment] = useState(false);
  const [completePayAmount, setCompletePayAmount] = useState('');
  const [completePayMethod, setCompletePayMethod] = useState<PaymentMethod>('CASH');
  const [completePayRef, setCompletePayRef] = useState('');

  // 3. Not Delivered / Skip Modal
  const [skipDelivery, setSkipDelivery] = useState<Delivery | null>(null);
  const [skipReason, setSkipReason] = useState(NOT_DELIVERED_REASONS[0]);
  const [skipNotes, setSkipNotes] = useState('');

  // 4. Payment Success Modal (WhatsApp share)
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    customerName: string;
    customerPhone?: string;
    paymentNumber: string;
    amount: string;
    paymentMethod: string;
    remainingBalance: string;
    date: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Helper to extract Kubbus and Romali quantities in pieces (ps) for any delivery
  const getStopQuantities = (d: Delivery) => {
    let kubbus = 0;
    let romali = 0;
    const items = d.order_details?.items || [];
    for (const it of items) {
      const name = (it.product_details?.name || '').toLowerCase();
      const code = (it.product_details?.code || (it.product_details as any)?.sku || '').toLowerCase();
      if (name.includes('kub') || code.includes('kub')) {
        kubbus += Number(it.quantity) || 0;
      } else if (name.includes('rom') || code.includes('rom')) {
        romali += Number(it.quantity) || 0;
      }
    }
    return { kubbus, romali };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [delList, sumData, paySum, shiftData] = await Promise.all([
        deliveryService.getDeliveries(),
        reportService.getDashboardSummary(),
        paymentService.getDailySummary(),
        driverShiftService.getTodayShift().catch((err) => {
          console.warn('Driver shift status not loaded:', err);
          return null;
        }),
      ]);
      setDeliveries(delList);
      setSummary(sumData);
      setPaymentSummary(paySum);
      if (shiftData) {
        setShift(shiftData);
        if (!shiftData.is_opened) {
          const kQty =
            shiftData.metrics?.assigned_kubbus ||
            delList.reduce((acc: number, d: Delivery) => acc + getStopQuantities(d).kubbus, 0);
          const rQty =
            shiftData.metrics?.assigned_romali ||
            delList.reduce((acc: number, d: Delivery) => acc + getStopQuantities(d).romali, 0);
          setKubbusTakeInput(String(kQty));
          setRomaliTakeInput(String(rQty));
        }
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-sync deliveries in background every 25 seconds
    const interval = setInterval(() => {
      deliveryService.getDeliveries().then((delList) => {
        setDeliveries(delList);
      }).catch((err) => {
        console.warn('Background delivery refresh failed:', err);
      });
    }, 25000);

    const handleFocus = () => {
      deliveryService.getDeliveries().then((delList) => {
        setDeliveries(delList);
      }).catch(() => {});
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenMaps = (address?: string) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Financial calculations helper for any delivery stop
  const getDeliveryFinancials = (d: Delivery) => {
    const todayAmount = parseFloat(d.order_details?.total_amount || '0');
    const customerCurrentDebt = parseFloat(d.order_details?.customer_details?.current_balance || '0');

    let previousOutstanding = 0;
    let totalDue = 0;

    if (d.status === 'DELIVERED') {
      // Order amount was already posted to current_balance
      previousOutstanding = Math.max(0, customerCurrentDebt - todayAmount);
      totalDue = customerCurrentDebt;
    } else {
      // Order is pending or not delivered; current_balance is previous credit
      previousOutstanding = customerCurrentDebt;
      totalDue = previousOutstanding + todayAmount;
    }

    return {
      previousOutstanding,
      todayAmount,
      totalDue,
    };
  };

  // Open standalone payment collection modal
  const openCollectPaymentModal = (d: Delivery) => {
    const fin = getDeliveryFinancials(d);
    setPaymentDelivery(d);
    setCollectAmount(fin.todayAmount > 0 ? fin.todayAmount.toString() : fin.totalDue.toString());
    setCollectMethod('CASH');
    setCollectRef('');
    setCollectNotes('');
    setActionError(null);
  };

  // Submit standalone payment collection
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDelivery) return;

    const amountNum = parseFloat(collectAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);

      const customerId = paymentDelivery.order_details?.customer || '';
      const orderId = paymentDelivery.order;
      const fin = getDeliveryFinancials(paymentDelivery);
      const remainingDebt = Math.max(0, fin.totalDue - amountNum).toFixed(2);

      const recorded = await paymentService.recordPayment({
        customer_id: customerId,
        amount: amountNum.toFixed(2),
        payment_method: collectMethod,
        order_id: orderId,
        reference_number: collectRef.trim() || undefined,
        notes: collectNotes.trim() || `Collected for shop ${paymentDelivery.order_details?.customer_details?.name}`,
      });

      setPaymentDelivery(null);
      setPaymentSuccessData({
        customerName: paymentDelivery.order_details?.customer_details?.name || 'Customer Shop',
        customerPhone: paymentDelivery.order_details?.customer_details?.phone,
        paymentNumber: recorded.payment_number,
        amount: amountNum.toFixed(2),
        paymentMethod: collectMethod,
        remainingBalance: remainingDebt,
        date: new Date().toLocaleDateString(),
      });

      fetchData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Open complete delivery modal
  const openCompleteModal = (d: Delivery) => {
    const fin = getDeliveryFinancials(d);
    setCompleteDelivery(d);
    setRecipientName(d.order_details?.customer_details?.owner_name || 'Staff');
    setDeliveryNotes('');
    setIncludePayment(false);
    setCompletePayAmount(fin.todayAmount.toString());
    setCompletePayMethod('CASH');
    setCompletePayRef('');
    setActionError(null);
  };

  // Submit delivery completion
  const handleCompleteDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeDelivery) return;

    if (!recipientName.trim()) {
      setActionError('Recipient / Staff name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);

      // 1. Complete delivery in backend
      await deliveryService.completeDelivery(completeDelivery.id, {
        recipient_name: recipientName.trim(),
        notes: deliveryNotes.trim() || undefined,
      });

      // 2. If payment included
      if (includePayment && parseFloat(completePayAmount) > 0) {
        const payNum = parseFloat(completePayAmount);
        const fin = getDeliveryFinancials(completeDelivery);
        const remaining = Math.max(0, fin.totalDue - payNum).toFixed(2);

        const recordedPay = await paymentService.recordPayment({
          customer_id: completeDelivery.order_details?.customer || '',
          order_id: completeDelivery.order,
          amount: payNum.toFixed(2),
          payment_method: completePayMethod,
          reference_number: completePayRef.trim() || undefined,
          notes: `Collected upon delivery #${completeDelivery.delivery_number}`,
        });

        setPaymentSuccessData({
          customerName: completeDelivery.order_details?.customer_details?.name || 'Customer Shop',
          customerPhone: completeDelivery.order_details?.customer_details?.phone,
          paymentNumber: recordedPay.payment_number,
          amount: payNum.toFixed(2),
          paymentMethod: completePayMethod,
          remainingBalance: remaining,
          date: new Date().toLocaleDateString(),
        });
      }

      setCompleteDelivery(null);
      fetchData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to complete delivery.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Skip / Not Delivered modal
  const openSkipModal = (d: Delivery) => {
    setSkipDelivery(d);
    setSkipReason(NOT_DELIVERED_REASONS[0]);
    setSkipNotes('');
    setActionError(null);
  };

  // Submit Skip / Not Delivered
  const handleConfirmSkip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skipDelivery) return;

    try {
      setSubmitting(true);
      setActionError(null);

      await deliveryService.markNotDelivered(skipDelivery.id, {
        failed_reason: skipReason,
        notes: skipNotes.trim() || undefined,
      });

      setSkipDelivery(null);
      fetchData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to record stop status.');
    } finally {
      setSubmitting(false);
    }
  };

  // Stock calculations across route deliveries
  const totalAssignedKubbus = deliveries.reduce((acc, d) => acc + getStopQuantities(d).kubbus, 0);
  const totalAssignedRomali = deliveries.reduce((acc, d) => acc + getStopQuantities(d).romali, 0);

  const deliveredKubbus = deliveries
    .filter((d) => d.status === 'DELIVERED')
    .reduce((acc, d) => acc + getStopQuantities(d).kubbus, 0);
  const deliveredRomali = deliveries
    .filter((d) => d.status === 'DELIVERED')
    .reduce((acc, d) => acc + getStopQuantities(d).romali, 0);

  const allocatedKubbus = shift?.metrics?.assigned_kubbus || totalAssignedKubbus;
  const allocatedRomali = shift?.metrics?.assigned_romali || totalAssignedRomali;

  const currentKubbusLoaded = shift?.is_opened
    ? shift.kubbus_loaded
    : (parseInt(kubbusTakeInput, 10) || allocatedKubbus);
  const currentRomaliLoaded = shift?.is_opened
    ? shift.romali_loaded
    : (parseInt(romaliTakeInput, 10) || allocatedRomali);

  const remainingKubbusInVan = Math.max(0, currentKubbusLoaded - deliveredKubbus);
  const remainingRomaliInVan = Math.max(0, currentRomaliLoaded - deliveredRomali);

  // Financial metrics for shift handover
  const shiftCash = parseFloat(paymentSummary?.cash_total || shift?.cash_collected || '0');
  const shiftExpenses = parseFloat(shift?.expenses_total || '0');
  const shiftNetHandover = Math.max(0, shiftCash - shiftExpenses);

  // Handle Day Opening Submission
  const handleOpenDay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkKubbus || !checkRomali) {
      setOpenDayError('Please verify and check both Kubbus and Romali checkboxes before opening shift.');
      return;
    }
    const kLoaded = parseInt(kubbusTakeInput, 10);
    const rLoaded = parseInt(romaliTakeInput, 10);
    if (isNaN(kLoaded) || kLoaded < 0 || isNaN(rLoaded) || rLoaded < 0) {
      setOpenDayError('Please enter valid quantities for loaded stock.');
      return;
    }

    try {
      setSubmittingOpenDay(true);
      setOpenDayError(null);
      const updatedShift = await driverShiftService.openDay({
        kubbus_loaded: kLoaded,
        romali_loaded: rLoaded,
        opening_notes: openNotes.trim() || undefined,
      });
      setShift(updatedShift);
    } catch (err: any) {
      setOpenDayError(err.response?.data?.error || err.message || 'Failed to open day shift.');
    } finally {
      setSubmittingOpenDay(false);
    }
  };

  // Open Day Close Modal
  const openCloseDayModal = () => {
    setKubbusReturnInput(String(remainingKubbusInVan));
    setRomaliReturnInput(String(remainingRomaliInVan));
    setCloseNotes('');
    setCloseDayError(null);
    setIsDayCloseModalOpen(true);
  };

  // Confirm Day Close Submission
  const handleConfirmCloseDay = async (e: React.FormEvent) => {
    e.preventDefault();
    const kRet = parseInt(kubbusReturnInput, 10);
    const rRet = parseInt(romaliReturnInput, 10);
    if (isNaN(kRet) || kRet < 0 || isNaN(rRet) || rRet < 0) {
      setCloseDayError('Please enter valid returned quantities (0 or more).');
      return;
    }

    try {
      setSubmittingCloseDay(true);
      setCloseDayError(null);
      const updatedShift = await driverShiftService.closeDay({
        kubbus_returned: kRet,
        romali_returned: rRet,
        closing_notes: closeNotes.trim() || undefined,
      });
      setShift(updatedShift);
      setIsDayCloseModalOpen(false);
      fetchData();
    } catch (err: any) {
      setCloseDayError(err.response?.data?.error || err.message || 'Failed to close day shift.');
    } finally {
      setSubmittingCloseDay(false);
    }
  };

  // Filtered deliveries
  const totalStops = deliveries.length;
  const deliveredCount = deliveries.filter((d) => d.status === 'DELIVERED').length;
  const notDeliveredCount = deliveries.filter((d) => d.status === 'NOT_DELIVERED').length;
  const pendingCount = deliveries.filter((d) => d.status !== 'DELIVERED' && d.status !== 'NOT_DELIVERED').length;

  const filteredDeliveries = deliveries.filter((d) => {
    if (statusFilter === 'PENDING' && (d.status === 'DELIVERED' || d.status === 'NOT_DELIVERED')) return false;
    if (statusFilter === 'DELIVERED' && d.status !== 'DELIVERED') return false;
    if (statusFilter === 'NOT_DELIVERED' && d.status !== 'NOT_DELIVERED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const shopName = d.order_details?.customer_details?.name?.toLowerCase() || '';
      const address = d.order_details?.customer_details?.address?.toLowerCase() || '';
      const phone = d.order_details?.customer_details?.phone?.toLowerCase() || '';
      return shopName.includes(q) || address.includes(q) || phone.includes(q);
    }

    return true;
  });

  return (
    <div style={{ paddingBottom: '1.5rem' }}>
      {/* 1. Simple Mobile Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #dc2626 100%)',
          color: 'white',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.1rem',
          marginBottom: '0.85rem',
          boxShadow: '0 4px 14px rgba(185, 28, 28, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fef08a', fontWeight: 800 }}>
              TODAY'S ROUTE
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0.1rem 0' }}>
              {summary?.route_name || user?.assigned_route_name || 'Assigned Route'}
            </h2>
          </div>
          <button
            onClick={fetchData}
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '0.4rem 0.65rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        {/* 4 Mini Progress Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', marginTop: '0.85rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.4rem', borderRadius: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#fecaca', display: 'block' }}>TOTAL</span>
            <strong style={{ fontSize: '1.15rem' }}>{totalStops}</strong>
          </div>
          <div style={{ background: 'rgba(5, 150, 105, 0.35)', padding: '0.4rem', borderRadius: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#a7f3d0', display: 'block' }}>DONE</span>
            <strong style={{ fontSize: '1.15rem', color: '#6ee7b7' }}>{deliveredCount}</strong>
          </div>
          <div style={{ background: 'rgba(217, 119, 6, 0.35)', padding: '0.4rem', borderRadius: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#fef08a', display: 'block' }}>PENDING</span>
            <strong style={{ fontSize: '1.15rem', color: '#fde047' }}>{pendingCount}</strong>
          </div>
          <div style={{ background: 'rgba(220, 38, 38, 0.35)', padding: '0.4rem', borderRadius: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#fca5a5', display: 'block' }}>FAILED</span>
            <strong style={{ fontSize: '1.15rem', color: '#f87171' }}>{notDeliveredCount}</strong>
          </div>
        </div>

        {/* Quick Collection Snapshot: Cash & GPay */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.4rem',
            marginTop: '0.65rem',
            paddingTop: '0.65rem',
            borderTop: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div
            onClick={() => navigate('/driver/summary')}
            style={{
              background: 'rgba(0,0,0,0.22)',
              borderRadius: '8px',
              padding: '0.45rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Banknote size={15} style={{ color: '#86efac' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dcfce7', textTransform: 'uppercase' }}>
                Today Cash
              </span>
            </div>
            <strong style={{ fontSize: '0.98rem', color: '#ffffff', fontWeight: 900 }}>
              {formatCurrency(paymentSummary?.cash_total || '0')}
            </strong>
          </div>

          <div
            onClick={() => navigate('/driver/summary')}
            style={{
              background: 'rgba(0,0,0,0.22)',
              borderRadius: '8px',
              padding: '0.45rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <QrCode size={15} style={{ color: '#fef08a' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fef08a', textTransform: 'uppercase' }}>
                Today GPay
              </span>
            </div>
            <strong style={{ fontSize: '0.98rem', color: '#ffffff', fontWeight: 900 }}>
              {formatCurrency(paymentSummary?.upi_total || '0')}
            </strong>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. DAY OPEN / DAY CLOSE CONTROLS & STOCK VERIFICATION        */}
      {/* ============================================================ */}

      {/* CASE A: DAY NOT OPENED - DRIVER MUST VERIFY STOCK TO UNLOCK SHOP LIST */}
      {!shift?.is_opened && (
        <div
          style={{
            background: 'var(--surface)',
            border: '2px solid #dc2626',
            borderRadius: '12px',
            padding: '1.1rem',
            marginBottom: '1rem',
            boxShadow: '0 4px 16px rgba(220, 38, 38, 0.12)',
          }}
        >
          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#fef2f2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sunrise size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                DAY OPENING • VEHICLE STOCK TAKE
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                Verify & Take Route Stock
              </h3>
            </div>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '0.9rem', lineHeight: '1.35' }}>
            Please check the bakery stock loaded into your vehicle today. Verify piece counts (ps) and confirm to open shift and view your customer shop delivery list.
          </p>

          {openDayError && (
            <div
              style={{
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                marginBottom: '0.85rem',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{openDayError}</span>
            </div>
          )}

          {/* Side-by-side / Stacked Stock Cards for Kubbus & Romali */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.9rem' }}>
            {/* Kubbus Box */}
            <div
              style={{
                background: checkKubbus ? '#fef2f2' : '#f8fafc',
                border: checkKubbus ? '1.5px solid #f87171' : '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
                  🥖 Kubbus (ps)
                </span>
                <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                  Assigned
                </span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#991b1b', marginBottom: '0.45rem' }}>
                {allocatedKubbus} <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>ps</span>
              </div>

              {/* Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  marginBottom: '0.45rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={checkKubbus}
                  onChange={(e) => setCheckKubbus(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#dc2626' }}
                />
                <span>Take stock verified</span>
              </label>

              {/* Editable pieces taken (in case of buffer) */}
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>
                  Loaded into Van (ps):
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  style={{ height: '34px', fontSize: '0.88rem', fontWeight: 800, padding: '0.2rem 0.5rem' }}
                  value={kubbusTakeInput}
                  onChange={(e) => setKubbusTakeInput(e.target.value)}
                />
              </div>
            </div>

            {/* Romali Box */}
            <div
              style={{
                background: checkRomali ? '#fffbeb' : '#f8fafc',
                border: checkRomali ? '1.5px solid #fde68a' : '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>
                  🫓 Romali (ps)
                </span>
                <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                  Assigned
                </span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#92400e', marginBottom: '0.45rem' }}>
                {allocatedRomali} <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>ps</span>
              </div>

              {/* Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  marginBottom: '0.45rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={checkRomali}
                  onChange={(e) => setCheckRomali(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#dc2626' }}
                />
                <span>Take stock verified</span>
              </label>

              {/* Editable pieces taken (in case of buffer) */}
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>
                  Loaded into Van (ps):
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  style={{ height: '34px', fontSize: '0.88rem', fontWeight: 800, padding: '0.2rem 0.5rem' }}
                  value={romaliTakeInput}
                  onChange={(e) => setRomaliTakeInput(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Optional Opening Notes */}
          <div style={{ marginBottom: '0.9rem' }}>
            <input
              type="text"
              className="form-input"
              style={{ height: '36px', fontSize: '0.82rem' }}
              placeholder="Vehicle odometer or crate notes (optional)..."
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
            />
          </div>

          {/* Confirm Stock & Open Day Button */}
          <button
            type="button"
            className="btn btn-primary"
            style={{
              width: '100%',
              minHeight: '48px',
              fontSize: '1rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
              borderColor: '#991b1b',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            disabled={submittingOpenDay}
            onClick={() => handleOpenDay()}
          >
            <Unlock size={19} />
            <span>{submittingOpenDay ? 'Confirming Stock & Opening...' : 'Confirm Stock & Open Day (Show Shop List)'}</span>
          </button>
        </div>
      )}

      {/* LOCKED STATE BANNER: When day is not opened, shop list is protected */}
      {!shift?.is_opened && (
        <div
          style={{
            background: '#fff1f2',
            border: '2px dashed #fca5a5',
            borderRadius: '12px',
            padding: '2.5rem 1.25rem',
            textAlign: 'center',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.85rem',
            }}
          >
            <Lock size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#991b1b', margin: '0 0 0.4rem' }}>
            {totalStops} Delivery Shop Stops Locked
          </h3>
          <p style={{ color: '#7f1d1d', fontSize: '0.88rem', maxWidth: '380px', margin: '0 auto 1rem', lineHeight: '1.4' }}>
            Delivery stops and billing actions are locked until you check and confirm your vehicle stock above. Click <strong>"Confirm Stock & Open Day"</strong> to unlock your shops!
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', fontWeight: 700, borderColor: '#fca5a5', color: '#991b1b' }}
            onClick={() => {
              setCheckKubbus(true);
              setCheckRomali(true);
              handleOpenDay();
            }}
          >
            Quick 1-Tap Accept Stock & Unlock List
          </button>
        </div>
      )}

      {/* CASE B: DAY IS OPENED - SHOW ACTIVE SHIFT TRACKER OR CLOSED SUMMARY */}
      {shift?.is_opened && !shift?.is_closed && (
        <div
          style={{
            background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
            color: 'white',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            marginBottom: '0.85rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span
                style={{
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', display: 'inline-block' }} />
                DAY OPEN
              </span>
              <span style={{ fontSize: '0.74rem', color: '#a1a1aa' }}>
                Started {shift.opened_at ? formatDateTime(shift.opened_at) : 'Today'}
              </span>
            </div>

            <button
              type="button"
              onClick={openCloseDayModal}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
              }}
            >
              <Lock size={13} />
              <span>Day Closing / End Shift</span>
            </button>
          </div>

          {/* Live Van Stock Tracking */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.55rem 0.75rem', borderRadius: '8px' }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#fca5a5', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
                🥖 Kubbus Stock in Van
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, marginTop: '0.1rem' }}>
                <span style={{ color: '#ffffff' }}>{remainingKubbusInVan} ps left</span>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 500, marginLeft: '0.35rem' }}>
                  ({currentKubbusLoaded} taken • {deliveredKubbus} del.)
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.68rem', color: '#fef08a', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
                🫓 Romali Stock in Van
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, marginTop: '0.1rem' }}>
                <span style={{ color: '#ffffff' }}>{remainingRomaliInVan} ps left</span>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 500, marginLeft: '0.35rem' }}>
                  ({currentRomaliLoaded} taken • {deliveredRomali} del.)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASE C: DAY IS CLOSED */}
      {shift?.is_closed && (
        <div
          style={{
            background: '#f8fafc',
            border: '2px solid #64748b',
            borderRadius: '12px',
            padding: '0.9rem 1.1rem',
            marginBottom: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={18} color="#059669" />
              <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>DAY CLOSED & SHIFT SETTLED</strong>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {shift.closed_at ? formatDateTime(shift.closed_at) : 'Completed'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
            <span>Net Cash Handover to Counter:</span>
            <strong style={{ color: '#059669', fontSize: '1.05rem' }}>{formatCurrency(shift.net_cash_handover || '0')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: '0.2rem', color: 'var(--text-secondary)' }}>
            <span>Returned to Bakery:</span>
            <strong>{shift.kubbus_returned} ps Kubbus • {shift.romali_returned} ps Romali</strong>
          </div>
        </div>
      )}

      {/* RENDER SHOP LIST ONLY WHEN DAY IS CONFIRMED / OPENED */}
      {shift?.is_opened && (
        <>
          {/* Quick Search & Filter Tabs */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.4rem', height: '42px', fontSize: '0.9rem', borderRadius: '10px' }}
                placeholder="Search shop name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* 4 Clean Filter Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem' }}>
              {(['ALL', 'PENDING', 'DELIVERED', 'NOT_DELIVERED'] as const).map((tab) => {
                const isActive = statusFilter === tab;
                const label = tab === 'NOT_DELIVERED' ? 'FAILED' : tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    style={{
                      padding: '0.45rem 0.2rem',
                      fontSize: '0.74rem',
                      fontWeight: isActive ? 800 : 600,
                      borderRadius: '8px',
                      border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: isActive ? 'var(--primary)' : 'var(--surface)',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

      {/* 3. Delivery / Customer Cards List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : filteredDeliveries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredDeliveries.map((d) => {
            const isDelivered = d.status === 'DELIVERED';
            const isNotDelivered = d.status === 'NOT_DELIVERED';
            const customer = d.order_details?.customer_details;
            const items = d.order_details?.items || [];
            const phone = customer?.phone;
            const address = customer?.address;
            const isExpanded = Boolean(expandedCards[d.id]);
            const fin = getDeliveryFinancials(d);
            const stopQty = getStopQuantities(d);

            return (
              <div
                key={d.id}
                style={{
                  background: 'var(--surface)',
                  borderRadius: '12px',
                  border: isDelivered ? '1.5px solid #86efac' : isNotDelivered ? '1.5px solid #fca5a5' : '1.5px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}
              >
                {/* Compact Card Header: Clickable to expand */}
                <div
                  onClick={() => toggleExpand(d.id)}
                  style={{
                    padding: '0.85rem 1rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  {/* Row 1: Shop Name (PROMINENT) & Status Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h3
                      style={{
                        fontSize: '1.18rem',
                        fontWeight: 900,
                        color: 'var(--text-primary)',
                        margin: 0,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {customer?.name || 'Customer Shop'}
                    </h3>

                    <div>
                      {isDelivered ? (
                        <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                          Delivered
                        </span>
                      ) : isNotDelivered ? (
                        <span className="badge badge-danger" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                          Failed
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 1.5: Prominent Stock Required for this Stop (Kubbus & Romali in ps) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: '#fef2f2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        padding: '0.18rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      🥖 Kubbus: <strong>{stopQty.kubbus} ps</strong>
                    </span>
                    <span
                      style={{
                        background: '#fffbeb',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                        padding: '0.18rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      🫓 Romali: <strong>{stopQty.romali} ps</strong>
                    </span>
                  </div>

                  {/* Row 2: Important Numbers at a glance + Call & Map buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.86rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Today: <strong style={{ color: '#991b1b', fontWeight: 800 }}>{formatCurrency(fin.todayAmount)}</strong>
                      </span>
                      {fin.previousOutstanding > 0 && (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          • Due: <strong style={{ color: '#dc2626', fontWeight: 800 }}>{formatCurrency(fin.previousOutstanding)}</strong>
                        </span>
                      )}
                    </div>

                    {/* Quick Call & Map (stops propagation so it doesn't just toggle) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            borderRadius: '50%',
                            width: '34px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Call Shop"
                        >
                          <Phone size={15} />
                        </a>
                      )}
                      {address && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMaps(address);
                          }}
                          style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '50%',
                            width: '34px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Open Google Maps"
                        >
                          <Navigation size={15} />
                        </button>
                      )}
                      <div style={{ color: 'var(--text-muted)', marginLeft: '0.2rem' }}>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* EXPANDABLE SECTION ("View More" Style) */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      padding: '0.9rem 1rem',
                      background: 'var(--surface-sunken)',
                    }}
                  >
                    {/* Address & Items */}
                    <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                      {address && (
                        <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.35rem' }}>
                          <MapPin size={13} color="var(--primary)" />
                          <span>{address}</span>
                        </div>
                      )}

                      {/* Items */}
                      <div style={{ background: 'var(--surface)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '0.4rem' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                          ORDER ITEMS (PIECES / PS)
                        </span>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {items.length > 0
                            ? items.map((it) => `${it.product_details?.name || 'Item'} × ${it.quantity} ps`).join('  •  ')
                            : 'Wholesale Bakery Supply'}
                        </div>
                      </div>
                    </div>

                    {/* Prominent 4-Line Payment Breakdown Box */}
                    <div
                      style={{
                        background: 'white',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        padding: '0.75rem 0.9rem',
                        marginBottom: '0.85rem',
                      }}
                    >
                      {fin.previousOutstanding > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.3rem', borderBottom: '1px dashed #e2e8f0', fontSize: '0.82rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Previous Outstanding</span>
                          <strong style={{ color: '#d97706' }}>{formatCurrency(fin.previousOutstanding)}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed #e2e8f0', fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Today's Bill</span>
                        <strong style={{ color: '#991b1b' }}>{formatCurrency(fin.todayAmount)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.4rem', fontSize: '0.92rem' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Total Due</strong>
                        <strong style={{ color: '#dc2626', fontSize: '1.05rem', fontWeight: 900 }}>
                          {formatCurrency(fin.totalDue)}
                        </strong>
                      </div>
                    </div>

                    {/* Delivery Status Details */}
                    {isDelivered && (
                      <div style={{ fontSize: '0.78rem', color: '#065f46', background: '#ecfdf5', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
                        ✓ Delivered to <strong>{d.recipient_name || 'Staff'}</strong>
                        {d.delivered_at && ` at ${formatDateTime(d.delivered_at)}`}
                      </div>
                    )}

                    {isNotDelivered && (
                      <div style={{ fontSize: '0.78rem', color: '#991b1b', background: '#fef2f2', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
                        ✕ Skipped: <strong>{d.failed_reason}</strong>
                      </div>
                    )}

                    {/* Action Buttons: Big & Thumb-Friendly */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {!isDelivered && !isNotDelivered && (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{
                              flex: 2,
                              minHeight: '44px',
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                            }}
                            onClick={() => openCompleteModal(d)}
                          >
                            <Check size={18} />
                            <span>Mark Delivered</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              flex: 1.5,
                              minHeight: '44px',
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              color: '#059669',
                              borderColor: '#a7f3d0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                            }}
                            onClick={() => openCollectPaymentModal(d)}
                          >
                            <HandCoins size={17} />
                            <span>Collect ₹</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              flex: 1,
                              minHeight: '44px',
                              fontSize: '0.85rem',
                              color: '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onClick={() => openSkipModal(d)}
                          >
                            Skip
                          </button>
                        </>
                      )}

                      {isDelivered && (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              flex: 1,
                              minHeight: '44px',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                            }}
                            onClick={() => openCollectPaymentModal(d)}
                          >
                            <HandCoins size={17} />
                            <span>Collect Payment</span>
                          </button>

                          {isWhatsAppEnabled && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{
                                flex: 1,
                                minHeight: '44px',
                                fontSize: '0.88rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                              }}
                              onClick={() => {
                                const msg = generatePaymentReceiptMessage({
                                  customerName: customer?.name || 'Customer Shop',
                                  paymentNumber: d.delivery_number,
                                  amount: d.order_details?.total_amount || '0',
                                  paymentMethod: 'CASH',
                                  date: new Date().toLocaleDateString(),
                                  remainingBalance: customer?.current_balance,
                                });
                                openWhatsApp(phone, msg);
                              }}
                            >
                              <MessageSquare size={16} color="#059669" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                        </>
                      )}

                      {isNotDelivered && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            flex: 1,
                            minHeight: '44px',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                          }}
                          onClick={() => openCompleteModal(d)}
                        >
                          <RotateCcw size={16} />
                          <span>Retry Delivery Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <Truck size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No deliveries matching current filter.</p>
        </div>
      )}
      </>
      )}

      {/* ============================================================ */}
      {/* 4. MODAL: STANDALONE PAYMENT COLLECTION (PROMPT 5, 6, 7, 8)  */}
      {/* ============================================================ */}
      {paymentDelivery && (() => {
        const fin = getDeliveryFinancials(paymentDelivery);
        const collectedNum = parseFloat(collectAmount) || 0;
        // Prompt 6 & 7: Current Outstanding = Total Due - Amount Collected
        const calculatedRemaining = Math.max(0, fin.totalDue - collectedNum);

        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '440px', padding: '1.25rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#059669', fontWeight: 800 }}>
                    COLLECT PAYMENT
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    {paymentDelivery.order_details?.customer_details?.name || 'Customer Shop'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentDelivery(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <X size={22} />
                </button>
              </div>

              {actionError && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {actionError}
                </div>
              )}

              {/* CRYSTAL CLEAR 4-LINE FINANCIAL AUDIT BOX (PROMPT 5 & 7) */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '2px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.1rem',
                }}
              >
                {/* 1. Previous Outstanding (shown if exists) */}
                {fin.previousOutstanding > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Previous Outstanding</span>
                    <strong style={{ color: '#d97706', fontSize: '1rem' }}>{formatCurrency(fin.previousOutstanding)}</strong>
                  </div>
                )}

                {/* 2. Today's Amount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.45rem', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Today's Amount</span>
                  <strong style={{ color: '#991b1b', fontSize: '1rem' }}>{formatCurrency(fin.todayAmount)}</strong>
                </div>

                {/* Total Due Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.55rem', borderBottom: '1.5px dashed #94a3b8', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Amount Due</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{formatCurrency(fin.totalDue)}</span>
                </div>

                {/* 3. Amount Collected Input Preview */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.55rem', paddingBottom: '0.55rem', borderBottom: '2px solid #059669' }}>
                  <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>Amount Collected</span>
                  <span style={{ fontWeight: 900, color: '#059669', fontSize: '1.25rem' }}>
                    {formatCurrency(collectedNum)}
                  </span>
                </div>

                {/* 4. CURRENT OUTSTANDING (IMMEDIATE LIVE CALCULATION) */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.65rem',
                    background: calculatedRemaining > 0 ? '#fef2f2' : '#ecfdf5',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    marginTop: '0.5rem',
                  }}
                >
                  <span style={{ fontWeight: 800, color: calculatedRemaining > 0 ? '#991b1b' : '#065f46', fontSize: '0.9rem' }}>
                    Current Outstanding
                  </span>
                  <strong style={{ fontSize: '1.3rem', fontWeight: 900, color: calculatedRemaining > 0 ? '#dc2626' : '#059669' }}>
                    {formatCurrency(calculatedRemaining)}
                  </strong>
                </div>
              </div>

              {/* Form Input for Amount Collected */}
              <form onSubmit={handleConfirmPayment}>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Enter Collected Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ fontSize: '1.35rem', fontWeight: 800, height: '52px', color: '#059669', textAlign: 'center' }}
                    placeholder="0.00"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    required
                    autoFocus
                  />

                  {/* Fast Preset Tap Buttons */}
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => setCollectAmount(fin.totalDue.toString())}
                      style={{
                        flex: 1,
                        padding: '0.35rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Full ₹{fin.totalDue}
                    </button>
                    {fin.todayAmount > 0 && fin.todayAmount !== fin.totalDue && (
                      <button
                        type="button"
                        onClick={() => setCollectAmount(fin.todayAmount.toString())}
                        style={{
                          flex: 1,
                          padding: '0.35rem',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Today's ₹{fin.todayAmount}
                      </button>
                    )}
                    {fin.previousOutstanding > 0 && (
                      <button
                        type="button"
                        onClick={() => setCollectAmount(fin.previousOutstanding.toString())}
                        style={{
                          flex: 1,
                          padding: '0.35rem',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Due ₹{fin.previousOutstanding}
                      </button>
                    )}
                  </div>
                </div>

                {/* Payment Method Toggle (Cash vs UPI) */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Payment Mode
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setCollectMethod('CASH')}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: collectMethod === 'CASH' ? '2px solid #059669' : '1px solid var(--border)',
                        background: collectMethod === 'CASH' ? '#ecfdf5' : 'var(--surface)',
                        color: collectMethod === 'CASH' ? '#065f46' : 'var(--text-secondary)',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        minHeight: '46px',
                        cursor: 'pointer',
                      }}
                    >
                      <Banknote size={18} />
                      <span>CASH</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCollectMethod('GPAY_UPI')}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: collectMethod === 'GPAY_UPI' ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: collectMethod === 'GPAY_UPI' ? '#fef2f2' : 'var(--surface)',
                        color: collectMethod === 'GPAY_UPI' ? 'var(--primary-dark)' : 'var(--text-secondary)',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        minHeight: '46px',
                        cursor: 'pointer',
                      }}
                    >
                      <QrCode size={18} />
                      <span>GPAY / UPI</span>
                    </button>
                  </div>
                </div>

                {/* If UPI, reference ID */}
                {collectMethod === 'GPAY_UPI' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label">UPI Reference Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 12-digit transaction ID"
                      value={collectRef}
                      onChange={(e) => setCollectRef(e.target.value)}
                    />
                  </div>
                )}

                {/* Submit Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, minHeight: '48px', fontSize: '0.9rem' }}
                    onClick={() => setPaymentDelivery(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      flex: 2,
                      minHeight: '48px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      background: '#059669',
                      borderColor: '#047857',
                    }}
                    disabled={submitting}
                  >
                    {submitting ? 'Recording...' : `Confirm ₹${collectedNum || 0}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/* 5. MODAL: COMPLETE DELIVERY (PROMPT 5)                       */}
      {/* ============================================================ */}
      {completeDelivery && (() => {
        const fin = getDeliveryFinancials(completeDelivery);
        const collectedNum = includePayment ? (parseFloat(completePayAmount) || 0) : 0;
        const calculatedRemaining = Math.max(0, fin.totalDue - collectedNum);

        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '440px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800 }}>
                    CONFIRM DELIVERY
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    {completeDelivery.order_details?.customer_details?.name || 'Customer Shop'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCompleteDelivery(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={22} />
                </button>
              </div>

              {actionError && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {actionError}
                </div>
              )}

              <form onSubmit={handleCompleteDelivery}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Recipient / Staff Name *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ minHeight: '44px', fontSize: '0.95rem' }}
                    placeholder="Person who accepted goods"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                  />
                </div>

                {/* Optional Payment Collection Toggle */}
                <div
                  style={{
                    background: includePayment ? '#f0fdf4' : '#f8fafc',
                    border: includePayment ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={includePayment}
                      onChange={(e) => setIncludePayment(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#059669' }}
                    />
                    <span>Collect Payment Right Now?</span>
                  </label>

                  {includePayment && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {/* Live 4-Row Financial Card */}
                      <div
                        style={{
                          background: 'white',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.65rem 0.8rem',
                          marginBottom: '0.75rem',
                          fontSize: '0.82rem',
                        }}
                      >
                        {fin.previousOutstanding > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.25rem' }}>
                            <span>Previous Outstanding:</span>
                            <strong style={{ color: '#d97706' }}>{formatCurrency(fin.previousOutstanding)}</strong>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.25rem' }}>
                          <span>Today's Bill:</span>
                          <strong style={{ color: '#991b1b' }}>{formatCurrency(fin.todayAmount)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.25rem', borderBottom: '1px dashed #cbd5e1' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Total Due:</span>
                          <strong>{formatCurrency(fin.totalDue)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.35rem', color: calculatedRemaining > 0 ? '#dc2626' : '#059669' }}>
                          <span style={{ fontWeight: 700 }}>Current Outstanding:</span>
                          <strong style={{ fontSize: '0.95rem' }}>{formatCurrency(calculatedRemaining)}</strong>
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label">Amount Collected (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ height: '46px', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center', color: '#059669' }}
                          value={completePayAmount}
                          onChange={(e) => setCompletePayAmount(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setCompletePayMethod('CASH')}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: completePayMethod === 'CASH' ? '2px solid #059669' : '1px solid #cbd5e1',
                            background: completePayMethod === 'CASH' ? '#ecfdf5' : 'white',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                          }}
                        >
                          CASH
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompletePayMethod('GPAY_UPI')}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: completePayMethod === 'GPAY_UPI' ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                            background: completePayMethod === 'GPAY_UPI' ? '#fef2f2' : 'white',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                          }}
                        >
                          UPI / GPAY
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, minHeight: '48px' }}
                    onClick={() => setCompleteDelivery(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 2, minHeight: '48px', fontSize: '0.95rem', fontWeight: 800 }}
                    disabled={submitting}
                  >
                    {submitting ? 'Confirming...' : 'Mark Delivered'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/* 6. MODAL: SKIP / NOT DELIVERED (PROMPT 6)                     */}
      {/* ============================================================ */}
      {skipDelivery && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#dc2626', fontWeight: 800 }}>
                  SKIP DELIVERY STOP
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                  {skipDelivery.order_details?.customer_details?.name || 'Customer Shop'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSkipDelivery(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {actionError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleConfirmSkip}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Reason for Non-Delivery *
                </label>
                <select
                  className="form-select"
                  style={{ minHeight: '44px', fontSize: '0.9rem' }}
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  required
                >
                  {NOT_DELIVERED_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Driver Explanation Notes (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Shop closed until 4pm"
                  value={skipNotes}
                  onChange={(e) => setSkipNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, minHeight: '44px' }}
                  onClick={() => setSkipDelivery(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  style={{ flex: 1.5, minHeight: '44px', fontWeight: 800 }}
                  disabled={submitting}
                >
                  {submitting ? 'Recording...' : 'Confirm Skip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. MODAL: PAYMENT CONFIRMATION & WHATSAPP RECEIPT SHARE      */}
      {/* ============================================================ */}
      {paymentSuccessData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '1.5rem', textAlign: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
              Payment Recorded!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
              Receipt #{paymentSuccessData.paymentNumber}
            </p>

            {/* Financial Summary Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.25rem',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Customer Shop</span>
                <strong>{paymentSuccessData.customerName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Amount Collected</span>
                <strong style={{ color: '#059669', fontSize: '1.1rem' }}>{formatCurrency(paymentSuccessData.amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.9rem' }}>
                <span style={{ fontWeight: 700 }}>Current Outstanding</span>
                <strong style={{ color: '#dc2626', fontSize: '1.15rem' }}>
                  {formatCurrency(paymentSuccessData.remainingBalance)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {isWhatsAppEnabled && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    minHeight: '48px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    background: '#047857',
                    borderColor: '#065f46',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                  onClick={() => {
                    const msg = generatePaymentReceiptMessage({
                      customerName: paymentSuccessData.customerName,
                      paymentNumber: paymentSuccessData.paymentNumber,
                      amount: paymentSuccessData.amount,
                      paymentMethod: paymentSuccessData.paymentMethod,
                      date: paymentSuccessData.date,
                      remainingBalance: paymentSuccessData.remainingBalance,
                    });
                    openWhatsApp(paymentSuccessData.customerPhone, msg);
                  }}
                >
                  <MessageSquare size={18} />
                  <span>Share WhatsApp Receipt</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: '44px' }}
                onClick={() => setPaymentSuccessData(null)}
              >
                Close & Next Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. MODAL: DRIVER DAY CLOSING & NET CASH HANDOVER             */}
      {/* ============================================================ */}
      {isDayCloseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px', padding: '1.25rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Lock size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#dc2626', fontWeight: 800 }}>
                    END SHIFT
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    Day Closing & Handover
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDayCloseModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={22} />
              </button>
            </div>

            {closeDayError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '0.85rem', fontSize: '0.84rem' }}>
                {closeDayError}
              </div>
            )}

            <form onSubmit={handleConfirmCloseDay}>
              {/* SECTION 1: STOCK RECONCILIATION */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.85rem', marginBottom: '0.9rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, display: 'block', marginBottom: '0.5rem' }}>
                  1. STOCK RECONCILIATION (PIECES / PS)
                </span>

                {/* Kubbus Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem', paddingBottom: '0.6rem', borderBottom: '1px dashed #e2e8f0' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#991b1b', display: 'block' }}>🥖 Kubbus (ps)</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Taken: <strong>{currentKubbusLoaded}</strong> • Delivered: <strong>{deliveredKubbus}</strong>
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Returned (ps):</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ width: '80px', height: '32px', fontSize: '0.88rem', fontWeight: 800, textAlign: 'center' }}
                      value={kubbusReturnInput}
                      onChange={(e) => setKubbusReturnInput(e.target.value)}
                    />
                  </div>
                </div>

                {/* Romali Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#92400e', display: 'block' }}>🫓 Romali (ps)</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Taken: <strong>{currentRomaliLoaded}</strong> • Delivered: <strong>{deliveredRomali}</strong>
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Returned (ps):</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ width: '80px', height: '32px', fontSize: '0.88rem', fontWeight: 800, textAlign: 'center' }}
                      value={romaliReturnInput}
                      onChange={(e) => setRomaliReturnInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: CASH & EXPENSE RECONCILIATION */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.85rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, display: 'block', marginBottom: '0.5rem' }}>
                  2. COLLECTIONS & HANDOVER TO OFFICE
                </span>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', paddingBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cash Collected Today</span>
                  <strong style={{ color: '#059669' }}>{formatCurrency(paymentSummary?.cash_total || '0')}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', paddingBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>GPay / UPI Collected Today</span>
                  <strong style={{ color: '#991b1b' }}>{formatCurrency(paymentSummary?.upi_total || '0')}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', paddingBottom: '0.45rem', borderBottom: '1px dashed #cbd5e1' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Driver Route Expenses</span>
                  <strong style={{ color: '#dc2626' }}>- {formatCurrency(shift?.expenses_total || '0')}</strong>
                </div>

                {/* Net Cash Handover Highlight Box */}
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1.5px solid #6ee7b7',
                    borderRadius: '8px',
                    padding: '0.65rem 0.8rem',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Banknote size={18} color="#059669" />
                    <span style={{ fontWeight: 800, color: '#065f46', fontSize: '0.88rem' }}>
                      Net Cash Handover:
                    </span>
                  </div>
                  <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669' }}>
                    {formatCurrency(shiftNetHandover.toFixed(2))}
                  </strong>
                </div>
              </div>

              {/* SECTION 3: CLOSING NOTES */}
              <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Shift Closing Notes (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Handed cash to cashier, crates stacked"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, minHeight: '44px' }}
                  onClick={() => setIsDayCloseModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    flex: 2,
                    minHeight: '44px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
                    borderColor: '#991b1b',
                  }}
                  disabled={submittingCloseDay}
                >
                  {submittingCloseDay ? 'Settling Shift...' : 'Confirm Day Closing & Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
