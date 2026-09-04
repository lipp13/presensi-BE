const express = require("express");
const cors = require("cors");
const { successResponse } = require("./utils/response");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");
const { testConnection, isConfigured } = require("./config/supabase");

const app = express();

// Security Hardening: Sembunyikan identitas server framework
app.disable("x-powered-by");

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Konfigurasi CORS (Mendukung whitelist origin dari .env)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : "*";

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Root endpoint
app.get("/", (req, res) => {
  return successResponse(res, "Attendance API Presensi PKL is running", {
    app: "Presensi Online PKL - SMK Taruna Bhakti di Direktorat Bina Teknik SDA",
    version: "1.0.0",
    health_check: "/api/health",
  });
});

// Health check endpoint (memeriksa server dan koneksi Supabase)
app.get("/api/health", async (req, res, next) => {
  try {
    const supabaseStatus = await testConnection();

    return successResponse(res, "Status sistem backend", {
      status: "OK",
      uptime_seconds: Math.floor(process.uptime()),
      server_time: new Date().toISOString(),
      supabase: {
        is_configured: isConfigured,
        ...supabaseStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Endpoint untuk mengetes apakah Bot Telegram bisa mengirim pesan
const telegramService = require("./services/telegram.service");
app.get("/api/health/telegram", async (req, res) => {
  const result = await telegramService.testTelegramConnection();
  if (result.success) {
    return successResponse(res, result.message, result.data || {});
  } else {
    return errorResponse(res, result.message, "TELEGRAM_TEST_FAILED", 400, result.details);
  }
});

// API Routes
const authRoutes = require("./routes/auth.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const adminRoutes = require("./routes/admin.routes");

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);

// 404 Not Found Middleware
app.use(notFoundHandler);

// Centralized Global Error Middleware
app.use(errorHandler);

module.exports = app;