import {FieldValue, type Timestamp} from 'firebase-admin/firestore';
import {BUDGET_ID} from '../configs/consts';
import {db} from '../configs/firebaseConfig';

export interface JobRecord {
  at?: Timestamp;
  ok: boolean;
  detail: string;
}

const jobsDoc = () => db.collection('budgets').doc(BUDGET_ID).collection('meta').doc('jobs');

// Last result of each scheduled job, shown by /status
export async function recordJob(name: string, ok: boolean, detail: string): Promise<void> {
  try {
    await jobsDoc().set({[name]: {at: FieldValue.serverTimestamp(), ok, detail}}, {merge: true});
  } catch (err) {
    console.error('Failed to record job status:', name, err);
  }
}

export async function getJobs(): Promise<Record<string, JobRecord>> {
  const snap = await jobsDoc().get();
  return (snap.data() as Record<string, JobRecord> | undefined) ?? {};
}
