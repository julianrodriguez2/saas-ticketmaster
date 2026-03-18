import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./modules/auth/auth.routes";
import eventRoutes from "./modules/events/event.routes";
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
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/venues", venueRoutes);
app.use("/events", eventRoutes);
app.use("/health", healthRoutes);
app.use(errorHandler);

export default app;
