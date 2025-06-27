/**
 * Process and prepare insurance data for analysis
 * @param {Object} data - The raw data extracted from Excel or PDF
 * @returns {Object} The processed data ready for analysis
 */
export function processInsuranceData(data) {
  // If data comes from Excel, we'll use the first sheet or a specific named sheet
  let dataRows = [];
  
  if (data.sheets) {
    // Look for sheets with relevant names first
    const relevantSheetNames = ['claims', 'rejections', 'insurance', 'data'];
    const targetSheet = data.sheets.find(sheet => 
      relevantSheetNames.some(name => sheet.name.toLowerCase().includes(name))
    ) || data.sheets[0]; // Fallback to first sheet if no relevant sheet found
    
    dataRows = targetSheet.rows;
  } else if (data.tables && data.tables.length > 0) {
    // Convert PDF table format to row objects with headers as keys
    const table = data.tables[0]; // Use the first detected table
    dataRows = table.rows.map(row => {
      const rowObj = {};
      table.headers.forEach((header, index) => {
        rowObj[header] = row[index] || '';
      });
      return rowObj;
    });
  } else {
    throw new Error('No valid data found to process');
  }
  
  // Process the data rows
  const processedData = normalizeInsuranceData(dataRows);
  
  // Add derived statistics
  const enhancedData = enrichWithStatistics(processedData);
  
  return enhancedData;
}

/**
 * Normalize insurance data by standardizing field names and data types
 * @param {Array} rows - The raw data rows
 * @returns {Array} Normalized data rows
 */
function normalizeInsuranceData(rows) {
  if (!rows || !rows.length) return [];
  
  // Get all unique keys from all rows
  const allKeys = new Set();
  rows.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });
  
  // Create a mapping of common insurance field names to standardized names
  const fieldMappings = {
    // Claim information
    'claim id': 'claimId',
    'claim_id': 'claimId',
    'claimid': 'claimId',
    'claim #': 'claimId',
    'claim number': 'claimId',
    
    // Date fields
    'date': 'claimDate',
    'claim date': 'claimDate',
    'service date': 'serviceDate',
    'dos': 'serviceDate',
    'date of service': 'serviceDate',
    'submission date': 'submissionDate',
    'submitted date': 'submissionDate',
    
    // Amounts
    'amount': 'claimAmount',
    'claim amount': 'claimAmount',
    'billed amount': 'billedAmount',
    'billed': 'billedAmount',
    'paid amount': 'paidAmount',
    'paid': 'paidAmount',
    'allowed amount': 'allowedAmount',
    'allowed': 'allowedAmount',
    
    // Status fields
    'status': 'claimStatus',
    'claim status': 'claimStatus',
    'result': 'claimStatus',
    'outcome': 'claimStatus',
    
    // Rejection information
    'rejection reason': 'rejectionReason',
    'reason': 'rejectionReason',
    'denial reason': 'rejectionReason',
    'rejection code': 'rejectionCode',
    'denial code': 'rejectionCode',
    
    // Provider information
    'provider': 'providerName',
    'provider name': 'providerName',
    'provider id': 'providerId',
    'npi': 'providerId',
    
    // Patient information
    'patient': 'patientName',
    'patient name': 'patientName',
    'patient id': 'patientId',
    'member id': 'patientId',
    
    // Insurance information
    'payer': 'payerName',
    'insurance': 'payerName',
    'insurance company': 'payerName',
    'payer id': 'payerId',
    'insurance id': 'payerId',
  };
  
  // Normalize each row
  return rows.map(row => {
    const normalizedRow = {};
    
    Object.entries(row).forEach(([key, value]) => {
      // Normalize the key
      const lowerKey = key.toLowerCase();
      const normalizedKey = fieldMappings[lowerKey] || key;
      
      // Process the value based on field type
      let processedValue = value;
      
      // Handle date fields
      if (
        normalizedKey.includes('Date') || 
        normalizedKey.includes('date') ||
        normalizedKey === 'dos'
      ) {
        processedValue = normalizeDate(value);
      }
      
      // Handle amount fields
      else if (
        normalizedKey.includes('Amount') || 
        normalizedKey.includes('amount') ||
        normalizedKey === 'paid' ||
        normalizedKey === 'billed' ||
        normalizedKey === 'allowed'
      ) {
        processedValue = normalizeAmount(value);
      }
      
      normalizedRow[normalizedKey] = processedValue;
    });
    
    return normalizedRow;
  });
}

/**
 * Normalize a date value to ISO format
 * @param {any} value - The date value to normalize
 * @returns {string} ISO formatted date string or original value if not a date
 */
function normalizeDate(value) {
  if (!value) return null;
  
  // If already a string in ISO format, return as is
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value;
  }
  
  // If it's a Date object, convert to ISO
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // Try to parse common date formats
  try {
    // Handle common date formats
    let dateStr = value.toString().trim();
    
    // MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/');
      return new Date(year, month - 1, day).toISOString();
    }
    
    // DD/MM/YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      return new Date(year, month - 1, day).toISOString();
    }
    
    // YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      return new Date(dateStr).toISOString();
    }
    
    // Fall back to standard date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (e) {
    console.warn(`Could not parse date: ${value}`);
  }
  
  // Return the original value if we can't parse it
  return value;
}

/**
 * Normalize an amount value to a number
 * @param {any} value - The amount value to normalize
 * @returns {number} Normalized amount or null if invalid
 */
function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // If already a number, return as is
  if (typeof value === 'number') {
    return value;
  }
  
  // Try to convert string to number
  try {
    // Handle currency format (e.g., "$1,234.56")
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and other non-numeric characters
      const numericStr = value.replace(/[^0-9.-]/g, '');
      return parseFloat(numericStr);
    }
  } catch (e) {
    console.warn(`Could not parse amount: ${value}`);
  }
  
  // Return null if we couldn't parse a valid number
  return null;
}

/**
 * Helper function to calculate mean
 */
function calculateMean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Helper function to calculate median
 */
function calculateMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Helper function to calculate standard deviation
 */
function calculateStandardDeviation(values) {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return Math.sqrt(calculateMean(squaredDiffs));
}

/**
 * Helper function to calculate quantiles
 */
function calculateQuantiles(values, quantiles) {
  if (values.length === 0) return quantiles.map(() => 0);
  const sorted = [...values].sort((a, b) => a - b);
  return quantiles.map(q => {
    const index = q * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
  });
}

/**
 * Helper function to group data by a key
 */
function groupBy(array, keyFn) {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Enrich the processed data with statistical information
 * @param {Array} data - The processed data rows
 * @returns {Object} Enhanced data with statistics
 */
function enrichWithStatistics(data) {
  if (!data || !data.length) {
    return { rows: [], stats: {} };
  }
  
  // Get all amount fields
  const amountFields = Object.keys(data[0]).filter(key => 
    key.includes('Amount') || 
    key.includes('amount') || 
    ['paid', 'billed', 'allowed'].includes(key)
  );
  
  // Calculate statistics for each amount field
  const statistics = {};
  
  amountFields.forEach(field => {
    // Get all non-null values for this field
    const values = data
      .map(row => row[field])
      .filter(val => val !== null && val !== undefined && !isNaN(val));
    
    if (values.length === 0) return;
    
    statistics[field] = {
      mean: calculateMean(values),
      median: calculateMedian(values),
      min: Math.min(...values),
      max: Math.max(...values),
      standardDeviation: calculateStandardDeviation(values),
      quartiles: calculateQuantiles(values, [0.25, 0.5, 0.75])
    };
  });
  
  // Calculate claim status statistics
  if (data.some(row => row.claimStatus)) {
    const statusGroups = groupBy(data, d => d.claimStatus);
    
    statistics.claimStatus = Object.entries(statusGroups).map(([status, rows]) => ({
      status,
      count: rows.length,
      percentage: (rows.length / data.length) * 100
    }));
  }
  
  // Calculate rejection reason statistics if available
  if (data.some(row => row.rejectionReason)) {
    const rejectionData = data.filter(row => row.rejectionReason);
    const rejectionGroups = groupBy(rejectionData, d => d.rejectionReason);
    
    statistics.rejectionReasons = Object.entries(rejectionGroups).map(([reason, rows]) => ({
      reason,
      count: rows.length,
      percentage: (rows.length / rejectionData.length) * 100
    }));
  }
  
  return {
    rows: data,
    stats: statistics
  };
}
