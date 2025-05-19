"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  name: string;
  address: string;
  vatNumber: string;
  userId: string;
}

interface InvoiceFormData {
  companyName: string;
  companyAddress: string;
  companyVatNumber: string;
  invoiceDate: string;
}

export default function InvoiceForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [vatNumberChecked, setVatNumberChecked] = useState(false);
  const [isNewCompany, setIsNewCompany] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    companyName: "",
    companyAddress: "",
    companyVatNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0] // Default to today's date
  });

  const suggestionRef = useRef<HTMLDivElement>(null);
  
  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Search for companies by VAT number
    if (name === "companyVatNumber") {
      if (value.trim().length > 0) {
        searchCompaniesByVAT(value);
        setVatNumberChecked(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setVatNumberChecked(false);
        setIsNewCompany(false);
        setRegistering(false);
        setEditing(false);
        setSelectedCompanyId(null);
        // Clear other fields if VAT number is cleared
        setFormData(prev => ({
          ...prev,
          companyName: "",
          companyAddress: ""
        }));
      }
    }
  };

  const searchCompaniesByVAT = async (vatNumber: string) => {
    if (!user) return;
    
    try {
      // First check for exact match
      const exactMatchQuery = query(
        collection(db, "companies"),
        where("userId", "==", user.uid),
        where("vatNumber", "==", vatNumber)
      );
      
      const exactMatchSnapshot = await getDocs(exactMatchQuery);
      
      if (!exactMatchSnapshot.empty) {
        // Exact match found - autofill the company data
        const company = { id: exactMatchSnapshot.docs[0].id, ...exactMatchSnapshot.docs[0].data() } as Company;
        autoFillCompany(company);
        setSelectedCompanyId(company.id);
        setSuggestions([]);
        setShowSuggestions(false);
        setIsNewCompany(false);
        setRegistering(false);
        setEditing(false);
        return;
      }
      
      // If no exact match, look for partial matches for suggestions
      const suggestionsQuery = query(
        collection(db, "companies"),
        where("userId", "==", user.uid),
        where("vatNumber", ">=", vatNumber),
        where("vatNumber", "<=", vatNumber + "\uf8ff")
      );
      
      const suggestionsSnapshot = await getDocs(suggestionsQuery);
      const companiesData: Company[] = [];
      
      suggestionsSnapshot.forEach((doc) => {
        companiesData.push({ id: doc.id, ...doc.data() } as Company);
      });
      
      if (companiesData.length > 0) {
        // Show suggestions
        setSuggestions(companiesData);
        setShowSuggestions(true);
        setIsNewCompany(false);
      } else {
        // No matches found - new company
        setSuggestions([]);
        setShowSuggestions(false);
        setIsNewCompany(true);
        setSelectedCompanyId(null);
        // Clear company fields
        setFormData(prev => ({
          ...prev,
          companyName: "",
          companyAddress: ""
        }));
      }
    } catch (err) {
      console.error("Error searching companies:", err);
    }
  };

  const autoFillCompany = (company: Company) => {
    setFormData(prev => ({
      ...prev,
      companyName: company.name,
      companyAddress: company.address,
      companyVatNumber: company.vatNumber,
    }));
  };

  const selectCompany = (company: Company) => {
    autoFillCompany(company);
    setSelectedCompanyId(company.id);
    setShowSuggestions(false);
    setIsNewCompany(false);
    setRegistering(false);
    setEditing(false);
  };

  const registerCompany = () => {
    setRegistering(true);
  };

  const enableEditing = () => {
    setEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Try to find an existing company by VAT number
      const vatNumber = formData.companyVatNumber.trim();
      let companyId: string | null = null;
      
      if (vatNumber) {
        if (selectedCompanyId && editing) {
          // Update the existing company if we're editing
          await updateDoc(doc(db, "companies", selectedCompanyId), {
            name: formData.companyName.trim(),
            address: formData.companyAddress.trim(),
            updatedAt: serverTimestamp()
          });
          companyId = selectedCompanyId;
        } else if (selectedCompanyId) {
          // Use the selected company without updating
          companyId = selectedCompanyId;
        } else {
          // Check if company already exists with this VAT number
          const companyQuery = query(
            collection(db, "companies"),
            where("userId", "==", user.uid),
            where("vatNumber", "==", vatNumber)
          );
          
          const querySnapshot = await getDocs(companyQuery);
          
          if (querySnapshot.empty) {
            // Add new company
            const companyRef = await addDoc(collection(db, "companies"), {
              name: formData.companyName.trim(),
              address: formData.companyAddress.trim(),
              vatNumber: vatNumber,
              userId: user.uid,
              createdAt: serverTimestamp()
            });
            
            companyId = companyRef.id;
          } else {
            // Use existing company
            companyId = querySnapshot.docs[0].id;
            
            // Update the form with the company data to ensure consistency if not editing
            if (!editing) {
              const companyData = querySnapshot.docs[0].data() as Company;
              setFormData(prev => ({
                ...prev,
                companyName: companyData.name,
                companyAddress: companyData.address
              }));
            }
          }
        }
      }
      
      // Create invoice
      const invoiceRef = await addDoc(collection(db, "invoices"), {
        userId: user.uid,
        companyId,
        companyName: formData.companyName.trim(),
        companyAddress: formData.companyAddress.trim(),
        companyVatNumber: vatNumber,
        invoiceDate: formData.invoiceDate,
        createdAt: serverTimestamp(),
        status: "draft" // Or "issued", depending on your workflow
      });
      
      // Navigate to edit invoice page
      router.push(`/invoice/${invoiceRef.id}`);
      
    } catch (err) {
      console.error("Error creating invoice:", err);
      setError("Failed to create invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative" ref={suggestionRef}>
          <label htmlFor="companyVatNumber" className="block text-sm font-medium text-gray-700 mb-1">
            VAT Number*
          </label>
          <input
            type="text"
            id="companyVatNumber"
            name="companyVatNumber"
            value={formData.companyVatNumber}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter VAT number"
          />
          
          {vatNumberChecked && isNewCompany && !registering && (
            <div className="mt-2">
              <p className="text-yellow-600 text-sm">Company not registered</p>
              <button
                type="button"
                onClick={registerCompany}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Register this company
              </button>
            </div>
          )}
          
          {showSuggestions && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              {suggestions.map((company) => (
                <div
                  key={company.id}
                  onClick={() => selectCompany(company)}
                  className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                >
                  <span className="font-medium">{company.vatNumber}</span> - {company.name}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
              Company Name*
            </label>
            {vatNumberChecked && !isNewCompany && !registering && !editing && (
              <button
                type="button"
                onClick={enableEditing}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Edit details
              </button>
            )}
          </div>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            required
            disabled={!vatNumberChecked || (!isNewCompany && !registering && !editing)}
            className={`w-full rounded-lg border ${
              !vatNumberChecked || (!isNewCompany && !registering && !editing)
                ? "bg-gray-100 text-gray-500"
                : "bg-white"
            } border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="Enter company name"
          />
        </div>
        
        <div>
          <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Address*
          </label>
          <textarea
            id="companyAddress"
            name="companyAddress"
            value={formData.companyAddress}
            onChange={handleChange}
            required
            disabled={!vatNumberChecked || (!isNewCompany && !registering && !editing)}
            rows={3}
            className={`w-full rounded-lg border ${
              !vatNumberChecked || (!isNewCompany && !registering && !editing)
                ? "bg-gray-100 text-gray-500"
                : "bg-white"
            } border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>
        
        <div>
          <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700 mb-1">
            Invoice Date*
          </label>
          <input
            type="date"
            id="invoiceDate"
            name="invoiceDate"
            value={formData.invoiceDate}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading || (isNewCompany && !registering && (formData.companyName === "" || formData.companyAddress === ""))}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-white rounded-full"></span>
                Creating...
              </>
            ) : (
              "Create Invoice"
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 