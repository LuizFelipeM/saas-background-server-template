import { DIContainer } from "@/lib/di.container";
import { DITypes } from "@/lib/di.container/types";
import { WebhookService } from "./webhook.service";
import { describe, it, expect, beforeAll } from "vitest";

describe("WebhookService", () => {
  let webhookService: WebhookService;

  beforeAll(() => {
    webhookService = DIContainer.getInstance(DITypes.WebhookService);
  });

  it("should create a webhook endpoint", async () => {
    const endpoint = await webhookService.createEndpoint({
      url: "https://test.example.com/webhooks",
      events: ["user.activated", "user.deactivated"],
      isActive: true,
      secret: "test-secret",
      retryCount: 3,
      timeout: 5000,
    });

    expect(endpoint).toBeDefined();
    expect(endpoint.url).toBe("https://test.example.com/webhooks");
    expect(endpoint.events).toContain("user.activated");
    expect(endpoint.events).toContain("user.deactivated");
    expect(endpoint.isActive).toBe(true);
  });

  it("should send events without throwing errors", async () => {
    // This test will fail to send to a non-existent URL, but shouldn't throw
    await expect(
      webhookService.sendEvent("user.activated", {
        subscriptionId: "test-sub",
        stripeSubscriptionId: "sub_test",
        organizationId: "test-org",
        planId: "test-plan",
        status: "ACTIVE",
        activatedAt: new Date().toISOString(),
      })
    ).resolves.not.toThrow();
  });

  it("should list webhook endpoints", async () => {
    const endpoints = await webhookService.getEndpoints();
    expect(Array.isArray(endpoints)).toBe(true);
  });
});
