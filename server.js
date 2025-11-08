import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Transaction from './models/Transaction.js';

dotenv.config();
const app = express();

app.use(cors());            // consenti richieste dal frontend
app.use(express.json());    // parse JSON body

const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGO_URI;

// connessione a MongoDB
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connesso'))
  .catch(err => {
    console.error('❌ Errore connessione MongoDB:', err?.message || err);
    process.exit(1);
  });

// rotte base
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/transactions', async (req, res) => {
  const txs = await Transaction.find().sort({ date: -1 });
  res.json(txs);
});
app.post('/api/transactions', async (req, res) => {
  try {
    const tx = new Transaction(req.body);
    await tx.save();
    res.status(201).json(tx);
  } catch (e) {
    res.status(400).json({ error: e?.message || 'Bad Request' });
  }
});

app.listen(PORT, () => console.log(`🚀 Server avviato su :${PORT}`));
