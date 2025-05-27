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
import { Search, Eye, ChevronLeft, ChevronRight, Filter, Download, Calendar, Building, FileText } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { SubscriptionGate } from "@/components/ui/SubscriptionGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                  <p className="text-sm text-gray-500">
                    {selectedInvoices.size > 0 
                      ? `${selectedInvoices.size} selected` 
                      : `${allInvoiceIds.length} total invoices`
                    }
                  </p>
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center space-x-3">
                {selectedInvoices.size > 0 && (
                  <Button
                    onClick={handleDownloadVATSchedule}
                    className="bg-green-600 hover:bg-green-700 hidden sm:flex"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">Download VAT Schedule</span>
                    <span className="md:hidden">Download</span>
                  </Button>
                )}
                <Link href="/create-invoice">
                  <Button className="hidden sm:flex">
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">Create Invoice</span>
                    <span className="md:hidden">Create</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Search and Filters Card */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Filter className="h-5 w-5 mr-2" />
                Search & Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                {/* Search Input */}
                <div className="md:col-span-2 lg:col-span-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by company name, VAT number, or invoice ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                {/* Date From */}
                <div className="md:col-span-1 lg:col-span-2">
                  <DatePicker
                    value={dateFrom}
                    onChange={setDateFrom}
                    placeholder="From date"
                    className="h-11"
                  />
                </div>

                {/* Date To */}
                <div className="md:col-span-1 lg:col-span-2">
                  <DatePicker
                    value={dateTo}
                    onChange={setDateTo}
                    placeholder="To date"
                    className="h-11"
                  />
                </div>

                {/* Action Buttons */}
                <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                  <Button 
                    onClick={handleSearch}
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                  <Button 
                    onClick={clearFilters}
                    variant="outline"
                    className="flex-1 h-11"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions - Desktop version by default */}
          {selectedInvoices.size > 0 && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {selectedInvoices.size} invoice{selectedInvoices.size > 1 ? 's' : ''} selected
                    </Badge>
                    <span className="text-sm text-gray-500 hidden sm:block">
                      Ready for bulk actions
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setSelectedInvoices(new Set())}
                      variant="outline"
                      size="sm"
                      className="hidden sm:flex"
                    >
                      Clear Selection
                    </Button>
                    <Button
                      onClick={handleDownloadVATSchedule}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Download VAT Schedule</span>
                      <span className="sm:hidden">Download</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          {pageLoading ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading invoices...</p>
                </div>
              </CardContent>
            </Card>
          ) : invoices.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || dateFrom || dateTo 
                      ? "Try adjusting your search filters or date range."
                      : "Get started by creating your first invoice."
                    }
                  </p>
                  <div className="flex justify-center space-x-3">
                    {(searchTerm || dateFrom || dateTo) && (
                      <Button onClick={clearFilters} variant="outline">
                        Clear Filters
                      </Button>
                    )}
                    <Link href="/create-invoice">
                      <Button>
                        <FileText className="h-4 w-4 mr-2" />
                        Create Invoice
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table - Show by default, hide on mobile/tablet */}
              <Card className="block md:block">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectAll}
                            onCheckedChange={handleSelectAll}
                            disabled={loadingSelectAll || invoices.length === 0}
                          />
                        </TableHead>
                        <TableHead className="font-semibold">Invoice ID</TableHead>
                        <TableHead className="font-semibold">Company Name</TableHead>
                        <TableHead className="font-semibold">VAT Number</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold text-right">Total Amount</TableHead>
                        <TableHead className="font-semibold w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow 
                          key={invoice.id} 
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedInvoices.has(invoice.id)}
                              onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-blue-600">
                              {invoice.invoiceId || invoice.id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-gray-900">
                              {invoice.companyName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {invoice.companyVatNumber}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-gray-600">
                              {formatDate(invoice.invoiceDate)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(invoice.total)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleViewInvoice(invoice.id)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Mobile and Tablet Invoice Cards - Hidden by default, show only on small screens */}
              <div className="space-y-4 hidden">
                {/* Select All Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
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
                  </CardContent>
                </Card>

                {/* Invoice Cards */}
                {invoices.map((invoice) => (
                  <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedInvoices.has(invoice.id)}
                          onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900 truncate mb-1">
                                {invoice.companyName}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {invoice.invoiceId || invoice.id}
                              </Badge>
                            </div>
                            <Button
                              onClick={() => handleViewInvoice(invoice.id)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Building className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="truncate">VAT: {invoice.companyVatNumber}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span>{formatDate(invoice.invoiceDate)}</span>
                            </div>
                            <div className="pt-2">
                              <span className="text-lg font-bold text-gray-900">
                                {formatCurrency(invoice.total)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {(pagination.hasNext || pagination.hasPrev) && (
            <div className="flex justify-center items-center space-x-4 mt-6">
              <Button
                onClick={handlePrevPage}
                disabled={!pagination.hasPrev}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <Badge variant="secondary" className="px-3 py-1">
                Page {pagination.currentPage}
              </Badge>
              
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

          {/* Mobile FAB for Create Invoice */}
          <div className="sm:hidden fixed bottom-6 right-6">
            <Link href="/create-invoice">
              <Button size="lg" className="rounded-full h-14 w-14 p-0 shadow-lg">
                <FileText className="h-6 w-6" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </SubscriptionGate>
  );
} 