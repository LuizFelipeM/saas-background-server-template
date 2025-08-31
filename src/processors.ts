import { DIContainer } from "@/lib/di.container";
import { DITypes } from "@/lib/di.container/types";
import fs from "node:fs";
import path from "node:path";
import { ExternalQueues } from "./configs/queues";

export const registerWorkers = () => {
  const queueManager = DIContainer.getInstance(DITypes.QueueManager);

  // Register workers for external queues
  const externalQueues = Object.values(ExternalQueues);
  externalQueues.forEach(async (queue) => {
    try {
      const Worker = (await import(`./workers/${queue}`)).default;

      const queueInstance = queueManager.createQueue(queue, {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        },
      });
      console.log("Created queue", queueInstance.name);
      const worker = queueManager.createWorker(queue, new Worker());
      console.log("Created worker", worker.name);
    } catch (error) {
      console.error(`Error importing worker for External Queue ${queue}:`, error);
    }
  });

  // Register workers from the workers directory
  fs.readdirSync(path.join(__dirname, "workers"))
    .filter((file) => !externalQueues.includes(file as ExternalQueues))
    .forEach(async (file) => {
      try {
        const Worker = (await import(`./workers/${file}`)).default;

        const queueInstance = queueManager.createQueue(file, {
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
          },
        });
        console.log("Created queue", queueInstance.name);
        const worker = queueManager.createWorker(file, new Worker());
        console.log("Created worker", worker.name);
      } catch (error) {
        console.error(`Error importing worker for queue ${file}:`, error);
      }
    });

  // Handle cleanup on process termination
  process.on("SIGTERM", async () => {
    await queueManager.closeAll();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await queueManager.closeAll();
    process.exit(0);
  });
};
