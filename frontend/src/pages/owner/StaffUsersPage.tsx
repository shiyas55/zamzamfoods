import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { RecordShopPaymentModal } from '../../components/RecordShopPaymentModal';

export const StaffUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'staff' | 'attendance' | 'payouts' | 'accounts'>('staff');

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
  const [attendanceFilterRole, setAttendanceFilterRole] = useState<'ALL' | 'STAFF' | 'MEMBER'>('ALL');
  const [dailySheet, setDailySheet] = useState<DailySheetItem[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [showAttendanceWages, setShowAttendanceWages] = useState(false);

  // Payout State
  const [payouts, setPayouts] = useState<StaffPayout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutStaffId, setPayoutStaffId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
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

  const fetchDailySheet = async (dateVal: string) => {
    try {
      setAttendanceLoading(true);
      const res = await staffService.getDailySheet(dateVal);
      setDailySheet(res.sheet);
    } catch (err) {
      console.error('Failed to load daily sheet:', err);
    } finally {
      setAttendanceLoading(false);
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

  const handleMarkAllFull = () => {
    setDailySheet((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'FULL',
        calculated_wage: (parseFloat(item.base_daily_wage) || 0).toFixed(2),
      }))
    );
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
        })),
      });
      showToast(`Attendance saved for ${attendanceDate}!`);
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
      showToast('Payout recorded successfully!');
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

  // Calculate live daily sheet total wages
  const sheetTotalWage = dailySheet.reduce((acc, curr) => acc + (parseFloat(curr.calculated_wage) || 0), 0);
  const sheetPresentCount = dailySheet.filter((i) => i.status === 'FULL' || i.status === 'HALF').length;

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
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Staff & Roles Management
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Manage staff profiles, tenure wage slabs (₹400/₹500/₹600), ID proofs, daily attendance roll-calls, and payouts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleOpenShopCollection()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, borderColor: '#059669', color: '#059669' }}
            title="Record money taken or collected from a customer shop by a staff or share member"
          >
            <Store size={16} color="#059669" />
            Take / Collect from Shop
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleOpenPayoutModal()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <Wallet size={16} color="#059669" />
            Give Payout / Advance
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenCreateStaff}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <UserPlus size={16} />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1.15rem', borderLeft: '4px solid #b91c1c' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Staff Members
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {staffSummary?.total_staff ?? staffList.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {staffSummary?.worker_staff ?? 0} Direct Profiles • {staffSummary?.login_staff ?? 0} Login Accounts
          </span>
        </div>

        <div className="card" style={{ padding: '1.15rem', borderLeft: '4px solid #059669' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Working Today
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
            {staffSummary?.today_present ?? sheetPresentCount}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Staff marked present today</span>
        </div>

        <div className="card" style={{ padding: '1.15rem', borderLeft: '4px solid #b45309' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Wages Earned (Month)
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', marginTop: '0.2rem' }}>
            {formatCurrency(staffSummary?.month_wages_earned || '0.00')}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>From daily attendance calculations</span>
        </div>

        <div className="card" style={{ padding: '1.15rem', borderLeft: '4px solid #2563eb' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Payouts Given (Month)
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>
            {formatCurrency(staffSummary?.month_payouts_given || '0.00')}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cash advances & salaries paid</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
        }}
      >
        <button
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'staff' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'staff' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Users size={16} />
          Staff Directory ({staffList.length})
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'attendance' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'attendance' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Calendar size={16} />
          Daily Attendance
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'payouts' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'payouts' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Wallet size={16} />
          Payouts & Advances
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: activeTab === 'accounts' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'accounts' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
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
                              className="badge badge-success"
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
                            {st.role_type === 'STAFF' ? (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#dbeafe',
                                  color: '#1d4ed8',
                                  fontWeight: 700,
                                }}
                              >
                                Staff / Driver
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
                                  fontWeight: 700,
                                  border: '1px solid #fde68a',
                                }}
                              >
                                Share Member
                              </span>
                            )}
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
                                <FileCheck size={13} color="#059669" />
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
                                color: '#059669',
                                borderColor: '#a7f3d0',
                                backgroundColor: '#ecfdf5',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Store size={13} color="#059669" />
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
                              style={{ padding: '4px 8px', color: '#059669' }}
                            >
                              <Wallet size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenLedgerModal(st)}
                              className="btn btn-secondary btn-sm"
                              title="View Ledger & Attendance History"
                              style={{ padding: '4px 8px', color: '#2563eb' }}
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

      {/* ─── TAB 2: DAILY ATTENDANCE ROLL-CALL ─────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div>
          {/* Date Control Toolbar */}
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handleShiftDate(-1)}>
                <ChevronLeft size={16} /> Prev Day
              </button>
              <input
                type="date"
                className="form-input"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                style={{ fontWeight: 700 }}
              />
              <button className="btn btn-secondary btn-sm" onClick={() => handleShiftDate(1)}>
                Next Day <ChevronRight size={16} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setAttendanceDate(new Date().toISOString().split('T')[0])}
              >
                Today
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.85rem' }}>
                Present: <strong>{sheetPresentCount}</strong> / {dailySheet.length}
                {showAttendanceWages && (
                  <>
                    {' '}• Total Wage:{' '}
                    <strong style={{ color: '#059669', fontSize: '1rem' }}>{formatCurrency(sheetTotalWage.toFixed(2))}</strong>
                  </>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAttendanceWages(!showAttendanceWages)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
                title={showAttendanceWages ? 'Hide wage amounts' : 'Show wage amounts'}
              >
                {showAttendanceWages ? <EyeOff size={14} /> : <Eye size={14} />}
                {showAttendanceWages ? 'Hide Amounts' : 'Show Amounts'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleMarkAllFull}>
                Mark All Full Day
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAttendance}
                disabled={attendanceSaving}
                style={{ fontWeight: 700 }}
              >
                {attendanceSaving ? 'Saving...' : 'Save Attendance Sheet'}
              </button>
            </div>
          </div>

          {/* Attendance Role Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${attendanceFilterRole === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAttendanceFilterRole('ALL')}
              style={{ fontWeight: attendanceFilterRole === 'ALL' ? 700 : 500 }}
            >
              All Staff & Members ({dailySheet.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${attendanceFilterRole === 'STAFF' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAttendanceFilterRole('STAFF')}
              style={{ fontWeight: attendanceFilterRole === 'STAFF' ? 700 : 500 }}
            >
              Staff & Drivers ({dailySheet.filter((i) => i.role_type === 'STAFF' || (i.designation && i.designation.toLowerCase().includes('driver'))).length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${attendanceFilterRole === 'MEMBER' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAttendanceFilterRole('MEMBER')}
              style={{ fontWeight: attendanceFilterRole === 'MEMBER' ? 700 : 500 }}
            >
              Share Members (Business Owners) ({dailySheet.filter((i) => i.role_type !== 'STAFF' && (!i.designation || !i.designation.toLowerCase().includes('driver'))).length})
            </button>
          </div>

          <div className="table-container">
            {attendanceLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Name & Role</th>
                    {showAttendanceWages && <th>Tenure Slab</th>}
                    {showAttendanceWages && <th>Base Rate</th>}
                    <th style={{ textAlign: 'center' }}>Attendance Status (Click to Toggle)</th>
                    {showAttendanceWages && <th>Calculated Wage</th>}
                    <th>Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySheet.length > 0 ? (
                    dailySheet
                      .filter((item) => {
                        const isStaff = item.role_type === 'STAFF' || (item.designation && item.designation.toLowerCase().includes('driver'));
                        if (attendanceFilterRole === 'STAFF') return isStaff;
                        if (attendanceFilterRole === 'MEMBER') return !isStaff;
                        return true;
                      })
                      .map((item) => {
                        const isStaff = item.role_type === 'STAFF' || (item.designation && item.designation.toLowerCase().includes('driver'));
                        return (
                      <tr key={item.staff_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800 }}>{item.full_name}</span>
                            {isStaff ? (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#dbeafe',
                                  color: '#1d4ed8',
                                  fontWeight: 700,
                                }}
                              >
                                Staff / Driver
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
                                  fontWeight: 700,
                                  border: '1px solid #fde68a',
                                }}
                              >
                                Share Member
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.designation}</div>
                        </td>
                        {showAttendanceWages && (
                          <td>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {item.tenure_slab_label}
                            </span>
                          </td>
                        )}
                        {showAttendanceWages && (
                          <td>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(item.base_daily_wage)}</span>
                          </td>
                        )}
                        <td style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              background: 'var(--border-color, #e2e8f0)',
                              borderRadius: '8px',
                              padding: '2px',
                              gap: '2px',
                            }}
                          >
                            {isStaff ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSheetItem(item.staff_id, 'FULL')}
                                  style={{
                                    border: 'none',
                                    padding: '6px 16px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    background: item.status === 'FULL' ? '#059669' : 'transparent',
                                    color: item.status === 'FULL' ? '#fff' : 'var(--text-primary)',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSheetItem(item.staff_id, 'LEAVE')}
                                  style={{
                                    border: 'none',
                                    padding: '6px 16px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    background: item.status === 'LEAVE' ? '#dc2626' : 'transparent',
                                    color: item.status === 'LEAVE' ? '#fff' : 'var(--text-primary)',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  Leave
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSheetItem(item.staff_id, 'FULL')}
                                  style={{
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    background: item.status === 'FULL' ? '#059669' : 'transparent',
                                    color: item.status === 'FULL' ? '#fff' : 'var(--text-primary)',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  Full Day
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSheetItem(item.staff_id, 'HALF')}
                                  style={{
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    background: item.status === 'HALF' ? '#f59e0b' : 'transparent',
                                    color: item.status === 'HALF' ? '#fff' : 'var(--text-primary)',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  Half Day
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSheetItem(item.staff_id, 'LEAVE')}
                                  style={{
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    background: item.status === 'LEAVE' ? '#dc2626' : 'transparent',
                                    color: item.status === 'LEAVE' ? '#fff' : 'var(--text-primary)',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  Leave
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        {showAttendanceWages && (
                          <td>
                            <span
                              style={{
                                fontWeight: 800,
                                color: item.status === 'LEAVE' ? 'var(--text-muted)' : '#059669',
                                fontSize: '0.95rem',
                              }}
                            >
                              {formatCurrency(item.calculated_wage)}
                            </span>
                          </td>
                        )}
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Optional notes..."
                            style={{ padding: '4px 8px', fontSize: '0.8rem', width: '100%', maxWidth: '200px' }}
                            value={item.notes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDailySheet((prev) =>
                                prev.map((i) => (i.staff_id === item.staff_id ? { ...i, notes: val } : i))
                              );
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                    <tr>
                      <td colSpan={showAttendanceWages ? 6 : 3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No active staff members found to record attendance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
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
                          <span className="badge badge-neutral">{p.payment_method_display || p.payment_method}</span>
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
