import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS, INITIAL_BALANCE } from '../constants';
import { auth, db, googleProvider } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

const handleFirestoreError = (error, operationType, path) => {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isAuthenticated = !!currentUser;

  useEffect(() => {
    let unsubDoc = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setCurrentUser({
              uid: user.uid,
              ...userDoc.data()
            });
          } else {
            const newUser = {
              uid: user.uid,
              name: user.displayName || 'User',
              email: user.email || '',
              phoneNumber: user.phoneNumber || '',
              balance: INITIAL_BALANCE,
              joinDate: new Date().toISOString(),
              fundTransactions: []
            };
            await setDoc(userDocRef, newUser);
            setCurrentUser(newUser);
          }

          // Set up real-time listener
          unsubDoc = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              setCurrentUser({
                uid: user.uid,
                ...doc.data()
              });
            }
          }, (err) => {
            if (err.code === 'permission-denied') {
              console.warn("Permission denied for user document. This is expected during sign-out.");
              return;
            }
            console.error("Firestore Snapshot Error:", err);
          });
        } catch (err) {
          console.error("Auth Initialization Error:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const login = async (email, password) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setCurrentUser({ uid: user.uid, ...userDoc.data() });
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const signup = async (name, email, password) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      
      const newUser = {
        uid: user.uid,
        name,
        email,
        balance: INITIAL_BALANCE,
        joinDate: new Date().toISOString(),
        fundTransactions: []
      };
      try {
        await setDoc(doc(db, 'users', user.uid), newUser);
        setCurrentUser(newUser);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        setCurrentUser({ uid: user.uid, ...userDoc.data() });
      } else {
        const newUser = {
          uid: user.uid,
          name: user.displayName || 'User',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          balance: INITIAL_BALANCE,
          joinDate: new Date().toISOString(),
          fundTransactions: []
        };
        await setDoc(userDocRef, newUser);
        setCurrentUser(newUser);
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const setupRecaptcha = (containerId) => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  };

  const sendOtp = async (phoneNumber, containerId) => {
    try {
      setupRecaptcha(containerId);
      const appVerifier = window.recaptchaVerifier;
      window.confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const verifyOtp = async (otp) => {
    try {
      await window.confirmationResult.confirm(otp);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateBalance = async (amount, type = 'trade') => {
    if (!currentUser) return;
    
    const newBalance = currentUser.balance + amount;
    const newTransaction = {
      id: Date.now().toString(),
      amount: Math.abs(amount),
      type: amount >= 0 ? 'deposit' : 'withdraw',
      category: type,
      date: new Date().toISOString(),
      balanceAfter: newBalance
    };

    const updatedTransactions = [newTransaction, ...(currentUser.fundTransactions || [])];
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        balance: newBalance,
        fundTransactions: updatedTransactions
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const resetAccount = async () => {
    if (!currentUser) return;
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        balance: INITIAL_BALANCE,
        fundTransactions: []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const updateProfileData = async (data) => {
    if (!currentUser) return;
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), data);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
      return { success: false, message: error.message };
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="card max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-2xl font-bold">Authentication Error</h2>
          <p className="text-text-secondary">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary w-full py-3">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user: currentUser, 
      isAuthenticated, 
      loading,
      login, 
      logout, 
      signup, 
      signInWithGoogle,
      sendOtp,
      verifyOtp,
      updateBalance,
      resetAccount,
      updateProfile: updateProfileData
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
