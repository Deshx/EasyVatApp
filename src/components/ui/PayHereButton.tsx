"use client";

import { useEffect } from "react";

interface PayHereButtonProps {
  payId?: string;
  className?: string;
}

export default function PayHereButton({ 
  payId = "o1d31073b", 
  className = "" 
}: PayHereButtonProps) {
  useEffect(() => {
    // Inject the PayHere script just once
    const scriptId = "payhere-button";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.payhere.lk/payhere.pay.button.js";
      script.async = true; // non-blocking
      document.body.appendChild(script);
    }
  }, []); // runs only on first mount

  return (
    <div 
      id="payhere-form" 
      data-pay-id={payId} 
      className={className}
    />
  );
} 