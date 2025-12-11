'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Loader2, RefreshCw, CheckCircle } from 'lucide-react';

interface TallyEntryData {
  rowNumber: number;
  'Indent No.'?: string;
  'Indentor Name'?: string;
  'Product Name'?: string;
  'Bill No.'?: string;
  'Vendor Name'?: string;
  'Lift Qty'?: number;
  'Type Of Bill'?: string;
  'Bill Amount'?: number;
  'Photo Of Bill'?: string;
  'In Qty'?: number;
  'Photo Of Product'?: string;
  'Unit Of Measurement'?: string;
  Planned3?: string;
  Timestamp?: string;
  [key: string]: any;
}

interface TallyFormData {
  status: 'yes' | 'no' | '';
  reason: string;
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

export default function TallyEntry() {
  const [indents, setIndents] = useState<TallyEntryData[]>([]);
  const [selectedIndent, setSelectedIndent] = useState<TallyEntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTallyModal, setShowTallyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TallyEntryData | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState<TallyFormData>({
    status: '',
    reason: '',
  });

  useEffect(() => {
    fetchPendingTallyEntry();
  }, []);

  const fetchPendingTallyEntry = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching pending tally entry items...');
      const data = await fetchJsonp(`${SCRIPT_URL}?action=getPendingTallyEntry`);
      console.log('Response:', data);

      if (data.success) {
        setIndents(data.indents || []);
        console.log('Loaded', data.indents?.length || 0, 'pending tally entry items');
      } else {
        console.error('Error from server:', data.error);
        setError(data.error || 'Failed to fetch pending tally entry items');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Network error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (indent: TallyEntryData) => {
    setSelectedItem(indent);
    setShowTallyModal(true);
    setFormData({
      status: '',
      reason: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.status || !formData.reason) {
      alert('Please fill in all fields');
      return;
    }

    if (!selectedItem) return;

    try {
      setSubmitting(true);

      // Use GET request with JSONP to bypass CORS
      const params = new URLSearchParams({
        action: 'submitTallyEntry',
        rowNumber: selectedItem.rowNumber.toString(),
        status: formData.status,
        reason: formData.reason
      });

      const data = await fetchJsonp(`${SCRIPT_URL}?${params.toString()}`);
      console.log('Submission result:', data);

      if (data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setShowTallyModal(false);
          setSelectedItem(null);
          setIndents(indents.filter(i => i.rowNumber !== selectedItem.rowNumber));
        }, 2000);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Error during submission: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading pending tally entry items...</span>
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
              <Button onClick={fetchPendingTallyEntry} className="gap-2">
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
          <CardTitle>Tally Entry ({indents.length} Pending)</CardTitle>
          <Button 
            onClick={fetchPendingTallyEntry} 
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
              No pending tally entry items at this time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Indent No.</th>
                    <th className="text-left py-3 px-4 font-semibold">Product</th>
                    <th className="text-left py-3 px-4 font-semibold">Vendor</th>
                    <th className="text-left py-3 px-4 font-semibold">Lift Qty</th>
                    <th className="text-left py-3 px-4 font-semibold">In Qty</th>
                    <th className="text-left py-3 px-4 font-semibold">Unit</th>
                    <th className="text-left py-3 px-4 font-semibold">Bill Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {indents.map((indent) => (
                    <tr key={indent.rowNumber} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{indent['Indent No.'] || '-'}</td>
                      <td className="py-3 px-4">{indent['Product Name'] || '-'}</td>
                      <td className="py-3 px-4">{indent['Vendor Name'] || '-'}</td>
                      <td className="py-3 px-4">{indent['Lift Qty'] || 0}</td>
                      <td className="py-3 px-4">{indent['In Qty'] || 0}</td>
                      <td className="py-3 px-4">{indent['Unit Of Measurement'] || '-'}</td>
                      <td className="py-3 px-4">₹{indent['Bill Amount'] || 0}</td>
                      <td className="py-3 px-4">{indent.Planned3 || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedIndent(indent)}
                            className="gap-1"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleActionClick(indent)}
                            className="gap-1"
                          >
                            Tally Entry
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detail Modal */}
          {/* Detail Modal */}
{selectedIndent && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
      <CardHeader>
        <CardTitle>Complete Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(selectedIndent).map(([key, value]) => {
            // Skip these fields
            const fieldsToSkip = ['rowNumber', 'Planned3', 'Delay3', 'Status', 'Reason', 'Actual3'];
            if (fieldsToSkip.includes(key)) return null;
            
            // Special handling for photo URLs
            if ((key === 'Photo Of Bill' || key === 'Photo Of Product') && 
                value && typeof value === 'string' && value.startsWith('http')) {
              return (
                <div key={key} className="col-span-2">
                  <p className="text-sm text-muted-foreground">{key}</p>
                  <a 
                    href={value} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View {key}
                  </a>
                </div>
              );
            }
            
            return (
              <div key={key}>
                <p className="text-sm text-muted-foreground">{key}</p>
                <p className="font-medium">{value?.toString() || '-'}</p>
              </div>
            );
          })}
        </div>

                  <Button
                    onClick={() => setSelectedIndent(null)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tally Entry Form Modal */}
          {showTallyModal && selectedItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <Card className="w-full max-w-3xl my-8">
                <CardHeader>
                  <CardTitle>Tally Entry - {selectedItem['Indent No.']}</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Display Previous Step Information */}
                  <div className="mb-6 space-y-4">
                    {/* Lifting Information */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                      <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-300">Lifting Information</h3>
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

                    {/* Store In Information */}
                    <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                      <h3 className="font-semibold mb-3 text-green-900 dark:text-green-300">Store In Information</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">In Qty:</span>
                          <span className="ml-2 font-medium">{selectedItem['In Qty'] || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unit Of Measurement:</span>
                          <span className="ml-2 font-medium">{selectedItem['Unit Of Measurement'] || '-'}</span>
                        </div>
                        {selectedItem['Photo Of Product'] && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Photo Of Product:</span>
                            <a 
                              href={selectedItem['Photo Of Product']} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-600 hover:underline"
                            >
                              View Product Photo
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tally Entry Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Status *</label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: 'yes' | 'no') =>
                          setFormData({ ...formData, status: value })
                        }
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Reason *</label>
                      <textarea
                        placeholder="Enter reason for the status"
                        value={formData.reason}
                        onChange={(e) =>
                          setFormData({ ...formData, reason: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        rows={5}
                        disabled={submitting}
                      />
                    </div>

                    {submitted && (
                      <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <p className="text-green-800 dark:text-green-300">Tally entry submitted successfully!</p>
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
                          'Submit Tally Entry'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowTallyModal(false);
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
