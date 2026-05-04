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
  Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { clientService, bookingService } from '../lib/firestoreService';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  remarks: string;
}

export default function Crm() {
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: 'Wedding',
    eventDate: format(new Date(), 'yyyy-MM-dd'),
    price: 0,
    location: '',
    remarks: ''
  });

  useEffect(() => {
    return clientService.subscribe(setClients);
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        // Update existing client
        await clientService.update(editingClient.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          remarks: formData.remarks
        });
        // Note: For a real app, you might also want to update the associated booking if some fields changed.
        // But the user specifically asked for editing inquiries (clients).
      } else {
        // 1. Create client
        const clientRef = await clientService.add({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          remarks: formData.remarks
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
        name: '', email: '', phone: '', eventType: 'Wedding',
        eventDate: format(new Date(), 'yyyy-MM-dd'),
        price: 0, location: '', remarks: ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (client: any) => {
    setEditingClient(client);
    setFormData({
      ...formData,
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      remarks: client.remarks || ''
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({
      name: '', email: '', phone: '', eventType: 'Wedding',
      eventDate: format(new Date(), 'yyyy-MM-dd'),
      price: 0, location: '', remarks: ''
    });
    setIsModalOpen(true);
  };

  const generateInvoice = (client: any) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('LensFlow Photography', 20, 20);
    doc.setFontSize(10);
    doc.text('INVOICE', 160, 20);
    doc.setFontSize(12);
    doc.text('Bill To:', 20, 40);
    doc.text(client.name, 20, 48);
    doc.text('Photography Services', 20, 78);
    doc.line(20, 82, 190, 82);
    doc.save(`Invoice_${client.name}.pdf`);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex justify-between items-end">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Relationship Architecture</span>
          <h1 className="text-4xl font-bold tracking-tighter text-white mt-1">Client Inquiries</h1>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-2.5 bg-bento-accent text-white rounded-xl hover:bg-bento-accent-hover transition-all duration-300 shadow-lg shadow-indigo-500/20"
        >
          <UserPlus size={18} />
          <span className="text-sm font-semibold">New Entry</span>
        </button>
      </header>

      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
          <Search size={18} />
        </div>
        <input 
          type="text"
          placeholder="Filter inquiries..."
          className="w-full pl-12 pr-6 py-4 bg-bento-card border border-bento-border rounded-2xl focus:outline-none focus:border-indigo-500/50 transition-all text-zinc-100 placeholder:text-zinc-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-grow bg-bento-card border border-bento-border rounded-2xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-bento-border">
              <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">Principal</th>
              <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">Channel</th>
              <th className="px-6 py-4 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-20 text-center text-zinc-700 italic text-lg font-medium">
                  No active inquiries found.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
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
                      <p className="text-sm text-zinc-300">{client.email}</p>
                      <p className="text-[10px] text-zinc-500 font-mono italic">{client.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                       <button 
                        onClick={() => openEditModal(client)}
                        className="p-2 bg-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 border border-transparent transition-all"
                        title="Edit Details"
                      >
                        <Edit size={18} />
                      </button>
                       <button 
                        onClick={() => generateInvoice(client)}
                        className="p-2 bg-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 border border-transparent transition-all"
                        title="Generate Invoice"
                      >
                        <FileText size={18} />
                      </button>
                      <button className="p-2 bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-100 transition-all border border-transparent">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-bento-border rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <h2 className="text-2xl font-bold tracking-tight text-white">{editingClient ? 'Edit Inquiry' : 'Add New Inquiry'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleAddClient} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 ml-1">Schedule</label>
                      <input required type="date" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500/50 text-zinc-100" value={formData.eventDate} onChange={(e) => setFormData({...formData, eventDate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 ml-1">Budget ($)</label>
                      <input required type="number" placeholder="1500" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500/50 text-zinc-100" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} />
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
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-zinc-800 rounded-xl font-medium text-zinc-400 hover:bg-zinc-800 transition-colors">Cancel</button>
                  <button type="submit" className="flex-[2] px-6 py-3 bg-bento-accent text-white rounded-xl font-bold hover:bg-bento-accent-hover transition-all shadow-lg shadow-indigo-500/20">
                    {editingClient ? 'Apply Changes' : 'Commit Entry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
