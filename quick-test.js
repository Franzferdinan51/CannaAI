/**
 * Quick test to see which route is being used
 */

const http = require('http');

function makeRequest(data, callback) {
  const postData = JSON.stringify(data);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/analyze',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      callback({
        statusCode: res.statusCode,
        body: body
      });
    });
  });

  req.on('error', callback);
  req.write(postData);
  req.end();
}

console.log('Testing simple request (should use simple route)...');
makeRequest({
  strain: "Test",
  leafSymptoms: "Test symptoms"
}, (response) => {
  if (response.error) {
    console.log('❌ Error:', response.error);
  } else {
    console.log('📥 Status:', response.statusCode);
    console.log('📥 Response preview:', response.body.substring(0, 200) + '...');
  }
  console.log('\nCheck server logs for "SIMPLE ROUTE" marker to see which route was used.');
});