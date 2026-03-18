import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./modules/auth/auth.routes";
import checkoutRoutes from "./modules/checkout/checkout.routes";
import eventRoutes from "./modules/events/event.routes";
import orderRoutes from "./modules/orders/order.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import seatMapRoutes from "./modules/seatmaps/seatmap.routes";
import ticketRoutes from "./modules/tickets/ticket.routes";
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
app.use("/checkout", checkoutRoutes);
app.use("/orders", orderRoutes);
app.use("/tickets", ticketRoutes);
app.use("/venues", venueRoutes);
app.use("/events", eventRoutes);
app.use("/", seatMapRoutes);
app.use("/health", healthRoutes);
app.use(errorHandler);

export default app;
