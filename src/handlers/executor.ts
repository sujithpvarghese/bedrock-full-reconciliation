export const handler = async (event: any) => {
  // debug: log agent payload
  console.log("Bedrock Event:", JSON.stringify(event, null, 2));

  const functionName = event.function;
  const parameters: Record<string, string> = {};

  if (event.parameters) {
    for (const param of event.parameters) {
      parameters[param.name] = param.value;
    }
  }

  let result = "Unknown function called.";
  const identifier = parameters.identifier || parameters.styleId || parameters.productId;

  // guard: ensure we have an id for diagnostic calls
  const toolsRequiringId = ["checkWebDatabase", "checkInventoryService", "checkPricingEngine", "checkPimService", "syncSystem", "checkDeadLetterQueue"];

  try {
    if (toolsRequiringId.includes(functionName) && !identifier) {
      result = "FAILURE: Product ID or Style ID is missing. Please ask the user to provide an identifier (e.g., 'prod_9982' or '48291') to proceed.";
    } else {
      switch (functionName) {
        case "checkWebDatabase":
          // TODO: In a real production environment, we would import { getItem } from "../services/dynamo";
          // and query our "Rosetta Stone" table to perform this ID mapping.

          // Rosetta Stone: Map input ID to associated styleId and skuId for upstream systems
          // Mocking the mapping for target item: prod_9982 / Style 48291 / SKU_9982_A
          const isTarget = identifier === "prod_9982" || identifier === "48291";

          result = JSON.stringify({
            status: isTarget ? "NOT_SELLABLE" : "SELLABLE",
            productId: "prod_9982",
            styleId: "48291",
            skuId: "SKU_9982_A",
            webInventory: isTarget ? 0 : 50,
            webPrice: isTarget ? 0.00 : 19.99,
            webProductName: "Premium Cotton Graphic Tee",
            reason: isTarget ? ["Inventory is 0", "Price is 0"] : []
          });
          break;

        case "checkInventoryService":
          // query core system using skuId (passed from Bedrock after web lookup)
          result = JSON.stringify({ source: "Inventory Service", skuId: identifier, actualInventory: 150 });
          break;

        case "checkPricingEngine":
          // query core system using skuId
          result = JSON.stringify({ source: "Pricing Engine", skuId: identifier, actualPrice: 24.99 });
          break;

        case "checkPimService":
          // query core system using styleId
          result = JSON.stringify({ source: "PIM Service", styleId: identifier, actualProductName: "Premium Cotton Graphic Tee" });
          break;

        case "syncSystem":
          const targetSystem = parameters.system;

          // simulate long-running sync via external api call (mimic network delay)
          console.log(`[SYNC] starting sync for ${identifier}...`);
          console.log(`[SYNC] connecting to ${targetSystem} api...`);

          // artificial delay to mimic network i/o
          await new Promise(resolve => setTimeout(resolve, 1500));

          console.log(`[SYNC] data pulled from ${targetSystem}.`);
          console.log(`[SYNC] updating web database...`);
          console.log(`[SYNC] completed.`);

          result = JSON.stringify({
            status: "SYNC_SUCCESSFUL",
            identifier: identifier,
            systemSynchronized: targetSystem,
            message: `The ${targetSystem} data for ${identifier} has been successfully pulled via API and the Web Database has been updated.`
          });
          break;

        case "checkQueueHealth":
          const queueSystem = parameters.targetSystem;
          // simulate backlog scenario for the 'price' queue (triggers delay warnings)
          if (queueSystem === "price") {
            result = JSON.stringify({ system: queueSystem, status: "BACKLOGGED", visibleMessages: 15430, delayWarning: true, estimatedDelayMinutes: 45 });
          } else {
            result = JSON.stringify({ system: queueSystem, status: "HEALTHY", visibleMessages: 0, delayWarning: false });
          }
          break;

        case "checkDeadLetterQueue":
          // check if message is sitting in the dlq due to a previous crash
          if (identifier === "prod_9982") {
            result = JSON.stringify({ identifier, inDLQ: true, currentDLQSize: 1, lastError: "ConsumerDatabaseTimeoutException - Failed to acquire DB lock", status: "CRITICAL_FAILURE" });
          } else if (identifier === "prod_4040") {
            result = JSON.stringify({ identifier, inDLQ: true, currentDLQSize: 1, lastError: "ERR_INV_404 - Style not found in Oracle", status: "UPSTREAM_DATA_ERROR" });
          } else {
            result = JSON.stringify({ identifier, inDLQ: false, status: "CLEAR" });
          }
          break;

        case "queryTroubleshootingGuide":
          const errorCode = (parameters.errorCode || "UNKNOWN").toUpperCase();
          const guide: Record<string, string> = {
            "CONSUMERDATABASETIMEOUTEXCEPTION": "Transient database lock contention. This occurs when parallel sync jobs attempt to update the same record simultaneously. RESOLUTION: Trigger an autonomous 'syncSystem' to reconcile the state.",
            "ERR_INV_404": "The requested SKU/Style is missing from the Upstream Inventory Service. RESOLUTION: Verify the record exists in the core inventory system.",
            "ERR_PRICE_SYNC_FAIL": "The pricing update failed due to a network timeout with the Pricing Engine. RESOLUTION: Initiate a manual price synchronization.",
            "ERR_METADATA_INCOMPLETE": "The product metadata message is missing mandatory display attributes. RESOLUTION: Trigger a full 'pim' system sync to refresh metadata."
          };

          result = JSON.stringify({
            query: errorCode,
            explanation: guide[errorCode] || "No documentation found for this error. Recommend escalation to L2 support."
          });
          break;

        default:
          result = `Failure: Tool ${functionName} is not implemented.`;
      }
    }
  } catch (err: any) {
    result = "Error executing tool: " + err.message;
  }

  // Return the required response format back to Bedrock Agent
  return {
    messageVersion: "1.0",
    response: {
      actionGroup: event.actionGroup,
      apiPath: event.apiPath,
      function: event.function,
      functionResponse: {
        responseBody: {
          TEXT: {
            body: result
          }
        }
      }
    }
  };
};
