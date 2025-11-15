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

// Connessione MongoDB
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("MONGODB_URI non impostata nelle variabili di ambiente");
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Connesso a MongoDB");
  })
  .catch((err) => {
    console.error("Errore connessione MongoDB:", err.message);
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
