import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useInvoiceSession } from '@/lib/contexts/InvoiceSessionContext';
import './InvoiceGenerator.css';

interface InvoiceProps {
  companyName: string;
  companyAddress: string;
  companyVatNumber: string;
  invoiceDate: string;
  customerName: string;
  customerVatNumber: string;
  vehicleNumber?: string;
}

export default function InvoiceGenerator({
  companyName,
  companyAddress,
  companyVatNumber,
  invoiceDate,
  customerName,
  customerVatNumber,
  vehicleNumber
}: InvoiceProps) {
  const { bills } = useInvoiceSession();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Generate invoice ID based on date
  const generateInvoiceId = () => {
    const date = new Date(invoiceDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 100000).toString().padStart(6, '0');
    return `${random}/${month}/${year}/000065`;
  };
  
  useEffect(() => {
    // Fetch user profile data
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const profileDoc = await getDoc(doc(db, 'userProfiles', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  if (loading) {
    return <div className="animate-pulse h-screen bg-gray-100"></div>;
  }
  
  // Consolidate fuel items
  const consolidateFuelItems = () => {
    const fuelItems: { [key: string]: { quantity: number; price: number; amount: number } } = {};
    
    bills.forEach(bill => {
      const fuelType = bill.fuelType || 'Unknown';
      
      if (!fuelItems[fuelType]) {
        // Convert amounts and rates from strings to numbers and perform calculations
        const totalAmount = parseFloat(bill.amount) / 1.18; // Remove VAT
        const marketRate = parseFloat(bill.rate) / 1.18; // Remove VAT
        const quantity = marketRate > 0 ? totalAmount / marketRate : 0;
        
        fuelItems[fuelType] = {
          quantity,
          price: marketRate,
          amount: totalAmount
        };
      } else {
        // Add to existing item
        const totalAmount = parseFloat(bill.amount) / 1.18; // Remove VAT
        const marketRate = parseFloat(bill.rate) / 1.18; // Remove VAT
        const quantity = marketRate > 0 ? totalAmount / marketRate : 0;
        
        fuelItems[fuelType].quantity += quantity;
        fuelItems[fuelType].amount += totalAmount;
        // We keep the last price for simplicity
        fuelItems[fuelType].price = marketRate;
      }
    });
    
    return Object.entries(fuelItems).map(([fuelType, data]) => ({
      name: fuelType,
      quantity: data.quantity.toFixed(6), // Formatted with 6 decimal places
      price: data.price.toFixed(6),
      amount: data.amount.toFixed(2)
    }));
  };
  
  const fuelItems = consolidateFuelItems();
  const subtotal = fuelItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const vat = subtotal * 0.18;
  const total = subtotal + vat;
  const invoiceId = generateInvoiceId();
  const formattedDate = new Date(invoiceDate).toISOString().split('T')[0].replace(/-/g, '-');
  
  return (
    <div className="invoice-container">
      {/* Header */}
      <div className="invoice-header">
        <h1 className="invoice-company-name">{userProfile?.companyName || companyName}</h1>
        <p>{userProfile?.address || companyAddress}</p>
        <p>
          Tel: {userProfile?.phone || 'N/A'}, Email: {userProfile?.email || 'N/A'}
        </p>
        <p>Vat No: {userProfile?.vatNumber || companyVatNumber}</p>
      </div>
      
      {/* Invoice Details */}
      <div className="invoice-details">
        <div>
          <p><span className="font-semibold">Invoice ID:</span> {invoiceId}</p>
          <p><span className="font-semibold">Date:</span> {formattedDate}</p>
        </div>
        <div>
          <p><span className="font-semibold">Customer:</span> {customerName}</p>
          <p><span className="font-semibold">Customer VAT:</span> {customerVatNumber}</p>
          {vehicleNumber && (
            <p><span className="font-semibold">Vehicle Number:</span> {vehicleNumber}</p>
          )}
        </div>
      </div>
      
      {/* TAX INVOICE Title */}
      <div className="invoice-title">
        <h2>TAX INVOICE</h2>
      </div>
      
      {/* Invoice Table */}
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Fuel Type</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {fuelItems.map((item) => (
            <tr key={item.name}>
              <td>{item.name}</td>
              <td>{parseFloat(item.quantity).toFixed(6)} l</td>
              <td>{parseFloat(item.price).toFixed(6)}</td>
              <td>{parseFloat(item.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Totals */}
      <div className="invoice-totals">
        <div className="invoice-total-row">
          <div className="invoice-total-item">
            <span className="font-semibold">Sub Total:</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          <div className="invoice-total-item">
            <span className="font-semibold">Vat:</span>
            <span>{vat.toFixed(2)}</span>
          </div>
          <div className="invoice-total-item">
            <span className="font-semibold">Total:</span>
            <span>{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="invoice-footer">
        <p className="font-semibold">** THIS IS A COMPUTER GENERATED INVOICE. NO SIGNATURE REQUIRED. **</p>
        <p className="mt-2">Thanking you for choosing us!</p>
      </div>
    </div>
  );
} 