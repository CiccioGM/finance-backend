// server/routes/adminMigrationRoute.js
import express from "express";
import mongoose from "mongoose";
import TransactionModel from "../models/Transaction.js";
import CategoryModel from "../models/Category.js";

const router = express.Router();

// quick ping to check route mounted
router.get("/ping", (req, res) => res.json({ ok: true, msg: "admin route active" }));

// Protected migration endpoint
router.post("/run-migration", async (req, res) => {
  const { key, mode } = req.body;
  if (key !== process.env.MIGRATION_SECRET) return res.status(401).json({ error: "Unauthorized" });

  const DRY = mode !== "apply";
  const APPLY = mode === "apply";

  const report = {
    dryRun: DRY,
    convertedOidToObjectId: 0,
    totalCategoryOidObjects: 0,
    totalStringCategoriesFound: 0,
    createdCategories: [],
    updatedTransactionsCount: 0,
    errors: []
  };

  try {
    // 1) convert category.$oid -> ObjectId
    const docsWithOidObj = await TransactionModel.find({ "category.$oid": { $exists: true } }).lean().exec();
    report.totalCategoryOidObjects = docsWithOidObj.length;

    if (docsWithOidObj.length) {
      if (DRY) {
        report.convertedOidToObjectId = docsWithOidObj.length;
      } else if (APPLY) {
        const ops = docsWithOidObj.map(d => {
          const oidStr = d.category.$oid;
          return {
            updateOne: {
              filter: { _id: d._id },
              update: { $set: { category: mongoose.Types.ObjectId(oidStr) } }
            }
          };
        });
        if (ops.length) {
          const resBulk = await TransactionModel.bulkWrite(ops, { ordered: false });
          report.convertedOidToObjectId = resBulk.modifiedCount || resBulk.nModified || 0;
        }
      }
    }

    // 2) string categories -> create/find category docs and update txs
    const agg = await TransactionModel.aggregate([
      { $match: { category: { $type: "string" } } },
      { $group: { _id: { $toLower: "$category" }, examples: { $addToSet: "$category" }, count: { $sum: 1 } } }
    ]);

    report.totalStringCategoriesFound = agg.length;

    for (const g of agg) {
      const example = (g.examples && g.examples[0]) ? g.examples[0] : g._id;
      // try to find existing
      let cat = await CategoryModel.findOne({ name: { $regex: `^${escapeRegex(example)}$`, $options: "i" } }).exec();

      if (!cat && APPLY) {
        cat = await CategoryModel.create({ name: example, type: "uscita", icon: "💸", color: "#FF8042" });
        report.createdCategories.push({ _id: cat._id, name: cat.name });
      }

      if (cat || DRY) {
        const categoryId = cat ? cat._id : ("DRY_" + example);
        if (DRY) {
          const count = await TransactionModel.countDocuments({ category: { $regex: `^\\s*${escapeRegex(example)}\\s*$`, $options: "i" } });
          // only report counts
        } else {
          const upd = await TransactionModel.updateMany({ category: { $regex: `^\\s*${escapeRegex(example)}\\s*$`, $options: "i" } }, { $set: { category: categoryId } });
          report.updatedTransactionsCount += upd.modifiedCount || upd.nModified || 0;
        }
      }
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error("Migration error:", err);
    report.errors.push(err.message);
    res.status(500).json({ error: err.message, report });
  }
});

function escapeRegex(s) {
  return (s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default router;

