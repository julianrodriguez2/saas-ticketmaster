import type {
  EmailTemplateMap,
  EmailTemplateName,
  RenderedEmailTemplate
} from "./email.types";

type BuildTemplateContext = {
  appBaseUrl: string;
};

export function renderEmailTemplate<TTemplateName extends EmailTemplateName>(
  template: TTemplateName,
  payload: EmailTemplateMap[TTemplateName],
  context: BuildTemplateContext
): RenderedEmailTemplate {
  switch (template) {
    case "welcome": {
      const typedPayload = payload as EmailTemplateMap["welcome"];
      const loginUrl = `${context.appBaseUrl}/login`;
      return {
        subject: "Welcome to Ticketing Platform",
        text: [
          `Welcome ${typedPayload.userEmail},`,
          "",
          "Your account is ready. You can browse events and manage your tickets anytime.",
          `Log in: ${loginUrl}`
        ].join("\n"),
        html: `
          <h2>Welcome to Ticketing Platform</h2>
          <p>Your account is ready: <strong>${typedPayload.userEmail}</strong></p>
          <p>You can browse events and manage your tickets anytime.</p>
          <p><a href="${loginUrl}">Log in to your account</a></p>
        `
      };
    }
    case "order-confirmation": {
      const typedPayload = payload as EmailTemplateMap["order-confirmation"];
      const orderUrl = `${context.appBaseUrl}/orders/${typedPayload.orderId}`;
      return {
        subject: `Your tickets for ${typedPayload.eventTitle}`,
        text: [
          `Thanks for your order ${typedPayload.orderId}.`,
          "",
          `Event: ${typedPayload.eventTitle}`,
          `Date: ${typedPayload.eventDate.toLocaleString()}`,
          `Venue: ${typedPayload.venueName} (${typedPayload.venueLocation})`,
          `Total: $${typedPayload.totalAmount.toFixed(2)}`,
          `Ticket count: ${typedPayload.ticketCount}`,
          "",
          `View your order: ${orderUrl}`
        ].join("\n"),
        html: `
          <h2>Thanks for your order</h2>
          <p>Order reference: <strong>${typedPayload.orderId}</strong></p>
          <p>Event: <strong>${typedPayload.eventTitle}</strong></p>
          <p>Date: ${typedPayload.eventDate.toLocaleString()}</p>
          <p>Venue: ${typedPayload.venueName} (${typedPayload.venueLocation})</p>
          <p>Total: <strong>$${typedPayload.totalAmount.toFixed(2)}</strong></p>
          <p>Ticket count: <strong>${typedPayload.ticketCount}</strong></p>
          <p><a href="${orderUrl}">View your order and tickets</a></p>
        `
      };
    }
    case "payment-failure": {
      const typedPayload = payload as EmailTemplateMap["payment-failure"];
      const retryUrl = `${context.appBaseUrl}/events`;
      return {
        subject: "Payment could not be completed",
        text: [
          `We could not complete payment for order ${typedPayload.orderId}.`,
          typedPayload.eventTitle ? `Event: ${typedPayload.eventTitle}` : "",
          typedPayload.failureReason ? `Reason: ${typedPayload.failureReason}` : "",
          "",
          `You can retry checkout from: ${retryUrl}`
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <h2>Payment failed</h2>
          <p>We could not complete payment for order <strong>${typedPayload.orderId}</strong>.</p>
          ${typedPayload.eventTitle ? `<p>Event: ${typedPayload.eventTitle}</p>` : ""}
          ${typedPayload.failureReason ? `<p>Reason: ${typedPayload.failureReason}</p>` : ""}
          <p><a href="${retryUrl}">Browse events and try again</a></p>
        `
      };
    }
    case "ticket-checkin-placeholder": {
      const typedPayload = payload as EmailTemplateMap["ticket-checkin-placeholder"];
      return {
        subject: `Check-in recorded for ticket ${typedPayload.ticketCode}`,
        text: [
          `Ticket ${typedPayload.ticketCode} for ${typedPayload.eventTitle} was checked in.`,
          "",
          "This is a placeholder notification template for future attendee messaging."
        ].join("\n"),
        html: `
          <h2>Ticket check-in recorded</h2>
          <p>Ticket <strong>${typedPayload.ticketCode}</strong> for ${typedPayload.eventTitle} was checked in.</p>
          <p>This is a placeholder template for future attendee messaging workflows.</p>
        `
      };
    }
    case "refund-placeholder": {
      const typedPayload = payload as EmailTemplateMap["refund-placeholder"];
      return {
        subject: `Refund update for order ${typedPayload.orderId}`,
        text: [
          `Refund workflow placeholder for order ${typedPayload.orderId}.`,
          `Event: ${typedPayload.eventTitle}`,
          typedPayload.reason ? `Reason: ${typedPayload.reason}` : ""
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <h2>Refund update (placeholder)</h2>
          <p>Order: <strong>${typedPayload.orderId}</strong></p>
          <p>Event: ${typedPayload.eventTitle}</p>
          ${typedPayload.reason ? `<p>Reason: ${typedPayload.reason}</p>` : ""}
        `
      };
    }
    case "cancellation-placeholder": {
      const typedPayload = payload as EmailTemplateMap["cancellation-placeholder"];
      return {
        subject: `Order cancellation update for ${typedPayload.orderId}`,
        text: [
          `Cancellation workflow placeholder for order ${typedPayload.orderId}.`,
          `Event: ${typedPayload.eventTitle}`,
          typedPayload.reason ? `Reason: ${typedPayload.reason}` : ""
        ]
          .filter(Boolean)
          .join("\n"),
        html: `
          <h2>Order cancellation update (placeholder)</h2>
          <p>Order: <strong>${typedPayload.orderId}</strong></p>
          <p>Event: ${typedPayload.eventTitle}</p>
          ${typedPayload.reason ? `<p>Reason: ${typedPayload.reason}</p>` : ""}
        `
      };
    }
    default: {
      return {
        subject: "Ticketing Platform notification",
        text: "No template available.",
        html: "<p>No template available.</p>"
      };
    }
  }
}
