const http = require('http');

function testPlayground() {
  return new Promise((resolve, reject) => {
    const sessionId = `test-${Date.now()}`;
    console.log('🧪 Testing Playground Python execution...');
    console.log(`Session ID: ${sessionId}\n`);

    const testCode = `print("Hello from Playground!")
name = input("Enter your name: ")
print(f"Welcome, {name}!")`;

    const postData = JSON.stringify({
      code: testCode,
      language: 'python',
      sessionId: sessionId
    });

    const options = {
      hostname: 'localhost',
      port: 9876,
      path: '/api/playground/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      console.log(`✅ Status Code: ${res.statusCode}\n`);
      console.log('📤 Output:');

      res.on('data', (chunk) => {
        const data = chunk.toString();
        const lines = data.split('\n');

        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              if (eventData.type === 'output') {
                process.stdout.write(eventData.content);
              } else if (eventData.type === 'error') {
                console.log(`❌ Error: ${eventData.content}`);
              } else if (eventData.type === 'end') {
                console.log('\n✅ Execution completed successfully!');
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        });
      });

      res.on('end', () => {
        console.log('\n🎉 Playground test completed!');
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('❌ Request failed:', err.message);
      reject(err);
    });

    req.write(postData);
    req.end();

    // Simulate sending input after a delay
    setTimeout(() => {
      console.log('\n📥 Sending input: "TestUser"');
      
      const inputData = JSON.stringify({
        sessionId: sessionId,
        input: 'TestUser'
      });

      const inputOptions = {
        hostname: 'localhost',
        port: 9876,
        path: '/api/playground/input',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(inputData)
        }
      };

      const inputReq = http.request(inputOptions, (inputRes) => {
        let responseData = '';
        inputRes.on('data', chunk => responseData += chunk);
        inputRes.on('end', () => {
          console.log('📥 Input sent successfully');
        });
      });

      inputReq.on('error', (err) => {
        console.error('Failed to send input:', err.message);
      });

      inputReq.write(inputData);
      inputReq.end();
    }, 2000);
  });
}

testPlayground().catch(console.error);
