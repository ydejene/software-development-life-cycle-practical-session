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