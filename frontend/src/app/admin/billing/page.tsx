'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Cloud, IndianRupee, TrendingUp, TrendingDown, RefreshCw,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Server,
  BarChart3, Loader2, CreditCard,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────
function inr(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

// ── Mini bar chart ───────────────────────────────────────────────────
function TinyBarChart({ data }: { data: { label: string; totalCost: number }[] }) {
  const max = Math.max(...data.map(d => d.totalCost), 0.01);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="w-full relative" style={{ height: `${Math.max((d.totalCost / max) * 64, 2)}px` }}>
            <div
              className={`absolute bottom-0 w-full rounded-t-sm transition-all ${
                i === data.length - 1 ? 'bg-primary' : 'bg-primary/30 group-hover:bg-primary/60'
              }`}
              style={{ height: '100%' }}
            />
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-primary opacity-0 group-hover:opacity-100 whitespace-nowrap bg-white shadow px-1 rounded">
              {inr(d.totalCost)}
            </span>
          </div>
          <span className="text-[8px] text-muted-foreground rotate-[-35deg] translate-y-1 whitespace-nowrap">{d.label.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Service Row ──────────────────────────────────────────────────────
function ServiceRow({ name, cost, pct }: { name: string; cost: number; pct: number }) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <Server className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium truncate">{name}</span>
        </div>
        <span className="text-xs font-bold ml-4 shrink-0">{inr(cost)}</span>
      </div>
      <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

// ── Month Card ───────────────────────────────────────────────────────
function MonthCard({ month }: { month: any }) {
  const [expanded, setExpanded] = useState(false);
  const topServices = month.services.slice(0, 5);
  const hasMore = month.services.length > 5;

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm">{month.label}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{month.services.length} AWS service{month.services.length !== 1 ? 's' : ''}</span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                month.status === 'Paid'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {month.status || 'Paid'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-black text-base text-primary">{inr(month.totalCost)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t pt-3">
          {month.services.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No charges this month</p>
          ) : (
            <div className="divide-y">
              {(expanded ? month.services : topServices).map((s: any) => (
                <ServiceRow
                  key={s.name}
                  name={s.name}
                  cost={s.cost}
                  pct={month.totalCost > 0 ? (s.cost / month.totalCost) * 100 : 0}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function AdminBillingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBilling = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/billing');
      if (!res.data.success) {
        setError(res.data.error || 'Failed to load billing data');
        setData(null);
      } else {
        setData(res.data);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to fetch billing data');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Cloud className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-outfit font-black">AWS Billing</h1>
            <p className="text-sm text-muted-foreground">Monthly cloud infrastructure costs — Last 12 months</p>
          </div>
        </div>
        <button
          onClick={() => fetchBilling(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Fetching billing data from AWS Cost Explorer…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Unable to load billing data</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <p className="text-xs text-red-500 mt-3">
              Make sure your IAM user has the <code className="bg-red-100 px-1 rounded">ce:GetCostAndUsage</code> permission attached.
            </p>
          </div>
        </div>
      )}

      {/* Data */}
      {!loading && data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Unpaid
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">This Month</p>
              <h3 className="text-xl font-outfit font-black mt-0.5">{inr(data.summary.currentMonthCost)}</h3>
            </div>

            <div className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-green-50 text-green-600">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                  Paid
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Last Month</p>
              <h3 className="text-xl font-outfit font-black mt-0.5">{inr(data.summary.lastMonthCost)}</h3>
              {data.summary.trend !== 0 && (
                <p className={`text-[10px] font-bold mt-1 ${data.summary.trend > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {data.summary.trend > 0 ? '+' : ''}{data.summary.trend}% vs last month
                </p>
              )}
            </div>

            <div className="col-span-2 bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">12 months</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Total Billed (12 months)</p>
              <h3 className="text-2xl font-outfit font-black mt-0.5">{inr(data.summary.grandTotal)}</h3>
              {data.summary.accountId && (
                <p className="text-[10px] text-muted-foreground mt-1">Account: {data.summary.accountId} · Region: {data.summary.region}</p>
              )}
            </div>
          </div>

          {/* Chart */}
          {data.billing.length > 0 && (
            <div className="bg-white border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-outfit font-bold text-base">Monthly Cost Trend</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Blended cost per month (INR)</p>
                </div>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <TinyBarChart data={data.billing} />
            </div>
          )}

          {/* Month-by-month breakdown */}
          <div>
            <h2 className="font-outfit font-bold text-base mb-3">Monthly Breakdown</h2>
            <div className="space-y-3">
              {[...data.billing].reverse().map((month: any) => (
                <MonthCard key={month.period} month={month} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
