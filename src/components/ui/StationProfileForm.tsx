"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useRouter } from "next/navigation";

interface StationProfile {
  stationName: string;
  address: string;
  telephone: string;
  email: string;
  vatNumber: string;
  userId: string;
}

export function StationProfileForm() {
  const { user, refreshProfileStatus } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<StationProfile>({
    stationName: "",
    address: "",
    telephone: "",
    email: user?.email || "",
    vatNumber: "",
    userId: user?.uid || ""
  });

  // Fetch existing profile data if available
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const profileDoc = await getDoc(doc(db, "userProfiles", user.uid));
        
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as StationProfile;
          setProfile({
            ...profile,
            ...profileData,
            email: profileData.email || user.email || ""
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSubmitting(true);
      setError(null);
      
      // Prepare profile data
      const profileData = {
        ...profile,
        userId: user.uid,
        email: profile.email || user.email || "",
        updatedAt: new Date().toISOString()
      };
      
      // Save to Firestore
      await setDoc(doc(db, "userProfiles", user.uid), profileData);
      
      // Update profile status in context
      await refreshProfileStatus();
      
      // Navigate to dashboard
      router.push("/dashboard");
      
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">
          Complete Your Station Profile
        </h2>
        
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label htmlFor="stationName" className="block text-sm font-medium text-gray-700 mb-1">
              Filling Station Name*
            </label>
            <input
              type="text"
              id="stationName"
              name="stationName"
              value={profile.stationName}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address*
            </label>
            <textarea
              id="address"
              name="address"
              value={profile.address}
              onChange={handleChange}
              required
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-1">
              Telephone*
            </label>
            <input
              type="tel"
              id="telephone"
              name="telephone"
              value={profile.telephone}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email*
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={profile.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700 mb-1">
              VAT Number*
            </label>
            <input
              type="text"
              id="vatNumber"
              name="vatNumber"
              value={profile.vatNumber}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                Saving...
              </>
            ) : (
              "Complete Setup"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}