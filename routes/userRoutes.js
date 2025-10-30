// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { profile, signup, signin, getUserProfileByAdmin, logout } = require("../controllers/userController");
const { protect,adminOnly } = require("../middleware/authMiddleware");

router.post("/signup", signup);
router.post("/login", signin);
router.get("/myprofile", protect, profile);
router.post("/logout", protect, logout);

// Admin: view any user’s profile + fine details
router.get("/:userId/profile", protect, adminOnly, getUserProfileByAdmin);
module.exports = router;
