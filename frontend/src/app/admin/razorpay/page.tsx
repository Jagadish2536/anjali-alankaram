'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard, Search, ArrowRightLeft, ShieldCheck, AlertCircle,
  TrendingUp, RefreshCw, Undo2, SearchCode, Eye, CheckCircle, XCircle,
  Building2, BadgeCheck, ExternalLink, Clock, Info
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

interface Transaction {
  id: string;
  orderId: string;
  type: 'CHARGE' | 'REFUND';
  amount: string;
  status: 'SUCCESS' | 'FAILED';
  gateway: string;
  gatewayRef: string;
  failReason: string | null;
  createdAt: string;
  order: {
    orderNumber: string;
    totalAmount: string;
    status: string;
    user: {
      name: string;
      email: string;
      phone: string;
    };
  };
}

interface Stats {
  totalCapturedAmount: number;
  totalCapturedCount: number;
  totalRefundedAmount: number;
  totalRefundedCount: number;
  failedChargesCount: number;
  failedRefundsCount: number;
}

export default function RazorpayManagerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  // Refund Modal State
  const [refundingOrder, setRefundingOrder] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Bank / settlement details state
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [bankLoading, setBankLoading] = useState(true);

  const fetchBankDetails = async () => {
    setBankLoading(true);
    try {
      const { data } = await api.get('/admin/razorpay/bank-details');
      setBankDetails(data);
    } catch {
      setBankDetails(null);
    } finally {
      setBankLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/razorpay/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/razorpay/transactions', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          status: statusFilter,
          type: typeFilter,
        }
      });
      setTransactions(data.transactions);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchBankDetails();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const openRefundModal = (tx: Transaction) => {
    setRefundingOrder(tx);
    setRefundAmount(Number(tx.order.totalAmount).toString());
    setRefundReason('');
    setFeedback({ type: '', message: '' });
  };

  const closeRefundModal = () => {
    setRefundingOrder(null);
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingOrder) return;
    
    setProcessingRefund(true);
    setFeedback({ type: '', message: '' });
    
    try {
      await api.post('/admin/razorpay/refund', {
        orderId: refundingOrder.orderId,
        amount: Number(refundAmount),
      });
      
      setFeedback({ type: 'success', message: 'Refund initiated successfully!' });
      fetchStats();
      fetchTransactions();
      setTimeout(closeRefundModal, 2000);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Refund processing failed';
      setFeedback({ type: 'error', message: `Failed: ${errMsg}` });
    } finally {
      setProcessingRefund(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-black flex items-center gap-2">
            <ArrowRightLeft className="text-primary w-8 h-8" />
            Razorpay Payment Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor captured transactions, failed charges, check settlement logs, and manage manual refunds.
          </p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchTransactions(); fetchBankDetails(); }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-bold border bg-white rounded-xl hover:bg-gray-50 shadow-sm transition-all"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
          Sync Dashboard
        </button>
      </div>

      {/* ── Settlement Account Card ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Settlement Account</h2>
            <span className="text-xs text-muted-foreground font-medium bg-muted/30 px-2 py-0.5 rounded-full">Synced from Admin Settings</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/settings#bank"
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              Edit Bank Details →
            </Link>
            <a
              href="https://dashboard.razorpay.com/app/settlement-preferences"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
            >
              Razorpay Dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {bankLoading ? (
          <div className="flex items-center gap-3 py-4">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm text-muted-foreground">Loading bank details…</span>
          </div>
        ) : !bankDetails || (!bankDetails.accountNumber && !bankDetails.bankName) ? (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800">No bank details configured</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Go to <Link href="/admin/settings" className="underline font-bold">Admin → Settings → Bank Details</Link> to set up your account.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Account row — matches Razorpay's layout */}
            <div className="flex items-center gap-4 p-4 border rounded-xl bg-gray-50/70 flex-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-8 gap-y-1 flex-1">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Beneficiary Name</p>
                  <p className="text-sm font-bold text-foreground">{bankDetails.accountHolderName || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Account Number</p>
                  <p className="text-sm font-semibold font-mono">
                    {bankDetails.accountNumber
                      ? bankDetails.accountNumber.slice(0, -4).replace(/./g, '•') + bankDetails.accountNumber.slice(-4)
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">IFSC Code</p>
                  <p className="text-sm font-semibold font-mono">{bankDetails.ifscCode || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Bank</p>
                  <p className="text-sm font-semibold">{bankDetails.bankName || '—'}</p>
                </div>
              </div>
            </div>

            {/* Status + updated */}
            <div className="flex flex-col gap-3 min-w-[180px]">
              {/* Settlement status */}
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Settlements</p>
                {bankDetails.settlementActive ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full w-fit">
                    <BadgeCheck className="w-3.5 h-3.5" /> ACTIVE
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full w-fit">
                    <Clock className="w-3.5 h-3.5" /> INACTIVE
                  </span>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {bankDetails.settlementActive ? 'Payments captured in last 30 days' : 'No captures in last 30 days'}
                </p>
              </div>

              {/* Last updated */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Details Updated</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">
                  {bankDetails.lastUpdated
                    ? new Date(bankDetails.lastUpdated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>

              {/* Last settlement */}
              {bankDetails.lastSettlementDate && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Capture</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    {new Date(bankDetails.lastSettlementDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info note */}
        <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>To change your settlement bank account:</strong> Update bank details in{' '}
            <Link href="/admin/settings" className="underline font-bold">Admin Settings → Bank Details</Link>, then also update them manually in your{' '}
            <a href="https://dashboard.razorpay.com/app/settlement-preferences" target="_blank" rel="noopener noreferrer" className="underline font-bold">
              Razorpay Dashboard → Settlements → Bank Account Details
            </a>.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (() => {
        const activeCard =
          typeFilter === 'CHARGE' && statusFilter === 'SUCCESS' ? 'captured' :
          typeFilter === 'REFUND' && statusFilter === 'SUCCESS' ? 'refunded' :
          typeFilter === 'CHARGE' && statusFilter === 'FAILED' ? 'failedCharge' :
          typeFilter === 'REFUND' && statusFilter === 'FAILED' ? 'failedRefund' : null;

        const applyFilter = (type: string, status: string) => {
          setTypeFilter(type);
          setStatusFilter(status);
          setPage(1);
        };

        const clearFilter = () => {
          setTypeFilter('ALL');
          setStatusFilter('ALL');
          setPage(1);
        };

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <button
              onClick={() => applyFilter('CHARGE', 'SUCCESS')}
              className={`bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 text-left transition-all hover:shadow-md hover:border-green-300 ${activeCard === 'captured' ? 'ring-2 ring-green-500 border-green-300 bg-green-50/30' : ''}`}
            >
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Sales Captured</p>
                <h3 className="text-xl font-black mt-1 text-green-700">{formatPrice(stats.totalCapturedAmount)}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stats.totalCapturedCount} successful charges</p>
              </div>
            </button>

            <button
              onClick={() => applyFilter('REFUND', 'SUCCESS')}
              className={`bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 text-left transition-all hover:shadow-md hover:border-orange-300 ${activeCard === 'refunded' ? 'ring-2 ring-orange-500 border-orange-300 bg-orange-50/30' : ''}`}
            >
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                <Undo2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Amount Refunded</p>
                <h3 className="text-xl font-black mt-1 text-orange-700">{formatPrice(stats.totalRefundedAmount)}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stats.totalRefundedCount} refunds issued</p>
              </div>
            </button>

            <button
              onClick={() => applyFilter('CHARGE', 'FAILED')}
              className={`bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 text-left transition-all hover:shadow-md hover:border-red-300 ${activeCard === 'failedCharge' ? 'ring-2 ring-red-500 border-red-300 bg-red-50/30' : ''}`}
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Failed Charges</p>
                <h3 className="text-xl font-black mt-1 text-red-700">{stats.failedChargesCount}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Attempted checkouts that failed</p>
              </div>
            </button>

            <button
              onClick={() => applyFilter('REFUND', 'FAILED')}
              className={`bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 text-left transition-all hover:shadow-md hover:border-purple-300 ${activeCard === 'failedRefund' ? 'ring-2 ring-purple-500 border-purple-300 bg-purple-50/30' : ''}`}
            >
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Failed Refunds</p>
                <h3 className="text-xl font-black mt-1 text-purple-700">{stats.failedRefundsCount}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Reserve balance alerts</p>
              </div>
            </button>

            {activeCard && (
              <div className="lg:col-span-4 flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Filter active:</span>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {typeFilter} — {statusFilter}
                </span>
                <button
                  onClick={clearFilter}
                  className="text-xs font-bold text-muted-foreground hover:text-red-600 underline ml-1 transition-colors"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Payment ID, Refund ID, Order Number, or Customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 border-2 border-border focus:border-primary rounded-xl text-sm outline-none font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="border-2 border-border focus:border-primary rounded-xl px-3 py-3 text-sm outline-none bg-white font-semibold"
            >
              <option value="ALL">All Types</option>
              <option value="CHARGE">Charges</option>
              <option value="REFUND">Refunds</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border-2 border-border focus:border-primary rounded-xl px-3 py-3 text-sm outline-none bg-white font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>

            <button
              type="submit"
              className="bg-primary text-white font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-primary/95 shadow-sm transition-all"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">Loading transaction logs...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <SearchCode className="w-16 h-16 text-muted-foreground/30 mx-auto" />
            <h3 className="font-bold text-lg">No transactions found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              We couldn't find any charge or refund transactions matching the current search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/10 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Transaction Details</th>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          tx.type === 'CHARGE' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                        }`}>
                          {tx.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-primary hover:underline">
                      <Link href={`/admin/orders/${tx.orderId}`}>
                        #{tx.order?.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold">{tx.order?.user?.name || 'Guest'}</p>
                        <p className="text-xs text-muted-foreground">{tx.order?.user?.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-medium text-foreground">
                      {tx.gatewayRef}
                    </td>
                    <td className={`px-6 py-4 text-right font-black ${
                      tx.type === 'REFUND' ? 'text-orange-600' : 'text-foreground'
                    }`}>
                      {tx.type === 'REFUND' ? '-' : ''}{formatPrice(Number(tx.amount))}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {tx.status === 'SUCCESS' ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Success
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </div>
                        {tx.failReason && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1 bg-red-50/50 p-1.5 rounded border border-red-100 max-w-xs leading-normal">
                            ⚠️ {tx.failReason}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {tx.type === 'CHARGE' && tx.status === 'SUCCESS' && tx.order?.status !== 'CANCELLED' && tx.order?.status !== 'REFUNDED' && (
                        <button
                          onClick={() => openRefundModal(tx)}
                          className="text-xs font-bold px-3 py-1.5 bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-700 rounded-xl transition-all"
                        >
                          Manual Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground font-semibold">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 text-xs font-bold border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 text-xs font-bold border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Refund Trigger Modal */}
      {refundingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-black font-outfit border-b pb-3 mb-4 flex items-center gap-2">
              <Undo2 className="w-5 h-5 text-orange-600" />
              Trigger Razorpay Refund
            </h3>

            {feedback.message && (
              <div className={`p-3.5 rounded-xl border text-sm font-semibold mb-4 ${
                feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Order Reference:</p>
                <p className="font-bold text-sm">#{refundingOrder.order.orderNumber} (Captured amount: {formatPrice(Number(refundingOrder.amount))})</p>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Refund Amount (INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Enter amount to refund"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  You can perform a partial refund by entering a smaller amount, or leave it as the full amount.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Reason for Refund
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide audit notes or reasons for this refund..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full border-2 border-border focus:border-primary rounded-xl px-3 py-2 text-sm outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeRefundModal}
                  disabled={processingRefund}
                  className="px-4 py-2 border rounded-xl hover:bg-gray-50 text-sm font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingRefund || !refundAmount}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50 shadow"
                >
                  {processingRefund ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    'Initiate Refund'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
