/**
 * Analyze trends over time in insurance claims data
 */
export async function analyzeTrends(request) {
  try {
    const { resultId } = await request.json();
    
    if (!resultId) {
      return new Response(
        JSON.stringify({ error: 'No result ID provided for analysis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the extraction result from KV
    const extractionResult = await HEALTH_INSURANCE_DATA.get(`extraction:${resultId}`, { type: 'json' });
    
    if (!extractionResult) {
      return new Response(
        JSON.stringify({ error: 'No data found for the provided result ID' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Process data and generate trends analysis
    const trendResults = analyzeTrendPatterns(extractionResult);
    
    return new Response(
      JSON.stringify(trendResults),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error analyzing trends:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze trends: ' + error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Analyze trends over time in insurance claims data
 * @param {Array} data - The processed data rows
 * @returns {Object} Trend analysis results
 */
export function analyzeTrendPatterns(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { monthlyTrends: [], payerTrends: [], overallTrend: {} };
  }

  // Helper function to group data by a key
  const groupBy = (array, keyFn) => {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  };

  // Helper function to calculate sum
  const sum = (array, valueFn) => {
    return array.reduce((total, item) => total + (valueFn(item) || 0), 0);
  };

  // Helper function to calculate mean
  const mean = (array, valueFn) => {
    if (array.length === 0) return 0;
    return sum(array, valueFn) / array.length;
  };

  // Calculate monthly trends
  const monthlyGroups = groupBy(data, d => 
    d.claimDate ? d.claimDate.substring(0, 7) : '2024-01'
  );

  const monthlyTrendsArray = Object.entries(monthlyGroups).map(([month, rows]) => {
    const rejectedRows = rows.filter(row => row.claimStatus === 'Rejected');
    return {
      month,
      totalClaims: rows.length,
      rejectedClaims: rejectedRows.length,
      rejectionRate: rows.length > 0 ? (rejectedRows.length / rows.length) * 100 : 0,
      totalAmount: sum(rows, d => d.claimAmount),
      paidAmount: sum(rows, d => d.paidAmount)
    };
  }).sort((a, b) => new Date(a.month) - new Date(b.month));

  // Calculate payer trends
  const payerGroups = groupBy(data, d => d.payerName || 'Unknown');

  const payerTrendsArray = Object.entries(payerGroups).map(([payer, rows]) => {
    const rejectedRows = rows.filter(row => row.claimStatus === 'Rejected');
    return {
      payer,
      totalClaims: rows.length,
      rejectedClaims: rejectedRows.length,
      rejectionRate: rows.length > 0 ? (rejectedRows.length / rows.length) * 100 : 0,
      totalAmount: sum(rows, d => d.claimAmount),
      paidAmount: sum(rows, d => d.paidAmount),
      averagePaidAmount: mean(rows, d => d.paidAmount)
    };
  }).sort((a, b) => b.totalClaims - a.totalClaims);

  // Calculate overall trend changes
  let overallTrend = {};
  if (monthlyTrendsArray.length >= 2) {
    const firstMonth = monthlyTrendsArray[0];
    const lastMonth = monthlyTrendsArray[monthlyTrendsArray.length - 1];
    
    const claimVolumeChange = firstMonth.totalClaims > 0 
      ? ((lastMonth.totalClaims - firstMonth.totalClaims) / firstMonth.totalClaims) * 100 
      : 0;
    
    const rejectionRateChange = lastMonth.rejectionRate - firstMonth.rejectionRate;
    
    const firstAvgAmount = firstMonth.totalClaims > 0 ? firstMonth.totalAmount / firstMonth.totalClaims : 0;
    const lastAvgAmount = lastMonth.totalClaims > 0 ? lastMonth.totalAmount / lastMonth.totalClaims : 0;
    const averageClaimAmountChange = firstAvgAmount > 0 
      ? ((lastAvgAmount - firstAvgAmount) / firstAvgAmount) * 100 
      : 0;

    overallTrend = {
      claimVolumeChange,
      rejectionRateChange,
      averageClaimAmountChange
    };
  }

  return {
    monthlyTrends: monthlyTrendsArray,
    payerTrends: payerTrendsArray,
    overallTrend
  };
}
