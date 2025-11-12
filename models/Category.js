// models/Category.js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["entrata", "uscita"], required: true },
  icon: { type: String, default: "💰" },
  color: { type: String, default: "#00C49F" },
}, {
  timestamps: true,
});

// unique compound index on name+type could be useful
categorySchema.index({ name: 1, type: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);
