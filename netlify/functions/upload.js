const pdfParse = require('pdf-parse');

exports.handler = async function(event, context) {
  // Allow only POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }
  
  // Get the file data from the event body.
  // The file is expected to be sent as a base64-encoded string.
  let buffer;
  try {
    // event.isBase64Encoded should be true if the file is sent encoded.
    if (event.isBase64Encoded) {
      buffer = Buffer.from(event.body, 'base64');
    } else {
      buffer = Buffer.from(event.body);
    }
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid file data" }),
    };
  }
  
  try {
    const data = await pdfParse(buffer);
    // Here you can call your custom parsing logic.
    // For now, we simply return the extracted text.
    return {
      statusCode: 200,
      body: JSON.stringify({ text: data.text }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.toString() }),
    };
  }
};
