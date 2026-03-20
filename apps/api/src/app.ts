import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./modules/auth/auth.routes";
import adminAnalyticsRoutes from "./modules/admin-analytics/adminAnalytics.routes";
import adminAttendeeRoutes from "./modules/admin-attendees/adminAttendees.routes";
import adminNotificationRoutes from "./modules/admin-notifications/adminNotification.routes";
import adminOrdersRoutes from "./modules/admin-orders/adminOrders.routes";
import checkoutRoutes from "./modules/checkout/checkout.routes";
import eventTemplateRoutes from "./modules/event-templates/eventTemplate.routes";
import eventRoutes from "./modules/events/event.routes";
import importRoutes from "./modules/imports/import.routes";
import orderRoutes from "./modules/orders/order.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import presaleRoutes from "./modules/presales/presale.routes";
import seatMapRoutes from "./modules/seatmaps/seatmap.routes";
import ticketRoutes, { adminTicketRouter } from "./modules/tickets/ticket.routes";
import venueRoutes from "./modules/venues/venue.routes";
import { errorHandler } from "./middlewares/error-handler.middleware";

const app = express();
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.use(
  cors({
    origin: webOrigin,
    credentials: true
  })
);
app.use(cookieParser());

// Stripe webhook requires raw body verification, so it must run before JSON parsing.
app.use("/webhooks", paymentRoutes);
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/admin/analytics", adminAnalyticsRoutes);
app.use("/admin", adminAttendeeRoutes);
app.use("/admin/notifications", adminNotificationRoutes);
app.use("/admin/orders", adminOrdersRoutes);
app.use("/admin/event-templates", eventTemplateRoutes);
app.use("/admin/imports", importRoutes);
app.use("/admin/tickets", adminTicketRouter);
app.use("/checkout", checkoutRoutes);
app.use("/orders", orderRoutes);
app.use("/tickets", ticketRoutes);
app.use("/venues", venueRoutes);
app.use("/events", eventRoutes);
app.use("/", presaleRoutes);
app.use("/", seatMapRoutes);
app.use("/health", healthRoutes);
app.use(errorHandler);

export default app;
