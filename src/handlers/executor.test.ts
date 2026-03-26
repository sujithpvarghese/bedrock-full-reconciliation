import { handler } from "./executor";

describe("Bedrock Action Group Executor", () => {
  const createBedrockEvent = (functionName: string, parameters: { name: string; value: string }[]) => ({
    messageVersion: "1.0",
    actionGroup: "DiagnosticActions",
    apiPath: "/test",
    function: functionName,
    parameters: parameters
  });

  it("should return NOT_SELLABLE for broken mocked product prod_9982", async () => {
    const event = createBedrockEvent("checkWebDatabase", [{ name: "identifier", value: "prod_9982" }]);
    const result = await handler(event);

    const responseBodyString = result.response.functionResponse.responseBody.TEXT.body;
    const bodyJson = JSON.parse(responseBodyString);

    expect(bodyJson.status).toBe("NOT_SELLABLE");
    expect(bodyJson.webInventory).toBe(0);
  });

  it("should return SELLABLE for generic products", async () => {
    const event = createBedrockEvent("checkWebDatabase", [{ name: "identifier", value: "prod_12345" }]);
    const result = await handler(event);

    const responseBodyString = result.response.functionResponse.responseBody.TEXT.body;
    const bodyJson = JSON.parse(responseBodyString);

    expect(bodyJson.status).toBe("SELLABLE");
    expect(bodyJson.webInventory).toBe(50);
  });

  it("should successfully execute a mock syncSystem job and return SYNC_SUCCESSFUL", async () => {
    const event = createBedrockEvent("syncSystem", [
      { name: "identifier", value: "prod_9982" },
      { name: "system", value: "inventory" }
    ]);
    const result = await handler(event);

    const responseBodyString = result.response.functionResponse.responseBody.TEXT.body;
    const bodyJson = JSON.parse(responseBodyString);

    expect(bodyJson.status).toBe("SYNC_SUCCESSFUL");
    expect(bodyJson.systemSynchronized).toBe("inventory");
  });

  it("should return BACKLOGGED queue health warning for the price queue", async () => {
    const event = createBedrockEvent("checkQueueHealth", [{ name: "targetSystem", value: "price" }]);
    const result = await handler(event);

    const responseBodyString = result.response.functionResponse.responseBody.TEXT.body;
    const bodyJson = JSON.parse(responseBodyString);

    expect(bodyJson.status).toBe("BACKLOGGED");
    expect(bodyJson.delayWarning).toBe(true);
  });
});
