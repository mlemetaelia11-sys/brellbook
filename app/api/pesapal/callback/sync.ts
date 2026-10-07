import { db } from '@/lib/prisma';
import { pesapalStatus } from '@/lib/pesapal';
import { nextMonthlyPeriod } from '@/lib/subscription';

export async function sync(tracking: string, ref: string) {
  if (!tracking || !ref) return;

  const status = await pesapalStatus(tracking);

  const map: Record<
    number,
    'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PENDING'
  > = {
    1: 'COMPLETED',
    2: 'FAILED',
    3: 'CANCELLED',
    0: 'FAILED',
  };

  const paymentStatus =
    map[Number(status.status_code)] || 'PENDING';

  if (paymentStatus === 'PENDING') return;

  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${`pesapal:${ref}`})
        )
      `;

      const payment = await tx.payment.findUnique({
        where: { id: ref },
      });

      if (!payment || !payment.plan) return;
      if (payment.status === 'COMPLETED') return;

      const updated = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: { not: 'COMPLETED' },
        },
        data: {
          status: paymentStatus,
          trackingId: tracking,
          providerReference:
            status.confirmation_code || tracking,
          metadata: status,
          paidAt:
            paymentStatus === 'COMPLETED'
              ? new Date()
              : undefined,
        },
      });

      if (
        updated.count === 0 ||
        paymentStatus !== 'COMPLETED'
      ) {
        return;
      }

      const now = new Date();

      const current = await tx.subscription.findUnique({
        where: {
          businessId: payment.businessId,
        },
      });

      const currentEnd =
        current?.currentPeriodEnd &&
        new Date(current.currentPeriodEnd) > now
          ? new Date(current.currentPeriodEnd)
          : null;

      const start = currentEnd || now;
      const end = nextMonthlyPeriod(start);

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          billingStart: start,
          billingEnd: end,
        },
      });

      await tx.subscription.upsert({
        where: {
          businessId: payment.businessId,
        },
        update: {
          plan: payment.plan,
          status: 'ACTIVE',
          currentPeriodStart: start,
          currentPeriodEnd: end,
          nextBillingDate: end,
          graceEndsAt: null,
        },
        create: {
          businessId: payment.businessId,
          plan: payment.plan,
          status: 'ACTIVE',
          currentPeriodStart: start,
          currentPeriodEnd: end,
          nextBillingDate: end,
        },
      });
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    }
  );
}