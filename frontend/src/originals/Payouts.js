import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function PayoutsPage() {
  const queryClient = useQueryClient();

  // In a real app, this would be a complex aggregation query on the backend
  // For MVP, we'll fetch all active guards and their unpaid transactions
  
  const { data: guards } = useQuery({
    queryKey: ['guards'],
    queryFn: () => base44.entities.Guard.list(),
  });

  const { data: transactions } = useQuery({
    queryKey: ['all_transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 500),
  });

  // Mock aggregation of unpaid balances
  // In production this would be pre-calculated by backend jobs
  const balances = React.useMemo(() => {
    if (!guards || !transactions) return [];

    const guardBalances = {};
    
    transactions.forEach(tx => {
      // Only count paid transactions towards balance
      if (tx.status === 'paid') {
        if (!guardBalances[tx.guard_id]) {
          guardBalances[tx.guard_id] = {
            id: tx.guard_id,
            name: tx.guard_name,
            total_net: 0,
            tx_count: 0
          };
        }
        guardBalances[tx.guard_id].total_net += (tx.amount_net || 0);
        guardBalances[tx.guard_id].tx_count += 1;
      }
    });

    return Object.values(guardBalances).filter(b => b.total_net > 0);
  }, [guards, transactions]);

  const runPayoutMutation = useMutation({
    mutationFn: async (guardBalance) => {
      // 1. Create Payout Record
      await base44.entities.Payout.create({
        guard_id: guardBalance.id,
        guard_name: guardBalance.name,
        amount: parseFloat(guardBalance.total_net.toFixed(2)),
        status: 'processed',
        payout_date: new Date().toISOString().split('T')[0],
        reference_code: `PO-${Math.floor(Math.random() * 10000)}`
      });
      
      // 2. In a real app, we would also update all the transactions to 'settled' status
      // here we just simulate the payout creation
      return true;
    },
    onSuccess: () => {
      toast.success("Payout initiated successfully");
      queryClient.invalidateQueries(['payouts']);
    }
  });

  // Fetch recent payout history
  const { data: recentPayouts } = useQuery({
    queryKey: ['payouts'],
    queryFn: () => base44.entities.Payout.list('-created_date', 20),
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Payouts</h1>
        <p className="text-slate-500 mt-1">Settlement management and guard payments</p>
      </div>

      {/* Actionable Balances */}
      <Card className="border-indigo-100 bg-indigo-50/50">
        <CardHeader>
          <CardTitle className="text-indigo-900">Ready for Payout</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guard Name</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Net Balance</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    All settled! No pending balances found.
                  </TableCell>
                </TableRow>
              ) : (
                balances.map((balance) => (
                  <TableRow key={balance.id}>
                    <TableCell className="font-medium text-indigo-900">{balance.name}</TableCell>
                    <TableCell>{balance.tx_count}</TableCell>
                    <TableCell className="font-bold text-green-600">R{balance.total_net.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => runPayoutMutation.mutate(balance)}
                        disabled={runPayoutMutation.isPending}
                      >
                        {runPayoutMutation.isPending ? "Processing..." : "Pay Now"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Guard</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayouts?.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>{payout.payout_date}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{payout.reference_code}</TableCell>
                  <TableCell>{payout.guard_name}</TableCell>
                  <TableCell className="font-medium">R{payout.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {payout.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!recentPayouts || recentPayouts.length === 0) && (
                 <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No payout history available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}