# Webhook Service Documentation

## Overview

The webhook service allows you to send real-time events to external endpoints when certain actions occur in your SaaS application. Currently, it's integrated with the subscription service to send events when users activate or cancel their subscriptions.

## Features

- **Event-driven**: Send events to multiple endpoints simultaneously
- **Retry logic**: Automatic retry with exponential backoff for failed webhooks
- **Signature verification**: Optional HMAC signature for webhook security
- **Event logging**: All webhook attempts are logged in the database
- **Configurable**: Customizable retry count, timeout, and event filtering

## Available Events

### `user.activated`
Sent when a user's subscription becomes active (after successful payment).

**Event Data:**
```json
{
  "subscriptionId": "uuid",
  "stripeSubscriptionId": "sub_xxx",
  "organizationId": "uuid",
  "planId": "uuid",
  "status": "ACTIVE",
  "activatedAt": "2024-01-01T00:00:00.000Z"
}
```

### `user.deactivated`
Sent when a user's subscription is canceled.

**Event Data:**
```json
{
  "subscriptionId": "uuid",
  "stripeSubscriptionId": "sub_xxx",
  "organizationId": "uuid",
  "planId": "uuid",
  "status": "CANCELED",
  "canceledAt": "2024-01-01T00:00:00.000Z"
}
```

## Webhook Endpoint Format

When you receive a webhook, it will have the following structure:

```json
{
  "event": "user.activated",
  "data": {
    "subscriptionId": "uuid",
    "stripeSubscriptionId": "sub_xxx",
    "organizationId": "uuid",
    "planId": "uuid",
    "status": "ACTIVE",
    "activatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": 1704067200000,
  "id": "webhook-uuid"
}
```

## Headers

Each webhook request includes the following headers:

- `Content-Type: application/json`
- `User-Agent: SaaS-Background-Server/1.0`
- `X-Webhook-Event: user.activated`
- `X-Webhook-ID: webhook-uuid`
- `X-Webhook-Timestamp: 1704067200000`
- `X-Webhook-Signature: signature` (if secret is configured)

## Setting Up Webhook Endpoints

### Using the WebhookService

```typescript
import { DIContainer } from "@/lib/di.container";
import { DITypes } from "@/lib/di.container/types";

const webhookService = DIContainer.getInstance(DITypes.WebhookService);

// Create a webhook endpoint
const endpoint = await webhookService.createEndpoint({
  url: "https://your-api.com/webhooks",
  events: ["user.activated", "user.deactivated"],
  isActive: true,
  secret: "your-webhook-secret", // Optional
  retryCount: 3,
  timeout: 10000,
});
```

### Endpoint Configuration

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | The endpoint URL to send webhooks to |
| `events` | string[] | Array of event types to listen for |
| `isActive` | boolean | Whether the endpoint is active |
| `secret` | string? | Optional secret for signature verification |
| `retryCount` | number | Number of retry attempts (default: 3) |
| `timeout` | number | Request timeout in milliseconds (default: 10000) |

## Managing Webhook Endpoints

```typescript
// Get all endpoints
const endpoints = await webhookService.getEndpoints();

// Get a specific endpoint
const endpoint = await webhookService.getEndpoint("endpoint-id");

// Update an endpoint
await webhookService.updateEndpoint("endpoint-id", {
  isActive: false,
  events: ["user.activated"]
});

// Delete an endpoint
await webhookService.deleteEndpoint("endpoint-id");
```

## Retry Logic

If a webhook fails to deliver, the service will retry with exponential backoff:

1. **First retry**: 1 second delay
2. **Second retry**: 2 seconds delay
3. **Third retry**: 4 seconds delay
4. **Maximum delay**: 10 seconds

## Event Logging

All webhook attempts are logged in the `webhook_events` table with the following information:

- Event type and payload
- Success/failure status
- HTTP status code
- Error message (if failed)
- Retry attempt number
- Timestamp

## Security

### Signature Verification

If you provide a secret when creating a webhook endpoint, the service will include an `X-Webhook-Signature` header. You can verify this signature to ensure the webhook is authentic.

**Example verification (Node.js):**
```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Testing

You can test the webhook service using the provided example:

```bash
# Run the webhook example
pnpm tsx src/examples/webhook-example.ts
```

## Integration with Subscription Service

The webhook service is automatically integrated with the subscription service. When:

1. **A subscription becomes active** (after `invoice.paid` event from Stripe):
   - The subscription status is updated to "ACTIVE"
   - A `user.activated` webhook event is sent

2. **A subscription is canceled** (after `customer.subscription.deleted` event from Stripe):
   - The subscription status is updated to "CANCELED"
   - A `user.deactivated` webhook event is sent

## Best Practices

1. **Always verify webhook signatures** when possible
2. **Return 2xx status codes** quickly to acknowledge receipt
3. **Process webhooks asynchronously** to avoid timeouts
4. **Handle duplicate events** (webhooks may be retried)
5. **Monitor webhook delivery** using the event logs
6. **Use HTTPS endpoints** for security

## Troubleshooting

### Common Issues

1. **Webhooks not being sent**: Check if the endpoint is active and listening to the correct events
2. **Webhooks failing**: Check the endpoint URL, network connectivity, and server response
3. **Missing events**: Verify the event type is included in the endpoint's events array

### Monitoring

You can monitor webhook delivery by querying the `webhook_events` table:

```sql
-- Check recent webhook events
SELECT * FROM webhook_events 
WHERE sent_at > NOW() - INTERVAL '1 hour'
ORDER BY sent_at DESC;

-- Check failed webhooks
SELECT * FROM webhook_events 
WHERE success = false
ORDER BY sent_at DESC;
``` 