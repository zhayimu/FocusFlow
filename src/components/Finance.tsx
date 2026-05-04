import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, Calendar, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { bookingService } from '../lib/firestoreService';
import { format, parseISO, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function Finance() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    return bookingService.subscribe(setBookings);
  }, []);

  const years = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear());
    bookings.forEach(b => {
      const year = new Date(b.date).getFullYear();
      if (!isNaN(year)) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [bookings]);

  const yearIncome = useMemo(() => {
    return bookings
      .filter(b => new Date(b.date).getFullYear() === selectedYear)
      .reduce((acc, b) => acc + (Number(b.price) || 0), 0);
  }, [bookings, selectedYear]);

  const allTimeIncome = useMemo(() => {
    return bookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
  }, [bookings]);

  // Chart Data Preparation (12 months of selected year)
  const monthlyData = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
    
    return eachMonthOfInterval({
      start: yearStart,
      end: yearEnd
    }).map(month => {
      const monthStr = format(month, 'MMM');
      const income = bookings
        .filter(b => isSameMonth(parseISO(b.date), month))
        .reduce((acc, b) => acc + (Number(b.price) || 0), 0);
      
      return {
        name: monthStr,
        income: income,
      };
    });
  }, [bookings, selectedYear]);

  // Category Distribution for selected year
  const categoryDistribution = useMemo(() => {
    const yearBookings = bookings.filter(b => new Date(b.date).getFullYear() === selectedYear);
    const total = yearBookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
    if (total === 0) return [];

    const distribution: Record<string, number> = {};
    yearBookings.forEach(b => {
      const cat = b.eventType || 'Other';
      distribution[cat] = (distribution[cat] || 0) + (Number(b.price) || 0);
    });

    return Object.entries(distribution)
      .map(([label, value]) => ({
        label,
        value: Math.round((value / total) * 100),
        amount: value
      }))
      .sort((a, b) => b.value - a.value);
  }, [bookings, selectedYear]);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Financial Analytics</span>
          <h1 className="text-4xl font-bold tracking-tighter text-white mt-1">Income Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl">
          {years.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold transition-all",
                selectedYear === year 
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-bento-card border border-bento-border rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <TrendingUp size={20} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/5 px-2 py-0.5 rounded-full">
               ANNUAL
            </div>
          </div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Total Income ({selectedYear})</p>
          <p className="text-4xl font-bold text-white mt-1 tracking-tight">${yearIncome.toLocaleString()}</p>
        </div>

        <div className="bg-bento-card border border-bento-border rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Wallet size={20} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded-full">
               LIFETIME
            </div>
          </div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">All-Time Income</p>
          <p className="text-4xl font-bold text-white mt-1 tracking-tight">${allTimeIncome.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-center">
           <div className="flex items-center gap-3 text-indigo-400 mb-2">
             <Calendar size={18} />
             <span className="text-xs font-bold uppercase tracking-wider">Monthly Projection</span>
           </div>
           <p className="text-sm text-zinc-400 leading-relaxed">
             Average monthly income for {selectedYear} currently stands at <span className="text-white font-bold">${Math.round(yearIncome / 12).toLocaleString()}</span>. 
           </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-bento-card border border-bento-border rounded-2xl p-8 backdrop-blur-md">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Monthly Income Distribution</h3>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              REVENUE IN USD
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280" 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(value) => `$${value}`} 
                />
                <Tooltip 
                  cursor={{ stroke: '#4f46e5', strokeWidth: 1 }}
                  contentStyle={{ 
                    backgroundColor: '#09090b', 
                    border: '1px solid #27272a', 
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                  labelStyle={{ fontSize: '10px', color: '#71717a', marginBottom: '4px', textTransform: 'uppercase' }}
                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'Income']}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-bento-card border border-bento-border rounded-2xl p-8 backdrop-blur-md flex flex-col justify-between">
           <div>
             <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-10">Category Performance</h3>
             <div className="space-y-8">
               {categoryDistribution.length === 0 ? (
                 <p className="text-xs text-zinc-600 italic">No category data for this year.</p>
               ) : (
                 categoryDistribution.map((item, index) => (
                   <div key={item.label} className="space-y-3">
                     <div className="flex justify-between items-end">
                       <div>
                         <p className="text-xs font-bold text-white uppercase tracking-wider">{item.label}</p>
                         <p className="text-[10px] text-zinc-500 font-mono mt-1">${item.amount.toLocaleString()}</p>
                       </div>
                       <span className="text-xs font-mono text-indigo-400 font-bold">{item.value}%</span>
                     </div>
                     <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${item.value}%` }}
                         transition={{ duration: 1, delay: index * 0.1 }}
                         className="h-full bg-indigo-500 rounded-full"
                       />
                     </div>
                   </div>
                 ))
               )}
             </div>
           </div>

           <div className="mt-12 p-5 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl">
              <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-[0.2em] mb-2 font-bold text-center">Efficiency Insight</p>
              <p className="text-xs text-zinc-400 leading-relaxed text-center">
                {categoryDistribution[0] 
                  ? `${categoryDistribution[0].label} is your leading revenue generator at ${categoryDistribution[0].value}% of total annual income.`
                  : "Start logging bookings to see performance insights here."
                }
              </p>
           </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-bento-card border border-bento-border rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl shadow-black/50">
        <div className="p-8 border-b border-bento-border flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Revenue Stream</h3>
            <p className="text-xs text-zinc-500 mt-1">Incoming payments for photography services.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 text-xs font-mono">
            {bookings.filter(b => b.date.startsWith(selectedYear.toString())).length} Entries
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/50 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                <th className="px-8 py-4">Client Name</th>
                <th className="px-8 py-4">Type</th>
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4 text-right">Income</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {bookings
                .filter(b => b.date.startsWith(selectedYear.toString()))
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((book) => (
                <tr key={book.id} className="hover:bg-zinc-800/30 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <DollarSign size={14} />
                      </div>
                      <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        {book.clientName}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] px-3 py-1 bg-zinc-800/50 rounded-full text-zinc-500 font-bold tracking-tighter uppercase">
                      {book.eventType}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs text-zinc-500 font-mono">{book.date}</td>
                  <td className="px-8 py-5 text-right text-white font-black text-sm">
                    +${Number(book.price).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.filter(b => b.date.startsWith(selectedYear.toString())).length === 0 && (
            <div className="py-20 text-center">
              <p className="text-zinc-600 font-medium italic">No income records found for {selectedYear}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

