// server/routes/dashboardRoutes.js
import express from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";

const router = express.Router();

// GET /api/dashboard/summary
// restituisce: saldo (totale), entrate ultimi 30 giorni, uscite ultimi 30 giorni
router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const since30 = new Date(now);
    since30.setDate(now.getDate() - 30);

    // entrate / uscite ultimi 30 giorni
    const agg30 = await Transaction.aggregate([
      { $match: { date: { $gte: since30 } } },
      {
        $group: {
          _id: { $cond: [{ $gte: ["$amount", 0] }, "entrata", "uscita"] },
          total: { $sum: "$amount" }
        }
      }
    ]);

    let entrate30 = 0;
    let uscite30 = 0;
    for (const g of agg30) {
      if (g._id === "entrata") entrate30 = g.total;
      else uscite30 = Math.abs(g.total);
    }

    // saldo totale (tutte le transazioni)
    const totalAgg = await Transaction.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
    const saldo = totalAgg[0] ? totalAgg[0].total : 0;

    res.json({ saldo, entrate30, uscite30 });
  } catch (err) {
    console.error("Error /api/dashboard/summary", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/monthly
// restituisce array degli ultimi 12 mesi con entrate e uscite (valori positivi)
router.get("/monthly", async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const agg = await Transaction.aggregate([
      { $match: { date: { $gte: start } } },
      {
        $project: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          amount: 1
        }
      },
      {
        $group: {
          _id: { year: "$year", month: "$month", type: { $cond: [{ $gte: ["$amount", 0] }, "entrata", "uscita"] } },
          total: { $sum: "$amount" }
        }
      },
      {
        $project: {
          year: "$_id.year",
          month: "$_id.month",
          type: "$_id.type",
          total: 1,
          _id: 0
        }
      }
    ]);

    // costruisci array dei 12 mesi ordinati
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        entrate: 0,
        uscite: 0
      });
    }

    for (const r of agg) {
      const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
      const m = months.find(x => x.key === key);
      if (!m) continue;
      if (r.type === "entrata") m.entrate += r.total;
      else m.uscite += Math.abs(r.total);
    }

    res.json(months);
  } catch (err) {
    console.error("Error /api/dashboard/monthly", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/pie-expenses
// restituisce ripartizione delle USCITE per categoria: { _id, name, icon, color, value, percentage }
router.get("/pie-expenses", async (req, res) => {
  try {
    // Aggregazione: somma uscite (amount < 0) raggruppate per categoria (ObjectId)
    const agg = await Transaction.aggregate([
      { $match: { amount: { $lt: 0 }, category: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" }
        }
      },
      {
        // join con categories (se category è ObjectId)
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryDoc"
        }
      },
      { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: "$_id",
          total: { $abs: "$total" }, // positive number
          name: "$categoryDoc.name",
          icon: "$categoryDoc.icon",
          color: "$categoryDoc.color"
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    const totalAll = agg.reduce((s, r) => s + (r.total || 0), 0) || 0;

    const result = agg.map(r => ({
      _id: r._id,
      name: r.name || "Altro",
      icon: r.icon || "💸",
      color: r.color || "#AAAAAA",
      value: r.total || 0,
      percentage: totalAll > 0 ? Math.round(( (r.total || 0) / totalAll) * 10000) / 100 : 0 // two decimals
    }));

    res.json({ total: totalAll, data: result });
  } catch (err) {
    console.error("Error /api/dashboard/pie-expenses", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
