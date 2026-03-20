import nodemailer from "nodemailer";
import { renderEmailTemplate } from "./email.templates";
import type { EmailTemplateMap, EmailTemplateName } from "./email.types";

let cachedTransporter: nodemailer.Transporter | null = null;

type SendTemplateEmailInput<TTemplateName extends EmailTemplateName> = {
  to: string;
  template: TTemplateName;
  payload: EmailTemplateMap[TTemplateName];
};

type SendOrderConfirmationEmailInput = {
  to: string;
  orderId: string;
  eventTitle: string;
  eventDate: Date;
  venueName: string;
  venueLocation: string;
  totalAmount: number;
  ticketCount: number;
};

type SendPaymentFailureEmailInput = {
  to: string;
  orderId: string;
  eventTitle?: string;
  failureReason?: string;
};

export async function sendTemplateEmail<TTemplateName extends EmailTemplateName>(
  input: SendTemplateEmailInput<TTemplateName>
): Promise<void> {
  const transporter = await getTransporter();
  const fromAddress = process.env.EMAIL_FROM ?? "tickets@localhost";
  const appBaseUrl = process.env.APP_BASE_URL ?? process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const renderedTemplate = renderEmailTemplate(input.template, input.payload, {
    appBaseUrl
  });

  const mailResult = await transporter.sendMail({
    from: fromAddress,
    to: input.to,
    subject: renderedTemplate.subject,
    text: renderedTemplate.text,
    html: renderedTemplate.html
  });

  if (process.env.NODE_ENV !== "production") {
    console.info(`Email sent (${input.template}): ${mailResult.messageId}`);
  }
}

export async function sendTemplateEmailSafe<TTemplateName extends EmailTemplateName>(
  input: SendTemplateEmailInput<TTemplateName>
): Promise<void> {
  try {
    await sendTemplateEmail(input);
  } catch (error) {
    console.error(`Email send failed for template ${input.template}.`, error);
  }
}

export async function sendWelcomeEmail(input: { to: string }): Promise<void> {
  await sendTemplateEmail({
    to: input.to,
    template: "welcome",
    payload: {
      userEmail: input.to
    }
  });
}

export async function sendWelcomeEmailSafe(input: { to: string }): Promise<void> {
  await sendTemplateEmailSafe({
    to: input.to,
    template: "welcome",
    payload: {
      userEmail: input.to
    }
  });
}

export async function sendOrderConfirmationEmail(
  input: SendOrderConfirmationEmailInput
): Promise<void> {
  await sendTemplateEmail({
    to: input.to,
    template: "order-confirmation",
    payload: {
      orderId: input.orderId,
      eventTitle: input.eventTitle,
      eventDate: input.eventDate,
      venueName: input.venueName,
      venueLocation: input.venueLocation,
      totalAmount: input.totalAmount,
      ticketCount: input.ticketCount
    }
  });
}

export async function sendOrderConfirmationEmailSafe(
  input: SendOrderConfirmationEmailInput
): Promise<void> {
  await sendTemplateEmailSafe({
    to: input.to,
    template: "order-confirmation",
    payload: {
      orderId: input.orderId,
      eventTitle: input.eventTitle,
      eventDate: input.eventDate,
      venueName: input.venueName,
      venueLocation: input.venueLocation,
      totalAmount: input.totalAmount,
      ticketCount: input.ticketCount
    }
  });
}

export async function sendPaymentFailureEmail(
  input: SendPaymentFailureEmailInput
): Promise<void> {
  await sendTemplateEmail({
    to: input.to,
    template: "payment-failure",
    payload: {
      orderId: input.orderId,
      eventTitle: input.eventTitle,
      failureReason: input.failureReason
    }
  });
}

export async function sendPaymentFailureEmailSafe(
  input: SendPaymentFailureEmailInput
): Promise<void> {
  await sendTemplateEmailSafe({
    to: input.to,
    template: "payment-failure",
    payload: {
      orderId: input.orderId,
      eventTitle: input.eventTitle,
      failureReason: input.failureReason
    }
  });
}

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "0");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpPort > 0) {
    cachedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
    });

    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    jsonTransport: true
  });

  return cachedTransporter;
}
