import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from './useAuth';

interface StationProfile {
  id?: string;
  stationName: string;
  address: string;
  telephone: string;
  email: string;
  vatNumber: string;
  userId: string;
  updatedAt?: string;
}

export function useStationProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !db) {
        setProfile(null);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const profileDoc = await getDoc(doc(db, "userProfiles", user.uid));
        
        if (profileDoc.exists()) {
          const data = profileDoc.data() as StationProfile;
          setProfile({
            id: profileDoc.id,
            ...data
          });
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Error fetching station profile:", err);
        setError("Failed to load station profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  return { profile, loading, error };
} 