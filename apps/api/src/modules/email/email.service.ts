import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

type OrderConfirmationEmailInput = {
  to: string;
  orderId: string;
  eventTitle: string;
  eventDate: Date;
  venueName: string;
  venueLocation: string;
  totalAmount: number;
  ticketCount: number;
};

export async function sendOrderConfirmationEmail(
  input: OrderConfirmationEmailInput
): Promise<void> {
  const transporter = await getTransporter();
  const appOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const fromAddress = process.env.EMAIL_FROM ?? "tickets@localhost";
  const orderUrl = `${appOrigin}/orders/${input.orderId}`;

  const message = {
    from: fromAddress,
    to: input.to,
    subject: `Your tickets for ${input.eventTitle}`,
    text: [
      `Thanks for your order ${input.orderId}.`,
      "",
      `Event: ${input.eventTitle}`,
      `Date: ${input.eventDate.toLocaleString()}`,
      `Venue: ${input.venueName} (${input.venueLocation})`,
      `Total: $${input.totalAmount.toFixed(2)}`,
      `Ticket count: ${input.ticketCount}`,
      "",
      `View your order: ${orderUrl}`
    ].join("\n"),
    html: `
      <h2>Thanks for your order</h2>
      <p>Order reference: <strong>${input.orderId}</strong></p>
      <p>Event: <strong>${input.eventTitle}</strong></p>
      <p>Date: ${input.eventDate.toLocaleString()}</p>
      <p>Venue: ${input.venueName} (${input.venueLocation})</p>
      <p>Total: <strong>$${input.totalAmount.toFixed(2)}</strong></p>
      <p>Ticket count: <strong>${input.ticketCount}</strong></p>
      <p><a href="${orderUrl}">View your order and tickets</a></p>
    `
  };

  const info = await transporter.sendMail(message);

  if (process.env.NODE_ENV !== "production") {
    console.info(`Order confirmation email sent: ${info.messageId}`);
  }
}

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "0");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpPort > 0 && smtpUser && smtpPass) {
    cachedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    return cachedTransporter;
  }

  // Dev fallback transport writes emails to JSON output in logs.
  cachedTransporter = nodemailer.createTransport({
    jsonTransport: true
  });

  return cachedTransporter;
}
