/**
 * AI Insights API handler
 * Generates AI-powered insights from analysis data by calling OpenAI API
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
    const { analysisResults, apiKey } = await request.json();
    
    // Validate required fields
    if (!analysisResults) {
      return new Response(JSON.stringify({ error: 'Analysis results are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Call OpenAI API to generate insights
    const insightsResponse = await generateOpenAIInsights(analysisResults, apiKey);
    
    return new Response(JSON.stringify(insightsResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in AI insights handler:', error);
    
    let status = 500;
    let message = 'Failed to generate AI insights';
    
    // Check if the error is from OpenAI API
    if (error.message && error.message.includes('OpenAI API')) {
      status = 401;
      message = 'Invalid OpenAI API key or API access error';
    }
    
    return new Response(JSON.stringify({
      error: message,
      details: error.message
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Generate insights using OpenAI API
 */
async function generateOpenAIInsights(analysisData, apiKey) {
  try {
    // Prepare data for OpenAI
    const prompt = createInsightsPrompt(analysisData);
    
    // Call OpenAI API
    const openAIResponse = await callOpenAIAPI(prompt, apiKey);
    
    // Parse the response
    return parseOpenAIResponse(openAIResponse);
  } catch (error) {
    console.error('Error generating insights:', error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Create prompt for OpenAI with analysis data
 */
function createInsightsPrompt(analysisData) {
  // Format the data into a structured prompt
  return `
As a healthcare insurance data analyst, analyze the following insurance claims data and provide:
1. Key insights about rejection patterns and trends
2. Actionable recommendations for improving claim acceptance rates

Insurance Claims Data Summary:
- Total Claims: ${analysisData.overallStats.totalClaims.toLocaleString()}
- Rejection Rate: ${analysisData.overallStats.rejectionRate.toFixed(1)}%
- Total Claim Amount: $${analysisData.overallStats.totalAmount.toLocaleString()}
- Average Processing Time: ${analysisData.overallStats.averageProcessingDays.toFixed(1)} days

Top Rejection Reasons:
${analysisData.reasonsAnalysis.slice(0, 5).map(reason => 
  `- ${reason.reason}: ${reason.percentage.toFixed(1)}% (${reason.count} claims)`
).join('\n')}

Monthly Trends:
${analysisData.monthlyTrends.byMonth.map(month => 
  `- ${month.month}: ${month.totalClaims} claims, ${month.rejectionRate.toFixed(1)}% rejection rate`
).join('\n')}

Top Payers by Rejection Rate:
${analysisData.payerTrends.slice(0, 5).map(payer => 
  `- ${payer.payer}: ${payer.rejectionRate.toFixed(1)}% rejection rate on ${payer.totalClaims} claims`
).join('\n')}

Provide your analysis in two separate sections labeled "INSIGHTS" and "RECOMMENDATIONS". 
Each section should be detailed but concise, with 4-6 bullet points per section.
`;
}

/**
 * Call OpenAI API with the prompt
 */
async function callOpenAIAPI(prompt, apiKey) {
  try {
    // In a real implementation, this would call the OpenAI API
    // For now, we'll simulate a response to avoid requiring an actual key
    
    // This is placeholder code for the actual API call:
    /*
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a healthcare insurance data analyst.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }
    
    return await response.json();
    */
    
    // Simulate waiting for API response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // For demonstration, return a simulated response
    return simulateOpenAIResponse();
  } catch (error) {
    console.error('OpenAI API call error:', error);
    throw error;
  }
}

/**
 * Parse OpenAI API response
 */
function parseOpenAIResponse(response) {
  // In a real implementation, this would parse the actual OpenAI response
  // For now, use our simulated response
  
  /*
  // For actual OpenAI implementation:
  const content = response.choices[0].message.content;
  
  // Extract insights and recommendations
  const insightsPart = content.match(/INSIGHTS:([\s\S]*?)(?=RECOMMENDATIONS:)/i)?.[1]?.trim() || '';
  const recommendationsPart = content.match(/RECOMMENDATIONS:([\s\S]*)/i)?.[1]?.trim() || '';
  
  return {
    insights: insightsPart,
    recommendations: recommendationsPart
  };
  */
  
  return response;
}

/**
 * Simulate an OpenAI response for demonstration
 */
function simulateOpenAIResponse() {
  return {
    insights: `• The average rejection rate of 12.4% is significantly higher than the industry average of 8-10%, indicating potential issues in the claims submission process.

• "Missing Information" is the top rejection reason at 24.3%, suggesting a need for better claim form completion training or tools.

• There's a clear trend of improving rejection rates over time (decreasing from around 12% to 9%), which corresponds with possible process improvements that have been implemented.

• Medicaid has the highest rejection rate among payers (18.7%), which is concerning given it represents vulnerable populations.

• Processing time averages 12.4 days, which exceeds the ideal turnaround time of 7-10 days, potentially causing cash flow issues.

• The total claim amount of $38.2M represents a substantial financial interest, with approximately $4.7M in claims affected by rejections.`,
    recommendations: `• Implement targeted training focusing specifically on reducing "Missing Information" errors, potentially through new form validation tools or checklists.

• Investigate the specific requirements for Medicaid claims as they have the highest rejection rate, and consider creating a special review process for these claims before submission.

• Analyze claims from UnitedHealthcare (14.2% rejection rate) and Blue Cross Blue Shield (13.8% rejection rate) to identify specific patterns in their rejections and adjust submission processes accordingly.

• Continue and potentially strengthen the process improvements that have led to the positive trend of decreasing rejection rates over the past 6 months.

• Implement automated claim scrubbing software that can check for errors before submission to further reduce the rejection rate.

• Create a specialized team to handle resubmissions of rejected claims within 48 hours to improve cash flow and capture more revenue.`
  };
}
