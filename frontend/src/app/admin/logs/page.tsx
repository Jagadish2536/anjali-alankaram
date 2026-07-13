'use client';

import { useEffect, useState } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Code,
  Copy,
  Check
} from 'lucide-react';
import { api } from '@/lib/api';

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  s3Key: string | null;
  metadata: {
    adminName?: string;
    adminEmail?: string;
    adminRole?: string;
    description?: string;
    payload?: any;
    requestUrl?: string;
    requestMethod?: string;
  } | null;
  success: boolean;
  errorMsg: string | null;
  createdAt: string;
  admin?: {
    name: string | null;
    email: string | null;
    role: string;
  } | null;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const hasActiveFilters =
    selectedEntityType !== 'all' ||
    selectedAction !== 'all' ||
    searchQuery !== '' ||
    startDate !== '' ||
    endDate !== '';

  const handleClearFilters = () => {
    setSelectedEntityType('all');
    setSelectedAction('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setPage(1);
  };

  // Detail Modal
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLogs = async (pageNum = 1, showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params: any = {
        page: pageNum,
        limit,
      };

      if (selectedEntityType !== 'all') {
        params.entityType = selectedEntityType;
      }
      if (selectedAction !== 'all') {
        params.action = selectedAction;
      }
      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }

      const response = await api.get('/admin/logs', { params });
      if (response.data) {
        setLogs(response.data.logs || []);
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 1);
        setPage(response.data.page || 1);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [selectedEntityType, selectedAction, startDate, endDate]);

  const handlePrevPage = () => {
    if (page > 1) {
      fetchLogs(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      fetchLogs(page + 1);
    }
  };

  const handleCopyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (act.includes('DELETE') || act.includes('REJECT') || act.includes('REMOVE')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (act.includes('UPDATE') || act.includes('EDIT')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (act.includes('CANCEL')) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getEntityTypeBadgeColor = (type: string) => {
    const t = type.toUpperCase();
    switch (t) {
      case 'PRODUCT':
        return 'bg-purple-100 text-purple-800';
      case 'CATEGORY':
        return 'bg-pink-100 text-pink-800';
      case 'COUPON':
        return 'bg-indigo-100 text-indigo-800';
      case 'OFFER':
        return 'bg-teal-100 text-teal-800';
      case 'ORDER':
        return 'bg-orange-100 text-orange-800';
      case 'SETTINGS':
        return 'bg-slate-100 text-slate-800';
      case 'USER':
        return 'bg-cyan-100 text-cyan-800';
      case 'REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'WAREHOUSE':
        return 'bg-lime-100 text-lime-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Local filtering for searches
  const filteredLogs = logs.filter((log) => {
    const desc = log.metadata?.description || '';
    const email = log.metadata?.adminEmail || log.admin?.email || '';
    const name = log.metadata?.adminName || log.admin?.name || '';
    const query = searchQuery.toLowerCase();
    return (
      desc.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      name.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.entityType.toLowerCase().includes(query)
    );
  });

  const getInitials = (name?: string) => {
    if (!name) return 'AD';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 space-y-6 animate-in fade-in duration-300">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-outfit font-bold text-foreground flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary" />
            Activity Logs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Monitor state changes, catalog updates, orders, and setting adjustments.
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page, true)}
          disabled={loading || refreshing}
          className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-muted text-sm font-semibold transition-colors w-full sm:w-auto justify-center disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
          Refresh Logs
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-white p-4 rounded-2xl shadow-sm border">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search description, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted/30 border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          />
        </div>

        {/* Resource Type filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={selectedEntityType}
            onChange={(e) => {
              setSelectedEntityType(e.target.value);
              setPage(1);
            }}
            className="w-full py-2 px-3 bg-muted/30 border rounded-xl focus:outline-none text-sm"
          >
            <option value="all">All Resources</option>
            <option value="PRODUCT">Products</option>
            <option value="CATEGORY">Categories</option>
            <option value="ORDER">Orders</option>
            <option value="COUPON">Coupons</option>
            <option value="OFFER">Offers</option>
            <option value="SETTINGS">Settings</option>
            <option value="USER">Users / Customers</option>
            <option value="REVIEW">Reviews</option>
            <option value="WAREHOUSE">Warehouse</option>
          </select>
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="w-full py-2 px-3 bg-muted/30 border rounded-xl focus:outline-none text-sm"
          >
            <option value="all">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="CANCEL_ORDER">Cancel Order</option>
            <option value="UPDATE_STATUS">Update Order Status</option>
            <option value="ASSIGN_COURIER">Assign Courier</option>
            <option value="UPDATE_INVENTORY">Adjust Stock</option>
          </select>
        </div>

        {/* Start Date filter */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full py-2 px-3 bg-muted/30 border rounded-xl focus:outline-none text-sm text-muted-foreground"
            title="Start Date"
          />
        </div>

        {/* End Date filter */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full py-2 px-3 bg-muted/30 border rounded-xl focus:outline-none text-sm text-muted-foreground"
            title="End Date"
          />
        </div>

        {/* Stats & Reset */}
        <div className="flex items-center justify-between gap-2 px-2 col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1">
          {hasActiveFilters ? (
            <button
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold shrink-0"
            >
              Clear Filters
            </button>
          ) : (
            <span className="text-xs text-muted-foreground shrink-0">No active filters</span>
          )}
          <span className="text-xs text-muted-foreground font-medium text-right truncate">
            {filteredLogs.length} / {total} logs
          </span>
        </div>
      </div>

      {/* Logs Listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border rounded-2xl shadow-sm space-y-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Loading activity logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border rounded-2xl shadow-sm text-center px-4">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center text-muted-foreground mb-4">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Logs Found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">
            Try adjusting your filters or searches to discover activity log records.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-xs uppercase font-bold text-muted-foreground tracking-wider">
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Resource</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredLogs.map((log) => {
                  const adminName = log.metadata?.adminName || log.admin?.name || 'System';
                  const adminEmail = log.metadata?.adminEmail || log.admin?.email || '';
                  const adminRole = log.metadata?.adminRole || log.admin?.role || 'SYSTEM';

                  return (
                    <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-xs">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {getInitials(adminName)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-xs">{adminName}</p>
                            <p className="text-[10px] text-muted-foreground">{adminEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${getEntityTypeBadgeColor(log.entityType)}`}>
                          {log.entityType}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground max-w-xs truncate">
                        {log.metadata?.description || 'No description'}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Success
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"
                            title={log.errorMsg || 'Action failed'}
                          >
                            <XCircle className="w-4 h-4 shrink-0" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setActiveLog(log)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (< 768px) */}
          <div className="md:hidden space-y-4">
            {filteredLogs.map((log) => {
              const adminName = log.metadata?.adminName || log.admin?.name || 'System';
              const adminEmail = log.metadata?.adminEmail || log.admin?.email || '';
              const adminRole = log.metadata?.adminRole || log.admin?.role || 'SYSTEM';

              return (
                <div
                  key={log.id}
                  onClick={() => setActiveLog(log)}
                  className="bg-white p-4 rounded-2xl shadow-sm border hover:border-primary/30 transition-all flex flex-col gap-3 active:scale-[0.99] cursor-pointer"
                >
                  {/* Badges & Status */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-md ${getEntityTypeBadgeColor(log.entityType)}`}>
                        {log.entityType}
                      </span>
                    </div>
                    {log.success ? (
                      <span className="flex items-center text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                        Success
                      </span>
                    ) : (
                      <span className="flex items-center text-[11px] font-semibold text-rose-600">
                        <XCircle className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                        Failed
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="font-semibold text-foreground text-sm">
                    {log.metadata?.description || 'No description'}
                  </p>

                  {/* Timestamp & User */}
                  <div className="border-t border-muted/50 pt-2.5 flex justify-between items-center text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                        {getInitials(adminName)}
                      </div>
                      <div>
                        <span className="font-bold text-foreground block text-[11px] leading-tight">{adminName}</span>
                        <span className="text-[9px] text-muted-foreground leading-tight block">{adminEmail}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile-Friendly Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-6 py-4 rounded-2xl border shadow-sm mt-4">
              <div className="text-xs md:text-sm text-muted-foreground font-medium order-2 sm:order-1">
                Showing page <span className="font-semibold text-foreground">{page}</span> of{' '}
                <span className="font-semibold text-foreground">{totalPages}</span>
              </div>
              <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 border rounded-xl hover:bg-muted font-semibold text-sm transition-all disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={page === totalPages}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 border rounded-xl hover:bg-muted font-semibold text-sm transition-all disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details Side-Drawer / Modal */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-300"
          >
            {/* Modal Header */}
            <div className="p-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-primary" />
                <h3 className="font-outfit font-bold text-lg text-foreground">Log Details</h3>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Event Overview */}
              <div className="bg-muted/20 p-4 rounded-xl space-y-3">
                <h4 className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider">
                  Event Overview
                </h4>
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  {activeLog.metadata?.description || 'No description available'}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getActionBadgeColor(activeLog.action)}`}>
                    {activeLog.action}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${getEntityTypeBadgeColor(activeLog.entityType)}`}>
                    {activeLog.entityType}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-md flex items-center gap-1 ${
                    activeLog.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {activeLog.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {activeLog.success ? 'Success' : 'Failed'}
                  </span>
                </div>
              </div>

              {/* Actor Details */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider">
                  Actor Details
                </h4>
                <div className="flex items-center gap-3 p-3 border rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {getInitials(activeLog.metadata?.adminName || activeLog.admin?.name || 'System')}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">
                      {activeLog.metadata?.adminName || activeLog.admin?.name || 'System Actor'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeLog.metadata?.adminEmail || activeLog.admin?.email || 'N/A'}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-muted rounded-full mt-1 inline-block text-muted-foreground">
                      Role: {activeLog.metadata?.adminRole || activeLog.admin?.role || 'SYSTEM'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Execution Info */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider">
                  Request Metadata
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-muted/10 p-3 rounded-xl">
                    <p className="text-muted-foreground font-semibold">Timestamp</p>
                    <p className="font-bold text-foreground mt-1">
                      {new Date(activeLog.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-muted/10 p-3 rounded-xl">
                    <p className="text-muted-foreground font-semibold">HTTP Method</p>
                    <p className="font-bold text-foreground mt-1">
                      {activeLog.metadata?.requestMethod || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-muted/10 p-3 rounded-xl col-span-2">
                    <p className="text-muted-foreground font-semibold">Endpoint URL</p>
                    <p className="font-bold text-foreground mt-1 font-mono break-all">
                      {activeLog.metadata?.requestUrl || 'N/A'}
                    </p>
                  </div>
                  {activeLog.errorMsg && (
                    <div className="bg-rose-50 text-rose-900 p-3 rounded-xl col-span-2 border border-rose-200">
                      <p className="font-semibold text-rose-700">Error Message</p>
                      <p className="font-mono mt-1 font-bold break-words">{activeLog.errorMsg}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payload Changes */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-primary" />
                    Payload Details
                  </h4>
                  {activeLog.metadata?.payload && (
                    <button
                      onClick={() => handleCopyPayload(activeLog.metadata?.payload)}
                      className="text-xs flex items-center gap-1 text-primary hover:underline font-semibold"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy JSON
                        </>
                      )}
                    </button>
                  )}
                </div>
                {activeLog.metadata?.payload ? (
                  <div className="bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-800">
                    <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[300px] leading-relaxed">
                      <code>{JSON.stringify(activeLog.metadata.payload, null, 2)}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-xl text-muted-foreground text-xs">
                    No payload parameters logged for this action.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-muted/20">
              <button
                onClick={() => setActiveLog(null)}
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-all text-sm shadow-md"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
