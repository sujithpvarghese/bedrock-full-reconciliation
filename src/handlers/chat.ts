import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "us-east-1" });

export const handler = async (event: any) => {
  // We assume this is connected to a Chat UI or API Gateway
  const userPrompt = event.prompt;
  const sessionId = event.sessionId || `session-${Date.now()}`;

  if (!userPrompt) {
    return { error: "Missing 'prompt' in event." };
  }

  const command = new InvokeAgentCommand({
    agentId: process.env.AGENT_ID!,
    agentAliasId: process.env.AGENT_ALIAS_ID!,
    sessionId: sessionId,
    inputText: userPrompt,
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

    return {
      message: "Success",
      agentReply: outputText
    };
  } catch (err: any) {
    console.error("Error calling Bedrock Agent:", err);
    return { error: err.message };
  }
};
