/**
 * Report Generator API Handler
 * Generates reports in various formats from analysis data
 */

export async function handleRequest(request) {
  try {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse the request body
    const { analysisResults, reportType } = await request.json();
    
    // Validate required fields
    if (!analysisResults) {
      return new Response(JSON.stringify({ error: 'Analysis results are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!reportType) {
      return new Response(JSON.stringify({ error: 'Report type is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate the report based on the type
    let report;
    let mimeType;
    let fileName;
    
    switch (reportType.toLowerCase()) {
      case 'json':
        report = generateJSONReport(analysisResults);
        mimeType = 'application/json';
        fileName = 'insurance-analysis-report.json';
        break;
        
      case 'csv':
        report = generateCSVReport(analysisResults);
        mimeType = 'text/csv';
        fileName = 'insurance-analysis-report.csv';
        break;
        
      case 'xlsx':
      case 'excel':
        // For demo, we'll return a JSON report instead of actual Excel
        report = generateJSONReport(analysisResults);
        mimeType = 'application/json';
        fileName = 'insurance-analysis-report.json';
        break;
        
      case 'pdf':
        // For demo, we'll return a JSON report instead of actual PDF
        report = generateJSONReport(analysisResults);
        mimeType = 'application/json';
        fileName = 'insurance-analysis-report.json';
        break;
        
      default:
        return new Response(JSON.stringify({ error: `Unsupported report type: ${reportType}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // Return the report with appropriate headers
    return new Response(report, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error in report generator handler:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to generate report',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Generate JSON report
 */
function generateJSONReport(analysisResults) {
  // Add metadata to the report
  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      reportType: 'Insurance Claims Analysis',
      version: '1.0.0'
    },
    data: analysisResults
  };
  
  return JSON.stringify(report, null, 2);
}

/**
 * Generate CSV report
 */
function generateCSVReport(analysisResults) {
  let csv = '';
  
  // Add headers
  csv += 'Report Type,Insurance Claims Analysis\n';
  csv += `Generated At,${new Date().toISOString()}\n\n`;
  
  // Overall stats
  if (analysisResults.overallStats) {
    csv += 'Overall Statistics\n';
    csv += 'Metric,Value\n';
    csv += `Total Claims,${analysisResults.overallStats.totalClaims}\n`;
    csv += `Rejection Rate,${analysisResults.overallStats.rejectionRate.toFixed(1)}%\n`;
    csv += `Total Amount,$${analysisResults.overallStats.totalAmount.toLocaleString()}\n`;
    csv += `Avg. Processing Days,${analysisResults.overallStats.averageProcessingDays.toFixed(1)}\n\n`;
  }
  
  // Rejection Reasons
  if (analysisResults.reasonsAnalysis && analysisResults.reasonsAnalysis.length > 0) {
    csv += 'Rejection Reasons\n';
    csv += 'Reason,Count,Percentage\n';
    
    analysisResults.reasonsAnalysis.forEach(reason => {
      csv += `"${reason.reason}",${reason.count},${reason.percentage.toFixed(1)}%\n`;
    });
    
    csv += '\n';
  }
  
  // Monthly Trends
  if (analysisResults.monthlyTrends && analysisResults.monthlyTrends.byMonth) {
    csv += 'Monthly Trends\n';
    csv += 'Month,Total Claims,Rejected Claims,Rejection Rate,Total Amount,Paid Amount\n';
    
    analysisResults.monthlyTrends.byMonth.forEach(month => {
      csv += `${month.month},${month.totalClaims},${month.rejectedClaims},${month.rejectionRate.toFixed(1)}%,$${month.totalAmount.toLocaleString()},$${month.paidAmount.toLocaleString()}\n`;
    });
    
    csv += '\n';
  }
  
  // Payer Analysis
  if (analysisResults.payerTrends && analysisResults.payerTrends.length > 0) {
    csv += 'Payer Analysis\n';
    csv += 'Payer,Total Claims,Rejected Claims,Rejection Rate,Total Amount\n';
    
    analysisResults.payerTrends.forEach(payer => {
      csv += `"${payer.payer}",${payer.totalClaims},${payer.rejectedClaims},${payer.rejectionRate.toFixed(1)}%,$${payer.totalAmount.toLocaleString()}\n`;
    });
  }
  
  return csv;
}
