import { db } from '@/lib/prisma';
import { pesapalStatus } from '@/lib/pesapal';
import { nextMonthlyPeriod } from '@/lib/subscription';

export async function sync(tracking: string, ref: string) {
  if (!tracking || !ref) {
    throw new Error('PESAPAL_IDENTIFIERS_REQUIRED');
  }

  const existing = await db.subscriptionPayment.findUnique({
    where: { id: ref },
  });

  if (!existing) return;

  if (existing.pesapalOrderId && existing.pesapalOrderId !== tracking) {
    throw new Error('PESAPAL_TRACKING_MISMATCH');
  }

  const status = await pesapalStatus(tracking);
  const providerRef =
    status.merchant_reference ||
    status.order_merchant_reference ||
    status.id;

  if (providerRef && providerRef !== existing.id) {
    throw new Error('PESAPAL_REFERENCE_MISMATCH');
  }

  if (status.currency && status.currency !== existing.currency) {
    throw new Error('PESAPAL_CURRENCY_MISMATCH');
  }

  if (
    status.amount !== undefined &&
    Math.abs(Number(status.amount) - Number(existing.amount)) > 0.01
  ) {
    throw new Error('PESAPAL_AMOUNT_MISMATCH');
  }

  const map: Record<number, 'COMPLETED' | 'FAILED' | 'PENDING'> = {
    1: 'COMPLETED',
    2: 'FAILED',
    3: 'FAILED',
    0: 'FAILED',
  };

  const paymentStatus = map[Number(status.status_code)] || 'PENDING';

  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${existing.businessId + ':subscription-payment'})
        )
      `;

      const payment = await tx.subscriptionPayment.findUnique({
        where: { id: existing.id },
      });

      if (!payment) return;

      if (
        payment.pesapalOrderId &&
        payment.pesapalOrderId !== tracking
      ) {
        throw new Error('PESAPAL_TRACKING_MISMATCH');
      }

      if (payment.status === 'COMPLETED') return;

      await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: paymentStatus,
          pesapalOrderId: tracking,
          pesapalTransactionId: status.confirmation_code || tracking,
          metadata: status,
        },
      });

      if (paymentStatus !== 'COMPLETED') return;

      const now = new Date();
      const current = await tx.subscription.findUnique({
        where: { businessId: payment.businessId },
      });

      const currentEnd =
        current?.currentPeriodEnd &&
        new Date(current.currentPeriodEnd) > now
          ? new Date(current.currentPeriodEnd)
          : null;

      const billingStart = currentEnd || now;
      const billingEnd = nextMonthlyPeriod(billingStart);

      await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: { billingStart, billingEnd },
      });

      await tx.subscription.upsert({
        where: { businessId: payment.businessId },
        update: {
          plan: payment.plan,
          status: 'ACTIVE',
          currentPeriodStart: billingStart,
          currentPeriodEnd: billingEnd,
          nextBillingDate: billingEnd,
          graceEndsAt: null,
        },
        create: {
          businessId: payment.businessId,
          plan: payment.plan,
          status: 'ACTIVE',
          currentPeriodStart: billingStart,
          currentPeriodEnd: billingEnd,
          nextBillingDate: billingEnd,
        },
      });
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 15000,
    },
  );
}