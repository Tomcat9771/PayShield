import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccessPage() {
  const location = useLocation();
  const { guardName, amount } = location.state || { guardName: 'Guard', amount: '0.00' };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-xl overflow-hidden text-center">
        <div className="bg-green-500 h-2 w-full" />
        <CardContent className="pt-12 pb-8 px-6">
          <div className="mb-6 flex justify-center">
            <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
          <p className="text-slate-500 mb-8">
            Thank you! You've successfully sent payment.
          </p>

          <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
            <div className="text-sm text-slate-500 mb-1">Amount Paid</div>
            <div className="text-3xl font-bold text-slate-900 mb-4">R{parseFloat(amount).toFixed(2)}</div>
            
            <div className="h-px bg-slate-200 w-full my-4" />
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Recipient</span>
              <span className="font-medium text-slate-900">{guardName}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-slate-500">Date</span>
              <span className="font-medium text-slate-900">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            A receipt has been sent to your email if you provided one.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}