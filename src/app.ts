import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import passport from "passport";
import { IndexRoutes } from "./app/router/index.js";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler.js";
import { notFound } from "./app/middlewares/notFound.js";
import { paymentController } from "./app/modules/payment/payment.controller.js";
import { envVars } from "./app/config/env.js";
import { initPassport } from "./app/config/passport.config.js";

initPassport();

const app: Application = express();

// Vercel terminates TLS and forwards the client IP via X-Forwarded-For.
// Trust exactly one proxy hop so rate limiting keys on the real client IP.
app.set("trust proxy", 1);

app.use(passport.initialize());

const allowedOrigins = envVars.FRONTEND_URL
  ? envVars.FRONTEND_URL.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Register Stripe Webhook route requiring raw body before express.json()
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleStripeWebhookEvent,
);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", IndexRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: "API is working",
  });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
