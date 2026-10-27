import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { staffService, CreateStaffPayload } from '../../services/staffService';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  StaffMember,
  DailySheetItem,
  StaffPayout,
  StaffSummary,
  AttendanceStatus,
  StaffPayoutType,
  StaffPaymentMethod,
} from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Users,
  Plus,
  X,
  Shield,
  Edit2,
  Trash2,
  Key,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Wallet,
  UserCheck,
  UserX,
  FileCheck,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Upload,
  UserPlus,
  Eye,
  EyeOff,
  CreditCard,
  Store,
  Save,
  Search,
  Check,
  Truck,
  Briefcase,
  Sparkles,
  Printer,
  ArrowDownCircle,
  ArrowUpCircle,
  HelpCircle,
  Receipt,
  Zap,
} from 'lucide-react';
import { RecordShopPaymentModal } from '../../components/RecordShopPaymentModal';

interface StaffUsersPageProps {
  defaultTab?: 'staff' | 'attendance' | 'payouts' | 'accounts';
}

const isDriverPersonnel = (item: { role_type?: string; designation?: string }): boolean => {
  const des = (item.designation || '').toLowerCase();
  const role = (item.role_type || '').toUpperCase();
  if (des.includes('driver')) return true;
  if (role === 'STAFF') return true;
  return false;
};

const isMemberPersonnel = (item: { role_type?: string; designation?: string }): boolean => {
  return !isDriverPersonnel(item);
};

export const StaffUsersPage: React.FC<StaffUsersPageProps> = ({ defaultTab }) => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromQuery = searchParams.get('tab') as 'staff' | 'attendance' | 'payouts' | 'accounts' | null;
  const [activeTab, setActiveTab] = useState<'staff' | 'attendance' | 'payouts' | 'accounts'>(
    tabFromQuery || defaultTab || 'staff'
  );

  useEffect(() => {
    if (tabFromQuery && tabFromQuery !== activeTab) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  const handleTabChange = (tab: 'staff' | 'attendance' | 'payouts' | 'accounts') => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    });
  };

  // Staff State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffSummary, setStaffSummary] = useState<StaffSummary | null>(null);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffFilterType, setStaffFilterType] = useState<'all' | 'staff' | 'member' | 'worker' | 'login'>('all');

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffRoleType, setStaffRoleType] = useState<'STAFF' | 'MEMBER'>('MEMBER');
  const [staffFullName, setStaffFullName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffDesignation, setStaffDesignation] = useState('Share Member');
  const [staffJoinedDate, setStaffJoinedDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffWageType, setStaffWageType] = useState<'DEFAULT_SLAB' | 'CUSTOM'>('DEFAULT_SLAB');
  const [staffCustomWage, setStaffCustomWage] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [staffSelectedUser, setStaffSelectedUser] = useState<string>('');
  const [hasLoginAccountToggle, setHasLoginAccountToggle] = useState(false);
  const [staffProofFile, setStaffProofFile] = useState<File | null>(null);
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceFilterRole, setAttendanceFilterRole] = useState<'ALL' | 'MEMBERS' | 'DRIVERS'>('ALL');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [dailySheet, setDailySheet] = useState<DailySheetItem[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [showAttendanceWages, setShowAttendanceWages] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialSheetLoadRef = React.useRef(true);

  // Payout State
  const [payouts, setPayouts] = useState<StaffPayout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutStaffId, setPayoutStaffId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutCashAmount, setPayoutCashAmount] = useState('');
  const [payoutGpayAmount, setPayoutGpayAmount] = useState('');
  const [payoutSplitMode, setPayoutSplitMode] = useState(false);
  const [payoutType, setPayoutType] = useState<StaffPayoutType>('SALARY');
  const [payoutMethod, setPayoutMethod] = useState<StaffPaymentMethod>('CASH');
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [payoutRef, setPayoutRef] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // Ledger Detail Modal State
  const [ledgerModalStaff, setLedgerModalStaff] = useState<StaffMember | null>(null);
  const [ledgerData, setLedgerData] = useState<{
    staff: StaffMember;
    total_earned: string;
    total_paid: string;
    balance_due: string;
    recent_attendances: any[];
    recent_payouts: any[];
  } | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // User Accounts State (Tab 4)
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userUsername, setUserUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [userRole, setUserRole] = useState('DRIVER');
  const [userPhone, setUserPhone] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Record Shop Payment Modal State
  const [isShopPaymentModalOpen, setIsShopPaymentModalOpen] = useState(false);
  const [shopPaymentStaffId, setShopPaymentStaffId] = useState<string | undefined>(undefined);

  const handleOpenShopCollection = (staffId?: string) => {
    setShopPaymentStaffId(staffId);
    setIsShopPaymentModalOpen(true);
  };

  // Global Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ─── Data Fetching ────────────────────────────────────────────────────────
  const fetchStaffData = async () => {
    try {
      setStaffLoading(true);
      let roleTypeParam: 'STAFF' | 'MEMBER' | undefined = undefined;
      if (staffFilterType === 'staff') roleTypeParam = 'STAFF';
      else if (staffFilterType === 'member') roleTypeParam = 'MEMBER';

      const [list, sum] = await Promise.all([
        staffService.getStaff({
          search: staffSearch || undefined,
          role_type: roleTypeParam,
          has_login:
            staffFilterType === 'login' ? true : staffFilterType === 'worker' ? false : undefined,
        }),
        staffService.getStaffSummary(),
      ]);
      setStaffList(list);
      setStaffSummary(sum);
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setStaffLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const fetchDailySheet = async (dateVal: string) => {
    try {
      setAttendanceLoading(true);
      isInitialSheetLoadRef.current = true;
      const res = await staffService.getDailySheet(dateVal);
      setDailySheet(res.sheet);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to load daily sheet:', err);
    } finally {
      setAttendanceLoading(false);
      setTimeout(() => {
        isInitialSheetLoadRef.current = false;
      }, 400);
    }
  };

  const fetchPayouts = async () => {
    try {
      setPayoutsLoading(true);
      const data = await staffService.getPayouts();
      setPayouts(data);
    } catch (err) {
      console.error('Failed to load payouts:', err);
    } finally {
      setPayoutsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await authService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
    fetchUsers();
  }, [staffSearch, staffFilterType]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchDailySheet(attendanceDate);
    } else if (activeTab === 'payouts') {
      fetchPayouts();
    } else if (activeTab === 'accounts') {
      fetchUsers();
    }
  }, [activeTab, attendanceDate]);

  // Debounced Auto-Save for Attendance Sheet
  useEffect(() => {
    if (isInitialSheetLoadRef.current || !autoSaveEnabled || activeTab !== 'attendance' || dailySheet.length === 0) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    setHasUnsavedChanges(true);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await staffService.bulkSaveAttendance({
          date: attendanceDate,
          attendances: dailySheet.map((item) => ({
            staff_id: item.staff_id,
            status: item.status,
            notes: item.notes,
            cash_paid: item.cash_paid || '0.00',
            gpay_paid: item.gpay_paid || '0.00',
          })),
        });
        setHasUnsavedChanges(false);
      } catch (err) {
        console.warn('Silent auto-save attendance notice:', err);
      }
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [dailySheet, autoSaveEnabled, attendanceDate, activeTab]);

  // ─── Staff Modal Handlers ──────────────────────────────────────────────────
  const handleOpenCreateStaff = () => {
    setEditingStaff(null);
    setStaffFullName('');
    setStaffPhone('');
    setStaffRoleType('MEMBER');
    setStaffDesignation('Share Member');
    setStaffJoinedDate(new Date().toISOString().split('T')[0]);
    setStaffWageType('CUSTOM');
    setStaffCustomWage('');
    setStaffNotes('');
    setStaffSelectedUser('');
    setHasLoginAccountToggle(false);
    setStaffProofFile(null);
    setStaffError(null);
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setStaffFullName(staff.full_name);
    setStaffPhone(staff.phone_number || '');
    const rType = staff.role_type || (staff.designation.toLowerCase().includes('driver') ? 'STAFF' : 'MEMBER');
    setStaffRoleType(rType);
    setStaffDesignation(staff.designation || (rType === 'STAFF' ? 'Staff Driver' : 'Share Member'));
    setStaffJoinedDate(staff.joined_date || new Date().toISOString().split('T')[0]);
    setStaffWageType(rType === 'MEMBER' ? 'CUSTOM' : staff.wage_type || 'DEFAULT_SLAB');
    setStaffCustomWage(staff.custom_daily_wage || '');
    setStaffNotes(staff.notes || '');
    setStaffSelectedUser(staff.user || '');
    setHasLoginAccountToggle(staff.has_login_account);
    setStaffProofFile(null);
    setStaffError(null);
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName.trim()) {
      setStaffError('Please enter full name.');
      return;
    }

    if (staffRoleType === 'MEMBER' && (!staffCustomWage || parseFloat(staffCustomWage) <= 0)) {
      setStaffError('Please enter Custom Daily Amount for Share Member.');
      return;
    }

    try {
      setStaffSubmitting(true);
      setStaffError(null);

      const finalWageType = staffRoleType === 'MEMBER' ? 'CUSTOM' : staffWageType;
      const payload: CreateStaffPayload = {
        full_name: staffFullName.trim(),
        phone_number: staffPhone.trim() || undefined,
        role_type: staffRoleType,
        designation: staffDesignation.trim() || (staffRoleType === 'STAFF' ? 'Staff Driver' : 'Share Member'),
        joined_date: staffJoinedDate,
        wage_type: finalWageType,
        custom_daily_wage: finalWageType === 'CUSTOM' ? staffCustomWage : null,
        proof_document: staffRoleType === 'STAFF' && staffProofFile ? staffProofFile : undefined,
        notes: staffNotes.trim() || undefined,
        user: hasLoginAccountToggle && staffSelectedUser ? staffSelectedUser : null,
      };

      if (editingStaff) {
        await staffService.updateStaff(editingStaff.id, payload);
        showToast('Staff member profile updated successfully!');
      } else {
        await staffService.createStaff(payload);
        showToast('Staff member added successfully!');
      }

      setIsStaffModalOpen(false);
      fetchStaffData();
      fetchDailySheet(attendanceDate);
    } catch (err: any) {
      setStaffError(err.message || 'Failed to save staff member');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete staff profile "${name}"?`)) return;
    try {
      await staffService.deleteStaff(id);
      showToast('Staff member removed successfully.');
      fetchStaffData();
      fetchDailySheet(attendanceDate);
    } catch (err) {
      alert('Failed to delete staff member.');
    }
  };

  // ─── Attendance Handlers ───────────────────────────────────────────────────
  const handleUpdateSheetItem = (staffId: string, status: AttendanceStatus) => {
    setDailySheet((prev) =>
      prev.map((item) => {
        if (item.staff_id === staffId) {
          const base = parseFloat(item.base_daily_wage) || 0;
          let calculated = '0.00';
          if (status === 'FULL') calculated = base.toFixed(2);
          else if (status === 'HALF') calculated = (base / 2).toFixed(2);
          return {
            ...item,
            status,
            calculated_wage: calculated,
          };
        }
        return item;
      })
    );
  };

  const handleUpdatePayment = (staffId: string, field: 'cash_paid' | 'gpay_paid', value: string) => {
    setDailySheet((prev) =>
      prev.map((item) => {
        if (item.staff_id === staffId) {
          return {
            ...item,
            [field]: value,
          };
        }
        return item;
      })
    );
  };

  const handleMarkAllFull = () => {
    setDailySheet((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'FULL',
        calculated_wage: (parseFloat(item.base_daily_wage) || 0).toFixed(2),
      }))
    );
  };

  const handleMarkAllLeave = () => {
    setDailySheet((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'LEAVE',
        calculated_wage: '0.00',
      }))
    );
  };

  const handleAutoFillCash = () => {
    setDailySheet((prev) =>
      prev.map((item) => ({
        ...item,
        cash_paid: item.calculated_wage,
        gpay_paid: '0.00',
      }))
    );
  };

  const handleClearPayouts = () => {
    setDailySheet((prev) =>
      prev.map((item) => ({
        ...item,
        cash_paid: '0.00',
        gpay_paid: '0.00',
      }))
    );
  };

  const handlePayFullWage = (staffId: string) => {
    setDailySheet((prev) =>
      prev.map((item) => {
        if (item.staff_id === staffId) {
          const earned = parseFloat(item.calculated_wage) || 0;
          return {
            ...item,
            cash_paid: earned.toFixed(2),
            gpay_paid: '0.00',
          };
        }
        return item;
      })
    );
  };

  const handleOpenCreateForSection = (type: 'MEMBER' | 'DRIVER') => {
    setEditingStaff(null);
    setStaffFullName('');
    setStaffPhone('');
    setStaffJoinedDate(new Date().toISOString().split('T')[0]);
    setStaffNotes('');
    setStaffSelectedUser('');
    setHasLoginAccountToggle(false);
    setStaffProofFile(null);
    setStaffError(null);

    if (type === 'MEMBER') {
      setStaffRoleType('MEMBER');
      setStaffDesignation('Share Member');
      setStaffWageType('CUSTOM');
      setStaffCustomWage('');
    } else {
      setStaffRoleType('STAFF');
      setStaffDesignation('Staff Driver');
      setStaffWageType('DEFAULT_SLAB');
      setStaffCustomWage('');
    }
    setIsStaffModalOpen(true);
  };

  const handleSaveAttendance = async () => {
    try {
      setAttendanceSaving(true);
      await staffService.bulkSaveAttendance({
        date: attendanceDate,
        attendances: dailySheet.map((item) => ({
          staff_id: item.staff_id,
          status: item.status,
          notes: item.notes,
          cash_paid: item.cash_paid || '0.00',
          gpay_paid: item.gpay_paid || '0.00',
        })),
      });
      showToast(`Attendance & payouts saved for ${attendanceDate}!`);
      fetchDailySheet(attendanceDate);
      fetchStaffData();
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance');
    } finally {
      setAttendanceSaving(false);
    }
  };

  const handleShiftDate = (days: number) => {
    const d = new Date(attendanceDate);
    d.setDate(d.getDate() + days);
    setAttendanceDate(d.toISOString().split('T')[0]);
  };

  // ─── Payout Handlers ───────────────────────────────────────────────────────
  const handleOpenPayoutModal = (staffId?: string) => {
    setPayoutStaffId(staffId || (staffList[0]?.id ?? ''));
    setPayoutAmount('');
    setPayoutCashAmount('');
    setPayoutGpayAmount('');
    setPayoutSplitMode(false);
    setPayoutType('SALARY');
    setPayoutMethod('CASH');
    setPayoutDate(new Date().toISOString().split('T')[0]);
    setPayoutRef('');
    setPayoutNotes('');
    setPayoutError(null);
    setIsPayoutModalOpen(true);
  };

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutStaffId) {
      setPayoutError('Please select a staff member.');
      return;
    }

    if (payoutSplitMode) {
      const cashVal = parseFloat(payoutCashAmount || '0');
      const gpayVal = parseFloat(payoutGpayAmount || '0');
      if (cashVal <= 0 && gpayVal <= 0) {
        setPayoutError('Please enter at least Cash or GPay amount greater than zero.');
        return;
      }
      try {
        setPayoutSubmitting(true);
        setPayoutError(null);
        const promises = [];
        if (cashVal > 0) {
          promises.push(
            staffService.createPayout({
              staff: payoutStaffId,
              amount: cashVal.toFixed(2),
              payout_type: payoutType,
              payment_method: 'CASH',
              date: payoutDate,
              reference: payoutRef.trim() ? `${payoutRef.trim()} (Cash)` : undefined,
              notes: payoutNotes.trim() ? `${payoutNotes.trim()} [Cash]` : undefined,
            })
          );
        }
        if (gpayVal > 0) {
          promises.push(
            staffService.createPayout({
              staff: payoutStaffId,
              amount: gpayVal.toFixed(2),
              payout_type: payoutType,
              payment_method: 'GPAY_UPI',
              date: payoutDate,
              reference: payoutRef.trim() ? `${payoutRef.trim()} (GPay)` : undefined,
              notes: payoutNotes.trim() ? `${payoutNotes.trim()} [GPay]` : undefined,
            })
          );
        }
        await Promise.all(promises);
        showToast('Cash & GPay payouts recorded and added to Expenses successfully!');
        setIsPayoutModalOpen(false);
        fetchPayouts();
        fetchStaffData();
      } catch (err: any) {
        setPayoutError(err.message || 'Failed to record payout');
      } finally {
        setPayoutSubmitting(false);
      }
      return;
    }

    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      setPayoutError('Please enter a valid amount greater than zero.');
      return;
    }

    try {
      setPayoutSubmitting(true);
      setPayoutError(null);
      await staffService.createPayout({
        staff: payoutStaffId,
        amount: payoutAmount,
        payout_type: payoutType,
        payment_method: payoutMethod,
        date: payoutDate,
        reference: payoutRef.trim() || undefined,
        notes: payoutNotes.trim() || undefined,
      });
      showToast('Payout recorded and added to Expenses successfully!');
      setIsPayoutModalOpen(false);
      fetchPayouts();
      fetchStaffData();
    } catch (err: any) {
      setPayoutError(err.message || 'Failed to record payout');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const handleDeletePayout = async (id: string, amount: string) => {
    if (!window.confirm(`Delete payout record of ₹${amount}?`)) return;
    try {
      await staffService.deletePayout(id);
      showToast('Payout record removed.');
      fetchPayouts();
      fetchStaffData();
    } catch (err) {
      alert('Failed to delete payout.');
    }
  };

  // ─── Ledger Detail Modal ───────────────────────────────────────────────────
  const handleOpenLedgerModal = async (staff: StaffMember) => {
    setLedgerModalStaff(staff);
    setLedgerLoading(true);
    try {
      const data = await staffService.getStaffLedger(staff.id);
      setLedgerData(data);
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  // ─── User Accounts Handlers (Tab 4) ─────────────────────────────────────────
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserUsername('');
    setUserEmail('');
    setUserPassword('');
    setUserFirstName('');
    setUserLastName('');
    setUserRole('DRIVER');
    setUserPhone('');
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setUserUsername(u.username);
    setUserEmail(u.email || '');
    setUserFirstName(u.first_name || '');
    setUserLastName(u.last_name || '');
    setUserRole(u.role);
    setUserPhone(u.phone_number || '');
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUsername.trim() || !userRole) {
      setUserError('Username and role are required.');
      return;
    }
    if (!editingUser && !userPassword) {
      setUserError('Password is required for new accounts.');
      return;
    }

    try {
      setUserSubmitting(true);
      setUserError(null);
      if (editingUser) {
        await authService.updateUser(editingUser.id, {
          username: userUsername.trim(),
          email: userEmail.trim(),
          first_name: userFirstName.trim(),
          last_name: userLastName.trim(),
          role: userRole,
          phone_number: userPhone.trim(),
        });
        showToast('Login account updated successfully!');
      } else {
        await authService.createUser({
          username: userUsername.trim(),
          email: userEmail.trim(),
          password: userPassword,
          first_name: userFirstName.trim(),
          last_name: userLastName.trim(),
          role: userRole,
          phone_number: userPhone.trim(),
        });
        showToast('New login account created!');
      }
      setIsUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setUserError(err.message || 'Failed to save account');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPassword) return;
    try {
      setUserSubmitting(true);
      await authService.resetPassword(resetPasswordUser.id, newPassword);
      showToast(`Password reset for ${resetPasswordUser.username}!`);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string | number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete login account "${name}"?`)) return;
    try {
      await authService.deleteUser(id);
      showToast('Login account removed.');
      fetchUsers();
    } catch (err) {
      alert('Failed to delete account.');
    }
  };

  // Attendance Sheet Calculations
  const attendanceStats = useMemo(() => {
    let fullCount = 0;
    let halfCount = 0;
    let leaveCount = 0;
    let totalEarned = 0;
    let totalCash = 0;
    let totalGPay = 0;

    let memberTotal = 0;
    let memberPresent = 0;
    let memberEarned = 0;

    let driverTotal = 0;
    let driverPresent = 0;
    let driverEarned = 0;

    dailySheet.forEach((item) => {
      const isDriver = isDriverPersonnel(item);
      const isMember = !isDriver;

      const wage = parseFloat(item.calculated_wage) || 0;
      const cash = parseFloat(item.cash_paid || '0') || 0;
      const gpay = parseFloat(item.gpay_paid || '0') || 0;

      totalEarned += wage;
      totalCash += cash;
      totalGPay += gpay;

      if (item.status === 'FULL') {
        fullCount++;
      } else if (item.status === 'HALF') {
        halfCount++;
      } else {
        leaveCount++;
      }

      if (isMember) {
        memberTotal++;
        if (item.status === 'FULL' || item.status === 'HALF') memberPresent++;
        memberEarned += wage;
      } else {
        driverTotal++;
        if (item.status === 'FULL') driverPresent++;
        driverEarned += wage;
      }
    });

    const totalPaid = totalCash + totalGPay;
    const netBalance = totalEarned - totalPaid;

    return {
      totalStaff: dailySheet.length,
      fullCount,
      halfCount,
      leaveCount,
      presentCount: fullCount + halfCount,
      totalEarned,
      totalCash,
      totalGPay,
      totalPaid,
      netBalance,

      memberTotal,
      memberPresent,
      memberEarned,

      driverTotal,
      driverPresent,
      driverEarned,
    };
  }, [dailySheet]);

  const sheetTotalWage = attendanceStats.totalEarned;
  const sheetPresentCount = attendanceStats.presentCount;

  return (
    <div>
      {/* Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: '#059669',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
          }}
        >
          <CheckCircle size={18} />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Staff Attendance & Wages
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '3px', margin: 0 }}>
            Daily roll-call, wages, advance tracking, and staff management.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleOpenShopCollection()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem' }}
            title="Record cash collected from a shop by a staff member"
          >
            <Store size={15} style={{ color: '#b91c1c' }} />
            Take from Shop
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleOpenPayoutModal()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem' }}
          >
            <Wallet size={15} style={{ color: '#dc2626' }} />
            Give Payout / Advance
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenCreateStaff}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem' }}
          >
            <UserPlus size={15} />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.25rem',
        }}
      >
        <button
          onClick={() => handleTabChange('staff')}
          style={{
            padding: '0.65rem 1.15rem',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'staff' ? 800 : 600,
            fontSize: '0.88rem',
            color: activeTab === 'staff' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'staff' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={16} />
          Staff Directory ({staffList.length})
        </button>

        <button
          onClick={() => handleTabChange('attendance')}
          style={{
            padding: '0.65rem 1.15rem',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'attendance' ? 800 : 600,
            fontSize: '0.88rem',
            color: activeTab === 'attendance' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'attendance' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Calendar size={16} />
          Daily Attendance ({attendanceStats.presentCount}/{attendanceStats.totalStaff})
        </button>

        <button
          onClick={() => handleTabChange('payouts')}
          style={{
            padding: '0.65rem 1.15rem',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'payouts' ? 800 : 600,
            fontSize: '0.88rem',
            color: activeTab === 'payouts' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'payouts' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Wallet size={16} />
          Payouts & Advances
        </button>

        <button
          onClick={() => handleTabChange('accounts')}
          style={{
            padding: '0.65rem 1.15rem',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'accounts' ? 800 : 600,
            fontSize: '0.88rem',
            color: activeTab === 'accounts' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'accounts' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Shield size={16} />
          System Login Accounts ({users.length})
        </button>
      </div>

      {/* ─── TAB 1: STAFF DIRECTORY ────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search staff by name, phone, designation..."
              style={{ minWidth: '240px', flex: 1 }}
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
            />
            <select
              className="form-select"
              value={staffFilterType}
              onChange={(e) => setStaffFilterType(e.target.value as any)}
              style={{ minWidth: '220px' }}
            >
              <option value="all">All Staff & Members</option>
              <option value="staff">Staff & Drivers Only</option>
              <option value="member">Share Members (Business Owners) Only</option>
              <option value="worker">Direct Profiles (No login account)</option>
              <option value="login">Staff with Login Account</option>
            </select>
          </div>

          <div className="table-container">
            {staffLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role / Title</th>
                    <th>Phone Number</th>
                    <th>ID Proof (Staff & Driver)</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.length > 0 ? (
                    staffList.map((st) => (
                      <tr
                        key={st.id}
                        onClick={() => handleOpenEditStaff(st)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view full details and edit"
                      >
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                            {st.full_name}
                          </div>
                          {st.has_login_account ? (
                            <span
                              className="badge badge-neutral"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px', fontSize: '0.68rem', padding: '1px 6px' }}
                            >
                              <UserCheck size={11} />
                              @{st.user_details?.username} ({st.user_details?.role})
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Direct Profile
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ marginBottom: '3px' }}>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontWeight: 700,
                                border: '1px solid var(--border)',
                              }}
                            >
                              {st.role_type === 'STAFF' ? 'Staff / Driver' : 'Share Member'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{st.designation}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>{st.phone_number || '—'}</span>
                        </td>
                        <td>
                          {st.role_type === 'STAFF' ? (
                            st.proof_document_url ? (
                              <a
                                href={st.proof_document_url}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', fontWeight: 600 }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileCheck size={13} color="#b91c1c" />
                                View Proof
                              </a>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditStaff(st);
                                }}
                              >
                                <Upload size={12} /> Upload Proof
                              </button>
                            )
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button
                              onClick={() => handleOpenShopCollection(st.id)}
                              className="btn btn-secondary btn-sm"
                              title={`Record money taken/collected from a customer shop by ${st.full_name}`}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: '#b91c1c',
                                borderColor: '#fecaca',
                                backgroundColor: '#fef2f2',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Store size={13} color="#b91c1c" />
                              Take from Shop
                            </button>
                            <button
                              onClick={() => handleOpenEditStaff(st)}
                              className="btn btn-secondary btn-sm"
                              title="View Full Profile Details & Edit"
                              style={{ padding: '4px 10px', fontSize: '0.76rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit2 size={13} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleOpenPayoutModal(st.id)}
                              className="btn btn-secondary btn-sm"
                              title="Give Payout / Advance"
                              style={{ padding: '4px 8px', color: '#b91c1c' }}
                            >
                              <Wallet size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenLedgerModal(st)}
                              className="btn btn-secondary btn-sm"
                              title="View Ledger & Attendance History"
                              style={{ padding: '4px 8px', color: '#b91c1c' }}
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(st.id, st.full_name)}
                              className="btn btn-secondary btn-sm"
                              title="Delete Profile"
                              style={{ padding: '4px 8px', color: '#dc2626' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No staff members found. Click "Add Staff Member" to register one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: DAILY ATTENDANCE & WAGES (CLEAN & SIMPLE) ─────── */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* 1. Clean Top Header & Date Navigation Toolbar */}
          <div
            className="card"
            style={{
              padding: '0.85rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.85rem',
              background: 'var(--bg-card)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            {/* Title & Date Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: '#fef2f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                  }}
                >
                  <Calendar size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    Daily Attendance &amp; Wages
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    1-Tap Roll-Call, wage calculation &amp; live expense sync
                  </div>
                </div>
              </div>

              {/* Date Nav Button Group */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'var(--bg-hover, #f8fafc)',
                  padding: '4px 6px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleShiftDate(-1)}
                  style={{ padding: '3px 8px', height: 28, fontSize: '0.78rem' }}
                  title="Previous Day"
                >
                  <ChevronLeft size={14} />
                </button>
                <input
                  type="date"
                  className="form-input"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  style={{
                    fontWeight: 700,
                    padding: '2px 8px',
                    fontSize: '0.82rem',
                    height: 28,
                    width: 135,
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleShiftDate(1)}
                  style={{ padding: '3px 8px', height: 28, fontSize: '0.78rem' }}
                  title="Next Day"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAttendanceDate(new Date().toISOString().split('T')[0])}
                  style={{ padding: '2px 10px', height: 28, fontSize: '0.75rem', fontWeight: 800 }}
                >
                  Today
                </button>
              </div>

              {/* Live Auto-Save Status Badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                {attendanceSaving || hasUnsavedChanges ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.74rem',
                      color: '#b45309',
                      background: '#fffbeb',
                      padding: '4px 9px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      border: '1px solid #fde68a',
                    }}
                    title="Saving changes in background..."
                  >
                    <Clock size={13} style={{ animation: 'spin 1.2s linear infinite' }} />
                    Saving changes...
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.74rem',
                      color: '#059669',
                      background: '#ecfdf5',
                      padding: '4px 9px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      border: '1px solid #a7f3d0',
                    }}
                    title="All attendance and wages are synchronized with central database"
                  >
                    <CheckCircle size={13} />
                    Auto-Saved
                  </span>
                )}

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  title="Toggle automatic saving as you click"
                >
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Auto-Save</span>
                </label>
              </div>
            </div>

            {/* Actions & Save Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenCreateForSection('MEMBER')}
                style={{
                  height: 32,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Plus size={14} />
                <span>Add Member</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenCreateForSection('DRIVER')}
                style={{
                  height: 32,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Truck size={14} />
                <span>Add Driver</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveAttendance}
                disabled={attendanceSaving}
                style={{
                  height: 32,
                  padding: '0 1.05rem',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Save size={15} />
                <span>{attendanceSaving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>

          {/* 2. 3 Clean, Simple, Modern KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {/* Card 1: Attendance Summary */}
            <div className="card" style={{ padding: '0.9rem 1.15rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Roll-Call Status ({attendanceDate})
                </span>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={16} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {attendanceStats.presentCount} / {attendanceStats.totalStaff}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 800 }}>Present Today</span>
              </div>
              {/* Progress bar */}
              <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#f1f5f9', marginTop: '8px' }}>
                <div style={{ width: `${attendanceStats.totalStaff ? (attendanceStats.fullCount / attendanceStats.totalStaff) * 100 : 0}%`, background: '#059669' }} title={`${attendanceStats.fullCount} Full Day`} />
                <div style={{ width: `${attendanceStats.totalStaff ? (attendanceStats.halfCount / attendanceStats.totalStaff) * 100 : 0}%`, background: '#d97706' }} title={`${attendanceStats.halfCount} Half Day`} />
                <div style={{ width: `${attendanceStats.totalStaff ? (attendanceStats.leaveCount / attendanceStats.totalStaff) * 100 : 0}%`, background: '#dc2626' }} title={`${attendanceStats.leaveCount} On Leave`} />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#047857', fontWeight: 700 }}>🟢 {attendanceStats.fullCount} Full</span>
                <span style={{ color: '#b45309', fontWeight: 700 }}>🟡 {attendanceStats.halfCount} Half</span>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>🔴 {attendanceStats.leaveCount} Leave</span>
              </div>
            </div>

            {/* Card 2: Daily Wages Earned */}
            <div className="card" style={{ padding: '0.9rem 1.15rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Daily Wages Earned
                </span>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e40af', lineHeight: 1.1 }}>
                {formatCurrency(attendanceStats.totalEarned)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '10px', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span>Members: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(attendanceStats.memberEarned)}</strong></span>
                <span>• Drivers: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(attendanceStats.driverEarned)}</strong></span>
              </div>
            </div>

            {/* Card 3: Paid Out Today & Due */}
            <div className="card" style={{ padding: '0.9rem 1.15rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Paid &amp; Balance Due
                </span>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={16} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {formatCurrency(attendanceStats.totalPaid)}
                </div>
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '5px',
                    background: attendanceStats.netBalance > 0 ? '#fef2f2' : '#ecfdf5',
                    color: attendanceStats.netBalance > 0 ? '#dc2626' : '#059669',
                    border: `1px solid ${attendanceStats.netBalance > 0 ? '#fecaca' : '#a7f3d0'}`,
                  }}
                >
                  {attendanceStats.netBalance > 0 ? `${formatCurrency(attendanceStats.netBalance)} due` : '✓ All Settled'}
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '10px', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#047857', fontWeight: 700 }}>💵 Cash: {formatCurrency(attendanceStats.totalCash)}</span>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>📱 GPay: {formatCurrency(attendanceStats.totalGPay)}</span>
                <span style={{ fontSize: '0.65rem', color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: '3px' }}>In Expenses</span>
              </div>
            </div>
          </div>

          {/* 3. Compact Clean Filter & 1-Tap Bulk Actions Toolbar */}
          <div
            style={{
              display: 'flex',
              gap: '0.65rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              background: 'var(--bg-card)',
              padding: '0.6rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1 1 200px', maxWidth: 280 }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search staff or driver..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                style={{ height: 30, fontSize: '0.8rem', width: '100%', padding: '0 0.55rem' }}
              />
              {attendanceSearch && (
                <button
                  type="button"
                  onClick={() => setAttendanceSearch('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Section Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${attendanceFilterRole === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAttendanceFilterRole('ALL')}
                style={{ height: 30, fontSize: '0.78rem', padding: '0 0.75rem', fontWeight: 700 }}
              >
                All ({attendanceStats.totalStaff})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${attendanceFilterRole === 'MEMBERS' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAttendanceFilterRole('MEMBERS')}
                style={{ height: 30, fontSize: '0.78rem', padding: '0 0.75rem', fontWeight: 700 }}
              >
                Share Members ({attendanceStats.memberTotal})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${attendanceFilterRole === 'DRIVERS' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAttendanceFilterRole('DRIVERS')}
                style={{ height: 30, fontSize: '0.78rem', padding: '0 0.75rem', fontWeight: 700 }}
              >
                Drivers ({attendanceStats.driverTotal})
              </button>
            </div>

            {/* 1-Tap Bulk Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleMarkAllFull}
                style={{
                  height: 30,
                  fontSize: '0.76rem',
                  padding: '0 0.65rem',
                  fontWeight: 700,
                  color: '#059669',
                  borderColor: '#a7f3d0',
                  background: '#ecfdf5',
                }}
                title="Mark all staff full day present"
              >
                <Check size={13} /> Mark All Present
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAutoFillCash}
                style={{ height: 30, fontSize: '0.76rem', padding: '0 0.65rem', fontWeight: 700 }}
                title="Fill Cash column with earned wage for quick daily payout"
              >
                <DollarSign size={13} /> Pay All Cash
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleMarkAllLeave}
                style={{
                  height: 30,
                  fontSize: '0.76rem',
                  padding: '0 0.65rem',
                  fontWeight: 700,
                  color: '#dc2626',
                  borderColor: '#fecaca',
                  background: '#fef2f2',
                }}
                title="Mark all staff on leave"
              >
                <X size={13} /> Mark All Leave
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearPayouts}
                style={{ height: 30, fontSize: '0.76rem', padding: '0 0.65rem' }}
                title="Reset Cash and GPay amounts to 0"
              >
                Clear Paid
              </button>
            </div>
          </div>

          {/* 4. Clean Simplified Table Sections */}
          {attendanceLoading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
              <div style={{ marginTop: '0.65rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading roll-call sheet...
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(['MEMBERS', 'DRIVERS'] as const).map((secKey) => {
                if (attendanceFilterRole !== 'ALL' && attendanceFilterRole !== secKey) {
                  return null;
                }

                // Filter items for this section
                const sectionItems = dailySheet.filter((item) => {
                  const isDriver = isDriverPersonnel(item);
                  const isMember = !isDriver;

                  if (secKey === 'MEMBERS' && !isMember) return false;
                  if (secKey === 'DRIVERS' && !isDriver) return false;

                  if (attendanceSearch.trim()) {
                    const q = attendanceSearch.toLowerCase().trim();
                    const match =
                      item.full_name.toLowerCase().includes(q) ||
                      (item.phone_number && item.phone_number.includes(q)) ||
                      (item.designation && item.designation.toLowerCase().includes(q));
                    if (!match) return false;
                  }
                  return true;
                });

                const secTitle =
                  secKey === 'MEMBERS'
                    ? 'Share Members (Owners & Partners)'
                    : 'Staff Drivers';

                const secSubtitle =
                  secKey === 'MEMBERS'
                    ? 'Roll-call: Full Day, Half Day, or Leave'
                    : 'Roll-call: Present or Leave';

                const secPresent = sectionItems.filter((i) => i.status === 'FULL' || i.status === 'HALF').length;
                const secEarned = sectionItems.reduce((acc, i) => acc + (parseFloat(i.calculated_wage) || 0), 0);

                return (
                  <div
                    key={secKey}
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Section Header Banner */}
                    <div
                      style={{
                        padding: '0.7rem 1.15rem',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.65rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        {secKey === 'MEMBERS' ? (
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#fef2f2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Briefcase size={16} />
                          </div>
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Truck size={16} />
                          </div>
                        )}
                        <div>
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                            {secTitle}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: '0.45rem' }}>
                            ({secSubtitle})
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <span style={{ color: '#059669' }}>{secPresent} / {sectionItems.length} Present</span> • Total Wage: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(secEarned)}</strong>
                        </span>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenCreateForSection(secKey === 'MEMBERS' ? 'MEMBER' : 'DRIVER')}
                          style={{
                            height: 28,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '0 0.65rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Plus size={13} />
                          {secKey === 'MEMBERS' ? 'Add Member' : 'Add Driver'}
                        </button>
                      </div>
                    </div>

                    {/* Clean Simplified Table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '0.82rem',
                          textAlign: 'left',
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: '#ffffff',
                              borderBottom: '1px solid var(--border)',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: 'var(--text-muted)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            <th style={{ padding: '0.65rem 0.65rem', width: '38px', textAlign: 'center' }}>#</th>
                            <th style={{ padding: '0.65rem 0.85rem' }}>Staff Personnel</th>
                            <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Daily Rate</th>
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Attendance (1-Click Toggle)</th>
                            <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Earned Wage</th>
                            <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Paid Today (Cash / GPay)</th>
                            <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '0.65rem 0.75rem' }}>Daily Remarks</th>
                            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '70px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionItems.length > 0 ? (
                            sectionItems.map((item, idx) => {
                              const earned = parseFloat(item.calculated_wage) || 0;
                              const cash = parseFloat(item.cash_paid || '0') || 0;
                              const gpay = parseFloat(item.gpay_paid || '0') || 0;
                              const rowPaid = cash + gpay;
                              const rowDue = earned - rowPaid;

                              return (
                                <tr
                                  key={item.staff_id}
                                  style={{
                                    borderBottom: '1px solid var(--border)',
                                    background: idx % 2 === 0 ? '#ffffff' : 'rgba(248, 250, 252, 0.6)',
                                    transition: 'background 0.12s ease',
                                  }}
                                >
                                  {/* 1. # */}
                                  <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 700 }}>
                                    {idx + 1}
                                  </td>

                                  {/* 2. Staff Personnel (Avatar + Name + Phone + Role) */}
                                  <td style={{ padding: '0.65rem 0.85rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      {/* Avatar Circle */}
                                      <div
                                        style={{
                                          width: 32,
                                          height: 32,
                                          borderRadius: '50%',
                                          background: secKey === 'MEMBERS' ? '#fee2e2' : '#dbeafe',
                                          color: secKey === 'MEMBERS' ? '#991b1b' : '#1e40af',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.74rem',
                                          fontWeight: 800,
                                          flexShrink: 0,
                                          border: `1.5px solid ${secKey === 'MEMBERS' ? '#fecaca' : '#bfdbfe'}`,
                                        }}
                                      >
                                        {getInitials(item.full_name)}
                                      </div>
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                          <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                                            {item.full_name}
                                          </strong>
                                          <span
                                            style={{
                                              fontSize: '0.65rem',
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                              fontWeight: 700,
                                              background: secKey === 'MEMBERS' ? '#fef2f2' : '#eff6ff',
                                              color: secKey === 'MEMBERS' ? '#b91c1c' : '#1d4ed8',
                                              border: `1px solid ${secKey === 'MEMBERS' ? '#fee2e2' : '#dbeafe'}`,
                                            }}
                                          >
                                            {item.designation}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px', display: 'flex', gap: '0.45rem' }}>
                                          {item.phone_number && <span>{item.phone_number}</span>}
                                          {item.tenure_slab_label && (
                                            <span style={{ opacity: 0.85 }}>
                                              • {isDriverPersonnel(item) && item.tenure_slab_label?.includes('Member') ? 'Tenure Slab' : item.tenure_slab_label}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* 3. Base Daily Rate */}
                                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                    {formatCurrency(item.base_daily_wage)}
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '2px' }}>/d</span>
                                  </td>

                                  {/* 4. Attendance Status (Vibrant 1-Click Color Toggle) */}
                                  <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                                    <div
                                      style={{
                                        display: 'inline-flex',
                                        background: '#f1f5f9',
                                        borderRadius: '8px',
                                        padding: '3px',
                                        gap: '3px',
                                        border: '1px solid #e2e8f0',
                                      }}
                                    >
                                      {secKey === 'MEMBERS' ? (
                                        <>
                                          {/* Full Day (Green) */}
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateSheetItem(item.staff_id, 'FULL')}
                                            style={{
                                              border: item.status === 'FULL' ? '1.5px solid #047857' : '1.5px solid transparent',
                                              padding: '5px 12px',
                                              borderRadius: '6px',
                                              fontWeight: 800,
                                              fontSize: '0.75rem',
                                              cursor: 'pointer',
                                              background: item.status === 'FULL' ? '#059669' : 'transparent',
                                              color: item.status === 'FULL' ? '#ffffff' : '#047857',
                                              boxShadow: item.status === 'FULL' ? '0 2px 5px rgba(5, 150, 105, 0.35)' : 'none',
                                              transition: 'all 0.12s ease',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title="Full Day: 100% daily wage"
                                          >
                                            {item.status === 'FULL' && <Check size={12} />}
                                            Full Day
                                          </button>

                                          {/* Half Day (Amber) */}
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateSheetItem(item.staff_id, 'HALF')}
                                            style={{
                                              border: item.status === 'HALF' ? '1.5px solid #b45309' : '1.5px solid transparent',
                                              padding: '5px 12px',
                                              borderRadius: '6px',
                                              fontWeight: 800,
                                              fontSize: '0.75rem',
                                              cursor: 'pointer',
                                              background: item.status === 'HALF' ? '#d97706' : 'transparent',
                                              color: item.status === 'HALF' ? '#ffffff' : '#b45309',
                                              boxShadow: item.status === 'HALF' ? '0 2px 5px rgba(217, 119, 6, 0.35)' : 'none',
                                              transition: 'all 0.12s ease',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title="Half Day: 50% daily wage"
                                          >
                                            {item.status === 'HALF' && <Clock size={12} />}
                                            Half Day
                                          </button>

                                          {/* Leave (Red) */}
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateSheetItem(item.staff_id, 'LEAVE')}
                                            style={{
                                              border: item.status === 'LEAVE' ? '1.5px solid #b91c1c' : '1.5px solid transparent',
                                              padding: '5px 12px',
                                              borderRadius: '6px',
                                              fontWeight: 800,
                                              fontSize: '0.75rem',
                                              cursor: 'pointer',
                                              background: item.status === 'LEAVE' ? '#dc2626' : 'transparent',
                                              color: item.status === 'LEAVE' ? '#ffffff' : '#991b1b',
                                              boxShadow: item.status === 'LEAVE' ? '0 2px 5px rgba(220, 38, 38, 0.35)' : 'none',
                                              transition: 'all 0.12s ease',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title="Leave: ₹0 wage"
                                          >
                                            {item.status === 'LEAVE' && <X size={12} />}
                                            Leave
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          {/* Driver: Present (Green) */}
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateSheetItem(item.staff_id, 'FULL')}
                                            style={{
                                              border: item.status === 'FULL' ? '1.5px solid #047857' : '1.5px solid transparent',
                                              padding: '5px 16px',
                                              borderRadius: '6px',
                                              fontWeight: 800,
                                              fontSize: '0.75rem',
                                              cursor: 'pointer',
                                              background: item.status === 'FULL' ? '#059669' : 'transparent',
                                              color: item.status === 'FULL' ? '#ffffff' : '#047857',
                                              boxShadow: item.status === 'FULL' ? '0 2px 5px rgba(5, 150, 105, 0.35)' : 'none',
                                              transition: 'all 0.12s ease',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                            }}
                                            title="Present: Full daily wage"
                                          >
                                            {item.status === 'FULL' && <Check size={12} />}
                                            Present
                                          </button>

                                          {/* Driver: Leave (Red) */}
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateSheetItem(item.staff_id, 'LEAVE')}
                                            style={{
                                              border: item.status === 'LEAVE' ? '1.5px solid #b91c1c' : '1.5px solid transparent',
                                              padding: '5px 16px',
                                              borderRadius: '6px',
                                              fontWeight: 800,
                                              fontSize: '0.75rem',
                                              cursor: 'pointer',
                                              background: item.status === 'LEAVE' ? '#dc2626' : 'transparent',
                                              color: item.status === 'LEAVE' ? '#ffffff' : '#991b1b',
                                              boxShadow: item.status === 'LEAVE' ? '0 2px 5px rgba(220, 38, 38, 0.35)' : 'none',
                                              transition: 'all 0.12s ease',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                            }}
                                            title="Leave: ₹0 wage"
                                          >
                                            {item.status === 'LEAVE' && <X size={12} />}
                                            Leave
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>

                                  {/* 5. Earned Wage Today */}
                                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                                    <strong
                                      style={{
                                        fontSize: '0.92rem',
                                        fontWeight: 900,
                                        color: item.status === 'LEAVE' ? 'var(--text-muted)' : '#0f172a',
                                      }}
                                    >
                                      {formatCurrency(earned)}
                                    </strong>
                                  </td>

                                  {/* 6. Paid Today (Cash + GPay + 1-Tap Pay Full) */}
                                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                      {/* Cash Input */}
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          background: '#ffffff',
                                          border: '1px solid var(--border)',
                                          borderRadius: '6px',
                                          padding: '2px 5px',
                                        }}
                                        title="Cash paid today"
                                      >
                                        <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 800, marginRight: '2px' }}>💵</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          className="hide-arrows"
                                          value={item.cash_paid ?? '0.00'}
                                          onChange={(e) => handleUpdatePayment(item.staff_id, 'cash_paid', e.target.value)}
                                          onFocus={(e) => {
                                            if (e.target.value === '0' || e.target.value === '0.00') e.target.select();
                                          }}
                                          style={{
                                            width: '56px',
                                            textAlign: 'right',
                                            fontWeight: 800,
                                            fontFamily: 'monospace',
                                            fontSize: '0.82rem',
                                            border: 'none',
                                            background: 'transparent',
                                            outline: 'none',
                                            color: 'var(--text-primary)',
                                          }}
                                        />
                                      </div>

                                      {/* GPay Input */}
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          background: '#ffffff',
                                          border: '1px solid var(--border)',
                                          borderRadius: '6px',
                                          padding: '2px 5px',
                                        }}
                                        title="GPay / Online wage paid today"
                                      >
                                        <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 800, marginRight: '2px' }}>📱</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          className="hide-arrows"
                                          value={item.gpay_paid ?? '0.00'}
                                          onChange={(e) => handleUpdatePayment(item.staff_id, 'gpay_paid', e.target.value)}
                                          onFocus={(e) => {
                                            if (e.target.value === '0' || e.target.value === '0.00') e.target.select();
                                          }}
                                          style={{
                                            width: '56px',
                                            textAlign: 'right',
                                            fontWeight: 800,
                                            fontFamily: 'monospace',
                                            fontSize: '0.82rem',
                                            border: 'none',
                                            background: 'transparent',
                                            outline: 'none',
                                            color: 'var(--text-primary)',
                                          }}
                                        />
                                      </div>

                                      {/* 1-Tap "Pay Full" Quick Button */}
                                      {earned > 0 && rowPaid === 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handlePayFullWage(item.staff_id)}
                                          style={{
                                            border: '1px solid #d1fae5',
                                            background: '#ecfdf5',
                                            color: '#047857',
                                            borderRadius: '5px',
                                            padding: '2px 6px',
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '2px',
                                          }}
                                          title="1-Tap Pay Full: fills Cash with earned wage"
                                        >
                                          <Zap size={10} style={{ color: '#059669' }} />
                                          Pay Full
                                        </button>
                                      )}
                                    </div>
                                  </td>

                                  {/* 7. Status / Balance Due */}
                                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                                    {rowDue === 0 && earned > 0 ? (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          padding: '2px 8px',
                                          borderRadius: '5px',
                                          background: '#ecfdf5',
                                          color: '#059669',
                                          border: '1px solid #a7f3d0',
                                        }}
                                      >
                                        ✓ Settled
                                      </span>
                                    ) : rowDue > 0 ? (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          padding: '2px 8px',
                                          borderRadius: '5px',
                                          background: '#fef2f2',
                                          color: '#dc2626',
                                          border: '1px solid #fecaca',
                                        }}
                                      >
                                        {formatCurrency(rowDue)} due
                                      </span>
                                    ) : rowDue < 0 ? (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          padding: '2px 8px',
                                          borderRadius: '5px',
                                          background: '#eff6ff',
                                          color: '#2563eb',
                                          border: '1px solid #bfdbfe',
                                        }}
                                      >
                                        +{formatCurrency(Math.abs(rowDue))} adv
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>—</span>
                                    )}
                                  </td>

                                  {/* 8. Daily Remark */}
                                  <td style={{ padding: '0.65rem 0.75rem' }}>
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="Note / remark..."
                                      style={{
                                        padding: '2px 7px',
                                        fontSize: '0.76rem',
                                        width: '100%',
                                        maxWidth: '170px',
                                        height: 26,
                                        borderRadius: '5px',
                                      }}
                                      value={item.notes}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setDailySheet((prev) =>
                                          prev.map((i) => (i.staff_id === item.staff_id ? { ...i, notes: val } : i))
                                        );
                                      }}
                                    />
                                  </td>

                                  {/* 9. Actions */}
                                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const original = staffList.find((s) => s.id === item.staff_id);
                                          if (original) handleOpenLedgerModal(original);
                                        }}
                                        style={{
                                          border: '1px solid var(--border)',
                                          background: '#ffffff',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          padding: '3px 5px',
                                          color: '#b91c1c',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                        }}
                                        title="View ledger / wage statement"
                                      >
                                        <FileText size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const original = staffList.find((s) => s.id === item.staff_id);
                                          if (original) handleOpenEditStaff(original);
                                        }}
                                        style={{
                                          border: '1px solid var(--border)',
                                          background: '#ffffff',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          padding: '3px 5px',
                                          color: 'var(--text-muted)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                        }}
                                        title="Edit staff profile"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                No active personnel found in this section.{' '}
                                <button
                                  type="button"
                                  onClick={() => handleOpenCreateForSection(secKey === 'MEMBERS' ? 'MEMBER' : 'DRIVER')}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#2563eb',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                  }}
                                >
                                  Click here to add one
                                </button>
                                .
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* 5. Clean Sheet Summary Footer */}
              <div
                className="card"
                style={{
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '10px',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.85rem',
                  boxShadow: 'var(--shadow-sm)',
                  marginTop: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                    }}
                  >
                    Sheet Summary
                  </span>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <strong>{attendanceStats.totalStaff}</strong> Total Personnel •{' '}
                    <strong style={{ color: '#059669' }}>{attendanceStats.presentCount} Present</strong> (
                    {attendanceStats.fullCount} Full, {attendanceStats.halfCount} Half,{' '}
                    <strong style={{ color: '#dc2626' }}>{attendanceStats.leaveCount} Leave</strong>)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.84rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>
                      Earned Wages
                    </span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 900 }}>
                      {formatCurrency(attendanceStats.totalEarned)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>
                      Cash Given
                    </span>
                    <strong style={{ color: '#059669', fontSize: '1.05rem', fontWeight: 900 }}>
                      {formatCurrency(attendanceStats.totalCash)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>
                      GPay Given
                    </span>
                    <strong style={{ color: '#2563eb', fontSize: '1.05rem', fontWeight: 900 }}>
                      {formatCurrency(attendanceStats.totalGPay)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>
                      Total Paid Out
                    </span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 900 }}>
                      {formatCurrency(attendanceStats.totalPaid)}
                    </strong>
                  </div>
                  <div
                    style={{
                      background: attendanceStats.netBalance > 0 ? '#fef2f2' : '#ecfdf5',
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: `1.5px solid ${attendanceStats.netBalance > 0 ? '#fecaca' : '#a7f3d0'}`,
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', color: attendanceStats.netBalance > 0 ? '#991b1b' : '#047857', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>
                      {attendanceStats.netBalance > 0 ? 'Net Due Today' : 'Status'}
                    </span>
                    <strong
                      style={{
                        color: attendanceStats.netBalance > 0 ? '#dc2626' : '#059669',
                        fontSize: '1.1rem',
                        fontWeight: 900,
                      }}
                    >
                      {attendanceStats.netBalance > 0 ? formatCurrency(attendanceStats.netBalance) : '✓ Fully Settled'}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveAttendance}
                    disabled={attendanceSaving}
                    style={{
                      height: 32,
                      padding: '0 1rem',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Save size={14} />
                    <span>{attendanceSaving ? 'Saving...' : 'Save Sheet'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: PAYOUTS & ADVANCES ────────────────────────────────────── */}
      {activeTab === 'payouts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Audit trail of cash advances, daily wages, and monthly salary payouts to staff.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => handleOpenPayoutModal()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <Plus size={16} /> Record Payout / Advance
            </button>
          </div>

          <div className="table-container">
            {payoutsLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Staff Member</th>
                    <th>Amount (₹)</th>
                    <th>Payout Type</th>
                    <th>Payment Method</th>
                    <th>Paid By</th>
                    <th>Reference / Remarks</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length > 0 ? (
                    payouts.map((p) => (
                      <tr key={p.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(p.date)}</td>
                        <td>
                          <strong>{p.staff_name}</strong>
                        </td>
                        <td style={{ fontWeight: 800, color: '#dc2626', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                          {formatCurrency(p.amount)}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              p.payout_type === 'ADVANCE'
                                ? 'badge-warning'
                                : p.payout_type === 'SALARY'
                                ? 'badge-primary'
                                : 'badge-neutral'
                            }`}
                          >
                            {p.payout_type_display || p.payout_type}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span className="badge badge-neutral">{p.payment_method_display || p.payment_method}</span>
                            <span style={{ fontSize: '0.62rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              In Expenses
                            </span>
                          </div>
                        </td>
                        <td>{p.paid_by_name || '—'}</td>
                        <td style={{ maxWidth: '240px', color: 'var(--text-secondary)' }}>
                          <div>{p.notes || '—'}</div>
                          {p.reference && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ref: {p.reference}</div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeletePayout(p.id, p.amount)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', color: '#dc2626' }}
                            title="Delete payout record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No payouts or advances recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: SYSTEM LOGIN ACCOUNTS ─────────────────────────────────── */}
      {activeTab === 'accounts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              System credentials and permissions for Owner, Managers, and Drivers who access the software.
            </p>
            <button
              className="btn btn-primary"
              onClick={handleOpenCreateUser}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <Plus size={16} /> New Login Account
            </button>
          </div>

          <div className="table-container">
            {usersLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>System Role</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.username}</strong>
                        </td>
                        <td>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || '—'}</td>
                        <td>
                          <span
                            className={`badge ${
                              u.role === 'OWNER'
                                ? 'badge-primary'
                                : u.role === 'MANAGER'
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>{u.phone_number || '—'}</td>
                        <td>{u.date_joined ? formatDate(u.date_joined) : '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => {
                                setResetPasswordUser(u);
                                setNewPassword('');
                              }}
                              className="btn btn-secondary btn-sm"
                              title="Reset Password"
                              style={{ padding: '4px 8px' }}
                            >
                              <Key size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="btn btn-secondary btn-sm"
                              title="Edit User"
                              style={{ padding: '4px 8px' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            {currentUser?.id !== u.id && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="btn btn-secondary btn-sm"
                                title="Delete User"
                                style={{ padding: '4px 8px', color: '#dc2626' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No user accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT STAFF MEMBER ────────────────────────────── */}
      {isStaffModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '1.75rem',
              borderRadius: '12px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Users size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  {editingStaff ? `Edit Profile & Details — ${editingStaff.full_name}` : 'Add Staff Member / Share Member'}
                </h3>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {editingStaff && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: 'var(--border-color, #f1f5f9)',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Daily Rate</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>{formatCurrency(editingStaff.current_daily_wage)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Earned</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(editingStaff.total_earned)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Paid</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(editingStaff.total_paid)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Balance Due</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: parseFloat(editingStaff.balance_due) > 0 ? '#b91c1c' : '#059669' }}>
                    {formatCurrency(editingStaff.balance_due)}
                  </div>
                </div>
              </div>
            )}

            {staffError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                {staffError}
              </div>
            )}

            <form onSubmit={handleSaveStaff}>
              {/* Role Classification Toggle (Staff vs Member) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Select Role Classification *
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    padding: '4px',
                    backgroundColor: 'var(--border-color, #f1f5f9)',
                    borderRadius: '8px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setStaffRoleType('STAFF');
                      setStaffWageType('DEFAULT_SLAB');
                      if (staffDesignation === 'Share Member' || staffDesignation === 'Partner / Owner' || !staffDesignation) {
                        setStaffDesignation('Staff Driver');
                      }
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      background: staffRoleType === 'STAFF' ? 'var(--primary, #3b82f6)' : 'transparent',
                      color: staffRoleType === 'STAFF' ? '#fff' : 'var(--text-primary)',
                      boxShadow: staffRoleType === 'STAFF' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>Staff / Driver</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: 400, marginTop: '2px' }}>
                      Driver / Operations • Present (100%) or Leave (₹0)
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffRoleType('MEMBER');
                      setStaffWageType('CUSTOM');
                      if (staffDesignation === 'Staff Driver' || !staffDesignation) {
                        setStaffDesignation('Share Member');
                      }
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      background: staffRoleType === 'MEMBER' ? 'var(--primary, #3b82f6)' : 'transparent',
                      color: staffRoleType === 'MEMBER' ? '#fff' : 'var(--text-primary)',
                      boxShadow: staffRoleType === 'MEMBER' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>Share Member (Business Owner)</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: 400, marginTop: '2px' }}>
                      Partner / Shareholder • Full (100%), Half (50%), Leave (₹0)
                    </div>
                  </button>
                </div>
              </div>

              {/* Account Type Selector Toggle */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  padding: '4px',
                  backgroundColor: 'var(--border-color, #f1f5f9)',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setHasLoginAccountToggle(false)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: !hasLoginAccountToggle ? '#fff' : 'transparent',
                    color: !hasLoginAccountToggle ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: !hasLoginAccountToggle ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Direct Profile (No Login Account)
                </button>
                <button
                  type="button"
                  onClick={() => setHasLoginAccountToggle(true)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: hasLoginAccountToggle ? '#fff' : 'transparent',
                    color: hasLoginAccountToggle ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: hasLoginAccountToggle ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Link Login User Account
                </button>
              </div>

              {hasLoginAccountToggle && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Select Associated Login User Account
                  </label>
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={staffSelectedUser}
                    onChange={(e) => setStaffSelectedUser(e.target.value)}
                  >
                    <option value="">-- Choose User Account --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.first_name} {u.last_name} - {u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rashid Khan"
                    style={{ width: '100%', fontWeight: 700 }}
                    value={staffFullName}
                    onChange={(e) => setStaffFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    style={{ width: '100%' }}
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={staffRoleType === 'STAFF' ? 'e.g. Staff Driver, Operations...' : 'e.g. Share Member, Partner, Managing Partner...'}
                    style={{ width: '100%' }}
                    value={staffDesignation}
                    onChange={(e) => setStaffDesignation(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                    {(staffRoleType === 'STAFF'
                      ? ['Staff Driver', 'Sales / Counter', 'Helper', 'Operations']
                      : ['Share Member', 'Partner / Owner', 'Managing Partner', 'Share Partner']
                    ).map((desig) => (
                      <button
                        key={desig}
                        type="button"
                        onClick={() => setStaffDesignation(desig)}
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          backgroundColor: staffDesignation === desig ? 'var(--primary)' : 'var(--bg-main)',
                          color: staffDesignation === desig ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {desig}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Joined Date *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={staffJoinedDate}
                    onChange={(e) => setStaffJoinedDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Wage Slab / Daily Amount Configuration */}
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--border-color, #f8fafc)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid var(--border-color, #e2e8f0)',
                }}
              >
                {staffRoleType === 'MEMBER' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                      Custom Daily Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className="form-input"
                      placeholder="e.g. 500, 750, 1000"
                      style={{ width: '100%', fontWeight: 700, fontSize: '1rem' }}
                      value={staffCustomWage}
                      onChange={(e) => setStaffCustomWage(e.target.value)}
                      required
                    />
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Full Day = 100% of custom amount (₹{staffCustomWage || '0'}) • Half Day = 50% • Leave = ₹0
                    </div>
                  </div>
                ) : (
                  <>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      Daily Wage Slab Calculation
                    </label>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="wageType"
                          checked={staffWageType === 'DEFAULT_SLAB'}
                          onChange={() => setStaffWageType('DEFAULT_SLAB')}
                        />
                        <span>Default Tenure Slabs</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="wageType"
                          checked={staffWageType === 'CUSTOM'}
                          onChange={() => setStaffWageType('CUSTOM')}
                        />
                        <span>Custom Daily Amount</span>
                      </label>
                    </div>

                    {staffWageType === 'DEFAULT_SLAB' ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          Automatic Tenure Slabs (Calculated from Joined Date):
                        </div>
                        <div>• <strong>0 to 2 Months:</strong> ₹400 / day</div>
                        <div>• <strong>2 to 6 Months:</strong> ₹500 / day</div>
                        <div>• <strong>6 to 12 Months:</strong> ₹600 / day</div>
                        <div>• <strong>1 to 2 Years:</strong> ₹700 / day</div>
                        <div>• <strong>2+ Years:</strong> ₹800 / day</div>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                          Custom Daily Amount (₹) *
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          className="form-input"
                          placeholder="e.g. 550 or 750"
                          style={{ width: '100%', fontWeight: 700 }}
                          value={staffCustomWage}
                          onChange={(e) => setStaffCustomWage(e.target.value)}
                          required={staffWageType === 'CUSTOM'}
                        />
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Full Day = 100% of custom rate • Half Day = 50% • Leave = ₹0
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ID Proof Document (Staff & Driver only) */}
              {staffRoleType === 'STAFF' && (
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--border-color, #f8fafc)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid var(--border-color, #e2e8f0)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>
                      ID Proof Document (Staff & Driver)
                    </label>
                    {editingStaff?.proof_document_url && (
                      <a
                        href={editingStaff.proof_document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                      >
                        <FileCheck size={13} color="#059669" />
                        View Uploaded Proof
                      </a>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="form-input"
                    style={{ width: '100%', padding: '6px' }}
                    onChange={(e) => setStaffProofFile(e.target.files?.[0] || null)}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Upload Aadhaar, driving license, voter ID, or photo document (PDF, PNG, JPG).
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Notes / Emergency Contact / Remarks
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Address, blood group, emergency contact details..."
                  style={{ width: '100%', resize: 'vertical' }}
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsStaffModalOpen(false)}
                  disabled={staffSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={staffSubmitting} style={{ fontWeight: 700 }}>
                  {staffSubmitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: RECORD PAYOUT / ADVANCE ──────────────────────────────── */}
      {isPayoutModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '1.75rem',
              borderRadius: '12px',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Wallet size={22} style={{ color: '#059669' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Record Staff Payout / Advance
                </h3>
              </div>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {payoutError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                {payoutError}
              </div>
            )}

            <form onSubmit={handleSavePayout}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Select Staff Member *
                </label>
                <select
                  className="form-select"
                  style={{ width: '100%', fontWeight: 600 }}
                  value={payoutStaffId}
                  onChange={(e) => setPayoutStaffId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Staff Member --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.full_name} ({st.designation}) • Due: {formatCurrency(st.balance_due)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Mode Selector: Single vs Split Cash & GPay */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Payment Mode
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setPayoutSplitMode(false)}
                    style={{
                      flex: 1,
                      padding: '0.45rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: !payoutSplitMode ? 800 : 600,
                      border: !payoutSplitMode ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: !payoutSplitMode ? '#fee2e2' : 'var(--bg-main)',
                      color: !payoutSplitMode ? '#991b1b' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Single (Cash or GPay)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayoutSplitMode(true);
                      if (payoutAmount && !payoutCashAmount) setPayoutCashAmount(payoutAmount);
                    }}
                    style={{
                      flex: 1,
                      padding: '0.45rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: payoutSplitMode ? 800 : 600,
                      border: payoutSplitMode ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: payoutSplitMode ? '#fee2e2' : 'var(--bg-main)',
                      color: payoutSplitMode ? '#991b1b' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Split (Cash + GPay)
                  </button>
                </div>
              </div>

              {!payoutSplitMode ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      className="form-input"
                      placeholder="0.00"
                      style={{ width: '100%', fontWeight: 800, color: '#dc2626' }}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                      Payment Method
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value as StaffPaymentMethod)}
                    >
                      <option value="CASH">Cash in Hand</option>
                      <option value="GPAY_UPI">GPay / UPI Transfer</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                        💵 Cash Paid (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        placeholder="0.00"
                        style={{ width: '100%', fontWeight: 800 }}
                        value={payoutCashAmount}
                        onChange={(e) => setPayoutCashAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                        📱 GPay Paid (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        placeholder="0.00"
                        style={{ width: '100%', fontWeight: 800 }}
                        value={payoutGpayAmount}
                        onChange={(e) => setPayoutGpayAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', textAlign: 'right', fontSize: '0.82rem', fontWeight: 800 }}>
                    Total Payout: <span style={{ color: '#dc2626' }}>₹{(parseFloat(payoutCashAmount || '0') + parseFloat(payoutGpayAmount || '0')).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Auto-sync to Expenses reassurance badge */}
              <div style={{ padding: '0.45rem 0.65rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '0.74rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, marginBottom: '1rem' }}>
                <Receipt size={14} style={{ color: '#059669', flexShrink: 0 }} />
                <span>Paid amounts are automatically added to <strong>Operating Expenses</strong> (Category: Daily Wages).</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Payout Type
                  </label>
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={payoutType}
                    onChange={(e) => setPayoutType(e.target.value as StaffPayoutType)}
                  >
                    <option value="SALARY">Salary / Wage Payout</option>
                    <option value="ADVANCE">Cash Advance</option>
                    <option value="BONUS">Bonus / Incentive</option>
                    <option value="OTHER">Other Payout</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={payoutDate}
                    onChange={(e) => setPayoutDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Bill / UPI Reference (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. UPI Ref #9023, Cash voucher #12"
                  style={{ width: '100%' }}
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Remarks / Notes
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Weekly wage payment, advance for emergency..."
                  style={{ width: '100%', resize: 'vertical' }}
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPayoutModalOpen(false)}
                  disabled={payoutSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={payoutSubmitting}
                  style={{ fontWeight: 700 }}
                >
                  {payoutSubmitting ? 'Recording...' : 'Record Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: STAFF LEDGER DETAIL ──────────────────────────────────── */}
      {ledgerModalStaff && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '680px',
              padding: '1.75rem',
              borderRadius: '12px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {ledgerModalStaff.full_name} — Account Ledger
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {ledgerModalStaff.designation} • Joined: {formatDate(ledgerModalStaff.joined_date)} • {ledgerModalStaff.tenure_slab_label}
                </p>
              </div>
              <button
                onClick={() => setLedgerModalStaff(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* KPI Balance Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.25rem',
                textAlign: 'center',
              }}
            >
              <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total Wages Earned
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '0.15rem' }}>
                  {formatCurrency(ledgerData?.total_earned || '0.00')}
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total Payouts Given
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', marginTop: '0.15rem' }}>
                  {formatCurrency(ledgerData?.total_paid || '0.00')}
                </div>
              </div>

              <div
                style={{
                  padding: '0.75rem',
                  background: '#fef3c7',
                  borderRadius: '8px',
                  border: '1px solid #fde68a',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: '#92400e', textTransform: 'uppercase', fontWeight: 800 }}>
                  Net Balance Due
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#b45309', marginTop: '0.15rem' }}>
                  {formatCurrency(ledgerData?.balance_due || '0.00')}
                </div>
              </div>
            </div>

            {/* Quick Action Bar inside Ledger Modal */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const staffId = ledgerModalStaff?.id;
                  setLedgerModalStaff(null);
                  handleOpenShopCollection(staffId);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 700,
                  color: '#059669',
                  borderColor: '#a7f3d0',
                  backgroundColor: '#ecfdf5',
                }}
              >
                <Store size={14} color="#059669" />
                Take Money from Shop
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const staffId = ledgerModalStaff?.id;
                  setLedgerModalStaff(null);
                  handleOpenPayoutModal(staffId);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
              >
                <Wallet size={14} />
                Give Payout / Advance
              </button>
            </div>

            {/* Recent Attendance Breakdown */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Recent Attendance Log ({ledgerData?.recent_attendances?.length || 0})
            </h4>
            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <table className="data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Daily Wage</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData?.recent_attendances && ledgerData.recent_attendances.length > 0 ? (
                    ledgerData.recent_attendances.map((att: any) => (
                      <tr key={att.id}>
                        <td>{formatDate(att.date)}</td>
                        <td>
                          <span
                            className={`badge ${
                              att.status === 'FULL'
                                ? 'badge-success'
                                : att.status === 'HALF'
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {att.status_display || att.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(att.daily_wage)}</td>
                        <td>{att.notes || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                        No attendance records found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Recent Payouts Breakdown */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Recent Payouts & Advances ({ledgerData?.recent_payouts?.length || 0})
            </h4>
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <table className="data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Method</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData?.recent_payouts && ledgerData.recent_payouts.length > 0 ? (
                    ledgerData.recent_payouts.map((p: any) => (
                      <tr key={p.id}>
                        <td>{formatDate(p.date)}</td>
                        <td style={{ fontWeight: 800, color: '#dc2626' }}>{formatCurrency(p.amount)}</td>
                        <td>{p.payout_type_display || p.payout_type}</td>
                        <td>{p.payment_method_display || p.payment_method}</td>
                        <td>{p.notes || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                        No payouts given yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setLedgerModalStaff(null)}>
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT USER LOGIN ACCOUNT ─────────────────────── */}
      {isUserModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '1.75rem',
              borderRadius: '12px',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Shield size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  {editingUser ? 'Edit System Account' : 'New Login Account'}
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {userError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                {userError}
              </div>
            )}

            <form onSubmit={handleSaveUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. manager1 or driver_ali"
                    style={{ width: '100%' }}
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    System Role *
                  </label>
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    required
                  >
                    <option value="DRIVER">Driver (Route app access)</option>
                    <option value="MANAGER">Manager (Operational access)</option>
                    <option value="OWNER">Owner (Full administrative access)</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Login Password *
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Minimum 8 characters"
                    style={{ width: '100%' }}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="First name"
                    style={{ width: '100%' }}
                    value={userFirstName}
                    onChange={(e) => setUserFirstName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Last name"
                    style={{ width: '100%' }}
                    value={userLastName}
                    onChange={(e) => setUserLastName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Mobile number"
                    style={{ width: '100%' }}
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="email@example.com"
                    style={{ width: '100%' }}
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsUserModalOpen(false)}
                  disabled={userSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={userSubmitting} style={{ fontWeight: 700 }}>
                  {userSubmitting ? 'Saving...' : editingUser ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: RESET PASSWORD ───────────────────────────────────────── */}
      {resetPasswordUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '1.5rem',
              borderRadius: '12px',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  Reset Password for @{resetPasswordUser.username}
                </h3>
              </div>
              <button
                onClick={() => setResetPasswordUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  New Password *
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter new secure password"
                  style={{ width: '100%' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResetPasswordUser(null)}
                  disabled={userSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={userSubmitting} style={{ fontWeight: 700 }}>
                  {userSubmitting ? 'Resetting...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Shop Payment Collection Modal */}
      <RecordShopPaymentModal
        isOpen={isShopPaymentModalOpen}
        preSelectedStaffId={shopPaymentStaffId}
        onClose={() => {
          setIsShopPaymentModalOpen(false);
          setShopPaymentStaffId(undefined);
        }}
        onSuccess={(msg) => {
          if (msg) showToast(msg);
          fetchStaffData();
        }}
      />
    </div>
  );
};
