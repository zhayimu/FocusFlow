import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  MapPin, 
  X,
  FileText,
  Edit,
  Trash2,
  Camera,
  Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { clientService, bookingService } from '../lib/firestoreService';

interface Client {
  id: string;
  name: string;
  phone: string;
  remarks: string;
}

export default function Crm() {
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    eventType: 'Wedding',
    eventDate: format(new Date(), 'yyyy-MM-dd'),
    price: 0,
    location: '',
    remarks: ''
  });

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<{id: string, name: string} | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    return clientService.subscribe(setClients);
  }, []);

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    const { id, name } = clientToDelete;
    
    setIsDeleting(id);
    setClientToDelete(null);
    try {
      // 1. Attempt to delete associated bookings (non-blocking for the client record)
      try {
        console.log('Attempting relational cleanup...');
        await bookingService.deleteAllByClientId(id);
      } catch (bookingErr) {
        console.warn('Booking cleanup failed, proceeding with client deletion:', bookingErr);
      }

      // 2. Delete the primary client record
      console.log('Deleting primary client record...');
      await clientService.delete(id);
      
      setSuccessMessage(`Client ${name} has been removed.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('CRITICAL: Failed to delete client:', err);
      let errorMsg = 'Could not delete client.';
      try {
        const parsed = JSON.parse(err.message);
        errorMsg = `Error: ${parsed.error}\nPath: ${parsed.path}\nOp: ${parsed.operationType}\nUID: ${parsed.authInfo?.userId}`;
      } catch {
        errorMsg = err.message || 'Unknown error occurred.';
      }
      alert(`Deletion Failed:\n${errorMsg}\n\nThis usually means you don't have permission to delete this specific record.`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingClient) {
        // Update existing client
        await clientService.update(editingClient.id, {
          name: formData.name,
          phone: formData.phone,
          remarks: formData.remarks,
          // Sync metadata to client record for easy recovery in edit modal
          eventType: formData.eventType,
          eventDate: formData.eventDate,
          price: formData.price,
          location: formData.location
        });
        
        // SYNC: Update client info in their bookings
        await bookingService.updateByClientId(editingClient.id, editingClient.name, {
          clientName: formData.name,
          eventType: formData.eventType,
          date: formData.eventDate,
          price: Number(formData.price),
          location: formData.location,
          remarks: formData.remarks
        });
      } else {
        // 1. Create client
        const clientRef = await clientService.add({
          name: formData.name,
          phone: formData.phone,
          remarks: formData.remarks,
          eventType: formData.eventType,
          eventDate: formData.eventDate,
          price: formData.price,
          location: formData.location
        });

        if (clientRef) {
          // 2. Create initial booking
          await bookingService.add({
            clientId: clientRef.id,
            clientName: formData.name,
            date: formData.eventDate,
            eventType: formData.eventType,
            price: Number(formData.price),
            location: formData.location,
            status: 'Booked',
            remarks: formData.remarks
          });
        }
      }

      setIsModalOpen(false);
      setEditingClient(null);
      setFormData({
        name: '', phone: '', eventType: 'Wedding',
        eventDate: format(new Date(), 'yyyy-MM-dd'),
        price: 0, location: '', remarks: ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (client: any) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      phone: client.phone || '',
      remarks: client.remarks || '',
      eventType: client.eventType || 'Wedding',
      eventDate: client.eventDate || format(new Date(), 'yyyy-MM-dd'),
      price: client.price || 0,
      location: client.location || ''
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({
      name: '', phone: '', eventType: 'Wedding',
      eventDate: format(new Date(), 'yyyy-MM-dd'),
      price: 0, location: '', remarks: ''
    });
    setIsModalOpen(true);
  };

  const [invoiceClient, setInvoiceClient] = useState<any | null>(null);

  const generateInvoice = (client: any) => {
    setInvoiceClient(client);
  };

  const InvoiceModal = ({ client, onClose }: { client: any, onClose: () => void }) => {
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 14);

    const invoiceNumber = `INV-${today.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [isGenerating, setIsGenerating] = useState(false);

    const downloadPDF = async (shouldShare = false) => {
      const element = document.getElementById('invoice-content');
      if (!element) return;
      
      setIsGenerating(true);
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            const styles = clonedDoc.getElementsByTagName('style');
            for (let i = 0; i < styles.length; i++) {
              // Replace oklch() with a fallback hex color to prevent parser crashes
              styles[i].innerHTML = styles[i].innerHTML.replace(/oklch\([^)]+\)/g, '#000000');
            }
          }
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        const fileName = `${invoiceNumber}_${client.name.replace(/\s+/g, '_')}.pdf`;

        if (shouldShare && navigator.share) {
          const pdfBlob = pdf.output('blob');
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
          
          try {
            await navigator.share({
              files: [file],
              title: 'Invoice',
              text: `Hi ${client.name}, here is your invoice ${invoiceNumber}.`
            });
          } catch (shareError) {
            // Fallback to text share if file share fails
            const message = `Hi ${client.name}, this is zhayimuuu. Here is your invoice ${invoiceNumber}. Thank you for choosing zhayimuuu!`;
            const cleanPhone = client.phone.replace(/\D/g, '');
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
          }
        } else {
          pdf.save(fileName);
        }
      } catch (error) {
        console.error('PDF generation failed:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-sm print:p-0 print:bg-white print:backdrop-blur-none">
        <motion.div 
          id="invoice-print-area"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-2xl text-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:shadow-none print:rounded-none print:max-h-none print:static print:w-full print:max-w-none"
        >
          {/* Controls - Hidden during print */}
          <div className="bg-zinc-100 px-8 py-4 flex justify-between items-center border-b border-zinc-200 print:hidden shrink-0">
            <h2 className="font-bold text-zinc-600 uppercase text-xs tracking-widest">Invoice Preview</h2>
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              <button 
                onClick={() => downloadPDF(true)}
                disabled={isGenerating}
                className="px-3 sm:px-4 py-2 bg-[#25D366] text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-[#20ba59] transition-colors flex items-center gap-2"
              >
                {isGenerating ? '...' : 'Share PDF (WA)'}
              </button>
              <button 
                onClick={() => downloadPDF(false)}
                disabled={isGenerating}
                className={cn(
                  "px-3 sm:px-4 py-2 bg-zinc-900 text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-black transition-colors flex items-center gap-2",
                  isGenerating && "opacity-50 cursor-not-allowed"
                )}
              >
                {isGenerating ? '...' : 'Save PDF'}
              </button>
              <button 
                onClick={() => {
                  window.focus();
                  setTimeout(() => window.print(), 100);
                }}
                className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
              >
                Print
              </button>
              <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-500 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Invoice Page Body */}
          <div className="overflow-y-auto print:overflow-visible print:p-0 bg-white" id="invoice-download-area">
            <div id="invoice-content" className="p-6 sm:p-12 space-y-8 sm:space-y-12 bg-white" style={{ backgroundColor: '#ffffff', fontFamily: '"Inter", sans-serif' }}>
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 sm:gap-0" style={{ color: '#18181b' }}>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center" style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}>
                      <Camera size={20} className="sm:w-6 sm:h-6" style={{ color: '#ffffff' }} />
                    </div>
                    <span className="text-xl sm:text-2xl font-black tracking-tighter" style={{ color: '#09090b' }}>ZHAYIMUUU</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-zinc-400 font-mono uppercase tracking-widest leading-relaxed" style={{ color: '#a1a1aa' }}>
                    Imagery Architecture & Production<br />
                    Professional Photography Services
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase mb-2" style={{ color: '#f4f4f5' }}>Invoice</h1>
                  <p className="text-[10px] sm:text-xs font-mono font-bold" style={{ color: '#71717a' }}>{invoiceNumber}</p>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 pt-6 sm:pt-8 border-t border-zinc-100" style={{ borderTopColor: '#f4f4f5' }}>
                <div className="space-y-3 sm:space-y-4">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ color: '#a1a1aa' }}>Bill To</p>
                  <div>
                    <p className="font-bold text-base sm:text-lg" style={{ color: '#09090b' }}>{client.name}</p>
                    <p className="text-xs sm:text-sm mt-1" style={{ color: '#71717a' }}>{client.phone}</p>
                    <p className="text-xs sm:text-sm" style={{ color: '#71717a' }}>{client.location || 'Client Location'}</p>
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4 text-left sm:text-right">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ color: '#a1a1aa' }}>Details</p>
                  <div className="space-y-2">
                    <div className="flex justify-start sm:justify-end gap-4">
                      <span className="text-[10px] sm:text-xs" style={{ color: '#a1a1aa' }}>Invoice Date:</span>
                      <span className="text-[10px] sm:text-xs font-bold font-mono" style={{ color: '#18181b' }}>{format(today, 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex justify-start sm:justify-end gap-4">
                      <span className="text-[10px] sm:text-xs" style={{ color: '#a1a1aa' }}>Due Date:</span>
                      <span className="text-[10px] sm:text-xs font-bold font-mono" style={{ color: '#4f46e5' }}>{format(today.getTime() + 1209600000, 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Table */}
              <div className="space-y-6 pt-6 sm:pt-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[400px] sm:min-w-0">
                    <thead>
                      <tr className="border-b-2 border-zinc-900 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ borderBottomColor: '#09090b' }}>
                        <th className="py-4">Description</th>
                        <th className="py-4 text-center">Service Date</th>
                        <th className="py-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100" style={{ borderColor: '#f4f4f5' }}>
                      <tr className="group">
                        <td className="py-4 sm:py-6">
                          <p className="font-bold text-sm sm:text-base" style={{ color: '#09090b' }}>Photography Session: {client.eventType}</p>
                          <p className="text-[10px] sm:text-xs mt-1 italic" style={{ color: '#71717a' }}>{client.remarks || 'Standard production and retouching'}</p>
                        </td>
                        <td className="py-4 sm:py-6 text-center text-xs font-mono" style={{ color: '#71717a' }}>
                          {client.eventDate ? format(parseISO(client.eventDate), 'dd MMM yyyy') : 'N/A'}
                        </td>
                        <td className="py-4 sm:py-6 text-right font-bold text-sm sm:text-base" style={{ color: '#09090b' }}>
                          RM {Number(client.price).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end pt-6 sm:pt-8">
                <div className="w-full sm:w-64 space-y-3 sm:space-y-4">
                  <div className="flex justify-between" style={{ color: '#71717a' }}>
                    <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold">Subtotal</span>
                    <span className="text-[10px] sm:text-xs font-mono font-bold">RM {Number(client.price).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: '#71717a' }}>
                    <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold">Tax (0%)</span>
                    <span className="text-[10px] sm:text-xs font-mono font-bold">RM 0.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 sm:pt-4 border-t-2" style={{ borderTopColor: '#09090b' }}>
                    <span className="text-xs sm:text-sm font-black uppercase tracking-widest" style={{ color: '#09090b' }}>Total Due</span>
                    <span className="text-lg sm:text-xl font-black" style={{ color: '#4f46e5' }}>RM {Number(client.price).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-20 text-center space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#a1a1aa' }}>Thank you for your business</p>
                <div className="flex justify-center gap-6 text-[9px] font-mono" style={{ color: '#a1a1aa' }}>
                  <span>zaimzaidi04@gmail.com</span>
                  <span>•</span>
                  <span>www.zhayimuuu.my</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-4 md:space-y-8 h-full flex flex-col">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Relationship Architecture</span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-white mt-1">Clients</h1>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="hidden md:block px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium rounded-xl"
              >
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={openAddModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-bento-accent text-white rounded-xl hover:bg-bento-accent-hover transition-all duration-300 shadow-lg shadow-indigo-500/20"
          >
            <UserPlus size={18} />
            <span className="text-sm font-semibold">New Entry</span>
          </button>
        </div>
      </header>

      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
          <Search size={18} />
        </div>
        <input 
          type="text"
          placeholder="Filter inquiries..."
          className="w-full pl-12 pr-6 py-3 md:py-4 bg-bento-card border border-bento-border rounded-2xl focus:outline-none focus:border-indigo-500/50 transition-all text-zinc-100 placeholder:text-zinc-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block flex-grow bg-bento-card border border-bento-border rounded-2xl overflow-auto scrollbar-hide min-h-0 backdrop-blur-md shadow-inner">
        <table className="w-full text-left border-collapse relative">
          <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-bento-border">
            <tr>
              <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">Principal</th>
              <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">Channel</th>
              <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {paginatedClients.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-20 text-center text-zinc-700 italic text-lg font-medium">
                  No active inquiries found.
                </td>
              </tr>
            ) : (
              paginatedClients.map((client) => (
                <tr key={client.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-sm">
                        {client.name.charAt(0)}
                      </div>
                      <p className="font-semibold text-zinc-100">{client.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="text-[12px] text-zinc-300 font-mono italic">{client.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                       <button 
                        onClick={() => openEditModal(client)}
                        className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-zinc-800 transition-all active:scale-95"
                        title="Edit Details"
                      >
                        <Edit size={18} />
                      </button>
                       <button 
                        onClick={() => generateInvoice(client)}
                        className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-zinc-800 transition-all active:scale-95"
                        title="Generate Invoice"
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        onClick={() => setClientToDelete({id: client.id, name: client.name})}
                        disabled={isDeleting === client.id}
                        className={cn(
                          "p-2 bg-zinc-900 border border-zinc-800 rounded-lg transition-all active:scale-95",
                          isDeleting === client.id 
                            ? "opacity-50 cursor-not-allowed text-zinc-600" 
                            : "text-zinc-500 hover:text-red-400 hover:border-red-500/50 hover:bg-zinc-800"
                        )}
                        title="Delete Inquiry"
                      >
                        {isDeleting === client.id ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          >
                            <MoreHorizontal size={18} />
                          </motion.div>
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex-grow overflow-y-auto scrollbar-hide space-y-4 pb-4">
        {paginatedClients.length === 0 ? (
          <div className="py-20 text-center text-zinc-700 italic text-lg font-medium bg-bento-card border border-bento-border rounded-2xl">
            No active inquiries found.
          </div>
        ) : (
          paginatedClients.map((client) => (
            <div key={client.id} className="bg-bento-card border border-bento-border rounded-2xl p-5 space-y-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-sm">
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100">{client.name}</p>
                    <div className="flex items-center gap-2 text-[11px] font-mono italic">
                      <span className="text-zinc-300">{client.phone}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-indigo-400 font-bold">RM {client.price || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => generateInvoice(client)}
                    className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 active:text-indigo-400"
                    title="Generate Invoice"
                  >
                    <FileText size={18} />
                  </button>
                  <button 
                    onClick={() => openEditModal(client)}
                    className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 active:text-indigo-400"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => setClientToDelete({id: client.id, name: client.name})}
                    className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 active:text-red-400"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              {client.remarks && (
                <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                  <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">Remarks</p>
                  <p className="text-xs text-zinc-400 italic line-clamp-2 leading-relaxed">"{client.remarks}"</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 px-2 py-4 border-t border-zinc-800 shrink-0">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredClients.length)} of {filteredClients.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={cn(
                "px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold transition-all",
                currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:text-white hover:border-zinc-600"
              )}
            >
              Previous
            </button>
            <div className="text-xs font-bold text-zinc-400 font-mono">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                "px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold transition-all",
                currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:text-white hover:border-zinc-600"
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-bento-border rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">{editingClient ? 'Edit' : 'New Entry'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleAddClient} className="p-6 md:p-8 space-y-6 overflow-y-auto scrollbar-hide">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 ml-1">Client Name</label>
                      <input required type="text" placeholder="John Doe" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500/50 text-zinc-100" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 ml-1">Assignment</label>
                       <select className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500/50 text-zinc-100 appearance-none" value={formData.eventType} onChange={(e) => setFormData({...formData, eventType: e.target.value})}>
                        <option>Wedding</option><option>Convocation</option><option>Portrait</option><option>Commercial</option><option>Event</option>
                       </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 ml-1">Phone Link</label>
                     <input required type="tel" placeholder="+60 12-345 6789" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500/50 text-zinc-100" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 ml-1">Schedule</label>
                      <input required type="date" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500/50 text-zinc-100 placeholder-zinc-500" value={formData.eventDate} onChange={(e) => setFormData({...formData, eventDate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 ml-1">Budget (RM)</label>
                      <input required type="number" placeholder="2500" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500/50 text-zinc-100" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 ml-1">Architecture (Location)</label>
                    <input type="text" placeholder="Venue or city" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500/50 text-zinc-100" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 ml-1">Notes & Metadata</label>
                    <textarea rows={3} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500/50 text-zinc-100 resize-none" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-3 pt-4 sm:static sticky bottom-0 bg-zinc-900 pb-2 sm:pb-0">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="hidden sm:block flex-1 px-6 py-3 border border-zinc-800 rounded-xl font-medium text-zinc-400 hover:bg-zinc-800 transition-colors">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={cn(
                      "flex-1 sm:flex-[2] px-6 py-4 sm:py-3 bg-bento-accent text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95",
                      isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-bento-accent-hover"
                    )}
                  >
                    {isSaving ? 'Processing...' : (editingClient ? 'Apply Changes' : 'Commit Entry')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {clientToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setClientToDelete(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-red-500/20 rounded-3xl overflow-hidden shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Delete Inquiry?</h2>
              <p className="text-sm text-zinc-400 mb-8">
                Are you sure you want to delete <strong className="text-white">{clientToDelete.name}</strong>? This action will permanently remove the client and all associated bookings.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setClientToDelete(null)}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteClient}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {invoiceClient && (
          <InvoiceModal 
            client={invoiceClient} 
            onClose={() => setInvoiceClient(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
