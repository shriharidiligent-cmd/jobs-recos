import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
  token: process.env.APIFY_TOKEN!,
});

// Map UI datePosted values to max allowed days for filtering
// '24h' → 0 means only hours/minutes/today pass; "1 Day Ago" is rejected
function getMaxDays(dateFilter: string): number {
  switch (dateFilter) {
    case '24h': return 0;
    case 'week': return 7;
    case 'month': return 30;
    default: return Infinity;
  }
}

// Helper function to check if a job posting is within the specified date range
function isWithinDateRange(item: any, dateFilter: string): boolean {
  const maxDays = getMaxDays(dateFilter);
  if (maxDays === Infinity) return true;

  // Try different date fields
  const postedDaysAgo = item.postedDaysAgo;
  const postedAt = item.postedAt;
  const postedDateRelative = item.postedDateRelative;
  const createdDate = item.createdDate;

  // Method 1: Check postedDaysAgo if available
  if (typeof postedDaysAgo === 'number') {
    return postedDaysAgo <= maxDays;
  }

  // Method 2: Parse relative date strings ("5 Days Ago", "3 days ago", "2 weeks ago")
  const relativeText = (typeof postedDateRelative === 'string' ? postedDateRelative : '') ||
                       (typeof postedAt === 'string' ? postedAt : '');
  if (relativeText) {
    const lower = relativeText.toLowerCase();

    if (lower.includes('hour') || lower.includes('min') || lower.includes('just now') || lower.includes('today')) {
      return true;
    }

    if (lower.includes('day')) {
      const daysMatch = lower.match(/(\d+)\s*day/);
      if (daysMatch) return parseInt(daysMatch[1]) <= maxDays;
      // "a day ago" or "1 day ago"
      return 1 <= maxDays;
    }

    if (lower.includes('week')) {
      const weeksMatch = lower.match(/(\d+)\s*week/);
      if (weeksMatch) return parseInt(weeksMatch[1]) * 7 <= maxDays;
      return 7 <= maxDays;
    }

    if (lower.includes('month')) {
      const monthsMatch = lower.match(/(\d+)\s*month/);
      if (monthsMatch) return parseInt(monthsMatch[1]) * 30 <= maxDays;
      return 30 <= maxDays;
    }
  }

  // Method 3: Use createdDate timestamp if available
  if (createdDate) {
    const jobDate = new Date(createdDate);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxDays);
    return jobDate >= cutoffDate;
  }

  // Reject items with unknown dates when a filter is active
  return false;
}

export interface JobResult {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  jobUrl: string;
  postUrl?: string; // LinkedIn post URL
  posterName?: string; // LinkedIn poster name
  posterProfileUrl?: string; // LinkedIn poster profile URL
  source: 'linkedin' | 'naukri';
  postedDate?: string;
  
  // LinkedIn-specific rich data
  author?: {
    name: string;
    avatar?: string;
    linkedinUrl?: string;
    info?: string;
    publicIdentifier?: string;
  };
  job?: {
    title?: string;
    location?: string;
    subtitle?: string;
    logoUrl?: string;
    linkedinUrl?: string;
    buttonText?: string;
  };
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
  postedAgo?: string; // "8 hours ago"
  content?: string; // Full post content
  postImages?: string[]; // Array of image URLs
  
  // Naukri-specific rich data
  salary?: string;
  experience?: string;
  skills?: string[];
  companyRating?: string;
  companyReviews?: number;
  logoUrl?: string;
  jobType?: string;
  isWalkIn?: boolean;
}

export async function scrapeLinkedIn(
  keywords: string,
  maxResults: number = parseInt(process.env.DEFAULT_LINKEDIN_COUNT || '15'),
  datePosted?: string
): Promise<JobResult[]> {
  try {
    // Add mandatory "@" symbol to LinkedIn keywords to filter casual posts
    const enhancedKeywords = `${keywords} @`;
    
    const input: any = {
      mode: 'search',
      searchKeywords: [enhancedKeywords], // Array format with @ symbol
      maxResults: maxResults,
    };

    // Map UI datePosted value to LinkedIn actor's expected format
    if (datePosted && datePosted !== 'any') {
      const linkedinDateMap: Record<string, string> = {
        '24h': '24h',
        'week': 'week',
        'month': 'month',
      };
      input.datePosted = linkedinDateMap[datePosted] || datePosted;
    }

    console.log('LinkedIn input parameters (with @ filter):', JSON.stringify(input, null, 2));

    const run = await client.actor(process.env.LINKEDIN_ACTOR_ID!).call(input);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log('LinkedIn raw items sample:', JSON.stringify(items[0], null, 2));

    // Filter out spam/low-quality posts
    const filteredItems = items.filter((item: any) => {
      const content = (item.content || item.text || '').toLowerCase();
      
      // Check for email addresses
      const hasEmail = /@gmail\.com|@yahoo\.com|@hotmail\.com|@outlook\.com|@[a-z0-9.-]+\.[a-z]{2,}/i.test(content);
      
      // Get filter keywords from environment (comma-separated)
      const filterKeywordsEnv = process.env.LINKEDIN_FILTER_KEYWORDS || '';
      const spamPhrases = filterKeywordsEnv
        .split(',')
        .map(keyword => keyword.trim().toLowerCase())
        .filter(keyword => keyword.length > 0);
      
      const hasSpamPhrase = spamPhrases.some(phrase => content.includes(phrase));
      
      // Return true only if post does NOT contain spam indicators
      return !hasEmail && !hasSpamPhrase;
    });

    console.log(`Filtered ${items.length - filteredItems.length} spam posts. Remaining: ${filteredItems.length}`);

    // Client-side date filtering as safety net (actor may still return older posts)
    let dateFilteredItems = filteredItems;
    if (datePosted && datePosted !== 'any') {
      dateFilteredItems = filteredItems.filter((item: any) => {
        // LinkedIn returns postedAt.postedAgoText like "8 hours ago", "3 days ago"
        const postedAgoText = item.postedAt?.postedAgoText || item.postedAt?.postedAgoShort || '';
        const fakeItem = { postedDateRelative: postedAgoText, postedAt: postedAgoText, createdDate: item.scrapedAt };
        return isWithinDateRange(fakeItem, datePosted);
      });
      console.log(`LinkedIn date filter: ${filteredItems.length} → ${dateFilteredItems.length} items within ${datePosted}`);
    }

    // Enforce exact result count by slicing
    const limitedItems = dateFilteredItems.slice(0, maxResults);
    
    console.log(`Returning ${limitedItems.length} LinkedIn results (requested: ${maxResults})`);

    return limitedItems.map((item: any) => {
      const fullContent = item.content || item.text || '';
      
      // Extract clean title (first sentence or first 80 chars)
      let cleanTitle = fullContent.split(/[.!?]\s/)[0] || fullContent;
      if (cleanTitle.length > 80) {
        cleanTitle = cleanTitle.substring(0, 80) + '...';
      }
      
      // Use job title if available, otherwise use extracted title from content
      const displayTitle = item.job?.title || cleanTitle || item.title || item.jobTitle || 'No title';
      
      return {
        id: item.id || item.postId || `linkedin-${Date.now()}-${Math.random()}`,
        title: displayTitle,
        company: item.author?.name || item.authorCompany || item.company || item.companyName || item.authorName || 'Unknown Company',
        location: item.job?.location || item.location || item.authorLocation,
        description: fullContent,
        jobUrl: item.job?.linkedinUrl || item.linkedinUrl || item.postUrl || item.jobUrl || item.url,
        postUrl: item.linkedinUrl || item.postUrl || item.url,
        posterName: item.author?.name || item.authorName || item.posterName,
        posterProfileUrl: item.author?.linkedinUrl || item.authorUrl || item.authorProfileUrl || item.posterProfileUrl,
        source: 'linkedin' as const,
        postedDate: item.scrapedAt || item.postedDate || item.publishedAt || item.date,
        
        // LinkedIn-specific rich data
        author: item.author ? {
          name: item.author.name || '',
          avatar: item.author.avatar?.url || item.author.avatarUrl,
          linkedinUrl: item.author.linkedinUrl || '',
          info: item.author.info || item.author.bio || item.author.headline || '',
          publicIdentifier: item.author.publicIdentifier || '',
        } : undefined,
        
        job: item.job ? {
          title: item.job.title || '',
          location: item.job.location || '',
          subtitle: item.job.subtitle || '',
          logoUrl: item.job.logoUrl || '',
          linkedinUrl: item.job.linkedinUrl || '',
          buttonText: item.job.buttonText || 'View job',
        } : undefined,
        
        engagement: item.engagement ? {
          likes: item.engagement.likes || 0,
          comments: item.engagement.comments || 0,
          shares: item.engagement.shares || 0,
        } : undefined,
        
        postedAgo: (() => {
          // Prioritize postedAgoShort first, then fallback to cleaning postedAgoText
          const shortText = item.postedAt?.postedAgoShort;
          if (shortText) {
            return shortText; // This gives us clean "8h", "1d", etc.
          }
          
          // Fallback: clean the longer text if short version not available
          const postedText = item.postedAt?.postedAgoText || '';
          let cleanText = postedText.split('•')[0].trim();
          
          // Extract just the time part (e.g., "8 hours ago")
          const timeMatch = cleanText.match(/(\d+\s*(hour|minute|day|week|month)s?\s+ago|\d+[hdwmy]\s*ago|just now|yesterday|today)/i);
          if (timeMatch) {
            cleanText = timeMatch[0];
          }
          
          return cleanText;
        })(),
        content: fullContent,
        postImages: item.postImages?.map((img: any) => img.url || img) || [],
      };
    });
  } catch (error) {
    console.error('LinkedIn scraping error:', error);
    return [];
  }
}

export async function scrapeNaukri(
  keywords: string,
  maxResults: number = parseInt(process.env.DEFAULT_NAUKRI_COUNT || '15'),
  datePosted?: string
): Promise<JobResult[]> {
  try {
    const input: any = {
      keyword: keywords,  // Use 'keyword' (singular) as per actor docs
      maxJobs: maxResults, // Use 'maxJobs' instead of 'maxResults'
    };

    // Add date filter using freshness parameter (expects days as string)
    if (datePosted && datePosted !== 'any') {
      const freshnessMap: Record<string, string> = {
        '24h': '1',
        'week': '7',
        'month': '30',
      };
      input.freshness = freshnessMap[datePosted] || '1';
      console.log(`Naukri freshness filter: ${input.freshness} day(s) for datePosted: ${datePosted}`);
    }

    console.log(`Naukri input parameters:`, JSON.stringify(input, null, 2));

    const run = await client.actor(process.env.NAUKRI_ACTOR_ID!).call(input);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log(`Naukri returned ${items.length} items before filtering`);
    if (items.length > 0) {
      console.log('Naukri sample item posted info:', {
        postedAt: items[0].postedAt,
        postedDateRelative: items[0].postedDateRelative,
        postedDaysAgo: items[0].postedDaysAgo
      });
    }

    // Client-side date filtering since Naukri actor doesn't have proper date filters
    let filteredItems = items;
    if (datePosted && datePosted !== 'any') {
      filteredItems = items.filter((item: any) => {
        return isWithinDateRange(item, datePosted);
      });
      console.log(`Naukri filtered to ${filteredItems.length} items within ${datePosted} range`);
    }

    // Enforce exact result count from filtered results
    const limitedItems = filteredItems.slice(0, maxResults);
    
    console.log(`Returning ${limitedItems.length} Naukri results (requested: ${maxResults}, after filtering)`);

    return limitedItems.map((item: any) => ({
      id: item.jobId || item.id || `naukri-${Date.now()}-${Math.random()}`,
      title: item.title || 'No title',
      company: item.companyName || item.company || 'Unknown Company',
      location: item.location || item.locationLabel,
      description: item.jobDescription || item.description,
      jobUrl: item.jobUrl || item.jobURL || (item.jdURL ? `https://www.naukri.com${item.jdURL}` : '#'),
      source: 'naukri' as const,
      postedDate: (() => {
        // Try different possible field names from different Naukri actors
        if (item.postedDateRelative) {
          return item.postedDateRelative; // "1 day ago" from prodiger actor
        } else if (item.postedAt) {
          return item.postedAt; // "5 Days Ago" from the original actor
        } else if (item.postedDaysAgo !== undefined && item.postedDaysAgo !== null) {
          return item.postedDaysAgo === 1 ? '1 day ago' : `${item.postedDaysAgo} days ago`;
        } else {
          return 'Recently posted'; // Fallback
        }
      })(),
      
      // Naukri-specific rich data - handle multiple actor formats
      salary: item.salary || item.salaryLabel,
      experience: item.experienceText || item.experienceLabel,
      skills: item.skills || item.tagsAndSkills || [],
      companyRating: (item.companyRating || item.ambitionBoxRating)?.toString(),
      companyReviews: item.companyReviewsCount || item.ambitionBoxReviews,
      logoUrl: item.companyLogoUrl || item.logoUrl,
      jobType: item.workMode || item.mode,
      isWalkIn: item.walkinJob || false,
    }));
  } catch (error) {
    console.error('Naukri scraping error:', error);
    return [];
  }
}

export async function scrapeJobs(
  keywords: string,
  linkedinCount: number = parseInt(process.env.DEFAULT_LINKEDIN_COUNT || '15'),
  naukriCount: number = parseInt(process.env.DEFAULT_NAUKRI_COUNT || '15'),
  sources: string[] = ['linkedin', 'naukri'],
  datePosted?: string
): Promise<JobResult[]> {
  const results: JobResult[][] = [];

  if (sources.includes('linkedin') && linkedinCount > 0) {
    results.push(await scrapeLinkedIn(keywords, linkedinCount, datePosted));
  }

  if (sources.includes('naukri') && naukriCount > 0) {
    results.push(await scrapeNaukri(keywords, naukriCount, datePosted));
  }

  return results.flat();
}
