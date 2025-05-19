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
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("unknown");

  // Check and update profile status
  const checkProfileStatus = async (currentUser: User): Promise<ProfileStatus> => {
    try {
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const status = await checkProfileStatus(currentUser);
        setProfileStatus(status);
      } else {
        setProfileStatus("unknown");
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      console.log("Attempting to sign in with Google...");
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      
      // Check profile status after sign-in
      const status = await checkProfileStatus(result.user);
      setProfileStatus(status);
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
    try {
      await firebaseSignOut(auth);
      setProfileStatus("unknown");
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
        refreshProfileStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
