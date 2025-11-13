// server/models/Category.js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["entrata", "uscita"], required: true },
  icon: { type: String, default: "💰" },
  color: { type: String, default: "#00C49F" }
}, { timestamps: true });

categorySchema.index({ name: 1, type: 1 }, { unique: false });

export default mongoose.model("Category", categorySchema);
