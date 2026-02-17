import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Lock, Smartphone, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";

// Commission configuration
const COMMISSION_PERCENTAGE = 0.05; // 5%

export default function PayPage() {
  const { guardId } = useParams();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [tip, setTip] = useState(0);
  const [paymentStep, setPaymentStep] = useState('amount'); // amount, method, processing

  // Fetch guard details
  const { data: guard, isLoading, error } = useQuery({
    queryKey: ['guard', guardId],
    queryFn: async () => {
      const results = await base44.entities.Guard.list({ 
        query: { id: guardId }, 
        limit: 1 
      });
      if (!results || results.length === 0) throw new Error('Guard not found');
      return results[0];
    },
    enabled: !!guardId
  });

  const processPaymentMutation = useMutation({
    mutationFn: async (paymentDetails) => {
      const gross = parseFloat(paymentDetails.amount);
      const commission = gross * COMMISSION_PERCENTAGE;
      const net = gross - commission;

      const transaction = {
        guard_id: guard.id,
        guard_name: guard.full_name,
        amount_gross: gross,
        commission_amount: parseFloat(commission.toFixed(2)),
        amount_net: parseFloat(net.toFixed(2)),
        status: 'paid', // Simulating immediate success
        payment_method: paymentDetails.method,
        created_date: new Date().toISOString()
      };
      
      return base44.entities.Transaction.create(transaction);
    },
    onSuccess: () => {
      navigate('/payment-success', { state: { guardName: guard.full_name, amount: amount } });
    },
    onError: () => {
      toast.error("Payment failed. Please try again.");
      setPaymentStep('amount');
    }
  });

  const handlePresetAmount = (val) => {
    setAmount(val.toString());
  };

  const handlePay = (method) => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setPaymentStep('processing');
    
    // Simulate processing delay
    setTimeout(() => {
      processPaymentMutation.mutate({ amount, method });
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !guard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Guard Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              The QR code you scanned seems to be invalid or the guard profile is no longer active.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header / Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 transform rotate-3">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">GuardPay</h1>
          <div className="flex items-center gap-2 mt-2 px-4 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <Lock className="h-3 w-3" /> Secure Checkout
          </div>
        </div>

        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-2 bg-indigo-600 w-full" />
          
          <div className="p-6 bg-slate-50 border-b border-slate-100 text-center">
            <p className="text-sm text-slate-500 uppercase tracking-wide font-semibold mb-1">You are paying</p>
            <h2 className="text-2xl font-bold text-slate-900">{guard.full_name}</h2>
            <p className="text-sm text-slate-500 flex items-center justify-center gap-1 mt-1">
              <MapPinIcon className="h-3 w-3" /> {guard.site_location || 'Parking Attendant'}
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {paymentStep === 'amount' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <Label className="text-slate-600 font-medium mb-2 block">Enter Amount (ZAR)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">R</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10 h-16 text-2xl font-bold"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[10, 20, 50].map((val) => (
                    <button
                      key={val}
                      onClick={() => handlePresetAmount(val)}
                      className={`
                        py-3 rounded-xl text-lg font-medium transition-all
                        ${amount === val.toString() 
                          ? 'bg-indigo-600 text-white shadow-md scale-105' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50'}
                      `}
                    >
                      R{val}
                    </button>
                  ))}
                </div>

                <Button 
                  className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                  onClick={() => setPaymentStep('method')}
                  disabled={!amount}
                >
                  Next
                </Button>
              </div>
            )}

            {paymentStep === 'method' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                 <div className="text-center mb-6">
                    <p className="text-sm text-slate-500">Total to pay</p>
                    <p className="text-3xl font-bold text-slate-900">R{parseFloat(amount).toFixed(2)}</p>
                 </div>

                 <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full h-16 justify-start px-6 text-lg relative overflow-hidden group"
                      onClick={() => handlePay('card')}
                    >
                      <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-4 z-10">
                        <CreditCard className="h-5 w-5 text-indigo-600" />
                      </div>
                      <span className="z-10">Pay with Card</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full h-16 justify-start px-6 text-lg relative overflow-hidden group"
                      onClick={() => handlePay('apple_pay')}
                    >
                       <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                       <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center mr-4 z-10">
                        <Smartphone className="h-5 w-5 text-white" />
                      </div>
                      <span className="z-10">Apple Pay</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full h-16 justify-start px-6 text-lg relative overflow-hidden group"
                      onClick={() => handlePay('instant_eft')}
                    >
                       <div className="absolute inset-0 bg-green-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                       <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-4 z-10">
                        <Banknote className="h-5 w-5 text-green-600" />
                      </div>
                      <span className="z-10">Instant EFT</span>
                    </Button>
                 </div>

                 <Button 
                    variant="ghost" 
                    className="w-full mt-4" 
                    onClick={() => setPaymentStep('amount')}
                  >
                    Back
                  </Button>
              </div>
            )}

            {paymentStep === 'processing' && (
              <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                <div className="relative mb-6">
                  <div className="h-20 w-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Processing Payment...</h3>
                <p className="text-slate-500">Please do not close this window</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 p-4 text-center text-xs text-slate-400">
            Powered by GuardPay • Secure SSL Encrypted
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function MapPinIcon({ className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}