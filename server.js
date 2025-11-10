import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import Transaction from "./models/Transaction.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connesso"))
  .catch((err) => {
    console.error("❌ Errore connessione MongoDB:", err?.message || err);
    process.exit(1);
  });

// Homepage
app.get("/", (req, res) => {
  res.send("Finance Backend API");
});

// Health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// GET all
app.get("/api/transactions", async (req, res) => {
  try {
    const txs = await Transaction.find().sort({ date: -1 });
    res.json(txs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create
app.post("/api/transactions", async (req, res) => {
  try {
    const tx = new Transaction(req.body);
    await tx.save();
    res.status(201).json(tx);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT update
app.put("/api/transactions/:id", async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!tx) return res.status(404).json({ error: "Not found" });
    res.json(tx);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE
app.delete("/api/transactions/:id", async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndDelete(req.params.id);
    if (!tx) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server avviato su :${PORT}`));
