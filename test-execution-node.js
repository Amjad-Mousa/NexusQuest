#!/usr/bin/env node

// Test all three execution endpoints with proper streaming handling

const testTask = async () => {
    console.log('\n=== Testing Task Execution ===');

    const sessionId = `task-${Date.now()}`;
    const body = JSON.stringify({
        code: `x = 5
y = 10
print(f"Sum: {x + y}")`,
        language: 'python',
        sessionId
    });

    try {
        const response = await fetch('http://localhost:9876/api/tasks/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(`✓ Task endpoint returned status ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let output = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            output += decoder.decode(value, { stream: true });
        }

        const lines = output.split('\n').filter(line => line.trim().startsWith('data:'));
        console.log(`✓ Received ${lines.length} SSE messages`);

        lines.forEach((line, i) => {
            try {
                const data = JSON.parse(line.substring(6));
                console.log(`  Message ${i + 1}: type=${data.type}, data length=${data.data?.length || 0}`);
            } catch (e) { }
        });

        return true;
    } catch (error) {
        console.error(`✗ Task execution failed: ${error.message}`);
        return false;
    }
};

const testProject = async () => {
    console.log('\n=== Testing Project Execution ===');

    const sessionId = `project-${Date.now()}`;
    const body = JSON.stringify({
        files: [
            {
                name: 'main.py',
                content: `def greet(name):
    return f"Hello, {name}!"

result = greet("World")
print(result)`
            }
        ],
        mainFile: 'main.py',
        language: 'python',
        sessionId
    });

    try {
        const response = await fetch('http://localhost:9876/api/projects/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(`✓ Project endpoint returned status ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let output = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            output += decoder.decode(value, { stream: true });
        }

        const lines = output.split('\n').filter(line => line.trim().startsWith('data:'));
        console.log(`✓ Received ${lines.length} SSE messages`);

        lines.forEach((line, i) => {
            try {
                const data = JSON.parse(line.substring(6));
                console.log(`  Message ${i + 1}: type=${data.type}, data length=${data.data?.length || 0}`);
            } catch (e) { }
        });

        return true;
    } catch (error) {
        console.error(`✗ Project execution failed: ${error.message}`);
        return false;
    }
};

const testPlayground = async () => {
    console.log('\n=== Testing Playground Execution ===');

    const sessionId = `playground-${Date.now()}`;
    const body = JSON.stringify({
        code: `for i in range(3):
    print(f"Line {i}")`,
        language: 'python',
        sessionId
    });

    try {
        const response = await fetch('http://localhost:9876/api/playground/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(`✓ Playground endpoint returned status ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let output = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            output += decoder.decode(value, { stream: true });
        }

        const lines = output.split('\n').filter(line => line.trim().startsWith('data:'));
        console.log(`✓ Received ${lines.length} SSE messages`);

        lines.forEach((line, i) => {
            try {
                const data = JSON.parse(line.substring(6));
                console.log(`  Message ${i + 1}: type=${data.type}, data length=${data.data?.length || 0}`);
            } catch (e) { }
        });

        return true;
    } catch (error) {
        console.error(`✗ Playground execution failed: ${error.message}`);
        return false;
    }
};

(async () => {
    console.log('Testing NexusQuest Execution Endpoints\n' + '='.repeat(40));

    const results = await Promise.all([
        testTask(),
        testProject(),
        testPlayground()
    ]);

    console.log('\n' + '='.repeat(40));
    const passed = results.filter(r => r).length;
    const total = results.length;

    if (passed === total) {
        console.log(`✓ All ${total} tests passed!`);
        process.exit(0);
    } else {
        console.log(`✗ ${total - passed} of ${total} tests failed`);
        process.exit(1);
    }
})();
