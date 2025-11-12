// routes/categories.js
import express from "express";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/**
 * GET /api/categories
 * Returns all categories
 */
router.get("/", async (req, res) => {
  try {
    const cats = await Category.find().sort({ type: 1, name: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET single category
 */
router.get("/:id", async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ error: "Not found" });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/categories
 * Create a new category
 * body: { name, type, icon, color }
 */
router.post("/", async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;
    if (!name || !type) return res.status(400).json({ error: "Missing name or type" });
    const cat = new Category({ name, type, icon, color });
    await cat.save();
    res.status(201).json(cat);
  } catch (err) {
    // handle duplicate key nicely
    if (err.code === 11000) return res.status(400).json({ error: "Categoria già esistente" });
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/categories/:id
 * Update (name, icon, color)
 * Prevent changing type? We allow it but note: you might want to disallow type changes.
 */
router.put("/:id", async (req, res) => {
  try {
    const updates = {};
    ["name", "icon", "color", "type"].forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const cat = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!cat) return res.status(404).json({ error: "Not found" });

    // Optionally: if `name` changed, you may want to update related UI/client caches — client will handle via GET
    res.json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/categories/:id
 * Only delete if NOT used by any transaction
 */
router.delete("/:id", async (req, res) => {
  try {
    const used = await Transaction.exists({ category: req.params.id });
    if (used) {
      return res.status(400).json({ error: "Categoria associata a transazioni esistenti" });
    }
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
