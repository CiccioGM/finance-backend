import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ["entrata", "uscita"], required: true },
  icon: { type: String, default: "💰" },
  color: { type: String, default: "#00C49F" },
});

export default mongoose.model("Category", categorySchema);
