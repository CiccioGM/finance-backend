// server/models/Transaction.js
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  description: { type: String, default: "" },
  amount: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.Mixed, default: null }, // can be ObjectId or legacy string or { $oid: "..." }
  account: { type: String, default: "Default" },
  method: { type: String, default: "Card" }
}, { timestamps: true });

transactionSchema.index({ date: -1 });

export default mongoose.model("Transaction", transactionSchema);
