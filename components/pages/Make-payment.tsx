'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Loader2, RefreshCw, ExternalLink, FileText, DollarSign } from 'lucide-react';

interface PaymentData {
  rowNumber: number;
  'Indent No.'?: string;
  'Indentor Name'?: string;
  'Product Name'?: string;
  'Qty'?: number;
  'Bill No.'?: string;
  'Amount'?: number;
  'Photo Of Bill'?: string;
  'Photo Of Product'?: string;
  'Make Payment'?: string; // Payment link from column AG
  [key: string]: any;
}

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLkH_vSbpObvC85M-t5TBukKIRqQxi0gH_ZjIc_O7xrjjBvz8QDuz4dEjkovODvoI93w/exec';

// JSONP helper
function fetchJsonp(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const script = document.createElement('script');
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout'));
    }, 30000);

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete (window as any)[callbackName];
      clearTimeout(timeoutId);
    }

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('Script loading failed'));
    };

    document.head.appendChild(script);
  });
}

export default function MakePayment() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching payment data...');
      const data = await fetchJsonp(`${SCRIPT_URL}?action=getPendingPayments`);
      console.log('Response:', data);

      if (data.success) {
        setPayments(data.payments || []);
        console.log('Loaded', data.payments?.length || 0, 'payment records');
      } else {
        console.error('Error from server:', data.error);
        setError(data.error || 'Failed to fetch payment data');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Network error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = (payment: PaymentData) => {
    if (payment['Make Payment']) {
      // Open payment link in new tab
      window.open(payment['Make Payment'], '_blank');
    } else {
      alert('No payment link available for this item');
    }
  };

  const handleViewDetails = (payment: PaymentData) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  // Filter payments based on search term
  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (payment['Indent No.']?.toLowerCase().includes(searchLower)) ||
      (payment['Indentor Name']?.toLowerCase().includes(searchLower)) ||
      (payment['Product Name']?.toLowerCase().includes(searchLower)) ||
      (payment['Bill No.']?.toLowerCase().includes(searchLower))
    );
  });

  // Calculate totals
  const totalAmount = filteredPayments.reduce((sum, payment) => sum + (payment['Amount'] || 0), 0);
  const totalItems = filteredPayments.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <span className="text-lg">Loading payment records...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchPaymentData} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Retry Loading
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Make Payment</h1>
          <p className="text-muted-foreground">
            Process payments for completed indents
          </p>
        </div>
        <Button 
          onClick={fetchPaymentData} 
          variant="outline" 
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold">
                  {payments.filter(p => p['Make Payment']).length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <ExternalLink className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Payment Records ({filteredPayments.length})</CardTitle>
            <div className="w-full md:w-64">
              <Input
                placeholder="Search by Indent No, Name, Product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <DollarSign className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No payment records found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Try changing your search criteria' 
                  : 'No payments available for processing'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-4 font-semibold border-b">Indent No.</th>
                    <th className="text-left p-4 font-semibold border-b">Indentor Name</th>
                    <th className="text-left p-4 font-semibold border-b">Product Name</th>
                    <th className="text-left p-4 font-semibold border-b">Qty</th>
                    <th className="text-left p-4 font-semibold border-b">Bill No.</th>
                    <th className="text-left p-4 font-semibold border-b">Amount (₹)</th>
                    <th className="text-left p-4 font-semibold border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment, index) => (
                    <tr 
                      key={payment.rowNumber} 
                      className={`border-b hover:bg-muted/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                    >
                      <td className="p-4">
                        <div className="font-medium">{payment['Indent No.'] || '-'}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{payment['Indentor Name'] || '-'}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{payment['Product Name'] || '-'}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{payment['Qty'] || 0}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{payment['Bill No.'] || '-'}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold">₹{payment['Amount']?.toLocaleString() || 0}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(payment)}
                            className="gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMakePayment(payment)}
                            className="gap-1"
                            disabled={!payment['Make Payment']}
                            title={payment['Make Payment'] ? "Open payment link" : "No payment link available"}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Make Payment
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Footer */}
          {/* {filteredPayments.length > 0 && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredPayments.length} of {payments.length} records
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Items with payment links: {payments.filter(p => p['Make Payment']).length}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">Total: ₹{totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div> 
          )} */}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="sticky top-0 bg-background z-10 border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Payment Details - {selectedPayment['Indent No.']}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedPayment(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Main Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Indent Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Indent No.</p>
                        <p className="font-medium">{selectedPayment['Indent No.'] || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Indentor Name</p>
                        <p className="font-medium">{selectedPayment['Indentor Name'] || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Product Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Product Name</p>
                        <p className="font-medium">{selectedPayment['Product Name'] || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Quantity</p>
                        <p className="font-medium">{selectedPayment['Qty'] || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Bill Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Bill No.</p>
                        <p className="font-medium">{selectedPayment['Bill No.'] || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-2xl font-bold text-primary">
                          ₹{selectedPayment['Amount']?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Payment Link</h3>
                    <div className="space-y-3">
                      {selectedPayment['Make Payment'] ? (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Payment URL</p>
                          <a
                            href={selectedPayment['Make Payment']}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Payment Portal
                          </a>
                          <p className="text-xs text-muted-foreground mt-2">
                            Click to open payment link in new tab
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">
                          <p className="text-yellow-800 dark:text-yellow-300">
                            No payment link available for this item
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedPayment['Photo Of Bill'] && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Bill Photo</h3>
                    <div className="p-4 border rounded-lg">
                      <a
                        href={selectedPayment['Photo Of Bill']}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <Eye className="w-4 h-4" />
                        View Bill Photo
                      </a>
                    </div>
                  </div>
                )}

                {selectedPayment['Photo Of Product'] && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Product Photo</h3>
                    <div className="p-4 border rounded-lg">
                      <a
                        href={selectedPayment['Photo Of Product']}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <Eye className="w-4 h-4" />
                        View Product Photo
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPayment(null);
                }}
                className="w-full mt-6"
              >
                Close Details
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}