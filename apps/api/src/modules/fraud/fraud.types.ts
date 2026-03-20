export type RiskLevelValue = "LOW" | "MEDIUM" | "HIGH";

export type FraudRiskAssessment = {
  riskLevel: RiskLevelValue;
  fraudFlags: string[];
  score: number;
  shouldBlock: boolean;
  blockReason?: string;
};

export type FraudEvaluationInput = {
  orderTotalAmount: number;
  ticketCount: number;
  email: string | null;
  ipAddress: string | null;
  eventId: string;
  isGuestCheckout: boolean;
};
