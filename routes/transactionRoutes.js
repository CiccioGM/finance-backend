// server/routes/transactionRoutes.js
import express from "express";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * Helper: restituisce l'id stringa se value rappresenta un ObjectId valido,
 * oppure null se non è un ObjectId.
 */
function extractObjectIdString(value) {
  if (!value) return null;
  // se è già ObjectId
  if (value instanceof mongoose.Types.ObjectId) return String(value);
  // se è un oggetto { _id: ... } o { $oid: "..." }
  if (typeof value === "object") {
    if (value._id && mongoose.Types.ObjectId.isValid(String(value._id))) return String(value._id);
    if (value.$oid && mongoose.Types.ObjectId.isValid(String(value.$oid))) return String(value.$oid);
    return null;
  }
  // se è stringa, verifica validità ObjectId
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) return value;
  return null;
}

/**
 * GET /api/transactions
 * q params: from, to, limit, category
 * This route now fetches txs without populate, then populates only valid ObjectId categories.
 */
router.get("/", async (req, res) => {
  try {
    const q = {};
    if (req.query.from) q.date = { ...q.date, $gte: new Date(req.query.from) };
    if (req.query.to) q.date = { ...q.date, $lte: new Date(req.query.to) };

    // support filter by category: if query param is an ObjectId string, use it,
    // otherwise filter by string equality (legacy)
    if (req.query.category) {
      if (mongoose.Types.ObjectId.isValid(req.query.category)) q.category = mongoose.Types.ObjectId(req.query.category);
      else q.category = req.query.category;
    }

    // get transactions *without* populate
    const txs = await Transaction.find(q).sort({ date: -1 }).lean().exec();

    // collect unique valid ObjectId strings from tx.category fields
    const objIds = new Set();
    for (const t of txs) {
      const oid = extractObjectIdString(t.category);
      if (oid) objIds.add(oid);
    }

    let categoryMap = {};
    if (objIds.size > 0) {
      const idsArray = Array.from(objIds).map(id => mongoose.Types.ObjectId(id));
      const cats = await Category.find({ _id: { $in: idsArray } }).lean().exec();
      categoryMap = cats.reduce((acc, c) => {
        acc[String(c._id)] = c;
        return acc;
      }, {});
    }

    // attach populated category objects only for valid ObjectId categories,
    // otherwise leave the original value (string or null)
    const result = txs.map(t => {
      const oid = extractObjectIdString(t.category);
      if (oid && categoryMap[oid]) {
        t.category = categoryMap[oid];
      } else {
        // keep as-is (string, null, or an object we couldn't resolve)
        // optionally normalize { $oid: "..." } to string
        if (t.category && typeof t.category === "object" && t.category.$oid) t.category = t.category.$oid;
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

    // if category provided as string ObjectId convert to ObjectId
    if (payload.category && typeof payload.category === "string" && mongoose.Types.ObjectId.isValid(payload.category)) {
      payload.category = mongoose.Types.ObjectId(payload.category);
    }

    const tx = new Transaction(payload);
    await tx.save();

    // try populate for response if category was ObjectId
    let txObj = tx.toObject();
    const oid = extractObjectIdString(txObj.category);
    if (oid) {
      const cat = await Category.findById(oid).lean().exec();
      if (cat) txObj.category = cat;
    } else {
      if (txObj.category && typeof txObj.category === "object" && txObj.category.$oid) txObj.category = txObj.category.$oid;
    }

    res.status(201).json(txObj);
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
      if (req.body.category === null) updates.category = null;
      else if (typeof req.body.category === "string" && mongoose.Types.ObjectId.isValid(req.body.category)) updates.category = mongoose.Types.ObjectId(req.body.category);
      else updates.category = req.body.category;
    }

    const tx = await Transaction.findByIdAndUpdate(req.params.id, updates, { new: true }).lean().exec();
    if (!tx) return res.status(404).json({ error: "Not found" });

    // try to populate category in response if it's an ObjectId
    const oid = extractObjectIdString(tx.category);
    if (oid) {
      const cat = await Category.findById(oid).lean().exec();
      if (cat) tx.category = cat;
    } else {
      if (tx.category && typeof tx.category === "object" && tx.category.$oid) tx.category = tx.category.$oid;
    }

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
    const tx = await Transaction.findByIdAndDelete(req.params.id).lean().exec();
    if (!tx) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/transactions/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
