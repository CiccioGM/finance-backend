import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import Transaction from "./models/Transaction.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Porta
const PORT = process.env.PORT || 5000;

// Connessione MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connesso"))
  .catch((err) => {
    console.error("❌ Errore connessione MongoDB:", err?.message || err);
    process.exit(1);
  });

// ✅ HOMEPAGE TEMPORANEA (root)
app.get("/", (req, res) => {
  res.send(`
    <h1>✅ Finance Backend API</h1>
    <p>Il server è attivo e funzionante.</p>
    <p>Endpoint disponibili:</p>
    <ul>
      <li><a href="/api/health">/api/health</a></li>
      <li><a href="/api/transactions">/api/transactions</a></li>
    </ul>
  `);
});

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ✅ API: ottieni tutte le transazioni
app.get("/api/transactions", async (req, res) => {
  const txs = await Transaction.find().sort({ date: -1 });
  res.json(txs);
});

// ✅ API: crea una nuova transazione
app.post("/api/transactions", async (req, res) => {
  try {
    const tx = new Transaction(req.body);
    await tx.save();
    res.status(201).json(tx);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Errore creazione transazione" });
  }
});

// Avvio server
app.listen(PORT, () =>
  console.log(`🚀 Server avviato su http://localhost:${PORT}`)
);
