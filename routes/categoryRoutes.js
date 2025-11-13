// server/routes/categoryRoutes.js
import express from "express";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";

const router = express.Router();

/** GET /api/categories */
router.get("/", async (req, res) => {
  try {
    const cats = await Category.find().sort({ type: 1, name: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/categories */
router.post("/", async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;
    if (!name || !type) return res.status(400).json({ error: "Missing name or type" });
    const cat = new Category({ name, type, icon, color });
    await cat.save();
    res.status(201).json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** PUT /api/categories/:id */
router.put("/:id", async (req, res) => {
  try {
    const updates = {};
    ["name", "icon", "color", "type"].forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const cat = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!cat) return res.status(404).json({ error: "Not found" });
    res.json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** DELETE /api/categories/:id (block if used) */
router.delete("/:id", async (req, res) => {
  try {
    const used = await Transaction.exists({ category: req.params.id });
    if (used) return res.status(400).json({ error: "Categoria associata a transazioni esistenti" });
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
