'use client';

import { useState } from 'react';

interface JobCardProps {
  job: {
    id: string;
    title: string;
    company: string;
    location?: string;
    description?: string;
    jobUrl: string;
    postUrl?: string;
    posterName?: string;
    posterProfileUrl?: string;
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
    postedAgo?: string;
    content?: string;
    postImages?: string[];
    
    // Naukri-specific rich data
    salary?: string;
    experience?: string;
    skills?: string[];
    companyRating?: string;
    companyReviews?: number;
    logoUrl?: string;
    jobType?: string;
    isWalkIn?: boolean;
  };
}

export default function JobCard({ job }: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffHours < 1) return 'now';
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays === 1) return '1d';
      if (diffDays < 7) return `${diffDays}d`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
      return `${Math.floor(diffDays / 30)}mo`;
    } catch {
      return null;
    }
  };

  // LinkedIn Card Design
  if (job.source === 'linkedin') {
    // Determine company logo and name
    const companyLogo = job.job?.logoUrl;
    const companyName = job.company || job.job?.subtitle?.replace('Job by ', '') || 'Unknown Company';
    
    // Determine job title
    const jobTitle = job.job?.title || job.title || 'Untitled Position';
    
    // Determine location
    const location = job.job?.location || job.location;
    
    // Determine description
    const description = job.content || job.description || '';
    const shouldShowReadMore = description.length > 200;
    const displayDescription = isExpanded ? description : description.substring(0, 200) + (shouldShowReadMore ? '...' : '');
    
    // Determine posted time
    const postedTime = job.postedAgo || formatDate(job.postedDate);
    
    // Determine apply URL
    const applyUrl = job.job?.linkedinUrl || job.jobUrl || job.postUrl || '#';

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
        {/* Top Section */}
        <div className="p-6">
          {/* Header: Logo + Company + Job Title + Badge + Time + Menu */}
          <div className="flex items-start justify-between mb-4">
            {/* Left: Logo + Company Info + Job Title */}
            <div className="flex items-start gap-3 flex-1">
              {/* Company Logo */}
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="w-12 h-12 object-contain flex-shrink-0 rounded-lg bg-gray-50 p-1"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              )}
              
              {/* Company Name + Job Title */}
              <div className="flex flex-col gap-1">
                
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {jobTitle}
                </h3>
              </div>
            </div>

            {/* Right: Source + Time + Menu */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* LinkedIn Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </div>

              {/* Time */}
              {postedTime && (
                <span className="text-xs text-gray-500">{postedTime}</span>
              )}

              {/* Menu Button */}
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Job Metadata Row - Only show available data */}
          {location && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{location}</span>
              </div>
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="mb-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {displayDescription}
              </p>
              {shouldShowReadMore && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1.5 focus:outline-none transition-colors"
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Section with Divider */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-start justify-between">
            {/* Left: Posted By Section */}
            {job.author ? (
              <div className="flex items-start gap-3 flex-1">
                {/* Avatar */}
                {job.author.avatar ? (
                  <img
                    src={job.author.avatar}
                    alt={job.author.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}

                {/* Name + Info + LinkedIn Profile */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">Posted by</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{job.author.name}</p>
                  {job.author.info && (
                    <div className="mb-1">
                      {(() => {
                        const words = job.author.info.split(' ');
                        const shortInfo = words.slice(0, 5).join(' ');
                        const hasMore = words.length > 5;
                        
                        return (
                          <div>
                            <span className="text-xs text-gray-600">
                              {isProfileExpanded ? job.author.info : shortInfo}
                            </span>
                            {hasMore && (
                              <button 
                                onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                                className="text-xs text-blue-600 hover:text-blue-700 ml-1 font-medium"
                              >
                                {isProfileExpanded ? ' Show less' : '... View more'}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {/* LinkedIn Profile Link - Moved below description */}
                  {job.author.linkedinUrl && (
                    <a
                      href={job.author.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      View LinkedIn profile
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Posted by</p>
                    <p className="text-sm font-semibold text-gray-900">{job.posterName || companyName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Right: View Post + Apply Button - Same row as posted by */}
            <div className="flex-shrink-0 ml-4 flex gap-2">
              {/* View Post Button */}
              <a
                href={job.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200"
              >
                View Post
              </a>
              
              {/* Apply Button */}
              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                APPLY
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Naukri Card Design (Enhanced with Rich Data)
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Top Section */}
      <div className="p-6">
        {/* Header: Logo + Company + Job Title + Badge + Time */}
        <div className="flex items-start justify-between mb-4">
          {/* Left: Logo + Company Info + Job Title */}
          <div className="flex items-start gap-3 flex-1">
            {/* Company Logo */}
            {job.logoUrl ? (
              <img
                src={job.logoUrl}
                alt={job.company}
                className="w-12 h-12 object-contain flex-shrink-0 rounded-lg bg-gray-50 p-1"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
            
            {/* Company Name + Rating + Job Title */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-900">{job.company}</h4>
                {job.companyRating && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded border border-orange-200">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{job.companyRating}</span>
                    {job.companyReviews && <span>({job.companyReviews})</span>}
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {job.title}
              </h3>
            </div>
          </div>

          {/* Right: Source + Time */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Naukri Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-md text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              Naukri
            </div>

            {/* Time */}
            {job.postedDate && (
              <span className="text-xs text-gray-500">{job.postedDate}</span>
            )}
          </div>
        </div>

        {/* Job Metadata Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-4">
          {job.location && (
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{job.location}</span>
            </div>
          )}
          {job.experience && (
            <>
              <span className="text-gray-400">|</span>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6z" />
                </svg>
                <span>{job.experience}</span>
              </div>
            </>
          )}
          {job.salary && (
            <>
              <span className="text-gray-400">|</span>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span>{job.salary}</span>
              </div>
            </>
          )}
          {job.isWalkIn && (
            <>
              <span className="text-gray-400">|</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200">
                Walk-in
              </span>
            </>
          )}
        </div>

        {/* Skills Section */}
        {job.skills && job.skills.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Required Skills:</p>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.slice(0, 6).map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200"
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 6 && (
                <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded-md border border-gray-200">
                  +{job.skills.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div className="mb-4">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {isExpanded ? job.description : job.description.substring(0, 200) + (job.description.length > 200 ? '...' : '')}
            </p>
            {job.description.length > 200 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1.5 focus:outline-none transition-colors"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-gray-200 p-6">
        <div className="flex items-center justify-end">
          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
          >
            Apply Now
          </a>
        </div>
      </div>
    </div>
  );
}