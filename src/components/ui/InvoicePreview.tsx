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
  invoiceId: string;
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
    <div className="bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      {/* A4 sized container with proper padding and centering */}
      <div 
        className="invoice-printable bg-white mx-auto"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{stationName}</h1>
          <p className="text-base mb-1">{stationAddress}</p>
          <p className="text-base mb-1">Tel: {stationPhone} | {stationEmail}</p>
          <p className="text-base">VAT No: {stationVatNumber}</p>
        </div>
        
        {/* Invoice Info */}
        <div className="flex justify-between mb-8">
          <div>
            <p className="text-base"><span className="font-semibold">Invoice ID:</span> {invoiceId}</p>
            <p className="text-base"><span className="font-semibold">Date:</span> {formattedDate}</p>
          </div>
          <div className="text-right">
            <p className="text-base"><span className="font-semibold">Bill To:</span> {companyName}</p>
            <p className="text-base"><span className="font-semibold">VAT No:</span> {companyVatNumber}</p>
          </div>
        </div>
        
        {/* Table header */}
        <div>
          <div className="grid grid-cols-4 py-3 border-t-2 border-b-2 border-gray-800">
            <div className="font-semibold text-base">Fuel Type</div>
            <div className="text-right font-semibold text-base">Qty (L)</div>
            <div className="text-right font-semibold text-base">Rate ex-VAT</div>
            <div className="text-right font-semibold text-base">Amount ex-VAT</div>
          </div>
        </div>
        
        {/* Invoice Items */}
        <div>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-4 py-4 border-b border-gray-200">
              <div className="text-base">{getFuelTypeDisplayName(item)}</div>
              <div className="text-right text-base">{formatNumber(item.quantityLitres)}</div>
              <div className="text-right text-base">{formatNumber(item.marketRate)}</div>
              <div className="text-right text-base">{formatNumber(item.amount)}</div>
            </div>
          ))}
        </div>
        
        {/* Totals */}
        <div className="mt-8">
          <div className="grid grid-cols-2">
            <div></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-right font-semibold text-base">Sub-total:</div>
              <div className="text-right text-base">{formatNumber(subTotal)}</div>
              
              <div className="text-right font-semibold text-base">VAT 18%:</div>
              <div className="text-right text-base">{formatNumber(vat18)}</div>
              
              <div className="text-right font-semibold text-base border-t-2 border-gray-800 pt-2">Total:</div>
              <div className="text-right font-bold text-base border-t-2 border-gray-800 pt-2">{formatNumber(total)}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons - not printed */}
      <div className="print-hidden p-6 flex justify-end">
        {onPrint && (
          <button
            onClick={onPrint}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Print Invoice
          </button>
        )}
      </div>
    </div>
  );
} 