import React from 'react';
import './InvoicePreview.css';

interface InvoiceItem {
  fuelType: string;
  fuelTypeName?: string;
  quantityLitres: number;
  marketRate: number;
  amount: number;
}

interface InvoicePreviewProps {
  invoiceId: string; // This will now be the custom EV-XXX-YYYY-0001 format
  invoiceDate: string;
  companyName: string;
  companyVatNumber: string;
  stationName: string;
  stationAddress: string;
  stationPhone: string;
  stationEmail: string;
  stationVatNumber: string;
  items: InvoiceItem[];
  subTotal: number;
  vat18: number;
  total: number;
  onPrint?: () => void;
  onSendEmail?: () => void;
}

export default function InvoicePreview({
  invoiceId,
  invoiceDate,
  companyName,
  companyVatNumber,
  stationName,
  stationAddress,
  stationPhone,
  stationEmail,
  stationVatNumber,
  items,
  subTotal,
  vat18,
  total,
  onPrint,
  onSendEmail
}: InvoicePreviewProps) {
  const formattedDate = new Date(invoiceDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Format numbers with 2 decimal places
  const formatNumber = (num: number) => {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Extract fuel type name without price per litre
  const getFuelTypeDisplayName = (item: InvoiceItem) => {
    if (item.fuelTypeName) {
      // Remove the price per litre part (e.g., "(Rs. 341/L)")
      return item.fuelTypeName.replace(/\s*\(Rs\.\s*[\d.]+\/L\)\s*$/, '').trim();
    }
    return item.fuelType || "Unknown Fuel Type";
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-4xl mx-auto">
      {/* Meta tag to disable automatic phone/email detection */}
      <meta name="format-detection" content="telephone=no, email=no" />
      
      {/* Responsive invoice container */}
      <div 
        className="invoice-printable bg-white mx-auto p-4 sm:p-6 md:p-8 lg:p-12 min-h-0 sm:min-h-[297mm]"
        style={{
          width: '100%',
          maxWidth: '210mm',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">{stationName}</h1>
          <p className="text-sm sm:text-base mb-1">{stationAddress}</p>
          <p 
            className="text-sm sm:text-base mb-1" 
            style={{
              color: 'inherit',
              textDecoration: 'none',
              WebkitTextDecorationLine: 'none'
            }}
          >
            <span style={{textDecoration: 'none', color: 'inherit'}}>Tel: {stationPhone} | {stationEmail}</span>
          </p>
          <p className="text-sm sm:text-base">VAT No: {stationVatNumber}</p>
        </div>
        
        {/* Invoice Info */}
        <div className="flex flex-col sm:flex-row sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <p className="text-sm sm:text-base"><span className="font-semibold">Invoice ID:</span> {invoiceId}</p>
            <p className="text-sm sm:text-base"><span className="font-semibold">Date:</span> {formattedDate}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm sm:text-base"><span className="font-semibold">Bill To:</span> {companyName}</p>
            <p className="text-sm sm:text-base"><span className="font-semibold">VAT No:</span> {companyVatNumber}</p>
          </div>
        </div>
        
        {/* Table header */}
        <div>
          <div className="grid grid-cols-4 py-2 sm:py-3 border-t-2 border-b-2 border-gray-800">
            <div className="font-semibold text-xs sm:text-sm md:text-base">Fuel Type</div>
            <div className="text-right font-semibold text-xs sm:text-sm md:text-base">Qty (L)</div>
            <div className="text-right font-semibold text-xs sm:text-sm md:text-base">Rate ex-VAT</div>
            <div className="text-right font-semibold text-xs sm:text-sm md:text-base">Amount ex-VAT</div>
          </div>
        </div>
        
        {/* Invoice Items */}
        <div>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-4 py-3 sm:py-4 border-b border-gray-200">
              <div className="text-xs sm:text-sm md:text-base">{getFuelTypeDisplayName(item)}</div>
              <div className="text-right text-xs sm:text-sm md:text-base">{formatNumber(item.quantityLitres)}</div>
              <div className="text-right text-xs sm:text-sm md:text-base">{formatNumber(item.marketRate)}</div>
              <div className="text-right text-xs sm:text-sm md:text-base">{formatNumber(item.amount)}</div>
            </div>
          ))}
        </div>
        
        {/* Totals */}
        <div className="mt-6 sm:mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="hidden sm:block"></div>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="text-right font-semibold text-xs sm:text-sm md:text-base">Sub-total:</div>
              <div className="text-right text-xs sm:text-sm md:text-base">{formatNumber(subTotal)}</div>
              
              <div className="text-right font-semibold text-xs sm:text-sm md:text-base">VAT 18%:</div>
              <div className="text-right text-xs sm:text-sm md:text-base">{formatNumber(vat18)}</div>
              
              <div className="text-right font-semibold text-xs sm:text-sm md:text-base border-t-2 border-gray-800 pt-2">Total:</div>
              <div className="text-right font-bold text-xs sm:text-sm md:text-base border-t-2 border-gray-800 pt-2">{formatNumber(total)}</div>
            </div>
          </div>
        </div>
        
        {/* Footer Message */}
        <div className="mt-8 sm:mt-12 text-center">
          <p className="text-xs sm:text-sm text-gray-600 italic">
            This is a computer generated invoice. No signature required. Thank you for choosing us!
          </p>
        </div>
      </div>
      
      {/* Print Button - not printed, full width on mobile */}
      <div className="print-hidden p-4 sm:p-6 sm:flex sm:justify-end">
        {onPrint && (
          <button
            onClick={onPrint}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            Print Invoice
          </button>
        )}
      </div>
    </div>
  );
} 