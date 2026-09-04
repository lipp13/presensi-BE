const express = require("express");
const cors = require("cors");
const { successResponse } = require("./utils/response");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");
const { testConnection, isConfigured } = require("./config/supabase");

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// API Routes
const authRoutes = require("./routes/auth.routes");
const attendanceRoutes = require("./routes/attendance.routes");

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);

// 404 Not Found Middleware
app.use(notFoundHandler);

// Centralized Global Error Middleware
app.use(errorHandler);

module.exports = app;