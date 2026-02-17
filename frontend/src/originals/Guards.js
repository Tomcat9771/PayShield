import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, QrCode, MoreHorizontal, Download, ExternalLink, MapPin, Phone, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function GuardsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedGuardQR, setSelectedGuardQR] = useState(null);
  const [payoutMethod, setPayoutMethod] = useState("cash_voucher");

  const queryClient = useQueryClient();

  const { data: guards, isLoading, error } = useQuery({
    queryKey: ['guards'],
    queryFn: async () => {
      console.log("Fetching guards...");
      try {
        const data = await base44.entities.Guard.list();
        console.log("Fetched guards raw data:", data);
        // Client-side sort just to be safe/robust
        return data ? data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)) : [];
      } catch (err) {
        console.error("Error fetching guards:", err);
        throw err;
      }
    },
  });

  const createGuardMutation = useMutation({
    mutationFn: (data) => base44.entities.Guard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['guards']);
      setIsAddDialogOpen(false);
      toast.success("Guard added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add guard");
      console.error(error);
    }
  });

  const filteredGuards = guards?.filter(guard => 
    guard.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guard.site_location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddGuard = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      full_name: formData.get('full_name'),
      id_number: formData.get('id_number'),
      phone_number: formData.get('phone_number'),
      site_location: formData.get('site_location'),
      payout_method: payoutMethod,
      status: 'active'
    };
    
    if (!data.full_name || !data.id_number || !data.phone_number) {
      toast.error("Please fill in all required fields");
      return;
    }

    console.log("Creating guard with data:", data);
    createGuardMutation.mutate(data);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Guards</h1>
          <p className="text-slate-500 mt-1">Manage your guard registry and QR codes</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Add New Guard
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name or location..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Payout Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : filteredGuards?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                  No guards found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredGuards?.map((guard) => (
                <TableRow key={guard.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{guard.full_name}</span>
                      <span className="text-xs text-slate-500">{guard.id_number}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-slate-600 text-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      {guard.site_location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-slate-600 text-sm">
                      <Phone className="h-3 w-3 mr-1" />
                      {guard.phone_number}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-slate-600 text-sm">
                      <CreditCard className="h-3 w-3 mr-1" />
                      {guard.payout_method?.replace('_', ' ')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={guard.status === 'active' ? 'success' : 'secondary'} className={
                      guard.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-700'
                    }>
                      {guard.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        onClick={() => setSelectedGuardQR(guard)}
                      >
                        <QrCode className="h-3.5 w-3.5 mr-1.5" />
                        QR Code
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>Edit Details</DropdownMenuItem>
                          <DropdownMenuItem>View Transactions</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Suspend Guard</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add Guard Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Guard</DialogTitle>
            <DialogDescription>
              Enter the guard's details to generate a profile and QR code.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddGuard} className="space-y-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" required placeholder="e.g. Solomon Dlamini" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="id_number">ID Number</Label>
                <Input id="id_number" name="id_number" required placeholder="SA ID Number" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input id="phone_number" name="phone_number" required placeholder="072..." />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="site_location">Site / Location</Label>
              <Input id="site_location" name="site_location" placeholder="e.g. Mall of Africa, Entrance 3" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payout_method">Payout Method</Label>
              <Select 
                name="payout_method" 
                value={payoutMethod} 
                onValueChange={setPayoutMethod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_voucher">Instant Cash Voucher</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="ewallet">eWallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createGuardMutation.isPending}>
                {createGuardMutation.isPending ? "Adding..." : "Add Guard"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!selectedGuardQR} onOpenChange={(open) => !open && setSelectedGuardQR(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guard QR Code</DialogTitle>
            <DialogDescription>
              Scan to pay {selectedGuardQR?.full_name}. Print this for the lanyard.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border shadow-sm my-2">
            <div className="text-center mb-4">
              <h3 className="font-bold text-lg text-slate-900">SCAN TO PAY</h3>
              <p className="text-sm text-slate-500">{selectedGuardQR?.full_name}</p>
            </div>
            {selectedGuardQR && (
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/pay/${selectedGuardQR.id}`)}`}
                alt="Guard QR Code"
                className="w-64 h-64 border-4 border-black rounded-lg"
              />
            )}
            <div className="text-center mt-4">
              <p className="text-xs font-mono text-slate-400">ID: {selectedGuardQR?.id}</p>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
             <Button variant="outline" asChild className="w-full sm:w-auto">
                <a href={`/pay/${selectedGuardQR?.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test Link
                </a>
             </Button>
             <Button className="w-full sm:w-auto" onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2" />
                Print / Save PDF
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}