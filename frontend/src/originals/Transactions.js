import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Search, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 100),
  });

  const filteredTransactions = transactions?.filter(tx => {
    const matchesSearch = tx.guard_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tx.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalGross = filteredTransactions?.reduce((acc, tx) => acc + (tx.amount_gross || 0), 0) || 0;
  const totalCommission = filteredTransactions?.reduce((acc, tx) => acc + (tx.commission_amount || 0), 0) || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 mt-1">Live payment feed and revenue tracking</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-500">Total Volume (Filtered)</div>
            <div className="text-2xl font-bold mt-1">R{totalGross.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-500">Total Commission (Filtered)</div>
            <div className="text-2xl font-bold mt-1 text-green-600">R{totalCommission.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-500">Transaction Count</div>
            <div className="text-2xl font-bold mt-1">{filteredTransactions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by guard name or transaction ID..."
            className="pl-9 bg-slate-50 border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2 text-slate-600">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Guard</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Gross Amount</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Net Payable</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">Loading transactions...</TableCell>
              </TableRow>
            ) : filteredTransactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  No transactions match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions?.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-slate-600 whitespace-nowrap">
                    {new Date(tx.created_date).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{tx.guard_name}</TableCell>
                  <TableCell className="capitalize text-slate-600">{tx.payment_method?.replace('_', ' ')}</TableCell>
                  <TableCell>R{tx.amount_gross?.toFixed(2)}</TableCell>
                  <TableCell className="text-slate-500">R{tx.commission_amount?.toFixed(2)}</TableCell>
                  <TableCell className="font-medium text-green-600">R{tx.amount_net?.toFixed(2)}</TableCell>
                  <TableCell>
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        tx.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                        tx.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {tx.status}
                      </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}