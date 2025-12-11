'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Upload, CheckCircle } from 'lucide-react';

interface StoreInData {
  rowNumber: number;
  'Indent No.'?: string;
  'Bill No.'?: string;
  'Vendor Name'?: string;
  'Lift Qty'?: number;
  'Type Of Bill'?: string;
  'Bill Amount'?: number;
  'Photo Of Bill'?: string;
  'Indentor Name'?: string;
  'Group Head'?: string;
  'Product Name'?: string;
  Actual1?: string;
  Planned2?: string;
  Timestamp?: string;
  [key: string]: any;
}

interface StoreInFormData {
  inQty: number;
  photoOfProduct: File | null;
  unitOfMeasurement: string;
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

// Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export default function StoreIn() {
  const [indents, setIndents] = useState<StoreInData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStoreInModal, setShowStoreInModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StoreInData | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState<StoreInFormData>({
    inQty: 0,
    photoOfProduct: null,
    unitOfMeasurement: '',
  });

  useEffect(() => {
    fetchPendingStoreIn();
  }, []);

  const fetchPendingStoreIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching pending store in items...');
      const data = await fetchJsonp(`${SCRIPT_URL}?action=getPendingStoreIn`);
      console.log('Response:', data);

      if (data.success) {
        setIndents(data.indents || []);
        console.log('Loaded', data.indents?.length || 0, 'pending store in items');
      } else {
        console.error('Error from server:', data.error);
        setError(data.error || 'Failed to fetch pending store in items');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Network error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (indent: StoreInData) => {
    setSelectedItem(indent);
    setShowStoreInModal(true);
    setFormData({
      inQty: 0,
      photoOfProduct: null,
      unitOfMeasurement: '',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, photoOfProduct: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.inQty || !formData.photoOfProduct || !formData.unitOfMeasurement) {
      alert('Please fill in all fields and upload photo');
      return;
    }

    if (!selectedItem) return;

    try {
      setSubmitting(true);

      // Convert photo to base64
      const photoBase64 = await fileToBase64(formData.photoOfProduct);

      // Create hidden iframe form submission (bypasses CORS)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.name = 'hidden_iframe_' + Date.now();
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = SCRIPT_URL;
      form.target = iframe.name;

      const fields = {
        action: 'submitStoreIn',
        rowNumber: selectedItem.rowNumber.toString(),
        inQty: formData.inQty.toString(),
        unitOfMeasurement: formData.unitOfMeasurement,
        photoOfProductBase64: photoBase64,
        photoFileName: formData.photoOfProduct.name
      };

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      
      iframe.onload = () => {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setShowStoreInModal(false);
          setSelectedItem(null);
          setIndents(indents.filter(i => i.rowNumber !== selectedItem.rowNumber));
          
          document.body.removeChild(form);
          document.body.removeChild(iframe);
        }, 2000);
      };

      form.submit();

    } catch (error) {
      console.error('Submission error:', error);
      alert('Error during submission: ' + (error as Error).message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading pending store in items...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchPendingStoreIn} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Store In ({indents.length} Pending)</CardTitle>
          <Button 
            onClick={fetchPendingStoreIn} 
            variant="outline" 
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {indents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending store in items at this time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Indent No.</th>
                    <th className="text-left py-3 px-4 font-semibold">Bill No.</th>
                    <th className="text-left py-3 px-4 font-semibold">Vendor Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Product</th>
                    <th className="text-left py-3 px-4 font-semibold">Lift Qty</th>
                    <th className="text-left py-3 px-4 font-semibold">Type Of Bill</th>
                    <th className="text-left py-3 px-4 font-semibold">Bill Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {indents.map((indent) => (
                    <tr key={indent.rowNumber} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{indent['Indent No.'] || '-'}</td>
                      <td className="py-3 px-4">{indent['Bill No.'] || '-'}</td>
                      <td className="py-3 px-4">{indent['Vendor Name'] || '-'}</td>
                      <td className="py-3 px-4">{indent['Product Name'] || '-'}</td>
                      <td className="py-3 px-4">{indent['Lift Qty'] || 0}</td>
                      <td className="py-3 px-4">{indent['Type Of Bill'] || '-'}</td>
                      <td className="py-3 px-4">{indent['Bill Amount'] || 0}</td>
                      <td className="py-3 px-4">{indent.Actual1 || '-'}</td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          onClick={() => handleActionClick(indent)}
                          className="gap-1"
                        >
                          Store In
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Store In Form Modal */}
          {showStoreInModal && selectedItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <Card className="w-full max-w-2xl my-8">
                <CardHeader>
                  <CardTitle>Store In Entry - {selectedItem['Indent No.']}</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Display Lifting Information (Current Step Only) */}
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30">
                    <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-300">Current Step - Lifting Information</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Indent No.:</span>
                        <span className="ml-2 font-medium">{selectedItem['Indent No.'] || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bill No.:</span>
                        <span className="ml-2 font-medium">{selectedItem['Bill No.'] || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vendor Name:</span>
                        <span className="ml-2 font-medium">{selectedItem['Vendor Name'] || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lift Qty:</span>
                        <span className="ml-2 font-medium">{selectedItem['Lift Qty'] || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type Of Bill:</span>
                        <span className="ml-2 font-medium">{selectedItem['Type Of Bill'] || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bill Amount:</span>
                        <span className="ml-2 font-medium">₹{selectedItem['Bill Amount'] || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <span className="ml-2 font-medium">{selectedItem.Actual1 || '-'}</span>
                      </div>
                      {selectedItem['Photo Of Bill'] && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Photo Of Bill:</span>
                          <a 
                            href={selectedItem['Photo Of Bill']} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:underline"
                          >
                            View Bill Photo
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Quantity (In) *</label>
                        <Input
                          type="number"
                          placeholder="Enter quantity"
                          value={formData.inQty || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, inQty: parseInt(e.target.value) || 0 })
                          }
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Unit Of Measurement *</label>
                        <Input
                          type="text"
                          placeholder="e.g., Boxes, Units, Kg, Liter"
                          value={formData.unitOfMeasurement}
                          onChange={(e) =>
                            setFormData({ ...formData, unitOfMeasurement: e.target.value })
                          }
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Photo Of Product (Upload) *</label>
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="product-photo"
                          disabled={submitting}
                        />
                        <label htmlFor="product-photo" className="cursor-pointer block">
                          <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm font-medium mb-1">
                            {formData.photoOfProduct?.name || 'Click to upload product photo'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Supported formats: JPG, PNG, GIF
                          </p>
                        </label>
                      </div>
                    </div>

                    {submitted && (
                      <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <p className="text-green-800 dark:text-green-300">Store In entry submitted successfully!</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Store In Entry'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowStoreInModal(false);
                          setSelectedItem(null);
                        }}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
