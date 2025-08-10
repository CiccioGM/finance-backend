import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Transaction from './models/Transaction.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connesso'))
  .catch(err => console.error('❌ Errore connessione Mongo', err));

app.get('/api/transactions', async (req, res) => {
  const txs = await Transaction.find().sort({ date: -1 });
  res.json(txs);
});

app.post('/api/transactions', async (req, res) => {
  const tx = new Transaction(req.body);
  await tx.save();
  res.json(tx);
});

app.listen(PORT, () => console.log(`🚀 Server avviato su ${PORT}`));
