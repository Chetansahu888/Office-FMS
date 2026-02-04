'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, History, PlusCircle, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getMasterData, submitFMSIndent, getFMSHistory } from '@/lib/fms';

interface FMSIndent {
  Timestamp: string;
  'Indent No.'?: string;  // Try with period
  'Indent No'?: string;   // Try without period
  'Indentor Name': string;
  'Area Of Machine': string;
  'Group Head': string;
  'Product Name': string;
  Qty: number;
  Specifications: string;
}

export default function CreateIndent() {
  const [activeTab, setActiveTab] = useState('create');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    indentorName: '',
    areaOfMachine: '',
    groupHead: '',
    productName: '',
    qty: 0,
    specifications: '',
  });

  const [masterData, setMasterData] = useState({
    indentorNames: [] as string[],
    groupHeads: [] as string[],
    productNames: [] as string[],
  });

  const [history, setHistory] = useState<FMSIndent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [indentNo, setIndentNo] = useState('');

  // Fetch master data on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getMasterData();
        
        console.log('📊 Master data response:', data);
        
        if (data.success) {
          setMasterData({
            indentorNames: data.indentorNames || [],
            groupHeads: data.groupHeads || [],
            productNames: data.productNames || [],
          });
          
          const total = (data.indentorNames?.length || 0) + (data.groupHeads?.length || 0) + (data.productNames?.length || 0);
          
          if (total > 0) {
            toast.success(`Loaded ${data.indentorNames?.length || 0} indentors, ${data.groupHeads?.length || 0} groups, ${data.productNames?.length || 0} products`);
          } else {
            toast.warning('No master data found. Please add data to MASTER sheet.');
          }
        } else {
          toast.error(data.error || 'Failed to load master data');
        }
      } catch (error) {
        console.error('Error fetching master data:', error);
        toast.error('Failed to load master data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Fetch history when switching to history tab
 const loadHistory = async () => {
  setLoadingHistory(true);
  try {
    const data = await getFMSHistory();
    
    console.log('📜 History data received:', data);
    console.log('📋 First indent keys:', data.indents?.[0] ? Object.keys(data.indents[0]) : 'No data');
    
    if (data.success) {
      setHistory(data.indents || []);
      toast.success(`Loaded ${data.indents?.length || 0} history records`);
    } else {
      toast.error(data.error || 'Failed to load history');
    }
  } catch (error) {
    console.error('Error fetching history:', error);
    toast.error('Failed to load history');
  } finally {
    setLoadingHistory(false);
  }
};


  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.indentorName || !formData.groupHead || !formData.productName || !formData.areaOfMachine) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.qty || formData.qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setSubmitting(true);

    try {
      const response = await submitFMSIndent(formData);

      if (response.success) {
        setIndentNo(response.indentNo || '');
        setSubmitted(true);
        toast.success(`Indent created successfully! Indent No: ${response.indentNo}`);

        // Reset form after 3 seconds
        setTimeout(() => {
          setFormData({
            indentorName: '',
            areaOfMachine: '',
            groupHead: '',
            productName: '',
            qty: 0,
            specifications: '',
          });
          setSubmitted(false);
          setIndentNo('');
        }, 3000);
      } else {
        toast.error(response.error || 'Failed to submit indent');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit indent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredHistory = history.filter(indent => {
  const indentNo = indent['Indent No.'] || indent['Indent No'] || '';
  return (
    indent['Indentor Name']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    indentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    indent['Product Name']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    indent['Area Of Machine']?.toLowerCase().includes(searchTerm.toLowerCase())
  );
});


  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading form data...</p>
        </div>
      </div>
    );
  }

  const hasNoMasterData = masterData.indentorNames.length === 0 && 
                          masterData.groupHeads.length === 0 && 
                          masterData.productNames.length === 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Indent Management System</CardTitle>
        </CardHeader>
        <CardContent>
          {hasNoMasterData && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  No master data found
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  Please add indentor names, group heads, and product names to the MASTER sheet in your Google Spreadsheet.
                </p>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="create" className="gap-2">
                <PlusCircle className="w-4 h-4" />
                Create Indent
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                View History
              </TabsTrigger>
            </TabsList>

            {/* CREATE TAB */}
            <TabsContent value="create">
              {!hasNoMasterData && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {/* <strong>Data Loaded:</strong> {masterData.indentorNames.length} indentors, {masterData.groupHeads.length} groups, {masterData.productNames.length} products */}
                  </p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Indentor Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2">
                      Indentor Name *
                    </label>
                    <Select
                      value={formData.indentorName}
                      onValueChange={(value) => handleInputChange('indentorName', value)}
                      disabled={masterData.indentorNames.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={masterData.indentorNames.length === 0 ? "No indentors available" : "Select indentor"} />
                      </SelectTrigger>
                      <SelectContent>
                        {masterData.indentorNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Area Of Machine */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2">
                      Area Of Machine *
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter area of machine"
                      value={formData.areaOfMachine}
                      onChange={(e) => handleInputChange('areaOfMachine', e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>

                  {/* Group Head */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2">
                      Group Head *
                    </label>
                    <Select
                      value={formData.groupHead}
                      onValueChange={(value) => handleInputChange('groupHead', value)}
                      disabled={masterData.groupHeads.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={masterData.groupHeads.length === 0 ? "No groups available" : "Select group head"} />
                      </SelectTrigger>
                      <SelectContent>
                        {masterData.groupHeads.map((head) => (
                          <SelectItem key={head} value={head}>
                            {head}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Product Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2">
                      Product Name *
                    </label>
                    <Select
                      value={formData.productName}
                      onValueChange={(value) => handleInputChange('productName', value)}
                      disabled={masterData.productNames.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={masterData.productNames.length === 0 ? "No products available" : "Select product"} />
                      </SelectTrigger>
                      <SelectContent>
                        {masterData.productNames.map((product) => (
                          <SelectItem key={product} value={product}>
                            {product}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2">
                      Quantity *
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter quantity"
                      value={formData.qty || ''}
                      onChange={(e) => handleInputChange('qty', parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-full"
                      required
                    />
                  </div>

                  {/* Specifications */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2">
                      Specifications
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter specifications"
                      value={formData.specifications}
                      onChange={(e) => handleInputChange('specifications', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Success Message */}
                {submitted && (
                  <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-green-800 dark:text-green-300 font-medium">
                        Indent created successfully!
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Indent No: {indentNo}
                      </p>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full md:w-auto min-w-[200px] bg-blue-600 hover:bg-blue-700" 
                  disabled={submitting || hasNoMasterData}
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Indent'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* HISTORY TAB - TABLE FORMAT */}
            <TabsContent value="history">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    onClick={loadHistory} 
                    variant="outline" 
                    size="sm"
                    disabled={loadingHistory}
                  >
                    {loadingHistory ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Refresh
                  </Button>
                </div>

                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
                    <span>Loading history...</span>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Timestamp
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Indent No
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Indentor Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Area Of Machine
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Group Head
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Product Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Qty
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Specifications
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredHistory.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="text-sm">
                                  {history.length === 0 
                                    ? 'No indents found. Create your first indent to see it here.'
                                    : 'No results match your search.'}
                                </p>
                              </td>
                            </tr>
                          ) : (
                            filteredHistory.map((indent, index) => (
                              <tr 
                                key={index} 
                                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {indent.Timestamp || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {indent['Indent No.'] || indent['Indent No'] || '-'}
                              </td>

                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {indent['Indentor Name'] || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {indent['Area Of Machine'] || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {indent['Group Head'] || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {indent['Product Name'] || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {indent.Qty || 0}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {indent.Specifications || '-'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
