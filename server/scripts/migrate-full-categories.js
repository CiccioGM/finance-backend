// server/scripts/migrate-full-categories.js
// Usage:
//   DRY RUN:   node migrate-full-categories.js --dry
//   APPLY RUN: node migrate-full-categories.js --apply
//
// Requirements: in server/.env (o env di Render) deve esserci MONGO_URI.
// Assumes project uses "type":"module" so we use ESM imports.

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import TransactionModel from "../models/Transaction.js";
import CategoryModel from "../models/Category.js";

const MONGO = process.env.MONGO_URI || process.env.MONGO || process.env.MONGO_URI_CONN;
if (!MONGO) {
  console.error("Missing MONGO_URI in env. Set MONGO_URI before running.");
  process.exit(1);
}

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry") && !argv.includes("--apply");
const APPLY = argv.includes("--apply");

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Connected.");

  const report = {
    totalCategoryOidObjects: 0,
    convertedOidToObjectId: 0,
    totalStringCategoriesFound: 0,
    stringCategoryGroups: [],
    createdCategories: [],
    updatedTransactionsCount: 0,
    errors: []
  };

  try {
    // 1) Find docs where category.$oid exists (object containing $oid)
    const filterOidObj = { "category.$oid": { $exists: true } };
    const docsWithOidObj = await TransactionModel.find(filterOidObj).lean().exec();
    report.totalCategoryOidObjects = docsWithOidObj.length;
    console.log(`Found ${docsWithOidObj.length} transactions with category.$oid objects.`);

    if (docsWithOidObj.length) {
      if (DRY) {
        docsWithOidObj.forEach(d => {
          report.convertedOidToObjectId++;
        });
        console.log("[DRY] Would convert all category.$oid -> ObjectId()");
      } else if (APPLY) {
        // bulk update: set category to ObjectId(value)
        const bulkOps = docsWithOidObj.map(d => {
          const oidStr = d.category && d.category.$oid;
          return {
            updateOne: {
              filter: { _id: d._id },
              update: { $set: { category: mongoose.Types.ObjectId(oidStr) } }
            }
          };
        });

        if (bulkOps.length) {
          const res = await TransactionModel.bulkWrite(bulkOps, { ordered: false });
          // note: different mongoose versions expose counts differently
          report.convertedOidToObjectId = res.modifiedCount ?? res.nModified ?? res.modified ?? 0;
          report.updatedTransactionsCount += report.convertedOidToObjectId;
          console.log(`Converted ${report.convertedOidToObjectId} category.$oid -> ObjectId.`);
        }
      } else {
        console.log("No --apply flag provided, skipping conversion of category.$oid. Run with --apply to perform writes.");
      }
    }

    // 2) Find transactions where category is a string (legacy textual categories)
    const filterStringCat = { category: { $type: "string" } };
    const agg = await TransactionModel.aggregate([
      { $match: filterStringCat },
      { $group: { _id: { $toLower: "$category" }, examples: { $addToSet: "$category" }, count: { $sum: 1 } } },
      { $project: { normalized: "$_id", examples: 1, count: 1 } },
      { $sort: { count: -1 } }
    ]).exec();

    report.totalStringCategoriesFound = agg.length;
    report.stringCategoryGroups = agg;
    console.log(`Found ${agg.length} distinct string category groups (normalized).`);

    if (agg.length) {
      for (const g of agg) {
        const normalized = g.normalized;
        const example = (g.examples && g.examples[0]) ? g.examples[0] : normalized;
        console.log(`Group: ${normalized} (example: ${example}) count=${g.count}`);

        // try to find existing category doc (case-insensitive exact)
        const existing = await CategoryModel.findOne({ name: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" } }).exec();

        let catId;
        if (existing) {
          catId = existing._id;
          console.log(` -> matched existing category "${existing.name}" (${catId})`);
        } else {
          // create new category with defaults (type = uscita)
          if (!DRY && APPLY) {
            const created = await CategoryModel.create({
              name: example,
              type: "uscita",
              icon: "💸",
              color: "#FF8042"
            });
            catId = created._id;
            report.createdCategories.push({ name: created.name, _id: catId });
            console.log(` -> created new category "${created.name}" (${catId})`);
          } else {
            // simulate id for DRY-run
            catId = `DRY_${example}`;
            console.log(` -> [DRY] would create new category "${example}"`);
          }
        }

        // update transactions matching this textual name (case-insensitive)
        const filterTx = { category: { $regex: `^\\s*${escapeRegex(example)}\\s*$`, $options: "i" } };

        if (DRY) {
          const count = await TransactionModel.countDocuments(filterTx).exec();
          console.log(`   [DRY] would update ${count} transactions setting category -> ${catId}`);
          report.updatedTransactionsCount += 0;
        } else if (APPLY) {
          const updateRes = await TransactionModel.updateMany(filterTx, { $set: { category: catId } }).exec();
          const matched = updateRes.matchedCount ?? updateRes.n ?? updateRes.modifiedCount ?? 0;
          report.updatedTransactionsCount += matched;
          console.log(`   Updated ${matched} transactions -> category ${catId}`);
        } else {
          const count = await TransactionModel.countDocuments(filterTx).exec();
          console.log(`   Found ${count} transactions to update (not applied; pass --apply to write)`);
        }
      }
    } else {
      console.log("No string categories found.");
    }

    console.log("Migration report:", JSON.stringify(report, null, 2));
  } catch (err) {
    console.error("Error during migration:", err);
    report.errors.push(err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    // print summary
    console.log("=== SUMMARY ===");
    console.log(`totalCategoryOidObjects: ${report.totalCategoryOidObjects}`);
    console.log(`convertedOidToObjectId (would/was): ${report.convertedOidToObjectId}`);
    console.log(`stringCategoryGroups: ${report.totalStringCategoriesFound}`);
    console.log(`createdCategories: ${report.createdCategories.length}`);
    console.log(`updatedTransactionsCount: ${report.updatedTransactionsCount}`);
    if (report.errors.length) console.log("Errors:", report.errors);
  }
}

function escapeRegex(s) {
  return (s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
