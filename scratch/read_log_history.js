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
  const rl = ***REMOVED***
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("=== TRANSCRIPT STEPS ===");
  for await (const line of rl) {
    try {
      const step = JSON.parse(line);
      if (step.step_index >= 0 && step.step_index <= 99) {
        console.log(`\nStep ${step.step_index} (${step.source}):`);
        console.log(step.content || `[Tool Call/Response of type ${step.type}]`);
      }
    } catch (err) {
      // Ignore parse errors
    }
  }
}

run();
