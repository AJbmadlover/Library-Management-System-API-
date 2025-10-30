const BorrowRecord = require('../models/borrowModel');
const Book = require('../models/bookModel');
const User = require('../models/userModel');
const { calculateFine } = require("../utils/calculateFine");

//borrow a book
exports.borrowBook = async (req, res) => {
  try {
    const { bookId } = req.body;

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.availableCopies <= 0)
      return res.status(400).json({ message: "No available copies of this book " });

    // Auto-set due date to 2 weeks from now
    const borrowDate = new Date();
    const dueDate = new Date(borrowDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    const borrowRecord = await BorrowRecord.create({
      user: req.user._id,
      book: bookId,
      borrowDate,
      dueDate,
    });
    await User.findByIdAndUpdate(req.user._id, {
        $push: { borrowedBooks: borrowRecord._id }
    });

    book.availableCopies -= 1;
    await book.save();

    res.status(201).json({ message: "Book borrowed successfully", borrowRecord });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Return a book
exports.returnBook = async (req, res) => {
  try {
    const { recordId } = req.params;

    const borrowRecord = await BorrowRecord.findById(recordId).populate("book");
    if (!borrowRecord)
      return res.status(404).json({ message: "Borrow record not found" });

    if (borrowRecord.status === "returned") {
      return res.status(400).json({ message: "Book already returned" });
    }

    // Set return date to now
    borrowRecord.returnDate = new Date();

    // Determine if overdue or on time
    if (borrowRecord.returnDate > borrowRecord.dueDate) {
      borrowRecord.status = "overdue";
      borrowRecord.fineAmount = calculateFine(
        borrowRecord.dueDate,
        borrowRecord.returnDate
      );
    } else {
      borrowRecord.status = "returned";
      borrowRecord.fineAmount = 0;
    }

    // Increase book availability
    borrowRecord.book.availableCopies += 1;
    await borrowRecord.book.save();
    await borrowRecord.save();

    res.status(200).json({
      message: "Book returned successfully",
      borrowRecord: {
        id: borrowRecord._id,
        title: borrowRecord.book.title,
        status: borrowRecord.status,
        fine: borrowRecord.fineAmount,
        returnedOn: borrowRecord.returnDate,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// View all borrow records (admin only)
exports.getAllBorrowRecords = async (req, res) => {
  try {
    const records = await BorrowRecord.find()
      .populate("user", "name email")
      .populate("book", "title author category");
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// View current user's borrow history
exports.getUserBorrowRecords = async (req, res) => {

  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: "borrowedBooks",
        populate: { path: "book", select: "title author category" }
      });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Update statuses dynamically
    const now = new Date();
    const records = user.borrowedBooks.map(record => {
      if (record.status === "borrowed" && record.dueDate < now) {
        record.status = "overdue";
      } else if (record.status === "borrowed" && record.dueDate >= now) {
        record.status = "reading"; // 👈 custom state for “still with book”
      }
      return record;
    });

    res.status(200).json({
      totalBorrowed: records.length,
      records: records.map(record => ({
        title: record.book.title,
        author: record.book.author,
        category: record.book.category,
        status: record.status,
        dueDate: record.dueDate,
        returnDate: record.returnDate,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all overdue borrow records
// @route GET /api/borrow/overdue
// @access Admin
exports.getAllOverdueRecords = async (req, res) => {
  try {
    const now = new Date();

    // Find all overdue records
    const overdueRecords = await BorrowRecord.find({
      status: { $in: ["borrowed", "overdue"] }, // still borrowed or already marked overdue
      dueDate: { $lt: now },
    })
      .populate("book", "title author category")
      .populate("user", "name email");

    if (overdueRecords.length === 0)
      return res.status(200).json({ message: "No overdue books currently." });

    // Optionally recalc fine
    const records = overdueRecords.map((record) => {
      const fine = record.fineAmount
        ? record.fineAmount
        : Math.max(0, Math.floor((now - record.dueDate) / (1000 * 60 * 60 * 24)) * 100); // static ₦100/day
      return {
        id: record._id,
        user: {
          name: record.user.name,
          email: record.user.email,
        },
        book: {
          title: record.book.title,
          author: record.book.author,
          category: record.book.category,
        },
        dueDate: record.dueDate,
        daysLate: Math.floor((now - record.dueDate) / (1000 * 60 * 60 * 24)),
        fine,
      };
    });

    res.status(200).json({
      totalOverdue: records.length,
      records,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/borrow/user/:id
exports.viewAllUsersBorrowHistory = async(req,res)=>{    
  try {
    const records = await BorrowRecord.find({ userId: req.params.id })
                                      .populate("book", "title author category");
    const now = new Date();

    const history = records.map((record) => ({
      title: record.book.title,
      author: record.book.author,
      category: record.book.category,
      borrowedAt: record.borrowDate,
      dueDate: record.dueDate,
      returnedAt: record.returnDate,
      status: record.returnDate
        ? "Returned"
        : now > record.dueDate
        ? "Overdue"
        : "Still Borrowed",
    }));

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
