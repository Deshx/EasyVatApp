import React from 'react';

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
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <div className="print:block" id="invoice-printable">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">{stationName}</h1>
          <p className="text-sm">{stationAddress}</p>
          <p className="text-sm">Tel: {stationPhone} | {stationEmail}</p>
          <p className="text-sm">VAT No: {stationVatNumber}</p>
        </div>
        
        {/* Invoice Info */}
        <div className="flex justify-between mb-6">
          <div>
            <p><span className="font-semibold">Invoice ID:</span> {invoiceId}</p>
            <p><span className="font-semibold">Date:</span> {formattedDate}</p>
          </div>
          <div className="text-right">
            <p><span className="font-semibold">Bill To:</span> {companyName}</p>
            <p><span className="font-semibold">VAT No:</span> {companyVatNumber}</p>
          </div>
        </div>
        
        {/* Table header - exact style from image */}
        <div>
          <div className="grid grid-cols-4 py-2 border-t border-b border-gray-300">
            <div className="font-semibold">Fuel Type</div>
            <div className="text-right font-semibold">Qty (L)</div>
            <div className="text-right font-semibold">Rate ex-VAT</div>
            <div className="text-right font-semibold">Amount ex-VAT</div>
          </div>
        </div>
        
        {/* Invoice Items */}
        <div>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-4 py-3 border-b border-gray-100">
              <div>{item.fuelTypeName || item.fuelType || "Unknown Fuel Type"}</div>
              <div className="text-right">{formatNumber(item.quantityLitres)}</div>
              <div className="text-right">{formatNumber(item.marketRate)}</div>
              <div className="text-right">{formatNumber(item.amount)}</div>
            </div>
          ))}
        </div>
        
        {/* Totals - exactly like the image */}
        <div className="mt-6">
          <div className="grid grid-cols-2">
            <div></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-right font-semibold">Sub-total:</div>
              <div className="text-right">{formatNumber(subTotal)}</div>
              
              <div className="text-right font-semibold">VAT 18%:</div>
              <div className="text-right">{formatNumber(vat18)}</div>
              
              <div className="text-right font-semibold border-t border-gray-300 pt-1">Total:</div>
              <div className="text-right font-bold border-t border-gray-300 pt-1">{formatNumber(total)}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons - not printed */}
      <div className="print:hidden mt-8 flex justify-end">
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