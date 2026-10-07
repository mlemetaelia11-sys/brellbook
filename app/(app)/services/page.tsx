import Link from 'next/link';
import { db } from '@/lib/prisma';
import { requireUser, requireBusiness } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { Card, Badge } from '@/components/ui';
import { Plus, Pencil } from 'lucide-react';

export default async function Services() {
  const user = await requireUser();
  const business = await requireBusiness(user.id);

  const services = await db.service.findMany({
    where: {
      businessId: business.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="p-5 md:p-8">
      <PageHeader
        title="Services"
        description="Manage what customers can book."
        action={
          <Link
            className="btn btn-primary"
            href="/services/new"
          >
            <Plus size={17} />
            Add Service
          </Link>
        }
      />

      <div className="grid gap-4">
        {services.length === 0 ? (
          <Card className="p-10 text-center text-slate-500">
            No services yet. Add your first service.
          </Card>
        ) : (
          services.map((service) => (
            <Card
              key={service.id}
              className="flex items-center gap-4 p-5"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-purple-50 text-xl font-bold text-[#6C2BFF]">
                {service.name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-bold">
                  {service.name}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  TSh {Number(service.price).toLocaleString()} ·{' '}
                  {service.durationMin} min ·{' '}
                  {service.category || 'Other'}
                </div>

                {service.description && (
                  <div className="mt-1 truncate text-xs text-slate-400">
                    {service.description}
                  </div>
                )}
              </div>

              <Badge tone={service.active ? 'green' : 'slate'}>
                {service.active ? 'Active' : 'Inactive'}
              </Badge>

              <Link
                className="rounded-lg border border-slate-200 p-2 transition hover:bg-slate-50"
                href={`/services/${service.id}`}
                aria-label={`Edit ${service.name}`}
              >
                <Pencil size={17} />
              </Link>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}