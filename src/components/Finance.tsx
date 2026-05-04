import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, CreditCard, Download } from 'lucide-react';
import { expenseService, bookingService } from '../lib/firestoreService';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth } from 'date-fns';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function Finance() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const unsubExpenses = expenseService.subscribe(setExpenses);
    const unsubBookings = bookingService.subscribe(setBookings);
    return () => { unsubExpenses(); unsubBookings(); };
  }, []);

  const totalRevenue = bookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Chart Data Preparation
  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  }).map(month => {
    const monthStr = format(month, 'MMM');
    const monthlyRevenue = bookings
      .filter(b => isSameMonth(new Date(b.date), month))
      .reduce((acc, b) => acc + (Number(b.price) || 0), 0);
    const monthlyExpenses = expenses
      .filter(e => isSameMonth(new Date(e.date), month))
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    
    return {
      name: monthStr,
      revenue: monthlyRevenue,
      expenses: monthlyExpenses,
      profit: monthlyRevenue - monthlyExpenses
    };
  });

  return (
    <div className="space-y-8 pb-12">
      <header>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Financial Architecture</span>
        <h1 className="text-4xl font-bold tracking-tighter text-white mt-1">Monetary Ledger</h1>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bento-card border border-bento-border rounded-2xl p-6 backdrop-blur-md">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-mono text-emerald-500 font-bold">+12.5%</span>
          </div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Gross Revenue</p>
          <p className="text-3xl font-bold text-white mt-1">${totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-bento-card border border-bento-border rounded-2xl p-6 backdrop-blur-md">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <ArrowDownRight size={20} />
            </div>
            <span className="text-[10px] font-mono text-rose-500 font-bold">-4.2%</span>
          </div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Total Expenses</p>
          <p className="text-3xl font-bold text-white mt-1">${totalExpenses.toLocaleString()}</p>
        </div>

        <div className="bg-bento-card border border-bento-border rounded-2xl p-6 backdrop-blur-md bg-indigo-600/5 ring-1 ring-indigo-500/20">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Wallet size={20} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-400 font-bold">
               <ArrowUpRight size={12} /> MARGIN
            </div>
          </div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Net Profit</p>
          <p className="text-3xl font-bold text-white mt-1">${netProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-bento-card border border-bento-border rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-8">Revenue vs Expenses</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last6Months}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fill="transparent" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-bento-card border border-bento-border rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-8">Performance Distribution</h3>
           <div className="space-y-6">
              {[
                { label: 'Wedding Services', value: 65, color: 'bg-indigo-500' },
                { label: 'Corporate Events', value: 20, color: 'bg-emerald-500' },
                { label: 'Portrait Sessions', value: 15, color: 'bg-amber-500' },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-medium">{item.label}</span>
                    <span className="text-white font-bold">{item.value}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
           </div>
           
           <div className="mt-12 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Growth Forecast</p>
              <p className="text-sm text-zinc-300 mt-2">Predicted +8% increase in Q3 based on seasonal wedding trends.</p>
           </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-bento-card border border-bento-border rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-6 border-b border-bento-border flex justify-between items-center">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Recent Cash Flow</h3>
          <button className="text-xs font-mono text-zinc-500 hover:text-white transition-colors flex items-center gap-2">
            <Download size={14} /> EXPORT CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/50 text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {expenses.slice(0, 5).map((exp) => (
                <tr key={exp.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-white">{exp.description}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] px-2 py-1 bg-zinc-800 rounded-full text-zinc-400 font-mono">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500">{exp.date}</td>
                  <td className="px-6 py-4 text-right text-rose-400 font-bold">-${Number(exp.amount).toLocaleString()}</td>
                </tr>
              ))}
              {bookings.slice(0, 3).map((book) => (
                <tr key={book.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-white">{book.clientName} (Revenue)</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] px-2 py-1 bg-emerald-500/10 rounded-full text-emerald-400 font-mono">
                      Booking
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500">{book.date}</td>
                  <td className="px-6 py-4 text-right text-emerald-400 font-bold">+${Number(book.price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
