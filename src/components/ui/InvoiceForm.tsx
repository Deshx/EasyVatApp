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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Camera as CameraIcon, 
  Building, 
  MapPin, 
  Hash, 
  Calendar,
  X,
  Edit,
  Plus,
  Check,
  FileText,
  Scan
} from "lucide-react";

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
  
  // Check if returning from recheck and restore company information
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const returnFromRecheckFlag = localStorage.getItem(`easyVat_${sessionBills.length > 0 ? 'session' : 'temp'}_returnFromRecheck`);
      const companyInfoKey = `easyVat_companyInfo_${user?.uid}`;
      
      if (returnFromRecheckFlag === 'true' && sessionBills.length > 0) {
        // Remove the flag
        localStorage.removeItem(`easyVat_${sessionBills.length > 0 ? 'session' : 'temp'}_returnFromRecheck`);
        
        // Try to restore company information from localStorage
        const storedCompanyInfo = localStorage.getItem(companyInfoKey);
        if (storedCompanyInfo) {
          try {
            const companyInfo = JSON.parse(storedCompanyInfo);
            setFormData(prev => ({
              ...prev,
              companyName: companyInfo.companyName || '',
              companyAddress: companyInfo.companyAddress || '',
              companyVatNumber: companyInfo.companyVatNumber || '',
            }));
            
            if (companyInfo.companyVatNumber) {
              setVatNumberChecked(true);
            }
            
            // Set invoice preview as active to show the preview instead of company form
            setInvoicePreviewActive(true);
          } catch (error) {
            console.error('Error parsing stored company info:', error);
          }
        }
      }
    }
  }, [sessionBills.length, user?.uid]);
  
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
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);
    
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
    
    // Save company information to localStorage when all required fields are filled
    if (typeof window !== 'undefined' && user?.uid && updatedFormData.companyName && updatedFormData.companyVatNumber && updatedFormData.companyAddress) {
      const companyInfoKey = `easyVat_companyInfo_${user.uid}`;
      localStorage.setItem(companyInfoKey, JSON.stringify(updatedFormData));
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
        
        // Save company information to localStorage
        if (typeof window !== 'undefined' && user?.uid) {
          const companyInfoKey = `easyVat_companyInfo_${user.uid}`;
          localStorage.setItem(companyInfoKey, JSON.stringify({
            companyName: company.name,
            companyAddress: company.address,
            companyVatNumber: company.vatNumber,
          }));
        }
        
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
    
    // Save company information to localStorage
    if (typeof window !== 'undefined' && user?.uid) {
      const companyInfoKey = `easyVat_companyInfo_${user.uid}`;
      localStorage.setItem(companyInfoKey, JSON.stringify({
        companyName: company.name,
        companyAddress: company.address,
        companyVatNumber: company.vatNumber,
      }));
    }
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <PageContainer size="md">
          <div className="flex items-center justify-between py-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleCancelSession}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold text-gray-900">Create Invoice</h1>
              {sessionBills.length > 0 && (
                <p className="text-sm text-gray-500">{sessionBills.length} bills scanned</p>
              )}
            </div>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleCancelSession}
              className="h-10 w-10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </PageContainer>
      </div>

      {error && (
        <PageContainer size="md" className="py-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </CardContent>
          </Card>
        </PageContainer>
      )}
      
      {showCamera && (
        <div className="fixed inset-0 z-50">
          <Camera onCapture={handleCapture} onClose={closeCamera} />
        </div>
      )}
      
      {showPreview && capturedImage && (
        <div className="fixed inset-0 z-50">
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
        </div>
      )}
      
      {!showPreview && !showCamera && (
        <PageContainer size="md" className="py-4 pb-20">
          {/* Bills in Session */}
          {sessionBills.length > 0 && !recheckModeActive && (
            <div className="mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scanned Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {sessionBills.map((bill, index) => (
                      <div key={index} className="relative border border-gray-200 rounded-lg p-2 h-24 flex items-center justify-center overflow-hidden bg-gray-50">
                        <img 
                          src={bill.imageSrc} 
                          alt={`Bill ${index + 1}`} 
                          className="max-w-full max-h-full object-contain" 
                        />
                        <div className="absolute top-1 right-1">
                          <Badge variant="secondary" className="text-xs">
                            {index + 1}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    onClick={openCamera}
                    variant="outline"
                    className="w-full h-12 border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Scan Another Bill
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Company Information Form */}
          {!invoicePreviewActive && (sessionBills.length === 0 || (sessionBills.length > 0 && (!vatNumberChecked || !formData.companyName))) && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* VAT Number Field */}
                  <div className="relative" ref={suggestionRef}>
                    <Label htmlFor="companyVatNumber" className="flex items-center gap-2 mb-2">
                      <Hash className="h-4 w-4 text-gray-500" />
                      VAT Number*
                    </Label>
                    <Input
                      id="companyVatNumber"
                      name="companyVatNumber"
                      value={formData.companyVatNumber}
                      onChange={handleChange}
                      placeholder="Enter VAT number"
                      className="h-12 text-lg"
                    />
                    
                    {vatNumberChecked && isNewCompany && !registering && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-700 text-sm mb-2">Company not registered</p>
                        <Button
                          type="button"
                          onClick={registerCompany}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          Register this company
                        </Button>
                      </div>
                    )}
                    
                    {showSuggestions && (
                      <Card className="absolute z-10 mt-1 w-full max-h-60 overflow-auto">
                        <CardContent className="p-0">
                          {suggestions.map((company) => (
                            <div
                              key={company.id}
                              onClick={() => selectCompany(company)}
                              className="cursor-pointer px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                            >
                              <p className="font-medium text-sm">{company.vatNumber}</p>
                              <p className="text-xs text-gray-500">{company.name}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  
                  {/* Company Name Field */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="companyName" className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        Company Name*
                      </Label>
                      {vatNumberChecked && !isNewCompany && !registering && !editing && (
                        <Button
                          type="button"
                          onClick={enableEditing}
                          variant="ghost"
                          size="sm"
                          className="text-xs text-blue-600 hover:text-blue-800 h-auto p-1"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      disabled={!vatNumberChecked || (!isNewCompany && !registering && !editing)}
                      placeholder="Enter company name"
                      className={`h-12 text-lg ${
                        !vatNumberChecked || (!isNewCompany && !registering && !editing)
                          ? "bg-gray-100 text-gray-500"
                          : ""
                      }`}
                    />
                  </div>
                  
                  {/* Address Field */}
                  <div>
                    <Label htmlFor="companyAddress" className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      Address*
                    </Label>
                    <Textarea
                      id="companyAddress"
                      name="companyAddress"
                      value={formData.companyAddress}
                      onChange={handleChange}
                      disabled={!vatNumberChecked || (!isNewCompany && !registering && !editing)}
                      rows={3}
                      placeholder="Enter company address"
                      className={`text-lg ${
                        !vatNumberChecked || (!isNewCompany && !registering && !editing)
                          ? "bg-gray-100 text-gray-500"
                          : ""
                      }`}
                    />
                  </div>
                  
                  {/* Invoice Date Field */}
                  <div>
                    <Label htmlFor="invoiceDate" className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      Invoice Date*
                    </Label>
                    <Input
                      type="date"
                      id="invoiceDate"
                      name="invoiceDate"
                      value={formData.invoiceDate}
                      onChange={handleChange}
                      className="h-12 text-lg"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Scan Bills Button */}
              {sessionBills.length === 0 && (
                <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0">
                  <CardContent className="p-0">
                    <Button
                      onClick={openCamera}
                      className="w-full h-16 bg-transparent hover:bg-white/10 text-white font-medium text-lg"
                    >
                      <CameraIcon className="h-6 w-6 mr-3" />
                      Scan Your First Bill
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Invoice Generator */}
          {sessionBills.length > 0 && vatNumberChecked && formData.companyName && (
            <div className="mt-6">
              <InvoiceGenerator
                bills={sessionBills}
                companyName={formData.companyName}
                companyVatNumber={formData.companyVatNumber}
                onSuccess={handleInvoiceSuccess}
                onError={handleInvoiceError}
                onPreviewStateChange={setInvoicePreviewActive}
              />
            </div>
          )}
        </PageContainer>
      )}
    </div>
  );
}