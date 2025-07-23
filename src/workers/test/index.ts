import { JobProcessor, JobResult } from "@saas-packages/queue-manager";
import { Job } from "bullmq";

export default class TestJob implements JobProcessor<any> {
  async process(job: Job<any>): Promise<JobResult> {
    job.log(`Processing test event: ${JSON.stringify(job.data, null, 2)}`);
    console.log(`Processing test event ${job.id} with data`, job.data);

    return {
      success: true,
    };
  }
}
