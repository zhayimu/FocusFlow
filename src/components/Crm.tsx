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
  Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
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
        await bookingService.updateByClientId(editingClient.id, {
          clientName: formData.name,
          eventType: formData.eventType,
          date: formData.eventDate,
          price: Number(formData.price),
          location: formData.location
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

  const generateInvoice = (client: any) => {
    console.log('Generating invoice feature temporarily disabled for compatibility.', client.name);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex justify-between items-end">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Relationship Architecture</span>
          <h1 className="text-4xl font-bold tracking-tighter text-white mt-1">Clients</h1>
        </div>
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium rounded-xl"
              >
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-6 py-2.5 bg-bento-accent text-white rounded-xl hover:bg-bento-accent-hover transition-all duration-300 shadow-lg shadow-indigo-500/20"
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
          className="w-full pl-12 pr-6 py-4 bg-bento-card border border-bento-border rounded-2xl focus:outline-none focus:border-indigo-500/50 transition-all text-zinc-100 placeholder:text-zinc-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-grow bg-bento-card border border-bento-border rounded-2xl overflow-auto min-h-0 backdrop-blur-md shadow-inner">
        <table className="w-full text-left border-collapse relative">
          <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-bento-border">
            <tr>
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
                        onClick={() => window.print()}
                        className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-zinc-800 transition-all active:scale-95"
                        title="Print Report"
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
                    <div className="space-y-2 col-span-2">
                       <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 ml-1">Phone Link</label>
                       <input required type="tel" placeholder="+60 12-345 6789" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500/50 text-zinc-100" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
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
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={cn(
                      "flex-[2] px-6 py-3 bg-bento-accent text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95",
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
    </div>
  );
}
