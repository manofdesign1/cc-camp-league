import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Submission rate limits - allow auto-sync every 5 minutes
  submitData: {
    kind: "fixed window",
    rate: 15, // 15 submissions per hour (supports 5-min auto-sync)
    period: HOUR,
  },
  
  // API endpoint rate limits
  apiGeneral: { 
    kind: "token bucket", 
    rate: 60, // 60 requests per minute
    period: MINUTE,
    capacity: 10, // Allow bursts of up to 10
  },
  
  // Failed submission attempts (even stricter)
  failedSubmissions: { 
    kind: "fixed window", 
    rate: 10, // Only 10 failed attempts per hour
    period: HOUR,
  },
  
  // Query rate limits for expensive operations
  expensiveQuery: {
    kind: "token bucket",
    rate: 20, // 20 per minute
    period: MINUTE,
    capacity: 5,
    shards: 5, // Use sharding for better performance
  },
});