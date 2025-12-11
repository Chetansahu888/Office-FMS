'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface IndentData {
  rowNumber: number;
  'Indent No.'?: string;
  'Indentor Name'?: string;
  'Group Head'?: string;
  'Product Name'?: string;
  Qty?: number;
  Specifications?: string;
  Planned?: string;
  Actual?: string;
  Timestamp?: string;
  [key: string]: any;
}

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLkH_vSbpObvC85M-t5TBukKIRqQxi0gH_ZjIc_O7xrjjBvz8QDuz4dEjkovODvoI93w/exec';

// JSONP helper function to bypass CORS
function fetchJsonp(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const script = document.createElement('script');
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout'));
    }, 30000);

    function cleanup() {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
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

export default function ApproveIndent() {
  const [indents, setIndents] = useState<IndentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{indent: IndentData, action: 'approve' | 'reject'} | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching pending approvals...');
      const data = await fetchJsonp(`${SCRIPT_URL}?action=getPendingApprovals`);
      console.log('Response:', data);

      if (data.success) {
        setIndents(data.indents || []);
        console.log('Loaded', data.indents?.length || 0, 'pending approvals');
      } else {
        console.error('Error from server:', data.error);
        setError(data.error || 'Failed to fetch pending approvals');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Network error while fetching data: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalClick = (indent: IndentData, action: 'approve' | 'reject') => {
    setPendingAction({ indent, action });
    setShowApprovalModal(true);
  };

  const confirmApprovalAction = async () => {
    if (!pendingAction) return;

    const { indent, action } = pendingAction;

    try {
      setActionLoading(indent.rowNumber);
      
      console.log('Submitting approval action:', { rowNumber: indent.rowNumber, action });
      
      // Use JSONP for GET request
      const data = await fetchJsonp(
        `${SCRIPT_URL}?action=approvalAction&rowNumber=${indent.rowNumber}&actionType=${action}`
      );
      
      console.log('Approval response:', data);

      if (data.success) {
        alert(`Indent ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
        // Remove the indent from the list
        setIndents(indents.filter(i => i.rowNumber !== indent.rowNumber));
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Network error during submission: ' + (error as Error).message);
    } finally {
      setActionLoading(null);
      setShowApprovalModal(false);
      setPendingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading pending approvals...</span>
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
              <Button onClick={fetchPendingApprovals} className="gap-2">
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
          <CardTitle>Approve Indents ({indents.length} Pending)</CardTitle>
          <Button 
            onClick={fetchPendingApprovals} 
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
              No pending approvals at this time.
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
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
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
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white gap-1"
                            onClick={() => handleApprovalClick(indent, 'approve')}
                            disabled={actionLoading === indent.rowNumber}
                          >
                            {actionLoading === indent.rowNumber ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => handleApprovalClick(indent, 'reject')}
                            disabled={actionLoading === indent.rowNumber}
                          >
                            {actionLoading === indent.rowNumber ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Approval Confirmation Modal */}
          {showApprovalModal && pendingAction && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>
                    {pendingAction.action === 'approve' ? 'Approve' : 'Reject'} Indent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    Are you sure you want to {pendingAction.action} indent{' '}
                    <strong>{pendingAction.indent['Indent No.']}</strong>?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={confirmApprovalAction}
                      className={
                        pendingAction.action === 'approve'
                          ? 'flex-1 bg-green-500 hover:bg-green-600'
                          : 'flex-1 bg-destructive hover:bg-destructive/90'
                      }
                    >
                      Confirm
                    </Button>
                    <Button
                      onClick={() => {
                        setShowApprovalModal(false);
                        setPendingAction(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
