import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import * as readline from "readline";

/**
 * Local CLI Chat Client for Bedrock Full Reconciliation
 * Usage: AGENT_ID=xxx AGENT_ALIAS_ID=yyy npm run chat
 */

const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
const sessionId = `session-${Date.now()}`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function askAgent(prompt: string) {
  const command = new InvokeAgentCommand({
    agentId: process.env.AGENT_ID,
    agentAliasId: process.env.AGENT_ALIAS_ID,
    sessionId: sessionId,
    inputText: prompt,
  });

  try {
    const response = await client.send(command);
    process.stdout.write("\n🤖 Agent: ");

    if (response.completion) {
      for await (const chunk of response.completion) {
        if (chunk.chunk && chunk.chunk.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          process.stdout.write(text);
        }
      }
    }
    process.stdout.write("\n\n");
  } catch (err: any) {
    console.error("\n❌ Error:", err.message);
  }
}

console.log("\n🚀 Bedrock Reconciliation Agent CLI");
console.log("Type your message and press Enter. Type 'exit' to quit.\n");

function main() {
  rl.question("👤 You: ", async (input) => {
    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      rl.close();
      return;
    }

    if (!process.env.AGENT_ID || !process.env.AGENT_ALIAS_ID) {
      console.error("❌ Error: AGENT_ID and AGENT_ALIAS_ID environment variables must be set.");
      rl.close();
      return;
    }

    await askAgent(input);
    main();
  });
}

main();
