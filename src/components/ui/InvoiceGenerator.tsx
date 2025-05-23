import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { BillData } from '@/lib/contexts/InvoiceSessionContext';
import { useFuelPrices } from '@/lib/contexts/FuelPricesContext';
import './InvoiceGenerator.css';
import { useInvoiceSession } from '@/lib/contexts/InvoiceSessionContext';

interface InvoiceGeneratorProps {
  bills: BillData[];
  companyName: string;
  companyVatNumber: string;
  onSuccess: (invoiceId: string) => void;
  onError: (error: string) => void;
  onPreviewStateChange?: (isActive: boolean) => void;
}

interface FuelTypeGroup {
  fuelType: string;
  fuelTypeName: string;
  totalIncl: number;
  totalQty: number;
  amountEx: number;
  rateEx: number;
  verifiedQty: number;
}

interface InvoiceItem {
  fuelType: string;
  fuelTypeName: string;
  quantityLitres: number;
  marketRate: number;
  amount: number;
}

interface InvoiceTotals {
  subTotal: number;
  vat18: number;
  total: number;
}

interface UserProfile {
  stationName: string;
  address: string;
  telephone: string;
  email: string;
  vatNumber: string;
}

interface FuelTypeInfo {
  id: string;
  name: string;
}

// localStorage keys
const STORAGE_KEY_USER_PROFILE = 'easyVat_userProfile';
const STORAGE_KEY_FUEL_TYPES = 'easyVat_fuelTypes';

export default function InvoiceGenerator({ 
  bills, 
  companyName, 
  companyVatNumber, 
  onSuccess, 
  onError, 
  onPreviewStateChange 
}: InvoiceGeneratorProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { sessionBills } = useInvoiceSession();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [fuelTypes, setFuelTypes] = useState<{[key: string]: string}>({});
  const { fuelPrices } = useFuelPrices();
  const [showIntermediate, setShowIntermediate] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  
  // Use sessionBills from context (which includes updates from localStorage) instead of the bills prop
  const currentBills = sessionBills.length > 0 ? sessionBills : bills;
  
  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Try to load user profile from localStorage
        const cachedProfile = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
        if (cachedProfile) {
          setUserProfile(JSON.parse(cachedProfile));
        }
        
        // Try to load fuel types from localStorage
        const cachedFuelTypes = localStorage.getItem(STORAGE_KEY_FUEL_TYPES);
        if (cachedFuelTypes) {
          setFuelTypes(JSON.parse(cachedFuelTypes));
        } else {
          // Default fuel type mappings if not in localStorage
          setFuelTypes({
            "petrol": "Petrol",
            "diesel": "Diesel",
            "super_diesel": "Super Diesel",
            "kerosene": "Kerosene",
            "gasoline": "Gasoline",
            "octane_92": "Octane 92",
            "octane_95": "Octane 95",
            "LP95": "LP95",
            "LP92": "LP92",
            "LAD": "LAD",
            "auto_diesel": "Auto Diesel",
            "super_petrol": "Super Petrol"
          });
        }
      } catch (error) {
        console.error("Error loading from localStorage:", error);
      }
    }
  }, []);
  
  // Function to show bill preview and calculations before saving
  const handlePreview = () => {
    if (currentBills.length === 0) {
      onError("No bills to process");
      return;
    }
    
    try {
      // Group bills by fuel type
      const fuelTypeGroups = groupBillsByFuelType(currentBills);
      
      // Calculate invoice items
      const invoiceItems = calculateInvoiceItems(fuelTypeGroups);
      
      // Calculate invoice totals
      const invoiceTotals = calculateInvoiceTotals(invoiceItems);
      
      // Prepare invoice data
      const newInvoiceData = {
        userId: user?.uid || 'guest',
        companyName,
        companyVatNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        items: invoiceItems,
        subTotal: invoiceTotals.subTotal,
        vat18: invoiceTotals.vat18,
        total: invoiceTotals.total,
        // We'll add userProfile data when we actually submit
      };
      
      setInvoiceData(newInvoiceData);
      setShowIntermediate(true);
      onPreviewStateChange?.(true);
    } catch (err) {
      console.error("Error generating invoice preview:", err);
      onError("Failed to generate invoice preview. Please try again.");
    }
  };
  
  // Auto-show preview when returning from recheck mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const returnFromRecheck = localStorage.getItem('easyVat_returnFromRecheck');
      if (returnFromRecheck === 'true' && currentBills.length > 0 && !showIntermediate) {
        // Clear the flag
        localStorage.removeItem('easyVat_returnFromRecheck');
        // Auto-show preview
        handlePreview();
      }
    }
  }, [currentBills.length, showIntermediate]); // Simplified dependencies
  
  // Auto-show preview when bills are available (skip intermediate step)
  useEffect(() => {
    if (currentBills.length > 0 && !showIntermediate && !invoiceData) {
      // Automatically show the invoice preview instead of showing the button first
      handlePreview();
    }
  }, [currentBills.length, showIntermediate, invoiceData]);
  
  // Refresh invoice preview when returning from recheck page
  useEffect(() => {
    if (showIntermediate && invoiceData && currentBills.length > 0) {
      // Check if bills have been updated and refresh the preview
      const timer = setTimeout(() => {
        try {
          const fuelTypeGroups = groupBillsByFuelType(currentBills);
          const invoiceItems = calculateInvoiceItems(fuelTypeGroups);
          const invoiceTotals = calculateInvoiceTotals(invoiceItems);
          
          setInvoiceData(prev => ({
            ...prev,
            items: invoiceItems,
            subTotal: invoiceTotals.subTotal,
            vat18: invoiceTotals.vat18,
            total: invoiceTotals.total,
          }));
        } catch (error) {
          console.error("Error refreshing invoice data:", error);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentBills, showIntermediate, invoiceData]);
  
  // Function to fetch user profile from Firebase
  const fetchUserProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    
    try {
      const profileDoc = await getDoc(doc(db, "userProfiles", user.uid));
      
      if (profileDoc.exists()) {
        const profile = profileDoc.data() as UserProfile;
        
        // Cache in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(profile));
        }
        
        return profile;
      } else {
        onError("User profile not found. Please complete your profile setup first.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  };
  
  // Function to fetch fuel types from Firebase
  const fetchFuelTypes = async (): Promise<{[key: string]: string}> => {
    try {
      const fuelTypeMap: {[key: string]: string} = {
        // Default fuel types
        "petrol": "Petrol",
        "diesel": "Diesel",
        "super_diesel": "Super Diesel",
        "kerosene": "Kerosene",
        "gasoline": "Gasoline",
        "octane_92": "Octane 92",
        "octane_95": "Octane 95",
        "LP95": "LP95",
        "LP92": "LP92",
        "LAD": "LAD",
        "auto_diesel": "Auto Diesel",
        "super_petrol": "Super Petrol"
      };
      
      // Add from fuel prices context
      fuelPrices.forEach(fuel => {
        if (fuel.id) {
          fuelTypeMap[fuel.id] = fuel.name;
        }
      });
      
      // Then fetch from Firestore
      const fuelTypesSnapshot = await getDocs(collection(db, "fuelTypes"));
      fuelTypesSnapshot.forEach(doc => {
        fuelTypeMap[doc.id] = doc.data().name || doc.id;
      });
      
      // Cache in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_FUEL_TYPES, JSON.stringify(fuelTypeMap));
      }
      
      return fuelTypeMap;
    } catch (error) {
      console.error("Error fetching fuel types:", error);
      throw error;
    }
  };

  // Function to handle actual invoice creation in Firebase
  const processInvoice = async () => {
    if (!user || currentBills.length === 0) {
      onError("Missing user or bill data");
      return;
    }

    try {
      setProcessing(true);
      
      // If we don't have a user profile or fuel types yet, fetch them now
      let profile = userProfile;
      let typesMap = fuelTypes;
      
      if (!profile) {
        profile = await fetchUserProfile();
        if (!profile) {
          throw new Error("Could not fetch user profile");
        }
        setUserProfile(profile);
      }
      
      if (Object.keys(typesMap).length === 0) {
        typesMap = await fetchFuelTypes();
        setFuelTypes(typesMap);
      }
      
      // If we already have invoice data from preview, use it
      let finalInvoiceData = invoiceData;
      
      // If not, generate it now
      if (!finalInvoiceData) {
        const fuelTypeGroups = groupBillsByFuelType(currentBills);
        const invoiceItems = calculateInvoiceItems(fuelTypeGroups);
        const invoiceTotals = calculateInvoiceTotals(invoiceItems);
        
        finalInvoiceData = {
          userId: user.uid,
          companyName,
          companyVatNumber,
          invoiceDate: new Date().toISOString().split('T')[0],
          items: invoiceItems,
          subTotal: invoiceTotals.subTotal,
          vat18: invoiceTotals.vat18,
          total: invoiceTotals.total,
        };
      }
      
      // Add necessary fields for Firebase
      const firebaseInvoiceData = {
        ...finalInvoiceData,
        createdAt: serverTimestamp(),
        status: "issued",
        userProfile: {
          companyName: profile.stationName,
          address: profile.address,
          phone: profile.telephone,
          email: profile.email,
          vatNumber: profile.vatNumber,
        },
        // Store original bills for reference
        originalBills: currentBills.map(bill => ({
          imageSrc: bill.imageSrc,
          rate: bill.extractedData.rate,
          volume: bill.extractedData.volume,
          amount: bill.extractedData.amount,
          fuelType: bill.extractedData.fuelType,
          fuelTypeName: bill.extractedData.fuelTypeName
        }))
      };
      
      // Save to Firestore
      const invoiceRef = await addDoc(collection(db, "invoices"), firebaseInvoiceData);
      
      onSuccess(invoiceRef.id);
      
    } catch (err) {
      console.error("Error creating invoice:", err);
      onError("Failed to create invoice. Please try again.");
    } finally {
      setProcessing(false);
      setShowIntermediate(false);
      onPreviewStateChange?.(false);
    }
  };
  
  const getFuelTypeName = (fuelTypeId: string, defaultFuelTypeName?: string): string => {
    // If we have a default name provided, use it
    if (defaultFuelTypeName) return defaultFuelTypeName;
    
    // Handle common patterns for fuel IDs
    if (!fuelTypeId) return "Unknown Fuel";
    
    // Try to extract a name from the ID if it's a UUID or complex ID
    if (fuelTypeId.length > 20 && fuelTypeId.includes("-")) {
      // For UUIDs or hash-like IDs, create a generic name
      return "Fuel Type";
    }
    
    // Return from our mapping, or the ID itself as fallback
    return fuelTypes[fuelTypeId] || fuelTypeId;
  };
  
  const groupBillsByFuelType = (bills: BillData[]): FuelTypeGroup[] => {
    // Group bills by fuel type
    const groups: { [key: string]: BillData[] } = {};
    
    bills.forEach(bill => {
      if (!bill.extractedData.fuelType) return;
      
      const fuelType = bill.extractedData.fuelType;
      if (!groups[fuelType]) {
        groups[fuelType] = [];
      }
      
      groups[fuelType].push(bill);
    });
    
    // Calculate values for each group
    return Object.entries(groups).map(([fuelType, bills]) => {
      // Get the fuel type name from the first bill in the group
      const fuelTypeName = bills[0].extractedData.fuelTypeName || getFuelTypeName(fuelType);
      
      // Calculate totalIncl = sum of lineTotalInclVAT
      const totalIncl = bills.reduce((sum, bill) => {
        return sum + parseFloat(bill.extractedData.amount);
      }, 0);
      
      // Calculate totalQty = sum of (lineTotalInclVAT ÷ marketRateInclVAT)
      const totalQty = bills.reduce((sum, bill) => {
        const amount = parseFloat(bill.extractedData.amount);
        const rate = parseFloat(bill.extractedData.rate);
        // Avoid division by zero
        return sum + (rate > 0 ? amount / rate : 0);
      }, 0);
      
      // Strip VAT once per group
      // amountEx = totalIncl ÷ 1.18
      const amountEx = totalIncl / 1.18;
      
      // rateEx = (totalIncl ÷ totalQty) ÷ 1.18
      const rateEx = totalQty > 0 ? (totalIncl / totalQty) / 1.18 : 0;
      
      // Verify quantity (should match)
      // qty = amountEx ÷ rateEx → equals totalQty
      const verifiedQty = rateEx > 0 ? amountEx / rateEx : 0;
      
      return {
        fuelType,
        fuelTypeName,
        totalIncl,
        totalQty,
        amountEx,
        rateEx,
        verifiedQty
      };
    });
  };
  
  const calculateInvoiceItems = (groups: FuelTypeGroup[]): InvoiceItem[] => {
    return groups.map(group => ({
      fuelType: group.fuelType,
      fuelTypeName: group.fuelTypeName,
      quantityLitres: parseFloat(group.totalQty.toFixed(2)),
      marketRate: parseFloat(group.rateEx.toFixed(2)),
      amount: parseFloat(group.amountEx.toFixed(2))
    }));
  };
  
  const calculateInvoiceTotals = (items: InvoiceItem[]): InvoiceTotals => {
    // Sub-total = sum of amountEx
    const subTotal = parseFloat(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
    
    // VAT 18% = subTotal × 0.18
    const vat18 = parseFloat((subTotal * 0.18).toFixed(2));
    
    // Grand Total = subTotal + VAT
    const total = parseFloat((subTotal + vat18).toFixed(2));
    
    return {
      subTotal,
      vat18,
      total
    };
  };
  
  // Cancel preview and go back
  const cancelPreview = () => {
    setShowIntermediate(false);
    setInvoiceData(null);
    onPreviewStateChange?.(false);
  };
  
  // Show intermediate preview screen
  if (showIntermediate && invoiceData) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Invoice Preview</h3>
        
        <div className="mb-4">
          <p><span className="font-medium">Company:</span> {invoiceData.companyName}</p>
          <p><span className="font-medium">VAT Number:</span> {invoiceData.companyVatNumber}</p>
          <p><span className="font-medium">Date:</span> {invoiceData.invoiceDate}</p>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2">Items:</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Fuel Type</th>
                  <th className="py-2 text-right">Quantity (L)</th>
                  <th className="py-2 text-right">Rate (Rs/L)</th>
                  <th className="py-2 text-right">Amount (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item: InvoiceItem, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{item.fuelTypeName}</td>
                    <td className="py-2 text-right">{item.quantityLitres.toFixed(2)}</td>
                    <td className="py-2 text-right">{item.marketRate.toFixed(2)}</td>
                    <td className="py-2 text-right">{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="flex justify-end mb-4">
          <div className="w-40">
            <div className="flex justify-between py-1">
              <span>Subtotal:</span>
              <span>Rs {invoiceData.subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>VAT (18%):</span>
              <span>Rs {invoiceData.vat18.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 font-bold">
              <span>Total:</span>
              <span>Rs {invoiceData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={cancelPreview}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={processing}
          >
            Back
          </button>

          {/* Recheck button - navigate to recheck page */}
          <button
            onClick={() => router.push('/recheck-bills')}
            className="px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50"
            disabled={processing}
          >
            Recheck
          </button>
           
          <button
            onClick={processInvoice}
            disabled={processing}
            className="flex-grow px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {processing ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2 inline-block"></span>
                Processing...
              </>
            ) : (
              "Confirm & Create Invoice"
            )}
          </button>
        </div>
      </div>
    );
  }

  // Show the main button if not in preview mode
  return (
    <button
      onClick={handlePreview}
      disabled={processing || currentBills.length === 0}
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
    >
      {processing ? (
        <>
          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
          Processing...
        </>
      ) : (
        `Create Invoice with ${currentBills.length} ${currentBills.length === 1 ? 'Bill' : 'Bills'}`
      )}
    </button>
  );
} 