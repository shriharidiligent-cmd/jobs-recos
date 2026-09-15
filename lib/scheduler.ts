import cron from 'node-cron';
import { supabaseAdmin } from './supabase';
import { scrapeJobs } from './apify';
import { updateLastScan, updateUserCredits } from './auth';

const CREDITS_PER_SEARCH = parseInt(process.env.CREDITS_PER_SEARCH || '5');
const DEFAULT_LINKEDIN_COUNT = parseInt(process.env.DEFAULT_LINKEDIN_COUNT || '15');
const DEFAULT_NAUKRI_COUNT = parseInt(process.env.DEFAULT_NAUKRI_COUNT || '15');

interface ScheduledUser {
  id: string;
  email: string;
  keywords: string[];
  scan_interval: number;
  last_scan_at: string | null;
  credits: number;
}

async function getUsersForScheduledScan(): Promise<ScheduledUser[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, keywords, scan_interval, last_scan_at, credits');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data || [];
}

async function performScheduledScan(user: ScheduledUser) {
  try {
    if (!user.keywords || user.keywords.length === 0) {
      console.log(`User ${user.email} has no keywords configured. Skipping.`);
      return;
    }

    if (user.credits < CREDITS_PER_SEARCH) {
      console.log(`User ${user.email} has insufficient credits. Skipping.`);
      return;
    }

    console.log(`Running scheduled scan for user ${user.email}`);

    // Combine keywords
    const keywords = user.keywords.join(' ');

    // Scrape jobs from both sources
    const jobs = await scrapeJobs(
      keywords, 
      DEFAULT_LINKEDIN_COUNT, 
      DEFAULT_NAUKRI_COUNT,
      ['linkedin', 'naukri']
    );

    console.log(`Found ${jobs.length} jobs for user ${user.email}`);

    // Update last scan time and deduct credits
    await updateLastScan(user.id);
    await updateUserCredits(user.id, user.credits - CREDITS_PER_SEARCH);

    console.log(`Scheduled scan completed for user ${user.email}`);
  } catch (error) {
    console.error(`Error in scheduled scan for user ${user.email}:`, error);
  }
}

async function runScheduledScans() {
  console.log('Running scheduled scans at configured time...');

  const users = await getUsersForScheduledScan();

  for (const user of users) {
    await performScheduledScan(user);
  }

  console.log('Scheduled scan cycle completed');
}

export function startScheduler() {
  // Get scan times from environment or use defaults: 08:00, 12:00, 16:00, 20:00
  const scanTimes = process.env.SCAN_TIMES || '08:00,12:00,16:00,20:00';
  const times = scanTimes.split(',').map(t => t.trim());

  console.log(`Scheduler starting with times: ${times.join(', ')}`);

  // Schedule for each configured time
  times.forEach(time => {
    const [hours, minutes] = time.split(':');
    
    // Cron format: minute hour * * *
    const cronExpression = `${minutes} ${hours} * * *`;
    
    cron.schedule(cronExpression, () => {
      console.log(`Triggered scheduled scan at ${time}`);
      runScheduledScans();
    });
    
    console.log(`Scheduled scan configured for ${time} daily`);
  });

  console.log('Scheduler started successfully');
}
