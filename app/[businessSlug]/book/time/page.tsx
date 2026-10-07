import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/prisma';
import { getAvailableSlots } from '@/lib/booking';
import { BusinessPageTracker } from '@/components/business-page-tracker';

type PageProps = {
  params: Promise<{
    businessSlug: string;
  }>;

  searchParams: Promise<{
    service?: string;
    date?: string;
    staff?: string;
  }>;
};

export default async function TimePage({
  params,
  searchParams,
}: PageProps) {
  const { businessSlug } = await params;
  const query = await searchParams;

  const business = await db.business.findUnique({
    where: {
      slug: businessSlug,
    },
  });

  if (!business || !business.active) {
    notFound();
  }

  if (!query.service || !query.date) {
    notFound();
  }

  const service = await db.service.findFirst({
    where: {
      id: query.service,
      businessId: business.id,
      active: true,
    },
  });

  if (!service) {
    notFound();
  }

  const slots = await getAvailableSlots(
    business.id,
    service.id,
    query.date,
    query.staff,
  );

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-4 py-8 md:px-6">
      <BusinessPageTracker
        businessSlug={business.slug}
        serviceId={service.id}
        type="TIME_SELECTED"
      />

      <div className="mx-auto max-w-xl">
        <Link
          href={`/${business.slug}/book/date?service=${encodeURIComponent(
            service.id,
          )}`}
          className="mb-6 inline-flex items-center text-sm font-semibold text-[#6C2BFF] hover:underline"
        >
          ← Back
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-7">
            <p className="text-sm font-semibold text-[#6C2BFF]">
              {business.name}
            </p>

            <h1 className="mt-2 text-2xl font-black text-slate-900">
              Choose a time
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {service.name} · {query.date}
            </p>
          </div>

          {slots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="font-semibold text-slate-900">
                No available times
              </p>

              <p className="mt-2 text-sm text-slate-500">
                There are no available slots on this date. Please choose
                another date.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {slots.map((slot) => {
                const params = new URLSearchParams({
                  service: service.id,
                  date: query.date as string,
                  time: slot,
                });

                if (query.staff) {
                  params.set('staff', query.staff);
                }

                return (
                  <Link
                    key={slot}
                    href={`/${business.slug}/book/customer?${params.toString()}`}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-800 transition hover:border-[#6C2BFF] hover:bg-violet-50 hover:text-[#6C2BFF]"
                  >
                    {slot}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}