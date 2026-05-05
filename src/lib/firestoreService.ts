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
      
      const bookingsQuery = query(
        collection(db, 'bookings'), 
        where('clientId', '==', clientId),
        where('userId', '==', auth.currentUser.uid)
      );
      const bookingSnapshot = await getDocs(bookingsQuery);
      const bookingIds = bookingSnapshot.docs.map(d => d.id);
      
      if (bookingIds.length > 0) {
        const pq = query(
          collection(db, 'payments'), 
          where('userId', '==', auth.currentUser.uid)
        );
        const pSnapshot = await getDocs(pq);
        const paymentsToDelete = pSnapshot.docs.filter(d => bookingIds.includes(d.data().bookingId));
        
        const pDeletions = paymentsToDelete.map(d => deleteDoc(doc(db, 'payments', d.id)));
        await Promise.all(pDeletions);

        const deletions = bookingSnapshot.docs.map(d => deleteDoc(doc(db, 'bookings', d.id)));
        await Promise.all(deletions);
      }
    } catch (e) { 
      console.error('Relational delete failed:', e);
      // We don't throw heroically here because we want the client delete to proceed even if cleanup fails
    }
  },

  async updateByClientId(clientId: string, oldClientName: string | null, data: any) {
    const path = 'bookings';
    try {
      if (!auth.currentUser) return;
      const q = query(
        collection(db, path), 
        where('userId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const toUpdate = snapshot.docs.filter(d => 
        d.data().clientId === clientId || 
        (oldClientName && d.data().clientName === oldClientName)
      );
      const updates = toUpdate.map(d => updateDoc(doc(db, 'bookings', d.id), data));
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
