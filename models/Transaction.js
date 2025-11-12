import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  description: { type: String },
  amount: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
});

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);
