"use client";

import React, { createContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { paymentService } from "@/lib/services/paymentService";

// Simple state enum for user profile status
type ProfileStatus = "unknown" | "new" | "complete";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  profileStatus: ProfileStatus;
  refreshProfileStatus: () => Promise<void>;
  isSuperAdmin: boolean;
  hasActiveSubscription: boolean;
  subscriptionLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  clearError: () => {},
  profileStatus: "unknown",
  refreshProfileStatus: async () => {},
  isSuperAdmin: false,
  hasActiveSubscription: false,
  subscriptionLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("unknown");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Check if user is super admin
  const checkSuperAdmin = (email: string | null) => {
    return email === "oceans.deshan@gmail.com";
  };

  // Check subscription status
  const checkSubscriptionStatus = async (currentUser: User): Promise<boolean> => {
    try {
      setSubscriptionLoading(true);
      
      // Super admin always has access
      if (checkSuperAdmin(currentUser.email)) {
        return true;
      }
      
      const isActive = await paymentService.isSubscriptionActive(currentUser.uid);
      
      if (!isActive) {
        // Check if user has a subscription record, if not create default
        const subscription = await paymentService.getUserSubscription(currentUser.uid);
        if (!subscription) {
          await paymentService.createDefaultSubscription(currentUser.uid, currentUser.email || '');
          // Recheck after creating default
          return await paymentService.isSubscriptionActive(currentUser.uid);
        }
      }
      
      return isActive;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Check and update profile status
  const checkProfileStatus = async (currentUser: User): Promise<ProfileStatus> => {
    try {
      // Check if Firestore is initialized
      if (!db) {
        console.warn("Firestore (db) is not initialized!");
        return "unknown";
      }
      
      const profileDoc = await getDoc(doc(db, "userProfiles", currentUser.uid));
      
      if (!profileDoc.exists()) {
        // No profile exists at all
        console.log("No profile exists for user");
        return "new";
      }
      
      // Profile exists and is complete
      console.log("User has a complete profile");
      return "complete";
    } catch (err) {
      console.error("Error checking profile status:", err);
      // Default to new user on error, to be safe
      return "new";
    }
  };

  // Refresh profile status manually (useful after form submission)
  const refreshProfileStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const status = await checkProfileStatus(user);
      setProfileStatus(status);
    } catch (err) {
      console.error("Error refreshing profile status:", err);
    } finally {
      setLoading(false);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    // Check if Firebase Auth is initialized
    if (!auth) {
      console.warn("Firebase Auth is not initialized!");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Check if user is super admin
        setIsSuperAdmin(checkSuperAdmin(currentUser.email));
        
        const status = await checkProfileStatus(currentUser);
        setProfileStatus(status);
        
        // Check subscription status
        const subscriptionActive = await checkSubscriptionStatus(currentUser);
        setHasActiveSubscription(subscriptionActive);
        
        // Update last login
        try {
          await paymentService.updateUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            lastLoginAt: new Date()
          });
        } catch (error) {
          console.error('Error updating last login:', error);
        }
      } else {
        setProfileStatus("unknown");
        setIsSuperAdmin(false);
        setHasActiveSubscription(false);
        setSubscriptionLoading(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    // Check if Firebase Auth is initialized
    if (!auth) {
      setError("Authentication system is not initialized. Please refresh the page.");
      setLoading(false);
      return;
    }
    
    const provider = new GoogleAuthProvider();
    
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      console.log("Attempting to sign in with Google...");
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      
      // Check if user is super admin
      setIsSuperAdmin(checkSuperAdmin(result.user.email));
      
      // Check profile status after sign-in
      const status = await checkProfileStatus(result.user);
      setProfileStatus(status);
      
      // Check subscription status
      const subscriptionActive = await checkSubscriptionStatus(result.user);
      setHasActiveSubscription(subscriptionActive);
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      
      // Handle Errors
      let errorMessage = "Failed to sign in with Google";
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in popup was closed before completing the sign-in.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "The sign-in popup was blocked by your browser. Please allow popups for this website.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setError(null);
    
    // Check if Firebase Auth is initialized
    if (!auth) {
      setError("Authentication system is not initialized.");
      return;
    }
    
    try {
      await firebaseSignOut(auth);
      setProfileStatus("unknown");
      setIsSuperAdmin(false);
      setHasActiveSubscription(false);
      setSubscriptionLoading(false);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to sign out";
      setError(errorMessage);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        error,
        signInWithGoogle,
        signOut: signOutUser,
        clearError,
        profileStatus,
        refreshProfileStatus,
        isSuperAdmin,
        hasActiveSubscription,
        subscriptionLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
