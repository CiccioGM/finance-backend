// server/routes/adminMigrationRoute.js
import express from "express";
import mongoose from "mongoose";
import TransactionModel from "../models/Transaction.js";
import CategoryModel from "../models/Category.js";

const router = express.Router();

// ⚠️ ROUTE PROTETTA da chiave segreta (vedi sotto come impostarla)
router.post("/run-migration", async (req, res) => {
  const { key, mode } = req.body; // { key: "la_tua_chiave", mode: "dry"|"apply" }

  if (key !== process.env.MIGRATION_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const DRY = mode !== "apply"; // default dry-run
  const APPLY = mode === "apply";

  const report = {
    dryRun: DRY,
    convertedOidToObjectId: 0,
    totalCategoryOidObjects: 0,
    totalStringCategoriesFound: 0,
    createdCategories: [],
    updatedTransactionsCount: 0,
    errors: [],
  };

  try {
    console.log("Running migration...", DRY ? "(dry run)" : "(apply)");

    // 1️⃣ Converti category.$oid → ObjectId
    const docsWithOidObj = await TransactionModel.find({ "category.$oid": { $exists: true } });
    report.totalCategoryOidObjects = docsWithOidObj.length;

    if (docsWithOidObj.length) {
      if (DRY) {
        report.convertedOidToObjectId = docsWithOidObj.length;
      } else {
        const ops = docsWithOidObj.map((d) => {
          const oidStr = d.category.$oid;
          return {
            updateOne: {
              filter: { _id: d._id },
              update: { $set: { category: new mongoose.Types.ObjectId(oidStr) } },
            },
          };
        });
        const resBulk = await TransactionModel.bulkWrite(ops, { ordered: false });
        report.convertedOidToObjectId = resBulk.modifiedCount || resBulk.nModified || 0;
      }
    }

    // 2️⃣ Migrazione categorie testuali
    const agg = await TransactionModel.aggregate([
      { $match: { category: { $type: "string" } } },
      { $group: { _id: { $toLower: "$category" }, examples: { $addToSet: "$category" }, count: { $sum: 1 } } },
    ]);

    report.totalStringCategoriesFound = agg.length;

    for (const g of agg) {
      const name = g.examples[0] || g._id;
      let cat = await CategoryModel.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: "i" } });

      if (!cat && APPLY) {
        cat = await CategoryModel.create({
          name,
          type: "uscita",
          icon: "💸",
          color: "#FF8042",
        });
        report.createdCategories.push({ _id: cat._id, name });
      }

      if (cat || DRY) {
        const categoryId = cat ? cat._id : "DRY_" + name;
        if (DRY) {
          const count = await TransactionModel.countDocuments({ category: { $regex: `^${escapeRegex(name)}$`, $options: "i" } });
          console.log(`[DRY] ${count} transactions would update -> ${name}`);
        } else {
          const resUpd = await TransactionModel.updateMany(
            { category: { $regex: `^${escapeRegex(name)}$`, $options: "i" } },
            { $set: { category: categoryId } }
          );
          report.updatedTransactionsCount += resUpd.modifiedCount || resUpd.nModified || 0;
        }
      }
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, report });
  }
});

function escapeRegex(s) {
  return (s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default router;
