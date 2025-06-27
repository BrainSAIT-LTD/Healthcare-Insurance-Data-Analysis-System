/**
 * Upload API handler
 * Handles file uploads from the BRAINSAIT interface
 */

export async function handleRequest(request) {
  try {
    const contentType = request.headers.get('content-type');
    
    // Check if this is a multipart/form-data request (file upload)
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'Request must be multipart/form-data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process the form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate a unique identifier for the uploaded file
    const fileId = generateUniqueId();
    const fileName = file.name;
    const fileSize = file.size;
    const fileType = file.type;

    // Here you would typically send the file to storage or process it
    // This is a simplified version that returns metadata about the file
    // In a real implementation, you might upload to S3/Cloudflare R2/etc.

    // For now, just acknowledge the file was received
    const response = {
      success: true,
      fileId,
      fileName,
      fileSize,
      fileType,
      uploadedAt: new Date().toISOString(),
      message: 'File received successfully'
    };

    // Return a JSON response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in upload handler:', error);
    
    // Return an error response
    return new Response(JSON.stringify({
      error: 'Failed to process upload',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Generate a unique ID for file tracking
 */
function generateUniqueId() {
  // Simple UUID v4-like implementation
  return 'file_' + ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}
