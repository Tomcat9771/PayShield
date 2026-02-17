import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, TrendingUp, Wallet, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from 'react-router-dom';

const StatsCard = ({ title, value, description, icon: Icon, color }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-600">
        {title}
      </CardTitle>
      <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </CardContent>
  </Card>
);

export default function Home() {
  // Fetch guards count
  const { data: guards, isLoading: loadingGuards } = useQuery({
    queryKey: ['guards'],
    queryFn: () => base44.entities.Guard.list(),
  });

  // Fetch recent transactions
  const { data: transactions, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 10),
  });

  // Calculate stats
  const totalVolume = transactions?.reduce((acc, tx) => acc + (tx.amount_gross || 0), 0) || 0;
  const totalCommission = transactions?.reduce((acc, tx) => acc + (tx.commission_amount || 0), 0) || 0;
  const activeGuards = guards?.filter(g => g.status === 'active').length || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your guard payments platform</p>
        </div>
        <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Volume" 
          value={`R${totalVolume.toFixed(2)}`}
          description="Gross transaction volume"
          icon={CreditCard}
          color="bg-blue-500"
        />
        <StatsCard 
          title="Commission Earned" 
          value={`R${totalCommission.toFixed(2)}`}
          description="Net platform revenue"
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatsCard 
          title="Active Guards" 
          value={loadingGuards ? "..." : activeGuards}
          description="Guards currently active"
          icon={Users}
          color="bg-indigo-500"
        />
        <StatsCard 
          title="Pending Payouts" 
          value="R0.00"
          description="Scheduled for next run"
          icon={Wallet}
          color="bg-amber-500"
        />
      </div>

      {/* Recent Transactions */}
      <Card className="col-span-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Link to="/transactions" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center">
            View All <ArrowUpRight className="h-4 w-4 ml-1" />
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guard</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTx ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : transactions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                transactions?.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.guard_name}</TableCell>
                    <TableCell>R{tx.amount_gross?.toFixed(2)}</TableCell>
                    <TableCell className="text-slate-500">R{tx.commission_amount?.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600 font-medium">R{tx.amount_net?.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        tx.status === 'paid' ? 'bg-green-100 text-green-700' : 
                        tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {tx.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-slate-500 text-xs">
                      {new Date(tx.created_date).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}