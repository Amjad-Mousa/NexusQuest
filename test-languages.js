const http = require('http');
const EventSource = require('eventsource');

// Test configurations for each language
const testConfigs = {
  python: {
    code: `print("Hello from Python!")
name = input("Enter your name: ")
print(f"Hello, {name}!")`,
    input: "Amjad"
  },
  javascript: {
    code: `console.log("Hello from JavaScript!");
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter your name: ', (name) => {
  console.log(\`Hello, \${name}!\`);
  rl.close();
});`,
    input: "Amjad"
  },
  java: {
    code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter your name: ");
        String name = scanner.nextLine();
        System.out.println("Hello, " + name + "!");
        scanner.close();
    }
}`,
    input: "Amjad"
  },
  cpp: {
    code: `#include <iostream>
#include <string>

int main() {
    std::cout << "Hello from C++!" << std::endl;
    std::string name;
    std::cout << "Enter your name: ";
    std::getline(std::cin, name);
    std::cout << "Hello, " << name << "!" << std::endl;
    return 0;
}`,
    input: "Amjad"
  }
};

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15);
}

function testLanguage(language, config) {
  return new Promise((resolve, reject) => {
    const sessionId = generateSessionId();
    console.log(`\n🧪 Testing ${language.toUpperCase()}...`);
    console.log(`Session ID: ${sessionId}`);

    const postData = JSON.stringify({
      code: config.code,
      language: language,
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
      let output = '';
      let hasError = false;

      res.on('data', (chunk) => {
        const data = chunk.toString();
        output += data;

        // Parse SSE data
        const lines = data.split('\n');
        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              if (eventData.type === 'output') {
                console.log(`📤 Output: ${eventData.content.trim()}`);
              } else if (eventData.type === 'error') {
                console.log(`❌ Error: ${eventData.content}`);
                hasError = true;
              } else if (eventData.type === 'end') {
                console.log(`✅ Execution completed for ${language}`);
              }
            } catch (e) {
              // Ignore parsing errors for now
            }
          }
        });
      });

      res.on('end', () => {
        if (hasError) {
          reject(new Error(`${language} execution failed`));
        } else {
          resolve(output);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive language tests for NexusQuest Playground\n');

  for (const [language, config] of Object.entries(testConfigs)) {
    try {
      await testLanguage(language, config);
      console.log(`✅ ${language.toUpperCase()} test passed!\n`);
    } catch (error) {
      console.log(`❌ ${language.toUpperCase()} test failed: ${error.message}\n`);
    }

    // Wait a bit between tests to avoid conflicts
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('🎉 All language tests completed!');
}

runAllTests().catch(console.error);