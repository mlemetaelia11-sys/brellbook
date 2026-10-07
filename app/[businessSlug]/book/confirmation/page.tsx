import { db } from "@/lib/prisma";
import Link from "next/link";

export default async function Confirmation({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ id: string }>;
}) {
  const { businessSlug } = await params;
  const q = await searchParams;

  const business = await db.business.findUnique({
    where: {
      slug: businessSlug,
    },
  });

  const booking = await db.booking.findUnique({
    where: {
      bookingCode: q.id,
    },
  });

  if (!business || !booking) {
    return (
      <main className="grid min-h-screen place-items-center p-5">
        Booking not found.
      </main>
    );
  }

  const whatsapp = business.whatsapp?.replace(/\D/g, "");

  const message = encodeURIComponent(
    `Hello, I have a booking with ${business.name}. Booking ID: ${booking.bookingCode}.`
  );

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F8FC] p-4">
      <div className="card w-full max-w-xl p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
          ✓
        </div>

        <h1 className="mt-5 text-3xl font-black">
          Booking Confirmed!
        </h1>

        <p className="mt-2 text-slate-500">
          {business.name}
        </p>

        <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-left">
          <div className="text-xs text-slate-400">
            Booking ID
          </div>

          <div className="font-bold">
            {booking.bookingCode}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-400">
                Service
              </div>

              <div className="font-semibold">
                {booking.serviceNameSnapshot}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">
                Price
              </div>

              <div className="font-semibold">
                TSh{" "}
                {Number(booking.priceSnapshot).toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">
                Date
              </div>

              <div className="font-semibold">
                {booking.date.toLocaleDateString()}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">
                Time
              </div>

              <div className="font-semibold">
                {booking.startTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            className="btn btn-secondary flex-1"
            href={`/${business.slug}`}
          >
            Done
          </Link>

          <Link
            className="btn btn-primary flex-1"
            href={`/${business.slug}/review?booking=${booking.bookingCode}`}
          >
            Leave a review
          </Link>

          {whatsapp && (
            <a
              className="btn flex-1 bg-[#21D0C3] text-white"
              href={`https://wa.me/${whatsapp}?text=${message}`}
            >
              Chat on WhatsApp
            </a>
          )}
        </div>
      </div>
    </main>
  );
}