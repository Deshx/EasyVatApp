import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { BillData } from '@/lib/contexts/InvoiceSessionContext';
import { useFuelPrices } from '@/lib/contexts/FuelPricesContext';
import './InvoiceGenerator.css';

interface InvoiceGeneratorProps {
  bills: BillData[];
  companyName: string;
  companyVatNumber: string;
  onSuccess: (invoiceId: string) => void;
  onError: (error: string) => void;
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

export default function InvoiceGenerator({ 
  bills, 
  companyName, 
  companyVatNumber, 
  onSuccess, 
  onError 
}: InvoiceGeneratorProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [processing, setProcessing] = useState(false);
  const [fuelTypes, setFuelTypes] = useState<{[key: string]: string}>({});
  const { fuelPrices } = useFuelPrices();
  
  // Fetch user profile data and fuel types
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch user profile
        const profileDoc = await getDoc(doc(db, "userProfiles", user.uid));
        
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data() as UserProfile);
        } else {
          onError("User profile not found. Please complete your profile setup first.");
          return;
        }
        
        // Default fuel type mappings
        const defaultFuelTypes: {[key: string]: string} = {
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
        
        // Map fuel types
        const fuelTypeMap: {[key: string]: string} = {
          ...defaultFuelTypes
        };
        
        // First add from fuel prices context
        fuelPrices.forEach(fuel => {
          if (fuel.id) {
            fuelTypeMap[fuel.id] = fuel.name;
          }
        });
        
        // Then fetch any additional fuel types from Firestore
        const fuelTypesSnapshot = await getDocs(collection(db, "fuelTypes"));
        fuelTypesSnapshot.forEach(doc => {
          fuelTypeMap[doc.id] = doc.data().name || doc.id;
        });
        
        setFuelTypes(fuelTypeMap);
      } catch (err) {
        console.error("Error fetching data:", err);
        onError("Failed to load necessary information.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, onError, fuelPrices]);

  const processInvoice = async () => {
    if (!user || !userProfile || bills.length === 0) return;

    try {
      setProcessing(true);
      
      // Group bills by fuel type
      const fuelTypeGroups = groupBillsByFuelType(bills);
      
      // Calculate invoice items
      const invoiceItems = calculateInvoiceItems(fuelTypeGroups);
      
      // Calculate invoice totals
      const invoiceTotals = calculateInvoiceTotals(invoiceItems);
      
      // Debug fuel types
      console.log("Fuel Types Mapping:", fuelTypes);
      console.log("Invoice Items with Names:", invoiceItems);
      
      // Create the invoice in Firestore
      const invoiceData = {
        userId: user.uid,
        companyName,
        companyVatNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        status: "issued",
        items: invoiceItems.map(item => ({
          fuelType: item.fuelType,
          fuelTypeName: item.fuelTypeName,
          quantityLitres: item.quantityLitres,
          marketRate: item.marketRate,
          amount: item.amount
        })),
        subTotal: invoiceTotals.subTotal,
        vat18: invoiceTotals.vat18,
        total: invoiceTotals.total,
        userProfile: {
          companyName: userProfile.stationName,
          address: userProfile.address,
          phone: userProfile.telephone,
          email: userProfile.email,
          vatNumber: userProfile.vatNumber,
        },
        // Store original bills for reference
        originalBills: bills.map(bill => ({
          imageSrc: bill.imageSrc,
          rate: bill.extractedData.rate,
          volume: bill.extractedData.volume,
          amount: bill.extractedData.amount,
          fuelType: bill.extractedData.fuelType,
          fuelTypeName: bill.extractedData.fuelTypeName
        }))
      };
      
      const invoiceRef = await addDoc(collection(db, "invoices"), invoiceData);
      
      onSuccess(invoiceRef.id);
      
    } catch (err) {
      console.error("Error creating invoice:", err);
      onError("Failed to create invoice. Please try again.");
    } finally {
      setProcessing(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <button
      onClick={processInvoice}
      disabled={processing || !userProfile}
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
    >
      {processing ? (
        <>
          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
          Processing...
        </>
      ) : (
        `Create Invoice with ${bills.length} ${bills.length === 1 ? 'Bill' : 'Bills'}`
      )}
    </button>
  );
} 