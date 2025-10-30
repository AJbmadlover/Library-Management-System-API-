const express = require("express");
const app = express();
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();
// Connect to MongoDB
connectDB();
// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const bookRoutes = require("./routes/bookRoutes");
const borrowRoutes = require("./routes/borrowRoutes");
const summaryRoutes = require('./routes/summaryRoutes');
const userRoutes = require('./routes/userRoutes');

// Mount routes
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/", borrowRoutes);
app.use("/api/summary", summaryRoutes); //admin only route


// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "Library Management System API is running 🚀" });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
  next();
});

// Error handler
const {errorHandler} = require('./middleware/errorhandler');
app.use(errorHandler);


const PORT = process.env.PORT || 3500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));