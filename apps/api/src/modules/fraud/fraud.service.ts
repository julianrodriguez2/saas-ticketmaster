import {
  prisma,
  type PaymentAttemptStatus,
  type RiskLevel
} from "@ticketing/db";
import { createAdminNotificationSafe } from "../admin-notifications/adminNotification.service";
import { recordSystemEventSafe } from "../system-events/systemEvent.service";
import type { FraudEvaluationInput, FraudRiskAssessment } from "./fraud.types";

type FraudConfig = {
  highAmountThreshold: number;
  maxTicketsPerOrder: number;
  maxFailedAttemptsPerHour: number;
  reviewThreshold: number;
};

type TrackPaymentAttemptInput = {
  email: string | null;
  ipAddress: string | null;
  eventId?: string | null;
  status: PaymentAttemptStatus;
  reason?: string;
};

export class FraudServiceError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function getFraudConfig(): FraudConfig {
  return {
    highAmountThreshold: parsePositiveNumber(
      process.env.FRAUD_HIGH_AMOUNT_THRESHOLD,
      500
    ),
    maxTicketsPerOrder: Math.floor(
      parsePositiveNumber(process.env.FRAUD_MAX_TICKETS_PER_ORDER, 8)
    ),
    maxFailedAttemptsPerHour: Math.floor(
      parsePositiveNumber(process.env.FRAUD_MAX_FAILED_ATTEMPTS_PER_HOUR, 5)
    ),
    reviewThreshold: Math.floor(
      parsePositiveNumber(process.env.FRAUD_REVIEW_THRESHOLD, 3)
    )
  };
}

export function enforceMaxTicketsPerOrder(ticketCount: number): void {
  const maxTicketsPerOrder = getFraudConfig().maxTicketsPerOrder;

  if (ticketCount > maxTicketsPerOrder) {
    throw new FraudServiceError(
      400,
      `A maximum of ${maxTicketsPerOrder} tickets can be purchased per order.`
    );
  }
}

export async function evaluateCheckoutRisk(
  input: FraudEvaluationInput
): Promise<FraudRiskAssessment> {
  const config = getFraudConfig();
  const fraudFlags: string[] = [];
  let score = 0;
  let shouldBlock = false;
  let blockReason: string | undefined;

  if (!Number.isFinite(input.orderTotalAmount) || input.orderTotalAmount <= 0) {
    shouldBlock = true;
    blockReason = "Checkout total must be greater than zero.";
    fraudFlags.push("INVALID_ORDER_TOTAL");
  }

  if (input.ticketCount > config.maxTicketsPerOrder) {
    shouldBlock = true;
    blockReason = `Ticket quantity exceeds allowed limit of ${config.maxTicketsPerOrder}.`;
    fraudFlags.push("MAX_TICKETS_EXCEEDED");
  }

  if (input.orderTotalAmount >= config.highAmountThreshold) {
    score += 2;
    fraudFlags.push("HIGH_ORDER_AMOUNT");
  }

  if (input.orderTotalAmount >= config.highAmountThreshold * 2) {
    score += 1;
    fraudFlags.push("VERY_HIGH_ORDER_AMOUNT");
  }

  if (input.ticketCount >= config.maxTicketsPerOrder) {
    score += 1;
    fraudFlags.push("LARGE_TICKET_COUNT");
  }

  if (input.isGuestCheckout && input.orderTotalAmount >= config.highAmountThreshold) {
    score += 1;
    fraudFlags.push("HIGH_VALUE_GUEST_CHECKOUT");
  }

  const [recentFailedAttempts, recentRapidPaidOrders] = await Promise.all([
    getRecentFailedAttemptsCount(input.email, input.ipAddress),
    getRecentRapidPaidOrdersCount({
      eventId: input.eventId,
      email: input.email,
      ipAddress: input.ipAddress
    })
  ]);

  if (recentFailedAttempts >= config.maxFailedAttemptsPerHour) {
    score += 2;
    fraudFlags.push("REPEATED_FAILED_ATTEMPTS");
  }

  if (recentRapidPaidOrders >= 3) {
    score += 1;
    fraudFlags.push("RAPID_PURCHASES_SAME_EVENT");
  }

  const riskLevel = determineRiskLevel(score, config.reviewThreshold);

  return {
    riskLevel,
    fraudFlags,
    score,
    shouldBlock,
    blockReason
  };
}

export async function applyOrderRiskAssessment(input: {
  orderId: string;
  eventId: string;
  orderTotalAmount: number;
  riskAssessment: FraudRiskAssessment;
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<void> {
  const { orderId, riskAssessment } = input;
  const shouldFlag = riskAssessment.riskLevel !== "LOW";
  const safeUserAgent = input.userAgent ? input.userAgent.slice(0, 500) : null;

  await prisma.order.update({
    where: {
      id: orderId
    },
    data: {
      riskLevel: riskAssessment.riskLevel,
      fraudFlags: riskAssessment.fraudFlags,
      flaggedAt: shouldFlag ? new Date() : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: safeUserAgent
    }
  });

  if (shouldFlag) {
    const severity = riskAssessment.riskLevel === "HIGH" ? "CRITICAL" : "WARNING";

    await createAdminNotificationSafe({
      type: "ORDER_FLAGGED",
      severity,
      title: `Order ${orderId} flagged as ${riskAssessment.riskLevel}`,
      message:
        riskAssessment.fraudFlags.length > 0
          ? `Flags: ${riskAssessment.fraudFlags.join(", ")}`
          : "Order matched risk review criteria.",
      relatedOrderId: orderId,
      relatedEventId: input.eventId,
      dedupeKey: `order-flagged:${orderId}:${riskAssessment.riskLevel}:${riskAssessment.fraudFlags.join("|")}`
    });

    await recordSystemEventSafe({
      type: "ORDER_FLAGGED",
      entityType: "ORDER",
      entityId: orderId,
      message: `Order risk evaluated as ${riskAssessment.riskLevel}.`,
      metadata: {
        riskLevel: riskAssessment.riskLevel,
        flags: riskAssessment.fraudFlags,
        score: riskAssessment.score
      }
    });
  }

  if (riskAssessment.fraudFlags.includes("HIGH_ORDER_AMOUNT")) {
    await createAdminNotificationSafe({
      type: "HIGH_VALUE_PURCHASE",
      severity: "WARNING",
      title: "High-value purchase detected",
      message: `Order ${orderId} total is $${input.orderTotalAmount.toFixed(2)}.`,
      relatedOrderId: orderId,
      relatedEventId: input.eventId,
      dedupeKey: `high-value-order:${orderId}`
    });
  }
}

export async function trackPaymentAttempt(input: TrackPaymentAttemptInput): Promise<void> {
  await prisma.paymentAttempt.create({
    data: {
      email: input.email,
      ipAddress: input.ipAddress,
      eventId: input.eventId ?? null,
      status: input.status,
      reason: input.reason
    }
  });

  if (input.status === "FAILED" || input.status === "BLOCKED") {
    const recentFailures = await getRecentFailedAttemptsCount(
      input.email,
      input.ipAddress
    );
    const maxAllowedFailures = getFraudConfig().maxFailedAttemptsPerHour;

    if (recentFailures >= maxAllowedFailures) {
      const dedupeToken = getFailureDedupeToken(input.email, input.ipAddress);

      await createAdminNotificationSafe({
        type: "REPEATED_CHECKOUT_FAILURES",
        severity: "CRITICAL",
        title: "Repeated checkout failures detected",
        message: `Detected ${recentFailures} failed/blocked attempts in the last hour.`,
        dedupeKey: `repeated-failures:${dedupeToken}:${new Date()
          .toISOString()
          .slice(0, 13)}`
      });

      await recordSystemEventSafe({
        type: "PAYMENT_FAILURE_THRESHOLD_REACHED",
        entityType: "PAYMENT_ATTEMPT",
        entityId: dedupeToken,
        message: "Repeated checkout failures exceeded configured threshold.",
        metadata: {
          failuresLastHour: recentFailures,
          maxAllowedFailures
        }
      });
    }
  }
}

export async function getFlaggedOrderCount(): Promise<number> {
  return prisma.order.count({
    where: {
      riskLevel: {
        in: ["MEDIUM", "HIGH"]
      }
    }
  });
}

async function getRecentFailedAttemptsCount(
  email: string | null,
  ipAddress: string | null
): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const identifiers = buildContactFilters(email, ipAddress);

  if (identifiers.length === 0) {
    return 0;
  }

  return prisma.paymentAttempt.count({
    where: {
      createdAt: {
        gte: oneHourAgo
      },
      status: {
        in: ["FAILED", "BLOCKED"]
      },
      OR: identifiers
    }
  });
}

async function getRecentRapidPaidOrdersCount(input: {
  eventId: string;
  email: string | null;
  ipAddress: string | null;
}): Promise<number> {
  const rapidWindowStart = new Date(Date.now() - 15 * 60 * 1000);
  const identifiers = buildOrderContactFilters(input.email, input.ipAddress);

  if (identifiers.length === 0) {
    return 0;
  }

  return prisma.order.count({
    where: {
      eventId: input.eventId,
      status: "PAID",
      createdAt: {
        gte: rapidWindowStart
      },
      OR: identifiers
    }
  });
}

function determineRiskLevel(score: number, reviewThreshold: number): RiskLevel {
  if (score >= reviewThreshold) {
    return "HIGH";
  }

  if (score >= Math.max(1, reviewThreshold - 1)) {
    return "MEDIUM";
  }

  return "LOW";
}

function buildContactFilters(
  email: string | null,
  ipAddress: string | null
): Array<{
  email?: string;
  ipAddress?: string;
}> {
  const filters: Array<{
    email?: string;
    ipAddress?: string;
  }> = [];

  if (email) {
    filters.push({ email });
  }

  if (ipAddress) {
    filters.push({ ipAddress });
  }

  return filters;
}

function buildOrderContactFilters(
  email: string | null,
  ipAddress: string | null
): Array<{
  email?: string;
  ipAddress?: string;
}> {
  const filters: Array<{
    email?: string;
    ipAddress?: string;
  }> = [];

  if (email) {
    filters.push({ email });
  }

  if (ipAddress) {
    filters.push({ ipAddress });
  }

  return filters;
}

function getFailureDedupeToken(email: string | null, ipAddress: string | null): string {
  if (email) {
    return `email:${email}`;
  }

  if (ipAddress) {
    return `ip:${ipAddress}`;
  }

  return "anonymous";
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}
