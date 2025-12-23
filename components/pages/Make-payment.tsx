'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Loader2, RefreshCw, ExternalLink, FileText, DollarSign, CheckCircle, Clock, AlertCircle, Receipt, CreditCard, TrendingUp } from 'lucide-react';

interface PaymentData {
  rowNumber: number;
  'Indent No.'?: string;
  'Indentor Name'?: string;
  'Product Name'?: string;
  'Qty'?: number;
  'Bill No.'?: string;
  'Amount'?: number;
  'Paid Amount'?: number;
  'Photo Of Bill'?: string;
  'Photo Of Product'?: string;
  'Make Payment'?: string;
  'Payment Status'?: string;
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
        // Data is already filtered by "Pending" status in Apps Script
        setPayments(data.payments || []);
        console.log('Loaded', data.payments?.length || 0, 'pending payment records');
        
        if (data.payments?.length === 0) {
          console.log('No pending payments found. Make sure Column 36 has "Pending" status and payment links are added.');
        }
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
      window.open(payment['Make Payment'], '_blank');
    } else {
      alert('No payment link available for this item');
    }
  };

  const handleViewDetails = (payment: PaymentData) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  // Helper function to get payment status display
  const getPaymentStatusDisplay = (payment: PaymentData) => {
    const status = payment['Payment Status']?.toString().trim().toLowerCase() || 'pending';
    
    switch(status) {
      case 'paid':
        return {
          label: 'Paid',
          color: 'green',
          icon: <CheckCircle className="w-4 h-4" />,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800'
        };
      case 'partially paid':
        return {
          label: 'Partial',
          color: 'yellow',
          icon: <Clock className="w-4 h-4" />,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800'
        };
      case 'pending':
      default:
        return {
          label: 'Pending',
          color: 'red',
          icon: <AlertCircle className="w-4 h-4" />,
          bgColor: 'bg-red-100',
          textColor: 'text-red-800'
        };
    }
  };

  // Calculate outstanding amount
  const calculateOutstandingAmount = (payment: PaymentData) => {
    const total = Number(payment['Amount']) || 0;
    const paid = Number(payment['Paid Amount']) || 0;
    return total - paid;
  };

  // Filter payments based on search term
  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (payment['Indent No.']?.toString().toLowerCase().includes(searchLower)) ||
      (payment['Indentor Name']?.toString().toLowerCase().includes(searchLower)) ||
      (payment['Product Name']?.toString().toLowerCase().includes(searchLower)) ||
      (payment['Bill No.']?.toString().toLowerCase().includes(searchLower)) ||
      (payment['Payment Status']?.toString().toLowerCase().includes(searchLower))
    );
  });

  // Calculate totals for PENDING items only
  const totalItems = filteredPayments.length;
  const pendingItems = filteredPayments.length; // All are pending now

  const totalBillAmount = filteredPayments.reduce((sum, payment) => sum + (Number(payment['Amount']) || 0), 0);
  const totalPaidAmount = filteredPayments.reduce((sum, payment) => sum + (Number(payment['Paid Amount']) || 0), 0);
  const totalOutstandingAmount = filteredPayments.reduce((sum, payment) => sum + calculateOutstandingAmount(payment), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <span className="text-lg">Loading pending payment records...</span>
        <p className="text-sm text-muted-foreground mt-2">Loading Pending Payments"</p>
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
            {/* Process payments for pending indents only (Column 36 = "Pending" and has payment link) */}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchPaymentData} 
            variant="outline" 
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
                <p className="text-xs text-muted-foreground">
                  {/* Column 36 = "Pending" */}
                </p>
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
                <p className="text-sm text-muted-foreground">Total Bill Amount</p>
                <p className="text-2xl font-bold">₹{totalBillAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Receipt className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid Amount</p>
                <p className="text-2xl font-bold">₹{totalPaidAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold">₹{totalOutstandingAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

{/* Payment Status Summary */}
<Card className="bg-red-50 border-red-200">
  <CardContent className="pt-6">
    <div className="flex items-center justify-between">
      <div>
        {/* Title with icon */}
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          Payment Status Summary
          <AlertCircle className="w-4 h-4 text-red-500" />
        </p>

        {/* Count */}
        <p className="text-2xl font-bold text-red-600">
          {pendingItems} Pending Payment{pendingItems !== 1 ? "s" : ""}
        </p>

        {/* Note */}
        <p className="text-xs text-muted-foreground mt-1">
          Showing only items where Payment Status is <b>Pending</b> and payment link exists.
        </p>
      </div>

      {/* Right side icon */}
      <div className="p-3 bg-red-100 rounded-full">
        <AlertCircle className="w-6 h-6 text-red-600" />
      </div>
    </div>
  </CardContent>
</Card>


      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Pending Payment Records ({filteredPayments.length})</CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="w-full md:w-64">
                <Input
                  placeholder="Search by Indent No, Name, Product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              {searchTerm && (
                <Button
                  onClick={() => setSearchTerm('')}
                  variant="outline"
                  size="sm"
                >
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                {payments.length === 0 ? (
                  <AlertCircle className="w-10 h-10 text-yellow-500" />
                ) : (
                  <CheckCircle className="w-10 h-10 text-green-500" />
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {payments.length === 0 
                  ? 'No pending payments found' 
                  : 'No matching records found'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {payments.length === 0 
                  ? 'No records found with "Pending" in Column 36 AND payment link in Column AG'
                  : 'Try changing your search criteria'}
              </p>
              <div className="space-y-3">
                <Button onClick={fetchPaymentData} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
                <div className="text-xs text-muted-foreground">
                  <p>Requirements to appear here:</p>
                  <ol className="list-decimal pl-4 mt-1 space-y-1">
                    <li>Column 36 (Payment Status) must be "Pending" (case-insensitive)</li>
                    <li>Column AG (Make Payment) must have a payment link</li>
                  </ol>
                </div>
              </div>
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
                    <th className="text-left p-4 font-semibold border-b">Bill Amount (₹)</th>
                    <th className="text-left p-4 font-semibold border-b">Paid Amount (₹)</th>
                    <th className="text-left p-4 font-semibold border-b">Outstanding Amount (₹)</th>
                    <th className="text-left p-4 font-semibold border-b">Payment Status</th>
                    <th className="text-left p-4 font-semibold border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment, index) => {
                    const outstanding = calculateOutstandingAmount(payment);
                    const statusDisplay = getPaymentStatusDisplay(payment);
                    
                    return (
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
                          <div className="font-bold">₹{(Number(payment['Amount']) || 0).toLocaleString()}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-green-600">
                            ₹{(Number(payment['Paid Amount']) || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{outstanding.toLocaleString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${statusDisplay.bgColor} ${statusDisplay.textColor} text-sm font-medium`}>
                              {statusDisplay.icon}
                              {statusDisplay.label}
                            </span>
                          </div>
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
                              title={
                                !payment['Make Payment'] 
                                  ? "No payment link available" 
                                  : "Open payment link"
                              }
                            >
                              <ExternalLink className="w-4 h-4" />
                              Make Payment
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="sticky top-0 bg-background z-10 border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Payment Details - {selectedPayment['Indent No.']}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getPaymentStatusDisplay(selectedPayment).bgColor} ${getPaymentStatusDisplay(selectedPayment).textColor} text-sm font-medium`}>
                    {getPaymentStatusDisplay(selectedPayment).icon}
                    {getPaymentStatusDisplay(selectedPayment).label} (Column 36)
                  </span>
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
                        <p className="text-sm text-muted-foreground">Bill Amount</p>
                        <p className="text-2xl font-bold text-primary">
                          ₹{(Number(selectedPayment['Amount']) || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Payment Information</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Paid Amount</p>
                          <p className="text-xl font-bold text-green-600">
                            ₹{(Number(selectedPayment['Paid Amount']) || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Outstanding</p>
                          <p className={`text-xl font-bold ${calculateOutstandingAmount(selectedPayment) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{calculateOutstandingAmount(selectedPayment).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Status</p>
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getPaymentStatusDisplay(selectedPayment).bgColor} ${getPaymentStatusDisplay(selectedPayment).textColor} text-sm font-medium`}>
                              {getPaymentStatusDisplay(selectedPayment).icon}
                              {getPaymentStatusDisplay(selectedPayment).label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {selectedPayment['Make Payment'] ? (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Payment Link</p>
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
                            Click to open payment link in new tab (Column AG)
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