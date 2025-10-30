// const {dueDate, returnDate} = require('../models/fineModel')

module.exports.calculateFine = (dueDate, returnDate) => {
  const FINE_RATE_PER_DAY = 100; // ₦100 per day
  const diffDays = Math.floor((returnDate - dueDate) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays * FINE_RATE_PER_DAY : 0;
};
