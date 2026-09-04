const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Endpoint Publik
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);

// Endpoint Terproteksi (Wajib kirim Bearer Token)
router.post("/reset-password", authenticate, authController.resetPassword);
router.post("/change-password", authenticate, authController.changePassword);
router.get("/me", authenticate, authController.getMe);

module.exports = router;
