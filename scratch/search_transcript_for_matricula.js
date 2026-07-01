const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = path.resolve('C:\\Users\\Caio\\.gemini\\antigravity\\brain\\b33051b7-7a78-42c0-8bc3-d35de7ea5973\\.system_generated\\logs\\transcript.jsonl');

async function run() {
  if (!fs.existsSync(logPath)) {
    console.error("Log file does not exist at:", logPath);
    return;
  }

  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("=== TRANSCRIPT SEARCH ===");
  for await (const line of rl) {
    try {
      const step = JSON.parse(line);
      const text = JSON.stringify(step);
      if (text.includes('000783') || text.includes('17784306000189.')) {
        console.log(`Step ${step.step_index} (${step.source}):`);
        // Find the snippet around '000783' or '17784306000189.'
        const index = text.indexOf('000783');
        const start = Math.max(0, index - 100);
        const end = Math.min(text.length, index + 100);
        console.log("Snippet:", text.substring(start, end));
      }
    } catch (err) {
      // Ignore parse errors
    }
  }
}

run();
