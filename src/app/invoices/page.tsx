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
  limit, 
  startAfter,
  endBefore,
  limitToLast,
  DocumentSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface InvoiceData {
  id: string;
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
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    
    if (!loading && user) {
      fetchInvoices();
    }
  }, [user, loading, router]);

  const buildQuery = (direction: 'next' | 'prev' | 'first' = 'first', startDoc?: DocumentSnapshot) => {
    if (!user) return null;
    
    let baseQuery = query(
      collection(db, "invoices"),
      where("userId", "==", user.uid)
    );
    
    // Add search filter if search term exists
    if (searchTerm.trim()) {
      // Since Firestore doesn't support case-insensitive search or contains operations well,
      // we'll fetch all and filter on the client side for invoice numbers
      // For better performance in production, consider using Algolia or similar
    }
    
    // Add date range filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom + "T00:00:00");
      baseQuery = query(baseQuery, where("invoiceDate", ">=", fromDate.toISOString().split('T')[0]));
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo + "T23:59:59");
      baseQuery = query(baseQuery, where("invoiceDate", "<=", toDate.toISOString().split('T')[0]));
    }
    
    // Add ordering and pagination
    baseQuery = query(baseQuery, orderBy("createdAt", "desc"));
    
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
        invoicesData.push({
          id: doc.id,
          companyName: data.companyName || '',
          companyVatNumber: data.companyVatNumber || '',
          invoiceDate: data.invoiceDate || '',
          total: data.total || 0,
          createdAt: data.createdAt,
          userId: data.userId
        });
      });
      
      // Client-side filtering for invoice ID search
      if (searchTerm.trim()) {
        invoicesData = invoicesData.filter(invoice => 
          invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.companyVatNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
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
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setPageHistory([]);
    fetchInvoices('first');
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setPageHistory([]);
    // Trigger a fresh fetch after clearing filters
    fetchInvoices('first');
  };

  const handleViewInvoice = (invoiceId: string) => {
    window.open(`/invoice/${invoiceId}`, '_blank');
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">View Invoices</h1>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
            {/* Search by Invoice ID */}
            <div className="lg:col-span-6">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Invoices
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by invoice ID, customer name, or VAT number..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            
            {/* Date From */}
            <div className="lg:col-span-3">
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                id="dateFrom"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Date To */}
            <div className="lg:col-span-3">
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                id="dateTo"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-lg">No invoices found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm || dateFrom || dateTo 
                  ? "Try adjusting your filters or search criteria" 
                  : "Create your first invoice to see it here"
                }
              </p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="grid grid-cols-6 gap-4 text-sm font-medium text-gray-700">
                  <div>Invoice ID</div>
                  <div>Date</div>
                  <div>Customer Name</div>
                  <div>VAT Number</div>
                  <div>Total Amount</div>
                  <div>Action</div>
                </div>
              </div>
              
              {/* Table Body */}
              <div>
                {invoices.map((invoice) => (
                  <div 
                    key={invoice.id}
                    className="px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="grid grid-cols-6 gap-4 items-center">
                      <div className="font-mono text-sm text-blue-600">
                        #{invoice.id.slice(0, 8)}...
                      </div>
                      <div className="text-sm text-gray-900">
                        {formatDate(invoice.invoiceDate)}
                      </div>
                      <div className="text-sm text-gray-900 truncate">
                        {invoice.companyName}
                      </div>
                      <div className="text-sm text-gray-600 font-mono">
                        {invoice.companyVatNumber}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total)}
                      </div>
                      <div>
                        <button
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Invoice
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {invoices.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {pagination.currentPage} • Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={!pagination.hasPrev}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
              
              <button
                onClick={handleNextPage}
                disabled={!pagination.hasNext}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 