"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

export function DebugPanel() {
  const { user, loading, error, profileStatus, refreshProfileStatus } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user || !db) return;
      
      try {
        const profileDoc = await getDoc(doc(db, "userProfiles", user.uid));
        if (profileDoc.exists()) {
          setProfileData(profileDoc.data());
        }
      } catch (err) {
        console.error("Error fetching profile in debug panel:", err);
      }
    };
    
    fetchProfileData();
    
    // Refetch every 3 seconds to see updates
    const interval = setInterval(fetchProfileData, 3000);
    return () => clearInterval(interval);
  }, [user]);
  
  if (!expanded) {
    return (
      <button 
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg z-50"
      >
        Debug
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 p-4 rounded-lg shadow-lg z-50 max-w-md overflow-auto max-h-[80vh]">
      <div className="flex justify-between mb-2">
        <h3 className="font-bold">Debug Panel</h3>
        <button onClick={() => setExpanded(false)} className="text-gray-500">Close</button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Current Path:</strong> {typeof window !== 'undefined' ? window.location.pathname : 'unknown'}
        </div>
        
        <div>
          <strong>Auth State:</strong>
          <ul className="pl-4">
            <li>Loading: {loading ? 'true' : 'false'}</li>
            <li>User: {user ? user.uid.substring(0, 6) + '...' : 'null'}</li>
            <li>Email: {user?.email || 'N/A'}</li>
            <li>Profile Status: {profileStatus}</li>
            <li>Error: {error || 'none'}</li>
          </ul>
        </div>
        
        {profileData && (
          <div>
            <strong>Profile Data:</strong>
            <ul className="pl-4">
              <li>stationName: {profileData.stationName || 'N/A'}</li>
              <li>updatedAt: {profileData.updatedAt || 'N/A'}</li>
            </ul>
          </div>
        )}
        
        <button 
          onClick={() => refreshProfileStatus()} 
          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-xs"
        >
          Refresh Profile Status
        </button>
      </div>
    </div>
  );
} 