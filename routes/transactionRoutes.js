// server/routes/transactionRoutes.js
import express from "express";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";

const router = express.Router();

/** 
 * Helper: restituisce un ObjectId valido oppure null 
 */
function toObjectId(v) {
  if (!v) return null;
  // già ObjectId
  if (v instanceof mongoose.Types.ObjectId) return v;
  // oggetto tipo {$oid:"..."}
  if (typeof v === "object" && v.$oid && mongoose.Types.ObjectId.isValid(v.$oid)) {
    return new mongoose.Types.ObjectId(v.$oid);
  }
  // oggetto tipo {_id:"..."}
  if (typeof v === "object" && v._id && mongoose.Types.ObjectId.isValid(v._id)) {
    return new mongoose.Types.ObjectId(v._id);
  }
  // stringa valida
  if (typeof v === "string" && mongoose.Types.ObjectId.isValid(v)) {
    return new mongoose.Types.ObjectId(v);
  }
  return null;
}

/**
 * GET /api/transactions
 */
router.get("/", async (req, res) => {
  try {
    const q = {};

    if (req.query.from) q.date = { ...q.date, $gte: new Date(req.query.from) };
    if (req.query.to) q.date = { ...q.date, $lte: new Date(req.query.to) };

    // Supporto filtro categoria (ID o stringa legacy)
    if (req.query.category) {
      if (mongoose.Types.ObjectId.isValid(req.query.category))
        q.category = new mongoose.Types.ObjectId(req.query.category);
      else q.category = req.query.category;
    }

    // Prendiamo le transazioni SENZA populate
    const txs = await Transaction.find(q).sort({ date: -1 }).lean();

    // Estraggo SOLO gli ObjectId validi
    const validIds = new Set();
    for (const t of txs) {
      const oid = toObjectId(t.category);
      if (oid) validIds.add(String(oid));
    }

    // Precarico tutte le categorie valide
    let categoryMap = {};
    if (validIds.size > 0) {
      const idsArr = [...validIds].map(id => new mongoose.Types.ObjectId(id));
      const cats = await Category.find({ _id: { $in: idsArr } }).lean();
      categoryMap = Object.fromEntries(cats.map(c => [String(c._id), c]));
    }

    // Riassemblo le transazioni con populate "manuale"
    const result = txs.map(t => {
      const oid = toObjectId(t.category);
      if (oid && categoryMap[String(oid)]) {
        t.category = categoryMap[String(oid)];
      } else {
        // Lascia categoria legacy invariata (stringa)
        if (typeof t.category === "object" && t.category?.$oid)
          t.category = t.category.$oid;
      }
      return t;
    });

    res.json(result);

  } catch (err) {
    console.error("GET /api/transactions error:", err);
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

    const oid = toObjectId(payload.category);
    if (oid) payload.category = oid;

    const tx = await Transaction.create(payload);
    let obj = tx.toObject();

    if (oid) obj.category = await Category.findById(oid).lean();

    res.status(201).json(obj);
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

    if (req.body.category !== undefined) {
      const oid = toObjectId(req.body.category);
      updates.category = oid ? oid : req.body.category;
    }

    const tx = await Transaction.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
    if (!tx) return res.status(404).json({ error: "Not found" });

    const oid = toObjectId(tx.category);
    if (oid) tx.category = await Category.findById(oid).lean();

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
