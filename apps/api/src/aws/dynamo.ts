/**
 * DynamoDB client configuration for AWS Lambda
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let documentClient: DynamoDBDocumentClient | null = null;

/**
 * Get or create the DynamoDB Document Client singleton
 * Optimized for AWS Lambda environment
 * 
 * @returns DynamoDBDocumentClient instance
 */
export function getDynamoClient(): DynamoDBDocumentClient {
  if (!documentClient) {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

    // Create base DynamoDB client
    const client = new DynamoDBClient({
      region,
    });

    // Create Document Client with marshalling options
    documentClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        // Convert empty strings to null
        convertEmptyValues: false,
        // Remove undefined values
        removeUndefinedValues: true,
        // Convert class instances to maps
        convertClassInstanceToMap: false,
      },
      unmarshallOptions: {
        // Return numbers as numbers (not strings)
        wrapNumbers: false,
      },
    });

    console.log('DynamoDB Document Client initialized', { region });
  }

  return documentClient;
}
