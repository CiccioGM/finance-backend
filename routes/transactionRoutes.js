// server/routes/transactionRoutes.js
import express from "express";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * GET /api/transactions
 * Query params: from, to, limit, category
 */
router.get("/", async (req, res) => {
  try {
    const q = {};
    if (req.query.from) q.date = { ...q.date, $gte: new Date(req.query.from) };
    if (req.query.to) q.date = { ...q.date, $lte: new Date(req.query.to) };
    if (req.query.category) {
      if (mongoose.Types.ObjectId.isValid(req.query.category)) q.category = mongoose.Types.ObjectId(req.query.category);
      else q.category = req.query.category;
    }

    const txs = await Transaction.find(q).sort({ date: -1 }).populate({ path: "category", model: Category });
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/transactions
 */
router.post("/", async (req, res) => {
  try {
    const payload = {
      date: req.body.date ? new Date(req.body.date) : new Date(),
      description: req.body.description || "",
      amount: Number(req.body.amount) || 0,
      account: req.body.account || "Default",
      method: req.body.method || "Card",
      category: req.body.category ?? null
    };

    // if category provided as string ObjectId convert
    if (payload.category && typeof payload.category === "string" && mongoose.Types.ObjectId.isValid(payload.category)) {
      payload.category = mongoose.Types.ObjectId(payload.category);
    }

    const tx = new Transaction(payload);
    await tx.save();
    await tx.populate({ path: "category", model: Category });
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
      if (req.body.category === null) updates.category = null;
      else if (mongoose.Types.ObjectId.isValid(req.body.category)) updates.category = mongoose.Types.ObjectId(req.body.category);
      else updates.category = req.body.category;
    }

    const tx = await Transaction.findByIdAndUpdate(req.params.id, updates, { new: true }).populate({ path: "category", model: Category });
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
