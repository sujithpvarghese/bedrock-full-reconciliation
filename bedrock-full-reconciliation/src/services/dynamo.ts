
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

export async function getItem(table: string, productId: string) {
  const res = await doc.send(new GetCommand({
    TableName: table,
    Key: { productId }
  }));
  return res.Item;
}

export async function putItem(table: string, item: any) {
  await doc.send(new PutCommand({
    TableName: table,
    Item: item
  }));
}
