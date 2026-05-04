import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Plus, Filter, Download, DollarSign, Tag, Calendar as CalendarIcon 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { expenseService, bookingService } from '../lib/firestoreService';

export default function Finance() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', category: 'Travel', date: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => {
    const unsubExpenses = expenseService.subscribe(setExpenses);
    const unsubBookings = bookingService.subscribe(setBookings);
    return () => { unsubExpenses(); unsubBookings(); };
  }, []);

  const totalIncome = bookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await expenseService.add({
      amount: Number(expenseForm.amount),
      description: expenseForm.description,
      category: expenseForm.category,
      date: expenseForm.date
    });
    setExpenseForm({ amount: '', description: '', category: 'Travel', date: format(new Date(), 'yyyy-MM-dd') });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
       <header className="flex justify-between items-end">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Financial Reporting</span>
          <h1 className="text-4xl font-bold tracking-tighter text-white mt-1">Earnings & Ledger</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-800 hover:text-white transition-all shadow-xl">
          <Plus size={18} /><span className="text-sm font-bold">Record Debit</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl backdrop-blur-md">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-4">Gross Revenue</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold tracking-tight italic text-white">${totalIncome.toLocaleString()}</p>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><TrendingUp size={16} /></div>
          </div>
        </div>
        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl backdrop-blur-md">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-4">Total Debit</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold tracking-tight italic text-white">${totalExpenses.toLocaleString()}</p>
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"><TrendingDown size={16} /></div>
          </div>
        </div>
        <div className="p-8 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/60 mb-4 font-bold">Net Yield</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold tracking-tight italic text-white">${netProfit.toLocaleString()}</p>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"><DollarSign size={16} /></div>
          </div>
        </div>
      </div>

      <div className="flex-grow bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-md bottom-0">
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/30">
          <h3 className="font-bold text-[11px] uppercase tracking-widest text-zinc-500">Transaction History</h3>
        </div>
        <div className="divide-y divide-zinc-800 h-full overflow-y-auto pb-20">
          {expenses.map((e) => (
            <div key={e.id} className="px-6 py-5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-500/5 border border-red-500/10 text-red-400 flex items-center justify-center"><TrendingDown size={18} /></div>
                <div><p className="font-semibold text-sm text-zinc-200">{e.description}</p><p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">{e.category} • {e.date}</p></div>
              </div>
              <p className="font-mono font-bold text-red-400">-${Number(e.amount).toLocaleString()}</p>
            </div>
          ))}
          {bookings.map((b) => (
             <div key={b.id} className="px-6 py-5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 flex items-center justify-center"><TrendingUp size={18} /></div>
                <div><p className="font-semibold text-sm text-zinc-200">Ref: {b.clientName}</p><p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">{b.eventType} • {b.date}</p></div>
              </div>
              <p className="font-mono font-bold text-emerald-400">+${Number(b.price).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Record Expense</h2>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <input required type="number" placeholder="Value ($)" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                <input required type="text" placeholder="Description of Debit" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} />
                <select className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 appearance-none" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                  <option>Gear</option><option>Travel</option><option>Maintenance</option><option>Software</option><option>Marketing</option>
                </select>
                <input type="date" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                <button type="submit" className="w-full py-3 bg-bento-accent text-white rounded-xl font-bold hover:bg-bento-accent-hover transition-all mt-4">Commit Debit Entry</button>
              </form>
            </div>
         </div>
      )}
    </div>
  );
}
