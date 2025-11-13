// server/routes/dashboardRoutes.js
import express from "express";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";

const router = express.Router();

// helpers
const startOfDay = d => new Date(new Date(d).setHours(0,0,0,0));

// GET /api/dashboard/summary
router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const since30 = new Date(now); since30.setDate(now.getDate() - 30);

    const agg = await Transaction.aggregate([
      { $match: { date: { $gte: since30 } } },
      { $group: {
          _id: { $cond: [{ $gte: ["$amount", 0] }, "entrate", "uscite"] },
          total: { $sum: "$amount" }
      }},
    ]);

    // find totals
    let entrate = 0, uscite = 0;
    for (const g of agg) {
      if (g._id === "entrate") entrate = g.total;
      else uscite = Math.abs(g.total);
    }

    // Saldo attuale (somma di tutte le transazioni)
    const totalAgg = await Transaction.aggregate([{ $group: { _id:null, total: { $sum: "$amount" } } }]);
    const saldo = totalAgg[0] ? totalAgg[0].total : 0;

    res.json({ saldo, entrate: entrate, uscite: uscite });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/monthly
router.get("/monthly", async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const agg = await Transaction.aggregate([
      { $match: { date: { $gte: start } } },
      { $project: { year: { $year: "$date" }, month: { $month: "$date" }, amount: 1 } },
      { $group: { _id: { year: "$year", month: "$month", type: { $cond: [{ $gte: ["$amount", 0] }, "entrate","uscite"] } }, total: { $sum: "$amount" } } },
      { $project: { year: "$_id.year", month: "$_id.month", type: "$_id.type", total: 1, _id: 0 } }
    ]);

    // normalize into months array
    const months = [];
    for (let i = 0; i < 12; ++i) {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${d.getMonth()+1}`;
      months.push({ key, year: d.getFullYear(), month: d.getMonth()+1, entrate:0, uscite:0 });
    }
    for (const r of agg) {
      const key = `${r.year}-${r.month}`;
      const m = months.find(x => x.key === key);
      if (!m) continue;
      if (r.type === "entrate") m.entrate += r.total;
      else m.uscite += Math.abs(r.total);
    }

    res.json(months);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
