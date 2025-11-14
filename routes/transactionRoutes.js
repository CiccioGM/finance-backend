// server/routes/transactionRoutes.js
import express from "express";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/**
 * GET /api/transactions
 * Query params: from, to, limit
 * NON fa populate delle categorie, restituisce quello che c'è in DB.
 */
router.get("/", async (req, res) => {
  try {
    const q = {};
    if (req.query.from) q.date = { ...q.date, $gte: new Date(req.query.from) };
    if (req.query.to) q.date = { ...q.date, $lte: new Date(req.query.to) };

    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0 || limit > 5000) limit = 1000;

    const txs = await Transaction.find(q)
      .sort({ date: -1 })
      .limit(limit)
      .lean()
      .exec();

    // NON tocchiamo più category: può essere stringa, ObjectId, mixed, va bene così.
    res.json(txs);
  } catch (err) {
    console.error("GET /api/transactions error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/transactions
 * Crea una transazione così com'è, senza forzare ObjectId sulla category.
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

    const tx = await Transaction.create(payload);
    res.status(201).json(tx.toObject());
  } catch (err) {
    console.error("POST /api/transactions error:", err);
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
    if (req.body.category !== undefined) updates.category = req.body.category;

    const tx = await Transaction.findByIdAndUpdate(req.params.id, updates, {
      new: true
    }).lean();

    if (!tx) return res.status(404).json({ error: "Not found" });
    res.json(tx);
  } catch (err) {
    console.error("PUT /api/transactions/:id error:", err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/transactions/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndDelete(req.params.id).lean();
    if (!tx) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/transactions/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
