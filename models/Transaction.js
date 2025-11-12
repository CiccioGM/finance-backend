// models/Transaction.js
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  description: { type: String, default: "" },
  amount: { type: Number, required: true },
  // category is a reference to Category document
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: false },
  account: { type: String, default: "Default" },
  method: { type: String, default: "Card" },
}, {
  timestamps: true,
});

// optional: index by date for faster queries by range
transactionSchema.index({ date: -1 });

export default mongoose.model("Transaction", transactionSchema);
