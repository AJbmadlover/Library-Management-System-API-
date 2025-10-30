const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  borrowBook,
  returnBook,
  getAllBorrowRecords,
  getUserBorrowRecords,
  getAllOverdueRecords,
  viewAllUsersBorrowHistory,
} = require("../controllers/borrowController");

// Member borrows a book
router.post("/borrow", protect, borrowBook);

// Member returns a book
router.put("/return/:recordId", protect, returnBook);

// Admin: view all records
router.get("/borrowed", protect, adminOnly, getAllBorrowRecords);
router.get("/overdue", protect, adminOnly, getAllOverdueRecords); //to view all overdue books with members
router.get("/borrowed/:userId",protect, adminOnly, viewAllUsersBorrowHistory)

// Member: view their own records
router.get("/myhistory", protect, getUserBorrowRecords);

module.exports = router;
