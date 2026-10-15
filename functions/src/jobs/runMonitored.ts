import {recordJob} from '../utils/jobStatus';
import {errorMessage} from '../utils/errorReport';
import {reportError} from '../utils/monitoring';

export interface JobResult {
  failed: number; // users whose processing threw (already reported one by one)
  detail: string;
}

// Runs a scheduled job, records its outcome for /status and alerts the admin when it crashes
export async function runMonitored(name: string, job: () => Promise<JobResult>): Promise<void> {
  try {
    const {failed, detail} = await job();
    await recordJob(name, failed === 0, failed > 0 ? `${detail}; помилок: ${failed}` : detail);
  } catch (err) {
    await reportError(`${name} crashed`, err);
    await recordJob(name, false, errorMessage(err).slice(0, 200));
    throw err; // the run stays failed in Cloud logs
  }
}
