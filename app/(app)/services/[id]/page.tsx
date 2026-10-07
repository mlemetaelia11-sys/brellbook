import { db } from '@/lib/prisma';
import { requireBusiness, requireUser } from '@/lib/auth';
import Link from 'next/link';

type EditServiceProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditService({
  params,
}: EditServiceProps) {
  const { id } = await params;

  const user = await requireUser();
  const business = await requireBusiness(user.id);

  const service = await db.service.findFirst({
    where: {
      id,
      businessId: business.id,
    },
  });

  if (!service) {
    return (
      <div className="p-8">
        Service not found.
      </div>
    );
  }

  return (
    <main className="p-5 md:p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/services"
          className="text-sm font-semibold text-[#6C2BFF]"
        >
          ← Services
        </Link>

        <h1 className="mt-3 text-3xl font-black">
          Edit service
        </h1>

        <form
          action={`/api/services/${service.id}`}
          method="post"
          className="card mt-7 space-y-4 p-6"
        >
          <input
            className="input"
            name="name"
            defaultValue={service.name}
            required
          />

          <input
            className="input"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={Number(service.price)}
            required
          />

          <input
            className="input"
            name="durationMinutes"
            type="number"
            min="1"
            defaultValue={service.durationMin}
            required
          />

          <textarea
            className="input min-h-28"
            name="description"
            defaultValue={service.description || ''}
          />

          <input
            type="hidden"
            name="active"
            value={service.active ? 'true' : 'false'}
          />

          <button
            type="submit"
            className="btn btn-primary w-full"
          >
            Save changes
          </button>
        </form>
      </div>
    </main>
  );
}