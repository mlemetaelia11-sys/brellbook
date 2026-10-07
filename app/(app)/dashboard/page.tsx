import { db } from '@/lib/prisma';
import { requireBusiness, requireUser } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { Badge, Card } from '@/components/ui';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MousePointerClick,
  Plus,
  Share2,
  Star,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { startOfDay, endOfDay, startOfMonth } from 'date-fns';
import type { ReactNode } from 'react';

export default async function Dashboard() {
  const user = await requireUser();
  const business = await requireBusiness(user.id);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);

  const [
    todayBookings,
    pendingBookings,
    completedBookings,
    monthBookings,
    recentBookings,
    revenue,
    customers,
    monthCompleted,
    avgRating,
    reviewsCount,
    cancelledBookings,
    noShows,
  ] = await Promise.all([
    db.booking.count({
      where: {
        businessId: business.id,
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    }),

    db.booking.count({
      where: {
        businessId: business.id,
        status: 'PENDING',
      },
    }),

    db.booking.count({
      where: {
        businessId: business.id,
        status: 'COMPLETED',
      },
    }),

    db.booking.count({
      where: {
        businessId: business.id,
        createdAt: {
          gte: monthStart,
        },
      },
    }),

    db.booking.findMany({
      where: {
        businessId: business.id,
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 8,
      select: {
        id: true,
        serviceNameSnapshot: true,
        customerNameSnapshot: true,
        startTime: true,
        status: true,
      },
    }),

    db.booking.aggregate({
      where: {
        businessId: business.id,
        status: {
          in: ['CONFIRMED', 'COMPLETED'],
        },
        createdAt: {
          gte: monthStart,
        },
      },
      _sum: {
        priceSnapshot: true,
      },
    }),

    db.customer.count({
      where: {
        businessId: business.id,
      },
    }),

    db.booking.count({
      where: {
        businessId: business.id,
        status: 'COMPLETED',
        createdAt: {
          gte: monthStart,
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
    }),

    db.review.count({
      where: {
        businessId: business.id,
      },
    }),

    db.booking.count({
      where: {
        businessId: business.id,
        status: 'CANCELLED',
        createdAt: {
          gte: monthStart,
        },
      },
    }),

    db.booking.count({
      where: {
        businessId: business.id,
        status: 'NO_SHOW',
        createdAt: {
          gte: monthStart,
        },
      },
    }),
  ]);

  const completionRate =
    monthBookings > 0
      ? Math.round((monthCompleted / monthBookings) * 100)
      : 0;

  const cancellationRate =
    monthBookings > 0
      ? Math.round((cancelledBookings / monthBookings) * 100)
      : 0;

  const noShowRate =
    monthBookings > 0
      ? Math.round((noShows / monthBookings) * 100)
      : 0;

  const firstName =
    user.name?.trim().split(/\s+/)[0] || 'there';

  return (
    <div className="p-5 md:p-8">
      <PageHeader
        title={`Good morning, ${firstName} 👋`}
        description="Here’s what’s happening with your business today."
        action={
          <Link
            className="btn btn-primary"
            href="/bookings?new=1"
          >
            <Plus size={17} />
            New Booking
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Today’s Bookings"
          value={todayBookings}
          icon={<CalendarDays size={18} />}
        />

        <Metric
          label="Pending"
          value={pendingBookings}
          icon={<Clock3 size={18} />}
        />

        <Metric
          label="Completed"
          value={completedBookings}
          icon={<CheckCircle2 size={18} />}
        />

        <Metric
          label="This Month"
          value={monthBookings}
          icon={<TrendingUp size={18} />}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmallMetric
          label="Expected Revenue"
          value={`TSh ${Number(
            revenue._sum.priceSnapshot || 0,
          ).toLocaleString()}`}
          icon={<TrendingUp size={17} />}
        />

        <SmallMetric
          label="Customers"
          value={customers.toLocaleString()}
          icon={<Users size={17} />}
        />

        <SmallMetric
          label="Completed This Month"
          value={monthCompleted.toLocaleString()}
          icon={<MousePointerClick size={17} />}
        />

        <SmallMetric
          label="Rating"
          value={
            avgRating._avg.rating
              ? `${avgRating._avg.rating.toFixed(1)} / 5`
              : '—'
          }
          icon={<Star size={17} />}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold">
                Today’s schedule
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Keep the day moving without double bookings.
              </p>
            </div>

            <Link
              className="text-sm font-semibold text-[#6C2BFF]"
              href="/calendar"
            >
              View calendar
            </Link>
          </div>

          <div className="space-y-3">
            {recentBookings.length === 0 ? (
              <Empty text="Your schedule is clear." />
            ) : (
              recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {booking.serviceNameSnapshot}
                    </div>

                    <div className="text-sm text-slate-500">
                      {booking.customerNameSnapshot} ·{' '}
                      {booking.startTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <Badge
                    tone={
                      booking.status === 'COMPLETED'
                        ? 'green'
                        : booking.status === 'PENDING'
                          ? 'yellow'
                          : booking.status === 'CANCELLED'
                            ? 'red'
                            : booking.status === 'NO_SHOW'
                              ? 'red'
                              : 'purple'
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">
                  Booking performance
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  This month
                </p>
              </div>

              <span className="text-2xl font-black text-[#6C2BFF]">
                {completionRate}%
              </span>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#6C2BFF]"
                style={{
                  width: `${completionRate}%`,
                }}
              />
            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-500">
              <span>
                {monthCompleted} completed
              </span>

              <span>
                {monthBookings} total bookings
              </span>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-bold">
              Quick actions
            </h2>

            <div className="mt-4 grid gap-3">
              <Link
                className="flex items-center justify-between rounded-xl bg-purple-50 p-4 font-semibold text-[#6C2BFF]"
                href="/services/new"
              >
                Add Service
                <ArrowUpRight size={17} />
              </Link>

              <Link
                className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold"
                href="/calendar"
              >
                View Calendar
                <CalendarDays size={17} />
              </Link>

              <Link
                className="flex items-center justify-between rounded-xl bg-slate-50 p-4 font-semibold"
                href="/growth"
              >
                Grow with BrellBook
                <Share2 size={17} />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <HealthCard
          icon={<CheckCircle2 size={18} />}
          label="Completion rate"
          value={`${completionRate}%`}
          tone="green"
        />

        <HealthCard
          icon={<XCircle size={18} />}
          label="Cancellation rate"
          value={`${cancellationRate}%`}
          tone="red"
        />

        <HealthCard
          icon={<XCircle size={18} />}
          label="No-show rate"
          value={`${noShowRate}%`}
          tone="red"
        />
      </div>

      <Card className="mt-5 p-6">
        <h2 className="font-bold">
          Customer & review health
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricSmall
            label="Customers"
            value={customers.toLocaleString()}
          />

          <MetricSmall
            label="Reviews"
            value={reviewsCount.toLocaleString()}
          />

          <MetricSmall
            label="Average rating"
            value={
              avgRating._avg.rating
                ? `${avgRating._avg.rating.toFixed(1)} / 5`
                : 'No reviews yet'
            }
          />
        </div>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-slate-400">
        <div className="text-sm">
          {label}
        </div>

        <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-[#6C2BFF]">
          {icon}
        </div>
      </div>

      <div className="mt-2 text-3xl font-black">
        {value}
      </div>

      <div className="mt-2 text-xs font-semibold text-emerald-600">
        Live data
      </div>
    </Card>
  );
}

function SmallMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <span className="text-[#6C2BFF]">
          {icon}
        </span>

        {label}
      </div>

      <div className="mt-2 text-xl font-black">
        {value}
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

function HealthCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'green' | 'red';
}) {
  const isGreen = tone === 'green';

  return (
    <Card className="p-5">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          isGreen
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-red-50 text-red-500'
        }`}
      >
        {icon}
      </div>

      <div className="mt-4 text-sm text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black">
        {value}
      </div>
    </Card>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}