import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import * as fs from "fs";
import * as path from "path";

/**
 * Automated Evaluation Suite for Project 1 (Full Reconciliation)
 */

const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
const evalConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "config/eval.json"), "utf8"));

async function runAgent(prompt: string) {
  const command = new InvokeAgentCommand({
    agentId: process.env.AGENT_ID,
    agentAliasId: process.env.AGENT_ALIAS_ID,
    sessionId: `eval-${Date.now()}`,
    inputText: prompt,
  });

  try {
    const response = await client.send(command);
    let outputText = "";
    if (response.completion) {
      for await (const chunk of response.completion) {
        if (chunk.chunk && chunk.chunk.bytes) {
          outputText += new TextDecoder().decode(chunk.chunk.bytes);
        }
      }
    }
    return { summary: outputText, success: true };
  } catch (err: any) {
    return { summary: err.message, success: false };
  }
}

async function startEval() {
  console.log("\n🚀 Starting Project 1 Evaluation Suite...");
  
  if (!process.env.AGENT_ID) {
    console.error("❌ AGENT_ID not set. Please check your .env file.");
    process.exit(1);
  }

  let totalScore = 0;

  for (const scenario of evalConfig.scenarios) {
    console.log(`\n📝 Scenario: [${scenario.name}]`);
    console.log(`   Input: "${scenario.input}"`);
    
    const result = await runAgent(scenario.input);
    
    if (result.success) {
      // Basic keyword-based accuracy score
      let score = 0;
      const keywords = scenario.expected_tools;
      keywords.forEach((kw: string) => {
        // Since we can't easily see the tool calls from the runtime response summary, 
        // we check for logical mention in the final summary
        if (result.summary.toLowerCase().includes(kw.toLowerCase().replace("check", "").replace("Service", ""))) {
          score += 1;
        }
      });

      const finalScore = (score / keywords.length) * 100;
      totalScore += finalScore;
      
      console.log(`   Result: SUCCESS`);
      console.log(`   Summary: ${result.summary.slice(0, 100)}...`);
      console.log(`   Accuracy Score: ${finalScore.toFixed(2)}%`);
    } else {
      console.log(`   Result: FAILED (${result.summary})`);
    }
  }

  const avgScore = totalScore / evalConfig.scenarios.length;
  console.log(`\n🏆 Final Operations Accuracy Score: ${avgScore.toFixed(2)}%\n`);
}

startEval();
