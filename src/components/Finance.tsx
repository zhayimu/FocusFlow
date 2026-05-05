import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wallet, TrendingUp, Calendar, ChevronLeft, ChevronRight, DollarSign, FileText, Download, X, Printer, Camera, Share2, MessageSquare } from 'lucide-react';
import { bookingService } from '../lib/firestoreService';
import { format, parseISO, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, animate, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

function NumberTicker({ value, prefix = "RM " }: { value: number, prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const controls = animate(prevValue.current, value, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for smooth finish
      onUpdate(currentValue) {
        node.textContent = `${prefix}${Math.round(currentValue).toLocaleString()}`;
      },
      onComplete() {
        prevValue.current = value;
      }
    });

    return () => controls.stop();
  }, [value, prefix]);

  return <span ref={ref}>{prefix}{value.toLocaleString()}</span>;
}

function PayslipModal({ onClose, monthlyData }: { onClose: () => void, monthlyData: any[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [data, setData] = useState({
    name: '',
    role: 'Photographer',
    month: format(new Date(), 'MMMM'),
    year: format(new Date(), 'yyyy'),
    basicSalary: '0',
    allowance: '0',
    deduction: '0',
    bonus: '0',
  });

  // Sync basic salary with monthly income data when month changes
  useEffect(() => {
    const selectedMonthShort = data.month.substring(0, 3);
    const monthRecord = monthlyData.find(m => m.name === selectedMonthShort);
    if (monthRecord) {
      setData(prev => ({ ...prev, basicSalary: monthRecord.income.toString() }));
    }
  }, [data.month, monthlyData]);

  const today = new Date();
  const payslipId = `PS-${format(today, 'yyyyMM')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const basic = Number(data.basicSalary) || 0;
  const allow = Number(data.allowance) || 0;
  const bon = Number(data.bonus) || 0;
  const ded = Number(data.deduction) || 0;
  const netPay = basic + allow + bon - ded;

  const contentRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    const element = contentRef.current;
    if (!element) return;
    
    setIsGenerating(true);
    try {
      // Ensure the element is fully rendered and visible
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const clonedContent = clonedDoc.getElementById('payslip-content');
          if (clonedContent) {
            clonedContent.style.width = '800px';
            clonedContent.style.padding = '40px';
            clonedContent.style.margin = '0';
          }
          // Remove problematic OKLCH colors for html2canvas
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            try {
              styleTags[i].innerHTML = styleTags[i].innerHTML.replace(/oklch\([^)]+\)/g, '#71717a');
            } catch (e) {
              console.warn('Failed to patch style tag:', e);
            }
          }

          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            if (el.style) {
              // Forced manual check for common tailwind colors that use oklch
              const computedStyle = window.getComputedStyle(el);
              if (computedStyle.color.includes('oklch')) {
                el.style.setProperty('color', '#18181b', 'important');
              }
              if (computedStyle.backgroundColor.includes('oklch')) {
                el.style.setProperty('background-color', '#ffffff', 'important');
              }
              if (computedStyle.borderColor.includes('oklch')) {
                el.style.setProperty('border-color', '#e4e4e7', 'important');
              }
            }
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const fileName = `Payslip_${data.name.replace(/\s+/g, '_') || 'Employee'}_${data.month}.pdf`;
      
      // Use Blob approach for better compatibility
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again or use the Print button.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm print:p-0 print:bg-white overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full h-full sm:h-[90vh] sm:max-w-5xl sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row overflow-hidden print:shadow-none print:rounded-none"
      >
        {/* Form Controls */}
        <div className="w-full sm:w-80 bg-zinc-50 border-b sm:border-b-0 sm:border-r border-zinc-200 p-6 space-y-6 overflow-y-auto shrink-0 print:hidden">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-900">Payslip Info</h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-400">
               <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recipient Name</label>
              <input 
                type="text" 
                value={data.name}
                onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Staff Full Name"
                className="w-full bg-white border border-zinc-200 p-3 rounded-xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Month</label>
                <select 
                  value={data.month}
                  onChange={e => setData(prev => ({ ...prev, month: e.target.value }))}
                  className="w-full bg-white border border-zinc-200 p-3 rounded-xl text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Year</label>
                <input 
                  type="text" 
                  value={data.year}
                  onChange={e => setData(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full bg-white border border-zinc-200 p-3 rounded-xl text-xs font-bold text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-zinc-200">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Basic Salary (RM)</label>
                <input 
                  type="number" 
                  value={data.basicSalary}
                  onChange={e => setData(prev => ({ ...prev, basicSalary: e.target.value }))}
                  className="w-full bg-white border border-zinc-300 p-3 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Allowance (RM)</label>
                <input 
                  type="number" 
                  value={data.allowance}
                  onChange={e => setData(prev => ({ ...prev, allowance: e.target.value }))}
                  className="w-full bg-white border border-zinc-300 p-3 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bonus (RM)</label>
                <input 
                  type="number" 
                  value={data.bonus}
                  onChange={e => setData(prev => ({ ...prev, bonus: e.target.value }))}
                  className="w-full bg-white border border-zinc-300 p-3 rounded-xl text-xs font-bold text-zinc-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-red-600">Deduction (RM)</label>
                <input 
                  type="number" 
                  value={data.deduction}
                  onChange={e => setData(prev => ({ ...prev, deduction: e.target.value }))}
                  className="w-full bg-white border border-red-200 p-3 rounded-xl text-xs font-bold text-red-600"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button 
              onClick={() => downloadPDF()}
              disabled={isGenerating}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Save PDF
            </button>
            <button 
              onClick={() => window.print()}
              className="w-full py-3 border border-zinc-200 text-zinc-500 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="flex-1 bg-zinc-200/50 p-4 sm:p-12 overflow-y-auto print:p-0 print:bg-white h-full">
          <div 
            id="payslip-content"
            ref={contentRef}
            className="mx-auto bg-white p-8 sm:p-16 space-y-12 shadow-sm sm:shadow-2xl w-full max-w-[800px] min-h-full sm:min-h-[1100px]"
            style={{ backgroundColor: '#ffffff', fontFamily: '"Inter", sans-serif' }}
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}>
                  <Camera size={28} style={{ color: '#ffffff' }} />
                </div>
                <span className="text-3xl font-black tracking-tighter" style={{ color: '#09090b' }}>ZHAYIMUUU</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-bold" style={{ color: '#71717a' }}>{payslipId}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-12 pt-8 border-t border-zinc-100" style={{ borderTopColor: '#f4f4f5' }}>
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#a1a1aa' }}>Employee Details</p>
                <div>
                  <p className="font-bold text-lg" style={{ color: '#09090b' }}>{data.name || '---'}</p>
                  <p className="text-sm mt-1" style={{ color: '#71717a' }}>{data.role}</p>
                </div>
              </div>
              <div className="space-y-4 text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#a1a1aa' }}>Payment Period</p>
                <div>
                  <p className="font-bold text-lg uppercase tracking-tight" style={{ color: '#09090b' }}>{data.month} {data.year}</p>
                  <p className="text-xs font-mono text-indigo-500 font-bold mt-1">Payment Date: {format(today, 'dd MMM yyyy')}</p>
                </div>
              </div>
            </div>

            {/* Earnings Table */}
            <div className="space-y-6">
              <p className="text-[10px] font-bold uppercase tracking-widest border-b pb-2" style={{ color: '#18181b', borderBottomColor: '#09090b' }}>Earnings & Deductions</p>
              
              <div className="space-y-2">
                <div className="flex justify-between py-2 items-center">
                  <span className="text-sm font-medium text-zinc-600">Basic Salary</span>
                  <span className="font-mono text-sm font-bold">RM {basic.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 items-center">
                  <span className="text-sm font-medium text-zinc-600">Allowance</span>
                  <span className="font-mono text-sm font-bold">RM {allow.toLocaleString()}</span>
                </div>
                {bon > 0 && (
                  <div className="flex justify-between py-2 items-center">
                    <span className="text-sm font-medium text-zinc-600">Bonus</span>
                    <span className="font-mono text-sm font-bold">RM {bon.toLocaleString()}</span>
                  </div>
                )}
                {ded > 0 && (
                  <div className="flex justify-between py-2 items-center">
                    <span className="text-sm font-medium text-red-500">Total Deductions</span>
                    <span className="font-mono text-sm font-bold text-red-500">- RM {ded.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="pt-8 border-t-2" style={{ borderTopColor: '#09090b' }}>
              <div className="flex justify-between items-center px-6 py-8 bg-zinc-50 rounded-2xl">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#a1a1aa' }}>Net Payable Amount</p>
                  <p className="text-sm font-bold text-zinc-500 mt-1">Total credit to account</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black" style={{ color: '#4f46e5' }}>RM {netPay.toLocaleString()}</p>
                  <p className="text-[10px] font-mono font-bold mt-1" style={{ color: '#71717a' }}>FOR THE MONTH OF {data.month.toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-12 text-center space-y-4">
              <div className="w-48 h-px bg-zinc-100 mx-auto" />
              <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.3em]">Computer Generated No Signature Required</p>
              <p className="text-[8px] text-zinc-300 italic">This is an official payment advice for photography production services rendered by ZHAYIMUUU.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Finance() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showPayslip, setShowPayslip] = useState(false);

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
    <div className="space-y-6 md:space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Financial Analytics</span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-white mt-1">Income Dashboard</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button 
            onClick={() => setShowPayslip(true)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-2xl text-xs font-bold transition-all"
          >
            <FileText size={16} />
            Generate Payslip
          </button>
          
          <div className="flex flex-nowrap md:flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
            {years.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={cn(
                  "px-4 md:px-6 py-2 rounded-xl text-xs font-bold transition-all",
                  selectedYear === year 
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
          <div className="text-3xl md:text-4xl font-bold text-white mt-1 tracking-tight">
            <NumberTicker value={yearIncome} />
          </div>
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
          <div className="text-3xl md:text-4xl font-bold text-white mt-1 tracking-tight">
            <NumberTicker value={allTimeIncome} />
          </div>
        </div>

        <div className="col-span-1 sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-center">
           <div className="flex items-center gap-3 text-indigo-400 mb-2">
             <Calendar size={18} />
             <span className="text-xs font-bold uppercase tracking-wider">Monthly Projection</span>
           </div>
           <p className="text-sm text-zinc-400 leading-relaxed">
             Average monthly income for {selectedYear} currently stands at <span className="text-white font-bold">RM {Math.round(yearIncome / 12).toLocaleString()}</span>. 
           </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-8 bg-bento-card border border-bento-border rounded-2xl p-5 md:p-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Monthly Distribution</h3>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              REVENUE IN MYR
            </div>
          </div>
          <div className="h-[300px] md:h-[400px] w-full">
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
                  tickFormatter={(value) => `RM ${value}`} 
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
                  formatter={(value: any) => [`RM ${value.toLocaleString()}`, 'Income']}
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

        <div className="col-span-12 lg:col-span-4 bg-bento-card border border-bento-border rounded-2xl p-6 md:p-8 backdrop-blur-md flex flex-col justify-between">
           <div>
             <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-8 md:mb-10">Category Performance</h3>
             <div className="space-y-6 md:space-y-8">
               {categoryDistribution.length === 0 ? (
                 <p className="text-xs text-zinc-600 italic">No category data for this year.</p>
               ) : (
                 categoryDistribution.map((item, index) => (
                   <div key={item.label} className="space-y-3">
                     <div className="flex justify-between items-end">
                       <div className="min-w-0 flex-1">
                         <p className="text-xs font-bold text-white uppercase tracking-wider truncate pb-1">{item.label}</p>
                         <p className="text-[10px] text-zinc-500 font-mono italic">RM {item.amount.toLocaleString()}</p>
                       </div>
                       <span className="text-xs font-mono text-indigo-400 font-bold ml-2">{item.value}%</span>
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

           <div className="mt-10 md:mt-12 p-4 md:p-5 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl">
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

      {/* Transaction View */}
      <div className="bg-bento-card border border-bento-border rounded-[2rem] overflow-hidden backdrop-blur-md">
        <div className="p-6 md:p-8 border-b border-bento-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Revenue Stream</h3>
            <p className="text-xs text-zinc-500 mt-1">Incoming payments for photography services.</p>
          </div>
          <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 text-[10px] font-mono uppercase tracking-widest">
            {bookings.filter(b => b.date.startsWith(selectedYear.toString())).length} Entries
          </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto scrollbar-hide">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/50 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                <th className="px-8 py-4 shrink-0">Client Name</th>
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
                    +RM {Number(book.price).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-zinc-800/50">
          {bookings
            .filter(b => b.date.startsWith(selectedYear.toString()))
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((book) => (
            <div key={book.id} className="p-4 flex justify-between items-center bg-zinc-900/20">
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">{book.clientName}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 bg-zinc-800 rounded text-zinc-400 uppercase font-bold tracking-wider">{book.eventType}</span>
                  <span className="text-[9px] text-zinc-600 font-mono">{book.date}</span>
                </div>
              </div>
              <p className="text-emerald-400 font-black text-sm leading-none">+RM {Number(book.price).toLocaleString()}</p>
            </div>
          ))}
          {bookings.filter(b => b.date.startsWith(selectedYear.toString())).length === 0 && (
            <div className="py-20 text-center">
              <p className="text-zinc-600 font-medium italic">No income records found for {selectedYear}.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showPayslip && (
          <PayslipModal onClose={() => setShowPayslip(false)} monthlyData={monthlyData} />
        )}
      </AnimatePresence>
    </div>
  );
}

