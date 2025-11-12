// routes/transactions.js
import express from "express";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * GET /api/transactions
 * Optional query params: from, to (ISO dates), limit, category (id)
 */
router.get("/", async (req, res) => {
  try {
    const q = {};
    if (req.query.from) q.date = { ...q.date, $gte: new Date(req.query.from) };
    if (req.query.to) q.date = { ...q.date, $lte: new Date(req.query.to) };
    if (req.query.category) {
      if (mongoose.Types.ObjectId.isValid(req.query.category)) q.category = req.query.category;
    }

    const txs = await Transaction.find(q).sort({ date: -1 }).populate("category");
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/transactions
 * body: { date, description, amount, category (id optional), account, method }
 */
router.post("/", async (req, res) => {
  try {
    const payload = {
      date: req.body.date ? new Date(req.body.date) : new Date(),
      description: req.body.description || "",
      amount: Number(req.body.amount) || 0,
      account: req.body.account || "Default",
      method: req.body.method || "Card",
    };

    // If category passed as id or as name: prefer id
    if (req.body.category) {
      // if it's an ObjectId, use it; otherwise try to find by name
      if (mongoose.Types.ObjectId.isValid(req.body.category)) {
        payload.category = req.body.category;
      } else {
        // try to find category by name and type (optional)
        const found = await Category.findOne({ name: req.body.category });
        if (found) payload.category = found._id;
      }
    }

    const tx = new Transaction(payload);
    await tx.save();
    await tx.populate("category");
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/transactions/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const updates = {};
    if (req.body.date) updates.date = new Date(req.body.date);
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.amount !== undefined) updates.amount = Number(req.body.amount);
    if (req.body.account !== undefined) updates.account = req.body.account;
    if (req.body.method !== undefined) updates.method = req.body.method;

    if (req.body.category !== undefined) {
      if (req.body.category === null) {
        updates.category = null;
      } else if (mongoose.Types.ObjectId.isValid(req.body.category)) {
        updates.category = req.body.category;
      } else {
        // try lookup by name
        const found = await Category.findOne({ name: req.body.category });
        updates.category = found ? found._id : undefined;
      }
    }

    const tx = await Transaction.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate("category");
    if (!tx) return res.status(404).json({ error: "Not found" });
    res.json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/transactions/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndDelete(req.params.id);
    if (!tx) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
