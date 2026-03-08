'use client';

import { useEffect, useState } from 'react';
import { dashboardAPI } from '@/services/api';

interface FinancialData {
  mrr:                number;
  total_revenue:      number;
  overdue_count:      number;
  overdue_amount:     number;
  active_memberships: number;
  expiring_soon:      number;
  recent_payments:    Array<{
    payment_id:     number;
    full_name:      string;
    amount:         number;
    payment_method: string;
    status:         string;
    paid_at:        string;
  }>;
}

function StatCard({ label, value, sublabel, accent }: {
  label: string; value: string; sublabel?: string; accent?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${accent || 'border-gray-200'}`}>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
    </div>
  );
}

function StatCard({ label, value, sublabel, accent }: {
  label: string; value: string; sublabel?: string; accent?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${accent || 'border-gray-200'}`}>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
    </div>
  );
}

function PaymentMethodBadge({ method }: { method: string }) {
  const styles: Record<string, string> = {
    telebirr: 'bg-green-100 text-green-800',
    cbe_birr: 'bg-blue-100  text-blue-800',
    cash:     'bg-gray-100  text-gray-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[method] || 'bg-gray-100 text-gray-600'}`}>
      {method.replace('_', ' ').toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    pending:   'bg-yellow-100 text-yellow-800',
    failed:    'bg-red-100   text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function DashboardPage() {
  const [data,    setData]    = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    dashboardAPI.getFinancials()
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  const formatETB = (n: number) =>
    new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 2 })
      .format(n);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <span className="font-semibold text-gray-900">FitSync</span>
          <span className="text-gray-300 text-sm">|</span>
          <span className="text-gray-500 text-sm">Admin Dashboard</span>
        </div>
        <button
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          onClick={() => window.location.href = '/login'}
        >
          Sign out
        </button>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Financial Overview</h1>
          <p className="text-sm text-gray-500 mt-1">All figures in Ethiopian Birr (ETB)</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatCard
                label="Monthly Recurring Revenue"
                value={formatETB(data.mrr)}
                sublabel="This calendar month"
                accent="border-blue-200"
              />
              <StatCard
                label="Total Revenue"
                value={formatETB(data.total_revenue)}
                sublabel="All time"
              />
              <StatCard
                label="Active Memberships"
                value={data.active_memberships.toString()}
                sublabel={`${data.expiring_soon} expiring within 7 days`}
              />
              <StatCard
                label="Overdue Payments"
                value={data.overdue_count.toString()}
                sublabel={formatETB(data.overdue_amount) + ' outstanding'}
                accent={data.overdue_count > 0 ? 'border-red-200' : 'border-gray-200'}
              />
              <StatCard
                label="Expiring Soon"
                value={data.expiring_soon.toString()}
                sublabel="Next 7 days"
                accent={data.expiring_soon > 0 ? 'border-yellow-200' : 'border-gray-200'}
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">Recent Payments</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Member</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.recent_payments.map((p) => (
                      <tr key={p.payment_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800">{p.full_name}</td>
                        <td className="px-5 py-3 text-gray-700">{formatETB(p.amount)}</td>
                        <td className="px-5 py-3"><PaymentMethodBadge method={p.payment_method} /></td>
                        <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-5 py-3 text-gray-500">
                          {new Date(p.paid_at).toLocaleDateString('en-ET')}
                        </td>
                      </tr>
                    ))}
                    {data.recent_payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                          No payment records yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}