export type WelcomeEmailPayload = {
  userEmail: string;
};

export type OrderConfirmationEmailPayload = {
  orderId: string;
  eventTitle: string;
  eventDate: Date;
  venueName: string;
  venueLocation: string;
  totalAmount: number;
  ticketCount: number;
};

export type PaymentFailureEmailPayload = {
  orderId: string;
  eventTitle?: string;
  failureReason?: string;
};

export type TicketCheckInPlaceholderPayload = {
  ticketCode: string;
  eventTitle: string;
};

export type RefundPlaceholderEmailPayload = {
  orderId: string;
  eventTitle: string;
  reason?: string;
};

export type CancellationPlaceholderEmailPayload = {
  orderId: string;
  eventTitle: string;
  reason?: string;
};

export type EmailTemplateMap = {
  welcome: WelcomeEmailPayload;
  "order-confirmation": OrderConfirmationEmailPayload;
  "payment-failure": PaymentFailureEmailPayload;
  "ticket-checkin-placeholder": TicketCheckInPlaceholderPayload;
  "refund-placeholder": RefundPlaceholderEmailPayload;
  "cancellation-placeholder": CancellationPlaceholderEmailPayload;
};

export type EmailTemplateName = keyof EmailTemplateMap;

export type RenderedEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};
