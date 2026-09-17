import cron from 'node-cron';
import { supabaseAdmin } from './supabase';
import { scrapeJobs } from './apify';
import { updateLastScan, updateUserCredits } from './auth';

const CREDITS_PER_JOB = parseFloat(process.env.CREDITS_PER_JOB || '0.0667');
const DEFAULT_LINKEDIN_COUNT = parseInt(process.env.DEFAULT_LINKEDIN_COUNT || '15');
const DEFAULT_NAUKRI_COUNT = parseInt(process.env.DEFAULT_NAUKRI_COUNT || '15');

interface ScheduledUser {
  id: string;
  email: string;
  keywords: string[];
  scan_interval: number;
  base_time: string | null;
  use_custom_schedule: boolean;
  last_scan_at: string | null;
  credits: number;
}

async function getUsersForScheduledScan(): Promise<ScheduledUser[]> {
  try {
    console.log('📊 Fetching users for scheduled scan...');
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, keywords, scan_interval, base_time, use_custom_schedule, last_scan_at, credits')
      .not('keywords', 'eq', '{}') // Only get users with keywords
      .gte('credits', 0); // Only get users with some credits (will validate exact amount per scan)

    if (error) {
      console.error('❌ Error fetching users:', error);
      return [];
    }

    const users = data || [];
    console.log(`📊 Found ${users.length} total users with keywords and credits`);
    
    // Log user breakdown for debugging
    const defaultUsers = users.filter(u => !u.use_custom_schedule);
    const customUsers = users.filter(u => u.use_custom_schedule);
    console.log(`📊 User breakdown: ${defaultUsers.length} default, ${customUsers.length} custom`);

    return users;
  } catch (error) {
    console.error('❌ Exception fetching users:', error);
    return [];
  }
}

async function performScheduledScan(user: ScheduledUser, currentTime: string) {
  try {
    if (!user.keywords || user.keywords.length === 0) {
      console.log(`User ${user.email} has no keywords configured. Skipping.`);
      return;
    }

    console.log(`🔍 Starting scheduled scan for user ${user.email} at ${currentTime} (Credits: ${user.credits})`);

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

    // Calculate credits needed based on jobs found
    const creditsNeeded = jobs.length * CREDITS_PER_JOB;

    if (user.credits < creditsNeeded) {
      console.log(`❌ User ${user.email} has insufficient credits for ${jobs.length} jobs. Needs ${creditsNeeded.toFixed(4)}, has ${user.credits}. Skipping.`);
      return;
    }

    // Extract hour for database storage (for backward compatibility)
    const scanHour = parseInt(currentTime.split(':')[0]);

    // Save scan results to database
    await saveScanResults(user.id, scanHour, keywords, jobs, ['linkedin', 'naukri']);

    // Update last scan time and deduct credits based on jobs delivered
    await updateLastScan(user.id);
    const newCreditBalance = user.credits - creditsNeeded;
    await updateUserCredits(user.id, newCreditBalance);

    console.log(`✅ Used ${creditsNeeded.toFixed(4)} credits for ${jobs.length} jobs. User ${user.email} has ${newCreditBalance.toFixed(4)} credits remaining.`);
    
    // Verify the credit update worked
    const { data: verifyUser, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();
    
    if (!verifyError && verifyUser) {
      console.log(`✅ Verification - User ${user.email} actual credits in DB: ${verifyUser.credits}`);
    } else {
      console.error(`❌ Failed to verify credit update for ${user.email}:`, verifyError);
    }

    console.log(`Scheduled scan completed for user ${user.email}`);
  } catch (error) {
    console.error(`❌ Error in scheduled scan for user ${user.email}:`, error);
  }
}

async function saveScanResults(
  userId: string, 
  scanHour: number, 
  keywords: string, 
  jobs: any[], 
  sources: string[]
) {
  try {
    const { error } = await supabaseAdmin
      .from('scan_results')
      .insert({
        user_id: userId,
        scan_time: new Date().toISOString(),
        scan_hour: scanHour,
        keywords: keywords,
        job_data: jobs,
        jobs_count: jobs.length,
        sources: sources
      });

    if (error) {
      console.error('Error saving scan results:', error);
    } else {
      console.log(`Saved ${jobs.length} jobs for user ${userId} at ${scanHour}:00`);
    }
  } catch (error) {
    console.error('Error saving scan results:', error);
  }
}

// Generate user's custom scan times for a day based on base_time and interval (in hours)
function generateUserScanTimes(baseTime: string, intervalHours: number): string[] {
  const [baseHours, baseMinutes] = baseTime.split(':').map(Number);
  const baseTimeInMinutes = baseHours * 60 + baseMinutes;
  const intervalMinutes = Math.round(intervalHours * 60);
  
  const scanTimes: string[] = [];
  let currentTime = baseTimeInMinutes;
  
  // Generate all scan times for the day (24 hours)
  while (currentTime < 24 * 60) {
    const hours = Math.floor(currentTime / 60);
    const minutes = currentTime % 60;
    scanTimes.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    currentTime += intervalMinutes;
  }
  
  return scanTimes;
}

// Run scans for users with DEFAULT schedule only
async function runDefaultScheduledScans(scanTime: string) {
  console.log(`🔔 Running default scheduled scans at ${scanTime}...`);

  const allUsers = await getUsersForScheduledScan();
  
  // Filter users who use DEFAULT schedule (not custom)
  const defaultUsers = allUsers.filter(user => !user.use_custom_schedule);
  
  console.log(`📊 Processing ${defaultUsers.length} users with default schedule for ${scanTime}`);
  
  if (defaultUsers.length === 0) {
    console.log('ℹ️ No users with default schedule found');
    return;
  }

  // Log users being processed
  defaultUsers.forEach(user => {
    console.log(`👤 Default user: ${user.email} (Credits: ${user.credits}, Keywords: ${user.keywords?.length || 0})`);
  });

  let processedCount = 0;
  let skippedCount = 0;

  for (const user of defaultUsers) {
    try {
      await performScheduledScan(user, scanTime);
      processedCount++;
    } catch (error) {
      console.error(`❌ Failed to process user ${user.email}:`, error);
      skippedCount++;
    }
  }

  console.log(`✅ Default scheduled scan cycle completed: ${processedCount} processed, ${skippedCount} skipped`);
}

// Run scans for users with CUSTOM schedule at specific time
async function runCustomScheduledScans(currentTime: string) {
  const allUsers = await getUsersForScheduledScan();
  
  // Filter users who use CUSTOM schedule AND should scan now
  const customUsers = allUsers.filter(user => {
    if (!user.use_custom_schedule || !user.base_time) {
      return false;
    }
    
    // Generate user's scan times and check if current time matches
    const userScanTimes = generateUserScanTimes(user.base_time, user.scan_interval);
    return userScanTimes.includes(currentTime);
  });

  if (customUsers.length > 0) {
    console.log(`🔔 Running custom scheduled scans at ${currentTime}...`);
    console.log(`📊 Processing ${customUsers.length} custom users scheduled for ${currentTime}`);

    // Log users being processed
    customUsers.forEach(user => {
      console.log(`👤 Custom user: ${user.email} (Credits: ${user.credits}, Base: ${user.base_time}, Interval: ${user.scan_interval}h)`);
    });

    let processedCount = 0;
    let skippedCount = 0;

    for (const user of customUsers) {
      try {
        await performScheduledScan(user, currentTime);
        processedCount++;
      } catch (error) {
        console.error(`❌ Failed to process custom user ${user.email}:`, error);
        skippedCount++;
      }
    }

    console.log(`✅ Custom scheduled scan cycle completed: ${processedCount} processed, ${skippedCount} skipped`);
  }
  // Note: We don't log when no custom users need scanning to avoid spam
}

// Store active cron tasks for cleanup
let activeCronTasks: any[] = [];
let customCronTask: any = null;

export function stopScheduler() {
  console.log('🛑 Stopping existing scheduler...');
  
  // Destroy all active cron tasks
  activeCronTasks.forEach(task => {
    if (task) {
      task.destroy();
    }
  });
  activeCronTasks = [];
  
  // Destroy custom cron task
  if (customCronTask) {
    customCronTask.destroy();
    customCronTask = null;
  }
  
  console.log('✅ Scheduler stopped successfully');
}

export function restartScheduler() {
  console.log('🔄 Restarting scheduler with updated configuration...');
  stopScheduler();
  startScheduler();
}

export function startScheduler() {
  console.log('🚀 Scheduler starting...');

  // Get default scan times from environment (fresh read each time)
  const defaultTimes = (process.env.SCAN_TIMES || '08:00,12:00,16:00,20:00')
    .split(',')
    .map(t => t.trim())
    .filter(time => {
      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      const isValid = timeRegex.test(time);
      
      if (!isValid) {
        console.warn(`⚠️ Invalid scan time format: ${time}. Skipping.`);
        return false;
      }
      
      // Check if hour is valid (0-23)
      const [hours] = time.split(':').map(Number);
      if (hours < 0 || hours > 23) {
        console.warn(`⚠️ Invalid hour in scan time: ${time}. Skipping.`);
        return false;
      }
      
      return true;
    });

  if (defaultTimes.length === 0) {
    console.error('❌ No valid scan times found. Using default times: 08:00,12:00,16:00,20:00');
    defaultTimes.push('08:00', '12:00', '16:00', '20:00');
  }

  console.log(`📅 Default scan times: ${defaultTimes.join(', ')}`);

  // Schedule for each default time (for users with default schedule ONLY)
  defaultTimes.forEach(time => {
    const [hours, minutes] = time.split(':').map(Number);
    
    // Additional validation before creating cron expression
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.error(`❌ Invalid time values: ${time}. Skipping.`);
      return;
    }
    
    // Cron format: minute hour * * *
    const cronExpression = `${minutes} ${hours} * * *`;
    
    try {
      const task = cron.schedule(cronExpression, () => {
        console.log(`⏰ Triggered default scheduled scan at ${time}`);
        runDefaultScheduledScans(time);
      });
      
      // Store task for cleanup
      activeCronTasks.push(task);
      
      console.log(`✅ Default schedule configured for ${time} daily (cron: ${cronExpression})`);
    } catch (error) {
      console.error(`❌ Failed to schedule scan for ${time}:`, error);
    }
  });

  // For custom users: Schedule every minute ONLY to check their individual schedules
  // This runs silently - only processes custom users who need scanning at exact time
  try {
    customCronTask = cron.schedule('* * * * *', () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // This only processes custom users and only logs when there are custom scans
      runCustomScheduledScans(currentTime);
    });
    
    console.log('✅ Custom user scheduler configured (every minute)');
  } catch (error) {
    console.error('❌ Failed to configure custom user scheduler:', error);
  }
  
  console.log('🎯 Scheduler configured successfully');
  console.log(`📊 Active schedules: ${activeCronTasks.length} default times + 1 custom checker`);
  console.log('- Default users: Scans at fixed times only');
  console.log('- Custom users: Scans at their configured times only');
}

// Export functions for manual testing
export { getUsersForScheduledScan, runDefaultScheduledScans, runCustomScheduledScans };
