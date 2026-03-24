import { Router } from "express";
import authRoutes from "../../modules/auth/auth.routes";
import adminAnalyticsRoutes from "../../modules/admin-analytics/adminAnalytics.routes";
import adminAttendeeRoutes from "../../modules/admin-attendees/adminAttendees.routes";
import adminNotificationRoutes from "../../modules/admin-notifications/adminNotification.routes";
import adminOrdersRoutes from "../../modules/admin-orders/adminOrders.routes";
import checkoutRoutes from "../../modules/checkout/checkout.routes";
import eventTemplateRoutes from "../../modules/event-templates/eventTemplate.routes";
import eventRoutes from "../../modules/events/event.routes";
import importRoutes from "../../modules/imports/import.routes";
import orderRoutes from "../../modules/orders/order.routes";
import presaleRoutes from "../../modules/presales/presale.routes";
import seatMapRoutes from "../../modules/seatmaps/seatmap.routes";
import ticketRoutes, { adminTicketRouter } from "../../modules/tickets/ticket.routes";
import venueRoutes from "../../modules/venues/venue.routes";
import healthRoutes from "../../routes/health.routes";
import {
  createAuthRateLimiter,
  createCheckoutRateLimiter,
  createPresaleValidationRateLimiter,
  createTicketOpsRateLimiter
} from "../../middlewares/rate-limit.middleware";

export function createApiV1Router(): Router {
  const router = Router();

  router.use("/auth", createAuthRateLimiter(), authRoutes);
  router.use("/admin/analytics", adminAnalyticsRoutes);
  router.use("/admin", adminAttendeeRoutes);
  router.use("/admin/notifications", adminNotificationRoutes);
  router.use("/admin/orders", adminOrdersRoutes);
  router.use("/admin/event-templates", eventTemplateRoutes);
  router.use("/admin/imports", importRoutes);
  router.use("/admin/tickets", createTicketOpsRateLimiter(), adminTicketRouter);
  router.use("/checkout", createCheckoutRateLimiter(), checkoutRoutes);
  router.use("/orders", orderRoutes);
  router.use("/tickets", createTicketOpsRateLimiter(), ticketRoutes);
  router.use("/venues", venueRoutes);
  router.use("/events", eventRoutes);
  router.use("/events/:eventId/presale/validate", createPresaleValidationRateLimiter());
  router.use("/", presaleRoutes);
  router.use("/", seatMapRoutes);
  router.use("/health", healthRoutes);

  return router;
}

