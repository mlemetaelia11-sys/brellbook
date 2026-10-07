import { requireBusiness, requireUser } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { Badge, Card } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import {
  CalendarDays,
  CheckCircle2,
  Star,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';

export default async function Analytics() {
  const user = await requireUser();
  const business = await requireBusiness(user.id);

  const subscription = await db.subscription.findUnique({
    where: {
      businessId: business.id,
    },
    select: {
      plan: true,
      status: true,
    },
  });

  if (subscription?.plan === 'FREE' || !subscription) {
    return (
      <div className="p-5 md:p-8">
        <Card className="p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-purple-50 text-[#6C2BFF]">
            <TrendingUp />
          </div>

          <h1 className="mt-5 text-3xl font-black">
            Advanced analytics is Pro
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-slate-500">
            Upgrade to unlock deeper booking, service and customer insights.
          </p>
        </Card>
      </div>
    );
  }

  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [
    totalBookings,
    pendingBookings,
    confirmedBookings,
    completedBookings,
    cancelledBookings,
    noShows,
    newCustomers,
    reviews,
    serviceGroups,
  ] = await Promise.all([
    db.booking.count({
      where: {
        businessId: business.id,
        createdAt: {
          gte: since,
        },
      },
    }),

    db.booking.count({
      where: {
        businessId: business.id,
        status: 'PENDING',
        createdAt: {
          gte: since,
        },
      },
    }),

    db.booking.count({
      where: {
        businessId: business.id,
        status: 'CONFIRMED',
        createdAt: {
          gte: since,
        },
      },
    }),

    db.booking.count({
      where: {
        businessId: business.id,
        status: 'COMPLETED',
        createdAt: {
          gte: since,
        },
      },
    }),

    db.booking.count({
      where: {
        businessId: business.id,
        status: 'CANCELLED',
        createdAt: {
          gte: since,
        },
      },
    }),

    db.booking.count({
      where: {
        businessId: business.id,
        status: 'NO_SHOW',
        createdAt: {
          gte: since,
        },
      },
    }),

    db.customer.count({
      where: {
        businessId: business.id,
        createdAt: {
          gte: since,
        },
      },
    }),

    db.review.aggregate({
      where: {
        businessId: business.id,
      },
      _avg: {
        rating: true,
      },
      _count: {
        _all: true,
      },
    }),

    db.booking.groupBy({
      by: ['serviceId'],
      where: {
        businessId: business.id,
        createdAt: {
          gte: since,
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          serviceId: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  const serviceRows = await Promise.all(
    serviceGroups.map(async (group) => {
      const service = await db.service.findUnique({
        where: {
          id: group.serviceId,
        },
        select: {
          name: true,
        },
      });

      return {
        name: service?.name || 'Service',
        count: group._count._all,
      };
    }),
  );

  const completionRate =
    totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 100)
      : 0;

  const confirmationRate =
    totalBookings > 0
      ? Math.round(
          ((confirmedBookings + completedBookings) / totalBookings) * 100,
        )
      : 0;

  const cancellationRate =
    totalBookings > 0
      ? Math.round((cancelledBookings / totalBookings) * 100)
      : 0;

  const noShowRate =
    totalBookings > 0
      ? Math.round((noShows / totalBookings) * 100)
      : 0;

  const maxServiceBookings =
    serviceRows.length > 0
      ? Math.max(...serviceRows.map((service) => service.count), 1)
      : 1;

  return (
    <div className="p-5 md:p-8">
      <PageHeader
        title="Analytics"
        description="Understand your bookings, customers, services and business performance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={<CalendarDays />}
          label="Bookings"
          value={totalBookings.toString()}
        />

        <Metric
          icon={<CheckCircle2 />}
          label="Completed"
          value={completedBookings.toString()}
        />

        <Metric
          icon={<Users />}
          label="New customers"
          value={newCustomers.toString()}
        />

        <Metric
          icon={<Star />}
          label="Average rating"
          value={
            reviews._avg.rating
              ? reviews._avg.rating.toFixed(1)
              : '—'
          }
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Booking performance</h2>
              <p className="mt-1 text-sm text-slate-500">
                This month
              </p>
            </div>

            <Badge tone="purple">
              {completionRate}% completed
            </Badge>
          </div>

          <div className="mt-6 space-y-5">
            <ProgressRow
              label="Confirmed + completed"
              value={confirmedBookings + completedBookings}
              total={totalBookings}
            />

            <ProgressRow
              label="Completed"
              value={completedBookings}
              total={totalBookings}
            />

            <ProgressRow
              label="Pending"
              value={pendingBookings}
              total={totalBookings}
            />

            <ProgressRow
              label="Cancelled"
              value={cancelledBookings}
              total={totalBookings}
            />

            <ProgressRow
              label="No-shows"
              value={noShows}
              total={totalBookings}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Top services</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ranked by bookings this month
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {serviceRows.length ? (
              serviceRows.map((service, index) => {
                const width = Math.round(
                  (service.count / maxServiceBookings) * 100,
                );

                return (
                  <div key={`${service.name}-${index}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {index + 1}. {service.name}
                        </div>
                      </div>

                      <Badge tone={index === 0 ? 'purple' : 'slate'}>
                        {service.count}
                      </Badge>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#6C2BFF]"
                        style={{
                          width: `${width}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No service booking data yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 />}
          label="Confirmation rate"
          value={`${confirmationRate}%`}
        />

        <StatCard
          icon={<TrendingUp />}
          label="Completion rate"
          value={`${completionRate}%`}
        />

        <StatCard
          icon={<XCircle />}
          label="Cancellation rate"
          value={`${cancellationRate}%`}
        />

        <StatCard
          icon={<XCircle />}
          label="No-show rate"
          value={`${noShowRate}%`}
        />
      </div>

      <Card className="mt-5 p-6">
        <h2 className="font-bold">Customer health</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricSmall
            label="Reviews"
            value={reviews._count._all.toString()}
          />

          <MetricSmall
            label="New customers"
            value={newCustomers.toString()}
          />

          <MetricSmall
            label="Booking activity"
            value={
              totalBookings > 0
                ? 'Active'
                : 'Waiting for first booking'
            }
          />
        </div>
      </Card>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-slate-400">{icon}</span>

        <span className="text-xs text-slate-400">
          This month
        </span>
      </div>

      <div className="mt-4 text-3xl font-black">
        {value}
      </div>

      <div className="mt-1 text-sm text-slate-500">
        {label}
      </div>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-500">
          {icon}
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </div>

          <div className="mt-1 text-2xl font-black">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MetricSmall({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-sm text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black">
        {value}
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage =
    total > 0
      ? Math.min(100, Math.max(0, Math.round((value / total) * 100)))
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-slate-600">
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#6C2BFF]"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}