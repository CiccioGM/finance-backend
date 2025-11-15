// src/server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import transactionRoutes from "./routes/transactionRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 🔑 Leggiamo la stringa di connessione da più nomi possibili
const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.MONGO_URL;

if (!mongoUri) {
  console.error(
    "❌ Nessuna variabile di connessione MongoDB trovata. " +
      "Imposta MONGODB_URI (o MONGO_URI / MONGO_URL) nelle variabili di ambiente."
  );
} else {
  console.log("Tentativo connessione MongoDB con URI:", mongoUri);
}

// Connessione MongoDB
mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 10000, // 10 secondi
  })
  .then(() => {
    console.log("✅ Connesso a MongoDB");
  })
  .catch((err) => {
    console.error(
      "❌ Errore connessione MongoDB:",
      err?.message || err.toString()
    );
  });

// Rotte API
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/budgets", budgetRoutes);

// Homepage semplice
app.get("/", (req, res) => {
  res.send("Backend Gestione Finanze attivo");
});

// Avvio server
app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});
