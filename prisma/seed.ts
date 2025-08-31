import { PrismaClient } from "../src/lib/generated/prisma";

const prisma = new PrismaClient();

async function seed() {
  await prisma.plan.createMany({
    data: [
      {
        name: "starter",
        stripeProductId: "prod_SGGFeD1q3JqvD9",
        features: {
          docUpload: {
            type: "DEFAULT",
          },
          docDownload: {
            type: "DEFAULT",
          },
        },
      },
      {
        name: "professional",
        stripeProductId: "prod_SwyQOggLZsJg42",
        features: {
          docUpload: {
            type: "DEFAULT",
          },
          docDownload: {
            type: "DEFAULT",
          },
        },
      },
    ],
  });

  await prisma.webhookEndpoint.createMany({
    data: [
      {
        url: "https://lenient-really-badger.ngrok-free.app/api/public/webhooks/bgserver/user",
        events: ["user.activated", "user.deactivated"],
        retryCount: 3,
      },
    ],
  });

  await prisma.$disconnect();
}

seed().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
