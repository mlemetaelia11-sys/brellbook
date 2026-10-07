'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';

type AnalyticsData = {
  metrics: {
    revenue: number;
    bookings: number;
    customers: number;
    completed: number;
    cancelled: number;
    averageBookingValue: number;
  };
  byService: Array<{
    serviceId: string;
    name: string;
    count: number;
    revenue: number;
  }>;
};

export default function Analytics() {
  const [d, setD] = useState<AnalyticsData | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const businessResponse = await fetch('/api/me/business');

        if (!businessResponse.ok) {
          throw new Error('Unable to load business.');
        }

        const businessData = await businessResponse.json();

        if (!businessData.business?.id) {
          throw new Error('No business found.');
        }

        const response = await fetch(
          `/api/analytics?businessId=${encodeURIComponent(
            businessData.business.id
          )}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load analytics.');
        }

        if (!cancelled) {
          setD(data);
        }
      } catch (error) {
        if (!cancelled) {
          setErr(
            error instanceof Error
              ? error.message
              : 'Unable to load analytics.'
          );
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardShell title="Analytics">
      <div className="page-title">
        <div>
          <h1>Analytics</h1>
          <p className="muted">
            Last 30 days · real booking and revenue data.
          </p>
        </div>
      </div>

      {err ? (
        <div className="card feature">
          <h3>{err}</h3>
          <Link
            className="btn btn-primary"
            href="/dashboard/subscription"
          >
            Upgrade
          </Link>
        </div>
      ) : !d ? (
        <div className="card feature">Loading…</div>
      ) : (
        <>
          <div className="grid3">
            {[
              [
                'Revenue',
                `TSh ${Math.round(
                  d.metrics.revenue
                ).toLocaleString()}`,
              ],
              ['Bookings', d.metrics.bookings],
              ['Customers', d.metrics.customers],
              ['Completed', d.metrics.completed],
              ['Cancellations', d.metrics.cancelled],
              [
                'Average booking',
                `TSh ${Math.round(
                  d.metrics.averageBookingValue
                ).toLocaleString()}`,
              ],
            ].map(([label, value]) => (
              <div className="card metric" key={String(label)}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div
            className="card panel"
            style={{ marginTop: 16 }}
          >
            <h3>Best services</h3>

            {d.byService.map((service) => (
              <div
                className="hours-row"
                key={service.serviceId}
              >
                <strong>{service.name}</strong>
                <span>{service.count} bookings</span>
                <span>
                  TSh{' '}
                  {Math.round(
                    service.revenue
                  ).toLocaleString()}
                </span>
              </div>
            ))}

            {!d.byService.length && (
              <div className="empty">
                No service booking data yet.
              </div>
            )}
          </div>
        </>
      )}
    </DashboardShell>
  );
}