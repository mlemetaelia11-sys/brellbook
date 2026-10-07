import { requireBusiness, requireUser } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { Card, CopyButton } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { ReferralActions } from '@/components/referral-actions';
import {
  Camera,
  MessageCircle,
  QrCode,
  Share2,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';

export default async function Growth() {
  const user = await requireUser();
  const business = await requireBusiness(user.id);

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');

  const bookingLink = `${baseUrl}/${business.slug}`;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalBookings,
    monthBookings,
    completedBookings,
    customers,
  ] = await Promise.all([
    db.booking.count({
      where: {
        businessId: business.id,
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

    db.booking.count({
      where: {
        businessId: business.id,
        status: 'COMPLETED',
        createdAt: {
          gte: monthStart,
        },
      },
    }),

    db.customer.count({
      where: {
        businessId: business.id,
      },
    }),
  ]);

  const completionRate =
    monthBookings > 0
      ? Math.round((completedBookings / monthBookings) * 100)
      : 0;

  return (
    <div className="p-5 md:p-8">
      <PageHeader
        title="Grow your business"
        description="Turn Instagram, WhatsApp and your booking page into a simple customer acquisition engine."
      />

      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[#6C2BFF]">
                Your booking link
              </div>

              <h2 className="mt-1 text-2xl font-black">
                Share it everywhere
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Put this link in your Instagram bio, WhatsApp Business
                profile, Facebook page, Google Business profile and printed
                QR posters.
              </p>
            </div>

            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-purple-50 text-[#6C2BFF]">
              <QrCode />
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <div className="break-all font-mono text-sm">
              {bookingLink}
            </div>

            <div className="mt-3">
              <CopyButton value={bookingLink} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <GrowthTip
              icon={<Camera />}
              title="Instagram"
              text="Add the link to your bio and pin a booking post."
            />

            <GrowthTip
              icon={<MessageCircle />}
              title="WhatsApp"
              text="Add it to your profile, greeting and status."
            />

            <GrowthTip
              icon={<QrCode />}
              title="QR code"
              text="Print your booking link on posters and cards."
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6C2BFF]">
            Booking performance
          </div>

          <h2 className="mt-1 text-2xl font-black">
            {completionRate}% completion
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Based on bookings created this month.
          </p>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#6C2BFF]"
              style={{
                width: `${completionRate}%`,
              }}
            />
          </div>

          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>{monthBookings} bookings</span>
            <span>{completedBookings} completed</span>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <StatCard
          icon={<TrendingUp />}
          value={totalBookings.toString()}
          label="Total bookings"
        />

        <StatCard
          icon={<Users />}
          value={customers.toString()}
          label="Customers"
        />

        <StatCard
          icon={<Share2 />}
          value={monthBookings.toString()}
          label="Bookings this month"
        />
      </div>

      <Card className="mt-5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[#6C2BFF]">
              Refer a business
            </div>

            <h2 className="mt-1 text-2xl font-black">
              Help another business get online.
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Invite salons, barbers, spas and other appointment businesses
              to discover BrellBook.
            </p>
          </div>

          <ReferralActions />
        </div>
      </Card>
    </div>
  );
}

function GrowthTip({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="text-[#6C2BFF]">
        {icon}
      </div>

      <div className="mt-3 font-bold">
        {title}
      </div>

      <div className="mt-1 text-xs leading-5 text-slate-500">
        {text}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <Card className="p-6">
      <div className="text-[#6C2BFF]">
        {icon}
      </div>

      <div className="mt-4 text-3xl font-black">
        {value}
      </div>

      <div className="text-sm text-slate-500">
        {label}
      </div>
    </Card>
  );
}