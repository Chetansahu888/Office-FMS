'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw, Upload, FileText, Image, CheckCircle, X } from 'lucide-react';

interface LiftingData {
  rowNumber: number;
  'Indent No.'?: string;
  'Indentor Name'?: string;
  'Group Head'?: string;
  'Product Name'?: string;
  Qty?: number;
  Specifications?: string;
  Planned1?: string;
  Timestamp?: string;
  [key: string]: any;
}

interface LiftingFormData {
  billNo: string;
  vendorName: string;
  liftQty: number;
  typeOfBill: string;
  billAmount: number | null;
  photoOfBill: File | null;
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

export default function LiftingModule() {
  const [indents, setIndents] = useState<LiftingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLiftingModal, setShowLiftingModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LiftingData | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState<LiftingFormData>({
    billNo: '',
    vendorName: '',
    liftQty: 0,
    typeOfBill: '',
    billAmount: null,
    photoOfBill: null,
  });

  useEffect(() => {
    fetchPendingLifting();
  }, []);

  const fetchPendingLifting = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchJsonp(`${SCRIPT_URL}?action=getPendingLifting`);

      if (data.success) {
        setIndents(data.indents || []);
      } else {
        setError(data.error || 'Failed to fetch pending lifting items');
      }
    } catch (error) {
      setError('Network error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (indent: LiftingData) => {
    setSelectedItem(indent);
    setShowLiftingModal(true);
    setFormData({
      billNo: '',
      vendorName: '',
      liftQty: 0,
      typeOfBill: '',
      billAmount: null,
      photoOfBill: null,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        alert('Please upload only images (JPEG, PNG, GIF, BMP, WebP), PDF, Word documents, Excel files, or text files.');
        e.target.value = ''; // Reset file input
        return;
      }
      
      if (file.size > maxSize) {
        alert('File size should be less than 10MB.');
        e.target.value = ''; // Reset file input
        return;
      }
      
      setFormData({ ...formData, photoOfBill: file });
    }
  };

  const removeFile = () => {
    setFormData({ ...formData, photoOfBill: null });
    // Reset file input
    const fileInput = document.getElementById('photo-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    } else if (file.type.includes('wordprocessingml') || file.type.includes('msword')) {
      return <FileText className="w-4 h-4" />;
    } else if (file.type.includes('spreadsheetml') || file.type.includes('excel')) {
      return <FileText className="w-4 h-4" />;
    } else {
      return <FileText className="w-4 h-4" />;
    }
  };

  const getFileTypeName = (file: File) => {
    if (file.type.startsWith('image/')) {
      return 'Image';
    } else if (file.type === 'application/pdf') {
      return 'PDF';
    } else if (file.type.includes('wordprocessingml') || file.type.includes('msword')) {
      return 'Word Document';
    } else if (file.type.includes('spreadsheetml') || file.type.includes('excel')) {
      return 'Excel Document';
    } else if (file.type === 'text/plain') {
      return 'Text File';
    } else {
      return 'Document';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Common validation for both bill types
    if (!formData.vendorName || !formData.liftQty || !formData.typeOfBill) {
      alert('Please fill in Vendor Name, Lift Qty, and Type Of Bill');
      return;
    }

    // Additional validation for Independent bills
    if (formData.typeOfBill === 'Independent') {
      if (!formData.billNo || formData.billAmount === null || formData.billAmount === 0) {
        alert('For Independent bills, please fill in Bill No and Bill Amount');
        return;
      }
    }

    if (!selectedItem) return;

    try {
      setSubmitting(true);

      // Convert file to base64 only if file exists
      let photoBase64 = '';
      let photoFileName = '';
      let photoMimeType = '';
      
      if (formData.photoOfBill) {
        photoBase64 = await fileToBase64(formData.photoOfBill);
        photoFileName = formData.photoOfBill.name;
        photoMimeType = formData.photoOfBill.type;
      }

      // Create a hidden form and submit via iframe (bypasses CORS)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.name = 'hidden_iframe_' + Date.now();
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = SCRIPT_URL;
      form.target = iframe.name;

      const fields = {
        action: 'submitLifting',
        rowNumber: selectedItem.rowNumber.toString(),
        billNo: formData.billNo || '',
        vendorName: formData.vendorName,
        liftQty: formData.liftQty.toString(),
        typeOfBill: formData.typeOfBill,
        billAmount: formData.billAmount?.toString() || '0',
        photoOfBillBase64: photoBase64,
        photoFileName: photoFileName,
        photoMimeType: photoMimeType
      };

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      
      // Listen for iframe load (response received)
      iframe.onload = () => {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setShowLiftingModal(false);
          setSelectedItem(null);
          setIndents(indents.filter(i => i.rowNumber !== selectedItem.rowNumber));
          
          // Cleanup
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

  const isIndependentBill = formData.typeOfBill === 'Independent';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading pending lifting items...</span>
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
              <Button onClick={fetchPendingLifting} className="gap-2">
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
          <CardTitle>Lifting Module ({indents.length} Pending)</CardTitle>
          <Button 
            onClick={fetchPendingLifting} 
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
              No pending lifting items at this time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Indent No.</th>
                    <th className="text-left py-3 px-4 font-semibold">Indentor</th>
                    <th className="text-left py-3 px-4 font-semibold">Group Head</th>
                    <th className="text-left py-3 px-4 font-semibold">Product</th>
                    <th className="text-left py-3 px-4 font-semibold">Qty</th>
                    <th className="text-left py-3 px-4 font-semibold">Specifications</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {indents.map((indent) => (
                    <tr key={indent.rowNumber} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">{indent['Indent No.'] || '-'}</td>
                      <td className="py-3 px-4">{indent['Indentor Name'] || '-'}</td>
                      <td className="py-3 px-4">{indent['Group Head'] || '-'}</td>
                      <td className="py-3 px-4">{indent['Product Name'] || '-'}</td>
                      <td className="py-3 px-4">{indent.Qty || 0}</td>
                      <td className="py-3 px-4">{indent.Specifications || '-'}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {indent.Timestamp || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          onClick={() => handleActionClick(indent)}
                          className="gap-1"
                        >
                          Submit Lifting
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Lifting Form Modal */}
          {showLiftingModal && selectedItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <Card className="w-full max-w-2xl my-8">
                <CardHeader>
                  <CardTitle>Submit Lifting Entry - {selectedItem['Indent No.']}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Vendor Name *</label>
                        <Input
                          type="text"
                          placeholder="Enter vendor name"
                          value={formData.vendorName}
                          onChange={(e) =>
                            setFormData({ ...formData, vendorName: e.target.value })
                          }
                          disabled={submitting}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Lift Qty *</label>
                        <Input
                          type="number"
                          placeholder="Enter quantity"
                          value={formData.liftQty || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, liftQty: parseInt(e.target.value) || 0 })
                          }
                          disabled={submitting}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Type Of Bill *</label>
                      <Select
                        value={formData.typeOfBill}
                        onValueChange={(value) => {
                          setFormData({ 
                            ...formData, 
                            typeOfBill: value,
                            billAmount: value === 'Common' ? null : formData.billAmount
                          });
                        }}
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bill type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Independent">Independent</SelectItem>
                          <SelectItem value="Common">Common</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Only show these fields for Independent bills */}
                    {isIndependentBill && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium mb-2">Bill No. *</label>
                            <Input
                              type="text"
                              placeholder="Enter bill number"
                              value={formData.billNo}
                              onChange={(e) =>
                                setFormData({ ...formData, billNo: e.target.value })
                              }
                              disabled={submitting}
                              required={isIndependentBill}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Bill Amount *</label>
                            <Input
                              type="number"
                              placeholder="Enter bill amount"
                              value={formData.billAmount || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, billAmount: parseFloat(e.target.value) || 0 })
                              }
                              disabled={submitting}
                              required={isIndependentBill}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Bill Document (Optional)
                            <span className="text-xs text-muted-foreground ml-2">
                              Supports Images, PDF, Word, Excel, Text files (Max 10MB)
                            </span>
                          </label>
                          
                          {formData.photoOfBill ? (
                            <div className="border border-border rounded-lg p-4 bg-muted/30">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {getFileIcon(formData.photoOfBill)}
                                  <div>
                                    <p className="font-medium">{formData.photoOfBill.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {getFileTypeName(formData.photoOfBill)} • {formatFileSize(formData.photoOfBill.size)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={removeFile}
                                  disabled={submitting}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                                onChange={handleFileChange}
                                className="hidden"
                                id="photo-file"
                                disabled={submitting}
                              />
                              <label htmlFor="photo-file" className="cursor-pointer block">
                                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                                <p className="font-medium mb-1">Click to upload bill document</p>
                                <p className="text-sm text-muted-foreground">
                                  Images, PDF, Word, Excel, Text files (Max 10MB)
                                </p>
                              </label>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {submitted && (
                      <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <p className="text-green-800 dark:text-green-300">Lifting entry submitted successfully!</p>
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
                          'Submit Lifting Entry'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowLiftingModal(false);
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