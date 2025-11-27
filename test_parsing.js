
const assert = require('assert');

async function testParsing() {
    console.log("Testing JSON parsing logic...");

    let answer = "";
    let buffer = "";

    // Simulate chunks arriving from the stream
    const chunks = [
        '{"response": "Hello"}',
        '\n{"res',
        'ponse": " world"}',
        '\n{"response": "!"}'
    ];

    for (const chunk of chunks) {
        buffer += chunk;
        let lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const json = JSON.parse(line);
                if (json.response) answer += json.response;
            } catch (e) {
                console.log("Parse error (expected for partial):", e.message);
            }
        }
    }

    if (buffer.trim()) {
        try {
            const json = JSON.parse(buffer);
            if (json.response) answer += json.response;
        } catch (e) { }
    }

    console.log("Result:", answer);
    assert.strictEqual(answer, "Hello world!");
    console.log("✅ Test Passed!");
}

testParsing();
