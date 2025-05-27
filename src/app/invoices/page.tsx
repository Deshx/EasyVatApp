"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc,
  doc,
  limit, 
  startAfter,
  endBefore,
  limitToLast,
  DocumentSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { SubscriptionGate } from "@/components/ui/SubscriptionGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InvoiceData {
  id: string; // Firestore document ID
  invoiceId?: string; // Custom invoice ID (EV-XXX-YYYY-0001 format)
  companyName: string;
  companyVatNumber: string;
  invoiceDate: string;
  total: number;
  createdAt: Timestamp;
  userId: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  firstDoc: DocumentSnapshot | null;
  lastDoc: DocumentSnapshot | null;
}

export default function InvoicesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // State for invoices and loading
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filtering and search
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // State for pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    firstDoc: null,
    lastDoc: null
  });
  
  // State for pagination navigation
  const [pageHistory, setPageHistory] = useState<DocumentSnapshot[]>([]);
  
  // State for checkbox selection
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [allInvoiceIds, setAllInvoiceIds] = useState<string[]>([]);
  const [loadingSelectAll, setLoadingSelectAll] = useState(false);
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    
    if (!loading && user) {
      // Reset everything when user changes
      setInvoices([]);
      setSelectedInvoices(new Set());
      setSelectAll(false);
      setAllInvoiceIds([]);
      setError(null);
      fetchInvoices('first');
    }
  }, [user, loading, router]);

  // Reset selections when invoices change
  useEffect(() => {
    setSelectedInvoices(new Set());
    updateSelectAllState();
  }, [invoices]);

  // Update select all state based on current selections and available invoices
  const updateSelectAllState = () => {
    if (allInvoiceIds.length === 0) {
      setSelectAll(false);
    } else {
      const allSelected = allInvoiceIds.every(id => selectedInvoices.has(id));
      setSelectAll(allSelected);
    }
  };

  // Update select all state when selectedInvoices changes
  useEffect(() => {
    updateSelectAllState();
  }, [selectedInvoices, allInvoiceIds]);

  // Fetch all invoice IDs that match current filters
  const fetchAllInvoiceIds = async (): Promise<string[]> => {
    if (!user) return [];
    
    try {
      const baseQuery = query(
        collection(db, "invoices"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(baseQuery);
      let allIds: string[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const invoiceDate = data.invoiceDate || '';
        
        // Apply date range filters client-side
        let include = true;
        if (dateFrom || dateTo) {
          if (dateFrom && invoiceDate < dateFrom) include = false;
          if (dateTo && invoiceDate > dateTo) include = false;
        }
        
        // Apply search term filters client-side
        if (searchTerm.trim() && include) {
          const searchLower = searchTerm.toLowerCase();
          include = 
            doc.id.toLowerCase().includes(searchLower) ||
            (data.companyName || '').toLowerCase().includes(searchLower) ||
            (data.companyVatNumber || '').toLowerCase().includes(searchLower);
        }
        
        if (include) {
          allIds.push(doc.id);
        }
      });
      
      return allIds;
    } catch (err) {
      console.error("Error fetching all invoice IDs:", err);
      return [];
    }
  };

  // Handle select all checkbox - now selects ALL invoices across all pages
  const handleSelectAll = async (checked: boolean) => {
    if (checked) {
      setLoadingSelectAll(true);
      try {
        const allIds = await fetchAllInvoiceIds();
        if (allIds.length > 0) {
          setAllInvoiceIds(allIds);
          setSelectedInvoices(new Set(allIds));
          setSelectAll(true);
        } else {
          // Fallback: select current page invoices only
          const currentPageIds = invoices.map(invoice => invoice.id);
          setSelectedInvoices(new Set(currentPageIds));
          setSelectAll(currentPageIds.length === invoices.length && invoices.length > 0);
        }
      } catch (err) {
        console.error("Error selecting all invoices:", err);
        // Fallback: select current page invoices only
        const currentPageIds = invoices.map(invoice => invoice.id);
        setSelectedInvoices(new Set(currentPageIds));
        setSelectAll(currentPageIds.length === invoices.length && invoices.length > 0);
        setError("Could not select all pages - selected current page only.");
      } finally {
        setLoadingSelectAll(false);
      }
    } else {
      setSelectedInvoices(new Set());
      setSelectAll(false);
    }
  };

  // Handle individual checkbox
  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelected = new Set(selectedInvoices);
    if (checked) {
      newSelected.add(invoiceId);
    } else {
      newSelected.delete(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  // Fetch all invoice IDs when filters change to keep track of total available
  useEffect(() => {
    if (user) {
      fetchAllInvoiceIds().then(setAllInvoiceIds);
    }
  }, [user, searchTerm, dateFrom, dateTo]);

  const buildQuery = (direction: 'next' | 'prev' | 'first' = 'first', startDoc?: DocumentSnapshot) => {
    if (!user) return null;
    
    // Use simpler query to avoid composite index requirements
    // We'll do filtering client-side in fetchInvoices
    let baseQuery = query(
      collection(db, "invoices"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    
    // Add pagination
    if (direction === 'next' && startDoc) {
      baseQuery = query(baseQuery, startAfter(startDoc), limit(ITEMS_PER_PAGE));
    } else if (direction === 'prev' && startDoc) {
      baseQuery = query(baseQuery, endBefore(startDoc), limitToLast(ITEMS_PER_PAGE));
    } else {
      baseQuery = query(baseQuery, limit(ITEMS_PER_PAGE));
    }
    
    return baseQuery;
  };

  const fetchInvoices = async (direction: 'next' | 'prev' | 'first' = 'first', startDoc?: DocumentSnapshot) => {
    if (!user) return;
    
    try {
      setPageLoading(true);
      setError(null);
      
      const invoiceQuery = buildQuery(direction, startDoc);
      if (!invoiceQuery) return;
      
      const querySnapshot = await getDocs(invoiceQuery);
      let invoicesData: InvoiceData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const invoice = {
          id: doc.id,
          invoiceId: data.invoiceId, // Include custom invoice ID
          companyName: data.companyName || '',
          companyVatNumber: data.companyVatNumber || '',
          invoiceDate: data.invoiceDate || '',
          total: data.total || 0,
          createdAt: data.createdAt,
          userId: data.userId
        };
        
        // Apply client-side filtering only if filters are active
        let include = true;
        
        // Date range filter
        if (dateFrom || dateTo) {
          const invoiceDate = invoice.invoiceDate;
          if (dateFrom && invoiceDate < dateFrom) include = false;
          if (dateTo && invoiceDate > dateTo) include = false;
        }
        
        // Search term filter
        if (searchTerm.trim() && include) {
          const searchLower = searchTerm.toLowerCase();
          include = 
            invoice.id.toLowerCase().includes(searchLower) ||
      (invoice.invoiceId && invoice.invoiceId.toLowerCase().includes(searchLower)) ||
            invoice.companyName.toLowerCase().includes(searchLower) ||
            invoice.companyVatNumber.toLowerCase().includes(searchLower);
        }
        
        if (include) {
          invoicesData.push(invoice);
        }
      });
      
      setInvoices(invoicesData);
      
      // Update pagination info
      const firstDoc = querySnapshot.docs[0] || null;
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      
      // Check if there are more documents for next page
      let hasNext = false;
      if (lastDoc && querySnapshot.docs.length === ITEMS_PER_PAGE) {
        const nextQuery = query(
          collection(db, "invoices"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(1)
        );
        const nextSnapshot = await getDocs(nextQuery);
        hasNext = !nextSnapshot.empty;
      }
      
      const newPagination: PaginationInfo = {
        currentPage: direction === 'next' ? pagination.currentPage + 1 : 
                     direction === 'prev' ? pagination.currentPage - 1 : 1,
        totalPages: 1, // We'll calculate this differently since Firestore doesn't give us total count easily
        hasNext,
        hasPrev: direction === 'next' ? true : 
                 direction === 'prev' ? pagination.currentPage > 2 : false,
        firstDoc,
        lastDoc
      };
      
      setPagination(newPagination);
      
      // Update page history for navigation
      if (direction === 'next' && firstDoc) {
        setPageHistory(prev => [...prev, firstDoc]);
      } else if (direction === 'prev') {
        setPageHistory(prev => prev.slice(0, -1));
      } else if (direction === 'first') {
        setPageHistory([]);
      }
      
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError("Failed to load invoices. Please try again.");
    } finally {
      setPageLoading(false);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasNext && pagination.lastDoc) {
      fetchInvoices('next', pagination.lastDoc);
    }
  };

  const handlePrevPage = () => {
    if (pagination.hasPrev && pageHistory.length > 0) {
      const prevFirstDoc = pageHistory[pageHistory.length - 1];
      fetchInvoices('prev', prevFirstDoc);
    }
  };

  const handleSearch = () => {
    setPagination({
      currentPage: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
      firstDoc: null,
      lastDoc: null
    });
    setPageHistory([]);
    // Clear selections when filters change
    setSelectedInvoices(new Set());
    setSelectAll(false);
    setAllInvoiceIds([]);
    fetchInvoices('first');
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setPagination({
      currentPage: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
      firstDoc: null,
      lastDoc: null
    });
    setPageHistory([]);
    // Clear selections when filters change
    setSelectedInvoices(new Set());
    setSelectAll(false);
    setAllInvoiceIds([]);
    // Use setTimeout to ensure state updates are applied before fetching
    setTimeout(() => {
      fetchInvoices('first');
    }, 0);
  };

  const handleViewInvoice = (invoiceId: string) => {
    window.open(`/invoice/${invoiceId}`, '_blank');
  };

  const handleDownloadVATSchedule = async () => {
    if (selectedInvoices.size === 0) {
      alert("Please select at least one invoice to download VAT schedule.");
      return;
    }

    try {
      setPageLoading(true);
      
      // Fetch user's registered company name
      let registeredName = 'Company';
      try {
        if (user?.uid) {
          const userProfileRef = doc(db, "userProfiles", user.uid);
          const userProfileSnap = await getDoc(userProfileRef);
          if (userProfileSnap.exists()) {
            const userData = userProfileSnap.data();
            registeredName = userData.companyName || userData.stationName || 'Company';
          }
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
      
      // Fetch detailed invoice data for selected invoices
      const invoiceDetails = [];
      for (const invoiceId of selectedInvoices) {
        try {
          const invoiceRef = doc(db, "invoices", invoiceId);
          const invoiceSnapshot = await getDoc(invoiceRef);
          
          if (invoiceSnapshot.exists()) {
            const invoiceData = invoiceSnapshot.data();
            // Verify this invoice belongs to the current user
            if (invoiceData.userId === user?.uid) {
              invoiceDetails.push({
                id: invoiceId,
                ...invoiceData
              });
            }
          }
        } catch (err) {
          console.error(`Error fetching invoice ${invoiceId}:`, err);
        }
      }

      if (invoiceDetails.length === 0) {
        alert("No invoice details could be retrieved.");
        return;
      }

      // Sort by invoice date for consistent ordering
      invoiceDetails.sort((a, b) => {
        const dateA = new Date(a.invoiceDate || '');
        const dateB = new Date(b.invoiceDate || '');
        return dateA.getTime() - dateB.getTime();
      });

      // Generate CSV content
      const csvHeaders = [
        "Serial No",
        "Invoice Date", 
        "Tax Invoice No",
        "Purchaser's TIN",
        "Name of the Purchaser",
        "Description",
        "Value of supply",
        "VAT Amount"
      ];

      const csvRows = invoiceDetails.map((invoice, index) => {
        // Clean VAT number by removing "- 7000" suffix if present
        const cleanVATNumber = (invoice.companyVatNumber || '')
          .replace(/\s*-\s*7000\s*$/, '')
          .trim();

        // Format date as DD/MM/YYYY
        const formatDate = (dateString: string) => {
          try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          } catch {
            return dateString;
          }
        };

        return [
          index + 1, // Serial No
          formatDate(invoice.invoiceDate || ''), // Invoice Date
                          invoice.invoiceId || invoice.id, // Tax Invoice No - use custom ID if available
          cleanVATNumber, // Purchaser's TIN
          invoice.companyName || '', // Name of the Purchaser
          "Fuel", // Description
          (invoice.subTotal || 0).toFixed(2), // Value of supply
          (invoice.vat18 || 0).toFixed(2) // VAT Amount
        ];
      });

      // Combine headers and rows
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        // Generate filename with registered name, date, and timestamp
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
        
        // Clean the registered name for filename (remove special characters)
        const cleanName = registeredName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        
        link.setAttribute('download', `${cleanName}_${dateStr}_${timeStr}.csv`);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        URL.revokeObjectURL(url);
      }

    } catch (err) {
      console.error("Error generating VAT schedule:", err);
      alert("An error occurred while generating the VAT schedule. Please try again.");
    } finally {
      setPageLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  if (loading || pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SubscriptionGate>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold text-gray-900">Invoices</h1>
              <p className="text-sm text-gray-500">
                {selectedInvoices.size > 0 ? `${selectedInvoices.size} selected` : `${invoices.length} invoices`}
              </p>
            </div>

            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Search and Filters - Mobile Optimized */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12"
                />
              </div>
              <Button 
                onClick={handleSearch}
                className="h-12 px-6"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <DatePicker
                  value={dateFrom}
                  onChange={setDateFrom}
                  placeholder="From date"
                  className="h-12"
                />
              </div>
              <div className="flex-1">
                <DatePicker
                  value={dateTo}
                  onChange={setDateTo}
                  placeholder="To date"
                  className="h-12"
                />
              </div>
              <Button 
                onClick={clearFilters}
                variant="outline"
                className="h-12 px-4"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Bulk Actions - Mobile Optimized */}
          {selectedInvoices.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedInvoices.size} invoice{selectedInvoices.size > 1 ? 's' : ''} selected
                </span>
                <Button
                  onClick={handleDownloadVATSchedule}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Download VAT
                </Button>
              </div>
            </div>
          )}

          {/* Mobile Invoice Cards */}
          <div className="space-y-3 md:hidden">
            {/* Select All Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  disabled={loadingSelectAll || invoices.length === 0}
                />
                <span className="text-sm font-medium text-gray-700">
                  {loadingSelectAll ? "Loading..." : "Select All"}
                  {allInvoiceIds.length > 0 && (
                    <span className="ml-1 text-xs text-gray-500">
                      ({allInvoiceIds.length} total)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Invoice Cards */}
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedInvoices.has(invoice.id)}
                    onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {invoice.companyName}
                      </h3>
                      <Button
                        onClick={() => handleViewInvoice(invoice.id)}
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        ID: {invoice.invoiceId || invoice.id}
                      </p>
                      <p className="text-sm text-gray-600">
                        VAT: {invoice.companyVatNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        Date: {formatDate(invoice.invoiceDate)}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(invoice.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (hidden on mobile) */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                      disabled={loadingSelectAll || invoices.length === 0}
                    />
                  </TableHead>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>VAT Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedInvoices.has(invoice.id)}
                        onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.invoiceId || invoice.id}
                    </TableCell>
                    <TableCell>{invoice.companyName}</TableCell>
                    <TableCell>{invoice.companyVatNumber}</TableCell>
                    <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleViewInvoice(invoice.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Empty State */}
          {invoices.length === 0 && !pageLoading && (
            <div className="text-center py-12">
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <p className="text-gray-500 mb-4">No invoices found</p>
                <Link href="/create-invoice">
                  <Button>Create Your First Invoice</Button>
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {(pagination.hasNext || pagination.hasPrev) && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                onClick={handlePrevPage}
                disabled={!pagination.hasPrev}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <span className="text-sm text-gray-600">
                Page {pagination.currentPage}
              </span>
              
              <Button
                onClick={handleNextPage}
                disabled={!pagination.hasNext}
                variant="outline"
                size="sm"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </main>
    </SubscriptionGate>
  );
} 