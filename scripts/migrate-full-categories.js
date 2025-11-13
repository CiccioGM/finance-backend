// server/scripts/migrate-full-categories.js
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import TransactionModel from "../models/Transaction.js";
import CategoryModel from "../models/Category.js";

const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error("Missing MONGO_URI in env");
  process.exit(1);
}

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry") && !argv.includes("--apply");
const APPLY = argv.includes("--apply");

async function main() {
  await mongoose.connect(MONGO);
  const report = { totalCategoryOidObjects: 0, convertedOidToObjectId: 0, totalStringCategoriesFound: 0, createdCategories: [], updatedTransactionsCount: 0, errors: [] };

  try {
    const docsWithOidObj = await TransactionModel.find({ "category.$oid": { $exists: true } }).lean().exec();
    report.totalCategoryOidObjects = docsWithOidObj.length;
    if (docsWithOidObj.length) {
      if (DRY) {
        report.convertedOidToObjectId = docsWithOidObj.length;
      } else if (APPLY) {
        const ops = docsWithOidObj.map(d => ({ updateOne: { filter: { _id: d._id }, update: { $set: { category: mongoose.Types.ObjectId(d.category.$oid) } } } }));
        const res = await TransactionModel.bulkWrite(ops, { ordered: false });
        report.convertedOidToObjectId = res.modifiedCount || res.nModified || 0;
        report.updatedTransactionsCount += report.convertedOidToObjectId;
      }
    }

    const agg = await TransactionModel.aggregate([
      { $match: { category: { $type: "string" } } },
      { $group: { _id: { $toLower: "$category" }, examples: { $addToSet: "$category" }, count: { $sum: 1 } } }
    ]).exec();

    report.totalStringCategoriesFound = agg.length;

    for (const g of agg) {
      const example = (g.examples && g.examples[0]) ? g.examples[0] : g._id;
      const existing = await CategoryModel.findOne({ name: { $regex: `^${escapeRegex(example)}$`, $options: "i" } });
      let catId;
      if (existing) {
        catId = existing._id;
      } else {
        if (!DRY && APPLY) {
          const created = await CategoryModel.create({ name: example, type: "uscita", icon: "💸", color: "#FF8042" });
          catId = created._id;
          report.createdCategories.push({ name: created.name, _id: catId });
        } else {
          catId = `DRY_${example}`;
        }
      }

      const filterTx = { category: { $regex: `^\\s*${escapeRegex(example)}\\s*$`, $options: "i" } };
      if (DRY) {
        const count = await TransactionModel.countDocuments(filterTx).exec();
      } else if (APPLY) {
        const upd = await TransactionModel.updateMany(filterTx, { $set: { category: catId } }).exec();
        report.updatedTransactionsCount += upd.modifiedCount || upd.nModified || 0;
      }
    }

    console.log("Report:", report);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

function escapeRegex(s) { return (s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

main().catch(err => { console.error(err); process.exit(1); });

