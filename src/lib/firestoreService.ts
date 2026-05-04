import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Clients API
export const clientService = {
  async add(data: any) {
    const path = 'clients';
    try {
      return await addDoc(collection(db, path), {
        ...data,
        userId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, path); }
  },
  
  subscribe(callback: (data: any[]) => void) {
    const path = 'clients';
    if (!auth.currentUser) return () => {};
    const q = query(
      collection(db, path), 
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (e) => handleFirestoreError(e, OperationType.GET, path));
  },

  async update(id: string, data: any) {
    const path = `clients/${id}`;
    try {
      const docRef = doc(db, 'clients', id);
      await updateDoc(docRef, data);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, path); }
  },

  async delete(id: string) {
    const path = `clients/${id}`;
    try {
      const docRef = doc(db, 'clients', id);
      await deleteDoc(docRef);
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, path); }
  }
};

// Bookings API
export const bookingService = {
  async add(data: any) {
    const path = 'bookings';
    try {
      return await addDoc(collection(db, path), {
        ...data,
        userId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, path); }
  },

  async update(id: string, data: any) {
    const path = `bookings/${id}`;
    try {
      const docRef = doc(db, 'bookings', id);
      await updateDoc(docRef, data);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, path); }
  },

  subscribe(callback: (data: any[]) => void) {
    const path = 'bookings';
    if (!auth.currentUser) return () => {};
    const q = query(
      collection(db, path), 
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (e) => handleFirestoreError(e, OperationType.GET, path));
  },

  async delete(id: string) {
    const path = `bookings/${id}`;
    try {
      const docRef = doc(db, 'bookings', id);
      await deleteDoc(docRef);
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, path); }
  },

  async deleteAllByClientId(clientId: string) {
    try {
      if (!auth.currentUser) return;
      
      // 1. Get all bookings for this client (using only clientId for simpler indexing)
      const bookingsQuery = query(
        collection(db, 'bookings'), 
        where('clientId', '==', clientId)
      );
      const bookingSnapshot = await getDocs(bookingsQuery);
      // Filter by userId client-side as a fallback/safety measure
      const userBookings = bookingSnapshot.docs.filter(d => d.data().userId === auth.currentUser?.uid);
      const bookingIds = userBookings.map(d => d.id);
      
      if (bookingIds.length > 0) {
        // 2. Delete payments associated with these bookings
        for (let i = 0; i < bookingIds.length; i += 10) {
          const chunk = bookingIds.slice(i, i + 10);
          const pq = query(collection(db, 'payments'), where('bookingId', 'in', chunk));
          const pSnapshot = await getDocs(pq);
          const pDeletions = pSnapshot.docs.map(d => deleteDoc(doc(db, 'payments', d.id)));
          await Promise.all(pDeletions);
        }

        // 3. Delete the bookings themselves
        const deletions = userBookings.map(d => deleteDoc(doc(db, 'bookings', d.id)));
        await Promise.all(deletions);
      }
    } catch (e) { 
      console.error('Relational delete failed:', e);
      // We don't throw heroically here because we want the client delete to proceed even if cleanup fails
    }
  },

  async updateByClientId(clientId: string, data: any) {
    const path = 'bookings';
    try {
      if (!auth.currentUser) return;
      const q = query(
        collection(db, path), 
        where('clientId', '==', clientId),
        where('userId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map(d => updateDoc(doc(db, 'bookings', d.id), data));
      await Promise.all(updates);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, path); }
  }
};

// Expenses API
export const expenseService = {
  async add(data: any) {
    const path = 'expenses';
    try {
      return await addDoc(collection(db, path), {
        ...data,
        userId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, path); }
  },

  subscribe(callback: (data: any[]) => void) {
    const path = 'expenses';
    if (!auth.currentUser) return () => {};
    const q = query(
      collection(db, path), 
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (e) => handleFirestoreError(e, OperationType.GET, path));
  }
};
