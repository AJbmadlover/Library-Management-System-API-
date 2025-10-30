const User = require("../models/userModel");
const BorrowRecord = require('../models/borrowModel');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @desc Register new user
// @route POST /api/users/signup
// @access Public
module.exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "member",
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Login user
// @route POST /api/users/login
// @access Public
module.exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get current logged-in user
// @route GET /api/users/me
// @access Private
module.exports.profile = async (req, res) => {
 try {
    // 1️⃣ Get user (without password)
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2️⃣ Get all borrow records for this user
    const records = await BorrowRecord.find({ user: user._id })
      .populate("book", "title author category")
      .sort({ createdAt: -1 });

    // 3️⃣ Fine settings
    const fineRate = 100; // per day (adjust as needed)

    // 4️⃣ Calculate fines dynamically
    const borrowHistory = records.map(record => {
      let fine = 0;
      let status = record.status;

      // Calculate overdue days
      if (record.status !== "returned") {
        const now = new Date();
        if (now > record.dueDate) {
          const diffDays = Math.ceil(
            (now - record.dueDate) / (1000 * 60 * 60 * 24)
          );
          fine = diffDays * fineRate;
          status = "overdue";
        } else {
          status = "within time";
        }
      } else if (record.returnDate && record.returnDate > record.dueDate) {
        // Late return — calculate fine
        const diffDays = Math.ceil(
          (record.returnDate - record.dueDate) / (1000 * 60 * 60 * 24)
        );
        fine = diffDays * fineRate;
      }

      return {
        title: record.book?.title,
        author: record.book?.author,
        category: record.book?.category,
        borrowDate: record.borrowDate,
        dueDate: record.dueDate,
        returnDate: record.returnDate,
        status,
        fine,
      };
    });

    // 5️⃣ Calculate total fines
    const totalFine = borrowHistory.reduce((sum, b) => sum + b.fine, 0);

    // 6️⃣ Respond with complete profile
    res.status(200).json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
      totalFine,
      borrowHistory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Logout controller
exports.logout = async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(400).json({ message: "No token provided" });

    tokenBlacklist.push(token); // invalidate token
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: view any user’s profile + fine details
exports.getUserProfileByAdmin = async (req, res) => {
  try {
    const { userId } = req.params; // admin passes userId in the URL
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Get user's borrow records
    const borrowRecords = await BorrowRecord.find({ user: userId })
      .populate("book", "title author category");

    const now = new Date();
    const fineRate = 100; // ₦100 per day overdue (adjust as you like)
    let totalFine = 0;

    // Calculate fines dynamically
    const detailedRecords = borrowRecords.map(record => {
      let fine = 0;

      if (!record.returnDate && record.dueDate < now) {
        // Not yet returned, but overdue
        const overdueDays = Math.floor((now - record.dueDate) / (1000 * 60 * 60 * 24));
        fine = overdueDays * fineRate;
      } else if (record.returnDate && record.returnDate > record.dueDate) {
        // Returned late
        const overdueDays = Math.floor((record.returnDate - record.dueDate) / (1000 * 60 * 60 * 24));
        fine = overdueDays * fineRate;
      }

      totalFine += fine;

      return {
        title: record.book?.title || "Unknown Book",
        author: record.book?.author || "Unknown",
        category: record.book?.category || "Uncategorized",
        borrowDate: record.borrowDate,
        dueDate: record.dueDate,
        returnDate: record.returnDate || null,
        status: record.returnDate
          ? record.returnDate > record.dueDate
            ? "Overdue (Returned Late)"
            : "Returned"
          : record.dueDate < now
          ? "Overdue (Not Returned)"
          : "Borrowed",
        fine
      };
    });

    res.status(200).json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        totalFine,
      },
      records: detailedRecords
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
