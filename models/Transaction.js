import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'Uncategorized' },
  amount: { type: Number, required: true }, // positivo=entrata, negativo=uscita
  account: { type: String, default: 'Default' },
  method: { type: String, default: 'Card' }
}, { timestamps: true });

export default mongoose.models.Transaction
  || mongoose.model('Transaction', transactionSchema);
