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
import Camera from "./Camera";
import ImagePreview from "./ImagePreview";
import EnhancedImagePreview from "./EnhancedImagePreview";
import InvoiceGenerator from "./InvoiceGenerator";
import { useInvoiceSession, BillData } from "@/lib/contexts/InvoiceSessionContext";

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
  
  // New states for camera and image capture
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Use the invoice session context
  const { sessionBills, addBill, clearSession, currentIndex, setCurrentIndex, recheckModeActive } = useInvoiceSession();
  
  // State to track if invoice preview is active
  const [invoicePreviewActive, setInvoicePreviewActive] = useState(false);
  
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
      }
    }
  };

  const searchCompaniesByVAT = async (vatNumber: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // First check for exact match to auto-fill immediately
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
      }
    } catch (err) {
      console.error("Error searching companies:", err);
    } finally {
      setLoading(false);
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

  const handleCapture = (imageSrc: string) => {
    console.log('Image captured, camera should be off now');
    setCapturedImage(imageSrc);
    setShowCamera(false);
    setShowPreview(true);
  };

  const handleRetake = () => {
    console.log('Retaking photo, opening camera again');
    setCapturedImage(null);
    setShowPreview(false);
    setShowCamera(true);
  };

  const handleNext = () => {
    console.log('Proceeding with next bill capture');
    
    if (capturedImage) {
      // Get the extracted data from the ImagePreview component and add to session
      // This will be passed through the onNext callback
      setShowPreview(false);
      
      // Reset for next capture
      setCapturedImage(null);
      
      // Open camera for next capture
      setShowCamera(true);
    }
  };
  
  const handleCompleteSession = () => {
    console.log('Completing session with bills:', sessionBills);
    
    if (capturedImage) {
      // Get the extracted data from the ImagePreview component and add to session
      // This will be passed through the onComplete callback
      setCapturedImage(null);
      setShowPreview(false);
    }
    
    // Return to form view - don't clear the session until the user creates the invoice
    setShowCamera(false);
  };

  // Add a function to handle the extracted data from ImagePreview
  const handleExtractedData = (imageSrc: string, extractedData: any) => {
    // Add the bill to the session
    addBill({
      imageSrc,
      extractedData
    });
    
    // Increment the current index
    setCurrentIndex(currentIndex + 1);
  };

  const openCamera = () => {
    console.log('Opening camera');
    setShowCamera(true);
  };

  const closeCamera = () => {
    console.log('Closing camera without capturing');
    setShowCamera(false);
  };
  
  // Define handleSubmit to open camera
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openCamera();
  };
  
  const handleInvoiceSuccess = (invoiceId: string) => {
    // Clear the session after successful invoice creation
    clearSession();
    
    // Redirect to the invoice view
    router.push(`/invoice/${invoiceId}`);
  };
  
  const handleInvoiceError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleCancelSession = () => {
    clearSession();
    router.push('/dashboard');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      {/* Cancel Session Button */}
      <button
        onClick={handleCancelSession}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-sm"
      >
        Cancel Session
      </button>

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {showCamera && (
        <Camera onCapture={handleCapture} onClose={closeCamera} />
      )}
      
      {showPreview && capturedImage && (
        <EnhancedImagePreview 
          imageSrc={capturedImage} 
          onRetake={handleRetake} 
          onNext={(extractedData) => {
            handleExtractedData(capturedImage, extractedData);
            handleNext();
          }}
          onComplete={(extractedData) => {
            handleExtractedData(capturedImage, extractedData);
            handleCompleteSession();
          }} 
        />
      )}
      
      {!showPreview && !showCamera && (
        <>
          {/* Show bills in the current session if any */}
          {sessionBills.length > 0 && !recheckModeActive && (
            <div className="mb-6" data-bills-session>
              <h3 className="text-lg font-medium mb-2">Bills in current session: {sessionBills.length}</h3>
              <div className="flex flex-wrap gap-4">
                {sessionBills.map((bill, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-2 w-32 h-32 flex items-center justify-center overflow-hidden">
                    <img 
                      src={bill.imageSrc} 
                      alt={`Bill ${index + 1}`} 
                      className="max-w-full max-h-full object-contain" 
                    />
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <button
                  type="button"
                  onClick={openCamera}
                  className="px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 focus:outline-none"
                >
                  Scan Another Bill
                </button>
              </div>
              
              {/* Always show the InvoiceGenerator when there are bills */}
              {sessionBills.length > 0 && (
                <div className="mt-6">
                  <InvoiceGenerator
                    bills={sessionBills}
                    companyName={formData.companyName || "test company 1 xtest"}
                    companyVatNumber={formData.companyVatNumber || "t1-12345678"}
                    onSuccess={handleInvoiceSuccess}
                    onError={handleInvoiceError}
                    onPreviewStateChange={setInvoicePreviewActive}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Show form if no bills or if there are bills but still need company info AND invoice preview is not active */}
          {!invoicePreviewActive && (sessionBills.length === 0 || (sessionBills.length > 0 && (!vatNumberChecked || !formData.companyName))) && (
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
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Scan Bill
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}