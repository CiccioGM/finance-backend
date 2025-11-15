// src/routes/budgetRoutes.js
import express from "express";
import Budget from "../models/Budget.js";

const router = express.Router();

// GET /api/budgets - lista di tutti i budget
router.get("/", async (req, res) => {
  try {
    const budgets = await Budget.find().sort({ createdAt: 1 }).lean();
    res.json(budgets);
  } catch (err) {
    console.error("Errore GET /api/budgets", err);
    res.status(500).json({ error: "Errore caricamento budget" });
  }
});

// POST /api/budgets - crea un nuovo budget
router.post("/", async (req, res) => {
  try {
    const { category, limit, period } = req.body;
    if (!category || typeof limit === "undefined") {
      return res.status(400).json({ error: "Categoria e limite sono obbligatori" });
    }

    const budget = new Budget({
      category,
      limit,
      period: period || "monthly",
    });

    const saved = await budget.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Errore POST /api/budgets", err);
    res.status(500).json({ error: "Errore creazione budget" });
  }
});

// PUT /api/budgets/:id - aggiorna un budget
router.put("/:id", async (req, res) => {
  try {
    const { category, limit, period } = req.body;
    const update = {};
    if (category) update.category = category;
    if (typeof limit !== "undefined") update.limit = limit;
    if (period) update.period = period;

    const updated = await Budget.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Budget non trovato" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Errore PUT /api/budgets/:id", err);
    res.status(500).json({ error: "Errore aggiornamento budget" });
  }
});

// DELETE /api/budgets/:id - elimina un budget
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Budget.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Budget non trovato" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Errore DELETE /api/budgets/:id", err);
    res.status(500).json({ error: "Errore eliminazione budget" });
  }
});

export default router;
