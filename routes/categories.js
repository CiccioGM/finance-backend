import express from "express";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

// 🔹 GET tutte le categorie
router.get("/", async (req, res) => {
  const cats = await Category.find().sort({ name: 1 });
  res.json(cats);
});

// 🔹 POST nuova categoria
router.post("/", async (req, res) => {
  try {
    const cat = new Category(req.body);
    await cat.save();
    res.json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔹 PUT aggiorna categoria (nome, icona, colore)
router.put("/:id", async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔹 DELETE elimina categoria (solo se non usata)
router.delete("/:id", async (req, res) => {
  const used = await Transaction.findOne({ category: req.params.id });
  if (used) {
    return res.status(400).json({ error: "Categoria associata a transazioni esistenti" });
  }
  await Category.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
