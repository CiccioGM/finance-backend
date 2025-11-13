// server/server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import transactionRoutes from "./routes/transactionRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import adminMigrationRoute from "./routes/adminMigrationRoute.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connessione MongoDB
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ ERRORE: MONGO_URI non è definita nelle variabili d'ambiente");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connessione a MongoDB riuscita"))
  .catch((err) => console.error("❌ Errore connessione MongoDB:", err));

// Rotte principali
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);

// Rotta di amministrazione temporanea (migrazione)
app.use("/api/admin", adminMigrationRoute);

// Rotta di test (ping)
app.get("/", (req, res) => {
  res.send("Finance Backend attivo ✅");
});

// Avvio server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su porta ${PORT}`);
});
