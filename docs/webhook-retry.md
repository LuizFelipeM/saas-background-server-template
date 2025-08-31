# Webhook Retry API

This document describes the webhook retry functionality that allows you to retry failed webhook events.

## API Endpoints

### Retry Webhook Event

**POST** `/webhooks/retry`

Retry a failed webhook event by its ID.

#### Request Body

```json
{
  "webhookEventId": "string"
}
```

#### Response

**Success Response (200):**
```json
{
  "success": true,
  "message": "Webhook event {id} retry initiated successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Error description"
}
```

#### Example Usage

```bash
curl -X POST http://localhost:3000/webhooks/retry \
  -H "Content-Type: application/json" \
  -d '{"webhookEventId": "webhook-event-uuid"}'
```

### Get Webhook Events

**GET** `/webhooks/events`

Retrieve webhook events with optional filtering.

#### Query Parameters

- `endpointId` (string, optional): Filter by endpoint ID
- `success` (boolean, optional): Filter by success status
- `event` (string, optional): Filter by event type
- `limit` (number, optional): Maximum number of results (default: 100, max: 1000)
- `offset` (number, optional): Number of results to skip (default: 0)

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "webhook-event-uuid",
      "endpointId": "endpoint-uuid",
      "event": "user.activated",
      "payload": "{\"event\":\"user.activated\",\"data\":{...}}",
      "success": false,
      "statusCode": null,
      "error": "Connection timeout",
      "attempt": 3,
      "sentAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

#### Example Usage

```bash
# Get all failed webhook events
curl "http://localhost:3000/webhooks/events?success=false"

# Get events for a specific endpoint
curl "http://localhost:3000/webhooks/events?endpointId=endpoint-uuid"

# Get events with pagination
curl "http://localhost:3000/webhooks/events?limit=50&offset=100"
```

## How It Works

1. **Find the webhook event**: The retry method looks up the webhook event by ID from the database
2. **Validate endpoint**: Checks if the associated webhook endpoint is still active
3. **Parse payload**: Extracts the original webhook payload from the stored event
4. **Retry delivery**: Uses the existing `sendToEndpoint` method to retry the webhook delivery
5. **Log result**: The retry attempt is logged as a new webhook event entry

## Error Handling

The retry functionality handles various error scenarios:

- **Webhook event not found**: Returns error if the event ID doesn't exist
- **Inactive endpoint**: Returns error if the webhook endpoint is disabled
- **Invalid payload**: Returns error if the stored payload is malformed
- **Delivery failure**: Any errors during retry are logged and returned

## Use Cases

- **Manual retry**: Retry specific failed webhooks from an admin interface
- **Bulk retry**: Retry multiple failed webhooks programmatically
- **Debugging**: Test webhook delivery after fixing endpoint issues
- **Recovery**: Recover from temporary endpoint outages

## Security Considerations

- The retry endpoint should be protected with authentication in production
- Consider rate limiting to prevent abuse
- Monitor retry attempts to detect potential issues
- Validate webhook event IDs to prevent unauthorized access
