'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard, Search, ArrowRightLeft, ShieldCheck, AlertCircle,
  TrendingUp, RefreshCw, Undo2, CheckCircle, XCircle,
  Building2, BadgeCheck, ExternalLink, Clock, Info,
  Wallet, BarChart3, Settings2, ArrowDownCircle, ChevronLeft, ChevronRight,
  Zap, Phone, Mail, Receipt, Layers, IndianRupee,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────
interface LivePayment {
  id: string;
  amount: number;
  currency: string;
  status: 'captured' | 'refunded' | 'failed' | 'created' | 'authorized';
  method: string;
  orderId: string;
  email: string;
  contact: string;
  fee: number;
  tax: number;
  errorCode: string | null;
  errorDescription: string | null;
  acquirerData: any;
  createdAt: string;
  capturedAt: string | null;
  refundStatus: string | null;
  amountRefunded: number;
  captured: boolean;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
}

interface Settlement {
  id: string;
  amount: number;
  fees: number;
  tax: number;
  utr: string;
  description: string;
  createdAt: string;
  status: string;
  ondemand: boolean;
}

interface AccountBalance {
  id: string;
  type: string;
  name: string;
  balance: number;
  currency: string;
  balance_updated_at: number;
}

const STATUS_STYLE: Record<string, string> = {
  captured: 'bg-green-50 text-green-700 border border-green-200',
  refunded: 'bg-orange-50 text-orange-700 border border-orange-200',
  failed: 'bg-red-50 text-red-700 border border-red-200',
  created: 'bg-gray-50 text-gray-600 border border-gray-200',
  authorized: 'bg-blue-50 text-blue-700 border border-blue-200',
  processed: 'bg-green-50 text-green-700 border border-green-200',
};

const METHOD_ICON: Record<string, string> = {
  upi: '📱', card: '💳', netbanking: '🏦', wallet: '👝', emi: '📅',
};

// ── Small stat card ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xl font-black mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Refund Modal ───────────────────────────────────────────────────────────
function RefundModal({ payment, onClose, onSuccess }: {
  payment: LivePayment; onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(String(payment.amount - payment.amountRefunded));
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ type: '', msg: '' });
    try {
      await api.post('/admin/razorpay/refund-payment', {
        paymentId: payment.id,
        amount: Number(amount),
        reason,
      });
      setFeedback({ type: 'success', msg: 'Refund initiated successfully!' });
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || 'Refund failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md border shadow-2xl p-6 relative">
        <h3 className="text-lg font-black font-outfit border-b pb-3 mb-4 flex items-center gap-2">
          <Undo2 className="w-5 h-5 text-orange-600" /> Initiate Refund
        </h3>
        <p className="text-xs text-muted-foreground mb-1">Payment: <span className="font-mono font-bold">{payment.id}</span></p>
        <p className="text-xs text-muted-foreground mb-4">
          Captured: <strong>{formatPrice(payment.amount)}</strong>
          {payment.amountRefunded > 0 && <> · Already refunded: <strong>{formatPrice(payment.amountRefunded)}</strong></>}
        </p>

        {feedback.msg && (
          <div className={`p-3 rounded-xl border text-sm font-semibold mb-4 ${
            feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>{feedback.msg}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">Refund Amount (₹)</label>
            <input
              type="number" step="0.01" required min="1"
              max={payment.amount - payment.amountRefunded}
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">Reason</label>
            <textarea rows={2} required value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Reason for refund..."
              className="w-full border-2 border-border focus:border-primary rounded-xl px-3 py-2 text-sm outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={onClose} disabled={loading}
              className="px-4 py-2 border rounded-xl hover:bg-gray-50 text-sm font-bold disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={loading || !amount}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50">
              {loading ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : 'Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function RazorpayManagerPage() {
  const [tab, setTab] = useState<'payments' | 'settlements' | 'overview'>('overview');

  // Overview / stats
  const [stats, setStats] = useState<any>(null);
  const [balance, setBalance] = useState<AccountBalance[] | null>(null);
  const [balanceErr, setBalanceErr] = useState('');
  const [bankDetails, setBankDetails] = useState<any>(null);

  // Payments tab
  const [payments, setPayments] = useState<LivePayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsErr, setPaymentsErr] = useState('');
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [pSkip, setPSkip] = useState(0);
  const pLimit = 20;
  const [pSearch, setPSearch] = useState('');
  const [pStatus, setPStatus] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Settlements tab
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [settlementsErr, setSettlementsErr] = useState('');
  const [sSkip, setSSkip] = useState(0);
  const sLimit = 20;

  // Refund modal
  const [refundTarget, setRefundTarget] = useState<LivePayment | null>(null);

  const fetchOverview = useCallback(async () => {
    const [statsRes, balRes, bankRes] = await Promise.allSettled([
      api.get('/admin/razorpay/stats'),
      api.get('/admin/razorpay/account-balance'),
      api.get('/admin/razorpay/bank-details'),
    ]);
    if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    if (balRes.status === 'fulfilled') {
      const d = balRes.value.data;
      if (d.success && d.balance) {
        const items: AccountBalance[] = Array.isArray(d.balance) ? d.balance : [d.balance];
        setBalance(items);
      } else {
        setBalanceErr(d.error || 'Could not load balance');
      }
    }
    if (bankRes.status === 'fulfilled') setBankDetails(bankRes.value.data);
  }, []);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsErr('');
    try {
      const params: any = { skip: pSkip, count: pLimit };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const { data } = await api.get('/admin/razorpay/live-payments', { params });
      if (data.success) {
        let items: LivePayment[] = data.items || [];
        if (pStatus !== 'ALL') items = items.filter(p => p.status === pStatus.toLowerCase());
        if (pSearch) {
          const q = pSearch.toLowerCase();
          items = items.filter(p =>
            p.id.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q) ||
            p.contact?.includes(q) ||
            p.orderId?.toLowerCase().includes(q) ||
            p.vpa?.toLowerCase().includes(q)
          );
        }
        setPayments(items);
        setPaymentsCount(data.count || items.length);
      } else {
        setPaymentsErr(data.error || 'Failed to load payments');
      }
    } catch (err: any) {
      setPaymentsErr(err.response?.data?.message || 'Network error');
    } finally {
      setPaymentsLoading(false);
    }
  }, [pSkip, fromDate, toDate, pStatus, pSearch]);

  const fetchSettlements = useCallback(async () => {
    setSettlementsLoading(true);
    setSettlementsErr('');
    try {
      const { data } = await api.get('/admin/razorpay/settlements', { params: { skip: sSkip, count: sLimit } });
      if (data.success) {
        setSettlements(data.items || []);
      } else {
        setSettlementsErr(data.error || 'Failed to load settlements');
      }
    } catch (err: any) {
      setSettlementsErr(err.response?.data?.message || 'Network error');
    } finally {
      setSettlementsLoading(false);
    }
  }, [sSkip]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { if (tab === 'payments') fetchPayments(); }, [tab, fetchPayments]);
  useEffect(() => { if (tab === 'settlements') fetchSettlements(); }, [tab, fetchSettlements]);

  // ── Computed totals from live payments ─────────────────────────────────
  const liveTotals = {
    captured: payments.filter(p => p.status === 'captured').reduce((s, p) => s + p.amount, 0),
    refunded: payments.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amountRefunded, 0),
    failed: payments.filter(p => p.status === 'failed').length,
    fees: payments.reduce((s, p) => s + p.fee, 0),
    taxes: payments.reduce((s, p) => s + p.tax, 0),
  };

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'settlements', label: 'Settlements', icon: ArrowDownCircle },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-black flex items-center gap-2">
            <ArrowRightLeft className="text-primary w-7 h-7" /> Razorpay Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Live data pulled directly from Razorpay API</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://dashboard.razorpay.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold border bg-white rounded-xl hover:bg-gray-50 shadow-sm transition-all text-blue-600">
            Razorpay Dashboard <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => { fetchOverview(); if (tab === 'payments') fetchPayments(); if (tab === 'settlements') fetchSettlements(); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold border bg-white rounded-xl hover:bg-gray-50 shadow-sm transition-all"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border rounded-2xl p-1 mb-6 shadow-sm w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.id ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">

          {/* Account Balance */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Wallet className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-base">Razorpay Account Balance</h2>
              <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">Live from API</span>
            </div>

            {balanceErr ? (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Balance unavailable</p>
                  <p className="text-xs text-amber-700 mt-0.5">{balanceErr}</p>
                  <p className="text-xs text-amber-600 mt-1">This may mean the Razorpay API doesn't expose balance on your plan, or keys are in test mode.</p>
                </div>
              </div>
            ) : balance === null ? (
              <div className="flex items-center gap-2 py-3">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-sm text-muted-foreground">Loading balance…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {balance.map((b, i) => (
                  <div key={i} className="p-4 border rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <IndianRupee className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{b.name || b.type || `Account ${i + 1}`}</p>
                      <p className="text-xl font-black text-primary">{formatPrice(b.balance / 100)}</p>
                      <p className="text-[10px] text-muted-foreground">{b.currency || 'INR'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DB Stats cards */}
          {stats && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">All-Time Summary (from records)</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Captured" value={formatPrice(stats.totalCapturedAmount)} sub={`${stats.totalCapturedCount} charges`} icon={TrendingUp} color="bg-green-50 text-green-600" />
                <StatCard label="Total Refunded" value={formatPrice(stats.totalRefundedAmount)} sub={`${stats.totalRefundedCount} refunds`} icon={Undo2} color="bg-orange-50 text-orange-600" />
                <StatCard label="Failed Charges" value={stats.failedChargesCount} sub="Checkout failures" icon={AlertCircle} color="bg-red-50 text-red-600" />
                <StatCard label="Failed Refunds" value={stats.failedRefundsCount} sub="Reserve alerts" icon={ShieldCheck} color="bg-purple-50 text-purple-600" />
              </div>
            </div>
          )}

          {/* Settlement Bank Details */}
          {bankDetails && (bankDetails.accountNumber || bankDetails.bankName) && (
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-base">Settlement Bank Account</h2>
                </div>
                <Link href="/admin/settings#bank" className="text-xs font-bold text-primary hover:underline">Edit Details →</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Beneficiary Name', val: bankDetails.accountHolderName },
                  { label: 'Account Number', val: bankDetails.accountNumber ? bankDetails.accountNumber.slice(0, -4).replace(/./g, '•') + bankDetails.accountNumber.slice(-4) : '—' },
                  { label: 'IFSC Code', val: bankDetails.ifscCode },
                  { label: 'Bank', val: bankDetails.bankName },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{f.label}</p>
                    <p className="text-sm font-semibold font-mono">{f.val || '—'}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                {bankDetails.settlementActive ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                    <BadgeCheck className="w-3.5 h-3.5" /> Settlements Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5" /> Inactive
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Info note */}
          <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              Switch to the <strong>Payments tab</strong> to see all live transactions (captured, refunded, failed) directly from Razorpay — including Bank RRN, UPI VPA, fees, and taxes.
              Use the <strong>Settlements tab</strong> to view all settled amounts with UTR numbers.
            </p>
          </div>
        </div>
      )}

      {/* ── PAYMENTS TAB ─────────────────────────────────────────────────── */}
      {tab === 'payments' && (
        <div className="space-y-5">

          {/* Live summary chips */}
          {payments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Captured (page)" value={formatPrice(liveTotals.captured)} icon={CheckCircle} color="bg-green-50 text-green-600" />
              <StatCard label="Refunded (page)" value={formatPrice(liveTotals.refunded)} icon={Undo2} color="bg-orange-50 text-orange-600" />
              <StatCard label="Razorpay Fees" value={formatPrice(liveTotals.fees)} icon={Receipt} color="bg-blue-50 text-blue-600" />
              <StatCard label="GST on Fees" value={formatPrice(liveTotals.taxes)} icon={Layers} color="bg-violet-50 text-violet-600" />
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by Payment ID, email, phone, order ID, UPI VPA…"
                  value={pSearch}
                  onChange={e => setPSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchPayments()}
                  className="w-full pl-9 pr-4 py-2.5 border-2 border-border focus:border-primary rounded-xl text-sm outline-none"
                />
              </div>
              <select value={pStatus} onChange={e => { setPStatus(e.target.value); setPSkip(0); }}
                className="border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm outline-none bg-white font-semibold">
                <option value="ALL">All Statuses</option>
                <option value="captured">Captured</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
                <option value="created">Created</option>
              </select>
              <div className="flex gap-2">
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm outline-none bg-white" />
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm outline-none bg-white" />
                <button onClick={() => { setPSkip(0); fetchPayments(); }}
                  className="bg-primary text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all">
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Payments table */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {paymentsLoading ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Fetching from Razorpay…</p>
              </div>
            ) : paymentsErr ? (
              <div className="py-16 text-center space-y-3">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                <p className="font-bold text-red-600">{paymentsErr}</p>
                <p className="text-xs text-muted-foreground">Check that your Razorpay keys are configured in Admin → Settings → Payment.</p>
                <Link href="/admin/settings" className="inline-block text-xs font-bold text-primary hover:underline mt-2">Configure Keys →</Link>
              </div>
            ) : payments.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="font-bold">No payments found</p>
                <p className="text-sm text-muted-foreground">Try adjusting the date range or filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/10 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-3">Payment ID</th>
                      <th className="px-4 py-3">Method / Bank RRN</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Fee + Tax</th>
                      <th className="px-4 py-3 text-right">Net Settled</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {payments.map(p => {
                      const rrn = p.acquirerData?.rrn || p.acquirerData?.bank_transaction_id || p.acquirerData?.transaction_id || '—';
                      const netSettled = p.amount - p.fee - p.tax;
                      const canRefund = p.status === 'captured' && (p.amount - p.amountRefunded) > 0;
                      const methodLabel = p.vpa ? `UPI · ${p.vpa}` : p.bank ? `${p.method?.toUpperCase()} · ${p.bank}` : p.method?.toUpperCase() || '—';
                      return (
                        <tr key={p.id} className="hover:bg-muted/5 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs font-bold text-primary">{p.id}</p>
                            {p.orderId && <p className="text-[10px] text-muted-foreground font-mono">{p.orderId}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold flex items-center gap-1">
                              <span>{METHOD_ICON[p.method] || '💳'}</span> {methodLabel}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{rrn !== '—' ? `RRN: ${rrn}` : ''}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-bold flex items-center gap-1"><Phone className="w-3 h-3" />{p.contact || '—'}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{p.email || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {p.createdAt ? new Date(p.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-sm">{formatPrice(p.amount)}</td>
                          <td className="px-4 py-3 text-right">
                            {p.fee > 0 || p.tax > 0 ? (
                              <div>
                                <p className="text-xs font-semibold text-red-600">-{formatPrice(p.fee + p.tax)}</p>
                                <p className="text-[10px] text-muted-foreground">Fee: {formatPrice(p.fee)} · GST: {formatPrice(p.tax)}</p>
                              </div>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-700 text-sm">
                            {p.status === 'captured' ? formatPrice(Math.max(0, netSettled)) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status] || 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                                {p.status}
                              </span>
                              {p.amountRefunded > 0 && (
                                <p className="text-[10px] text-orange-500 font-semibold mt-0.5">-{formatPrice(p.amountRefunded)} refunded</p>
                              )}
                              {p.errorDescription && (
                                <p className="text-[10px] text-red-500 mt-0.5 max-w-[160px] leading-tight">{p.errorDescription}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {canRefund && (
                              <button onClick={() => setRefundTarget(p)}
                                className="text-xs font-bold px-3 py-1.5 bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-700 rounded-xl transition-all">
                                Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!paymentsLoading && payments.length > 0 && (
              <div className="px-6 py-4 border-t flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground font-semibold">
                  Showing {pSkip + 1}–{pSkip + payments.length} of {paymentsCount} total
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPSkip(s => Math.max(0, s - pLimit))} disabled={pSkip === 0}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <button onClick={() => setPSkip(s => s + pLimit)} disabled={pSkip + pLimit >= paymentsCount}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SETTLEMENTS TAB ──────────────────────────────────────────────── */}
      {tab === 'settlements' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {settlementsLoading ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Fetching settlements…</p>
              </div>
            ) : settlementsErr ? (
              <div className="py-16 text-center space-y-3">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                <p className="font-bold text-red-600">{settlementsErr}</p>
                <p className="text-xs text-muted-foreground">Settlements data requires a live Razorpay account with settlement history.</p>
              </div>
            ) : settlements.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <ArrowDownCircle className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="font-bold">No settlements yet</p>
                <p className="text-sm text-muted-foreground">Settlements appear here after Razorpay processes captured payments to your bank account.</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 p-6 border-b bg-muted/5">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Settled</p>
                    <p className="text-2xl font-black text-green-700">{formatPrice(settlements.reduce((s, x) => s + x.amount, 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Fees Deducted</p>
                    <p className="text-2xl font-black text-red-600">{formatPrice(settlements.reduce((s, x) => s + x.fees, 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total GST on Fees</p>
                    <p className="text-2xl font-black text-violet-700">{formatPrice(settlements.reduce((s, x) => s + x.tax, 0))}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/10 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-5 py-3">Settlement ID</th>
                        <th className="px-5 py-3">UTR Number</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3 text-right">Gross Amount</th>
                        <th className="px-5 py-3 text-right">Fees + GST</th>
                        <th className="px-5 py-3 text-right">Net Amount</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {settlements.map(s => (
                        <tr key={s.id} className="hover:bg-muted/5 transition-colors">
                          <td className="px-5 py-4 font-mono text-xs font-bold text-primary">{s.id}</td>
                          <td className="px-5 py-4 font-mono text-xs font-semibold">{s.utr || '—'}</td>
                          <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                            {s.createdAt ? new Date(s.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-5 py-4 text-right font-black">{formatPrice(s.amount)}</td>
                          <td className="px-5 py-4 text-right text-red-600 font-semibold text-xs">
                            -{formatPrice(s.fees + s.tax)}
                            <p className="text-[10px] text-muted-foreground">Fee: {formatPrice(s.fees)} · GST: {formatPrice(s.tax)}</p>
                          </td>
                          <td className="px-5 py-4 text-right font-black text-green-700">{formatPrice(s.amount - s.fees - s.tax)}</td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[s.status] || 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                              {s.status || 'processed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Settlement pagination */}
                <div className="px-5 py-4 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">
                    Showing {sSkip + 1}–{sSkip + settlements.length}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setSSkip(s => Math.max(0, s - sLimit))} disabled={sSkip === 0}
                      className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <button onClick={() => setSSkip(s => s + sLimit)} disabled={settlements.length < sLimit}
                      className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundTarget && (
        <RefundModal
          payment={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={fetchPayments}
        />
      )}
    </div>
  );
}
