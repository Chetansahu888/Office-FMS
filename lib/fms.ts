const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyrXryQ1beeG3ABF5jq8--wiPXnjY5JIVoEdtpBMbS3Lr4Lyc7tJKJ1JLuCqRYMV-UAwQ/exec";

// JSONP helper
function jsonp(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Math.random().toString(36).substring(7);
    const script = document.createElement('script');
    
    (window as any)[callbackName] = (data: any) => {
      delete (window as any)[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };
    
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
    script.onerror = () => {
      delete (window as any)[callbackName];
      document.body.removeChild(script);
      reject(new Error('JSONP request failed'));
    };
    
    document.body.appendChild(script);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        reject(new Error('JSONP request timeout'));
      }
    }, 30000);
  });
}

export async function getMasterData() {
  try {
    const url = `${APP_SCRIPT_URL}?action=getMasterData&_=${Date.now()}`;
    console.log('🔍 Fetching master data from:', url);
    
    const data = await jsonp(url);
    console.log('✅ Master data received:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching master data:', error);
    return {
      success: false,
      indentorNames: [],
      groupHeads: [],
      productNames: [],
      error: error instanceof Error ? error.message : 'Failed to fetch master data'
    };
  }
}

export async function getFMSHistory() {
  try {
    const url = `${APP_SCRIPT_URL}?action=getFMSHistory&_=${Date.now()}`;
    console.log('🔍 Fetching history from:', url);
    
    const data = await jsonp(url);
    console.log('✅ History received:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching history:', error);
    return {
      success: false,
      indents: [],
      error: error instanceof Error ? error.message : 'Failed to fetch history'
    };
  }
}

export async function submitFMSIndent(formData: any) {
  try {
    console.log('📤 Submitting FMS indent...', formData);
    
    // Build URL with query parameters for GET request
    const params = new URLSearchParams({
      action: 'submitFMS',
      indentorName: formData.indentorName || '',
      areaOfMachine: formData.areaOfMachine || '',
      groupHead: formData.groupHead || '',
      productName: formData.productName || '',
      qty: (formData.qty || 0).toString(),
      specifications: formData.specifications || '',
      _: Date.now().toString()
    });
    
    const url = `${APP_SCRIPT_URL}?${params.toString()}`;
    console.log('🔗 Submission URL:', url);
    
    const data = await jsonp(url);
    console.log('✅ Submission response:', data);
    
    return data;
    
  } catch (error) {
    console.error('❌ Error submitting indent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit indent'
    };
  }
}
