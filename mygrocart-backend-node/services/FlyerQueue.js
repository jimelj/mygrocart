const Queue = require('bull');
const FlyerService = require('./FlyerService');

/**
 * FlyerQueue - Job queue for flyer processing
 *
 * Uses Bull + Redis to process flyer fetching jobs with:
 * - Controlled concurrency (1 job at a time to prevent OOM)
 * - Job deduplication (same ZIP won't be processed twice simultaneously)
 * - Automatic retries on failure
 * - Job status tracking for admin dashboard
 */
class FlyerQueue {
  constructor() {
    this.flyerService = new FlyerService();
    this.queue = null;
    this.isInitialized = false;

    // Track processing status in memory (for quick lookups)
    this.processingZips = new Set();
    this.jobHistory = []; // Last 100 jobs for admin dashboard
  }

  /**
   * Initialize the queue with Redis connection
   * @returns {Promise<boolean>} Whether initialization succeeded
   */
  async initialize() {
    if (this.isInitialized) return true;

    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.log('[FlyerQueue] Redis not configured - queue disabled, using direct processing');
      return false;
    }

    try {
      // Create Bull queue with Redis connection
      this.queue = new Queue('flyer-processing', redisUrl, {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          },
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50 // Keep last 50 failed jobs
        }
      });

      // Process jobs one at a time to prevent OOM
      this.queue.process(1, async (job) => {
        return this.processJob(job);
      });

      // Event handlers
      this.queue.on('completed', (job, result) => {
        console.log(`[FlyerQueue] Job ${job.id} completed for ZIP ${job.data.zipCode}`);
        this.processingZips.delete(job.data.zipCode);
        this.addToHistory(job, 'completed', result);
      });

      this.queue.on('failed', (job, err) => {
        console.error(`[FlyerQueue] Job ${job.id} failed for ZIP ${job.data.zipCode}:`, err.message);
        this.processingZips.delete(job.data.zipCode);
        this.addToHistory(job, 'failed', { error: err.message });
      });

      this.queue.on('active', (job) => {
        console.log(`[FlyerQueue] Job ${job.id} started for ZIP ${job.data.zipCode}`);
        this.processingZips.add(job.data.zipCode);
      });

      this.queue.on('error', (error) => {
        console.error('[FlyerQueue] Queue error:', error.message);
      });

      this.isInitialized = true;
      console.log('[FlyerQueue] Queue initialized successfully');
      return true;
    } catch (error) {
      console.error('[FlyerQueue] Failed to initialize queue:', error.message);
      return false;
    }
  }

  /**
   * Process a flyer job
   * @param {object} job - Bull job object
   * @returns {Promise<object>} Processing result
   */
  async processJob(job) {
    const { zipCode, triggeredBy, priority } = job.data;

    console.log(`[FlyerQueue] Processing ZIP ${zipCode} (triggered by: ${triggeredBy})`);

    try {
      const result = await this.flyerService.processZipCode(zipCode);
      return result;
    } catch (error) {
      console.error(`[FlyerQueue] Error processing ZIP ${zipCode}:`, error.message);
      throw error; // Let Bull handle retry
    }
  }

  /**
   * Add a ZIP code to the processing queue
   * @param {string} zipCode - ZIP code to process
   * @param {object} options - Job options
   * @returns {Promise<object>} Job info or existing job status
   */
  async addJob(zipCode, options = {}) {
    const {
      triggeredBy = 'system',
      priority = 'normal',
      force = false // Force reprocessing even if recently done
    } = options;

    // Validate ZIP code
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return {
        success: false,
        status: 'invalid',
        message: 'Invalid ZIP code format'
      };
    }

    // If queue not initialized, process directly (fallback)
    if (!this.isInitialized || !this.queue) {
      console.log(`[FlyerQueue] Queue not available, processing ZIP ${zipCode} directly`);

      // Check if already processing this ZIP
      if (this.processingZips.has(zipCode)) {
        return {
          success: true,
          status: 'processing',
          message: `ZIP ${zipCode} is already being processed`
        };
      }

      this.processingZips.add(zipCode);

      // Process in background (don't await)
      this.flyerService.processZipCode(zipCode)
        .then(result => {
          console.log(`[FlyerQueue] Direct processing completed for ZIP ${zipCode}`);
          this.processingZips.delete(zipCode);
        })
        .catch(error => {
          console.error(`[FlyerQueue] Direct processing failed for ZIP ${zipCode}:`, error.message);
          this.processingZips.delete(zipCode);
        });

      return {
        success: true,
        status: 'processing',
        message: `Started processing ZIP ${zipCode} (direct mode)`
      };
    }

    // Check if this ZIP is already in the queue or processing
    if (this.processingZips.has(zipCode) && !force) {
      return {
        success: true,
        status: 'processing',
        message: `ZIP ${zipCode} is already being processed`
      };
    }

    // Check for existing waiting jobs for this ZIP
    const waitingJobs = await this.queue.getWaiting();
    const existingJob = waitingJobs.find(j => j.data.zipCode === zipCode);

    if (existingJob && !force) {
      return {
        success: true,
        status: 'queued',
        jobId: existingJob.id,
        message: `ZIP ${zipCode} is already queued`
      };
    }

    // Add new job to queue
    const job = await this.queue.add({
      zipCode,
      triggeredBy,
      priority,
      timestamp: new Date().toISOString()
    }, {
      priority: priority === 'high' ? 1 : priority === 'low' ? 10 : 5,
      jobId: force ? undefined : `zip-${zipCode}` // Unique job ID to prevent duplicates
    });

    console.log(`[FlyerQueue] Added job ${job.id} for ZIP ${zipCode}`);

    return {
      success: true,
      status: 'queued',
      jobId: job.id,
      message: `ZIP ${zipCode} added to processing queue`
    };
  }

  /**
   * Get queue status for admin dashboard
   * @returns {Promise<object>} Queue statistics
   */
  async getQueueStatus() {
    if (!this.isInitialized || !this.queue) {
      return {
        enabled: false,
        message: 'Queue not initialized (using direct processing)',
        processingZips: Array.from(this.processingZips)
      };
    }

    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount()
      ]);

      const activeJobs = await this.queue.getActive();
      const waitingJobs = await this.queue.getWaiting();

      return {
        enabled: true,
        counts: {
          waiting,
          active,
          completed,
          failed
        },
        activeJobs: activeJobs.map(j => ({
          id: j.id,
          zipCode: j.data.zipCode,
          triggeredBy: j.data.triggeredBy,
          startedAt: j.processedOn
        })),
        waitingJobs: waitingJobs.slice(0, 10).map(j => ({
          id: j.id,
          zipCode: j.data.zipCode,
          triggeredBy: j.data.triggeredBy,
          addedAt: j.data.timestamp
        })),
        recentHistory: this.jobHistory.slice(0, 20),
        processingZips: Array.from(this.processingZips)
      };
    } catch (error) {
      console.error('[FlyerQueue] Error getting queue status:', error.message);
      return {
        enabled: true,
        error: error.message
      };
    }
  }

  /**
   * Check if a ZIP code is currently being processed
   * @param {string} zipCode - ZIP code to check
   * @returns {boolean} Whether ZIP is being processed
   */
  isProcessing(zipCode) {
    return this.processingZips.has(zipCode);
  }

  /**
   * Add job result to history
   * @param {object} job - Bull job
   * @param {string} status - Job status
   * @param {object} result - Job result
   */
  addToHistory(job, status, result) {
    this.jobHistory.unshift({
      id: job.id,
      zipCode: job.data.zipCode,
      triggeredBy: job.data.triggeredBy,
      status,
      result: result ? {
        flyersProcessed: result.flyersProcessed,
        newFlyers: result.newFlyers,
        totalDeals: result.totalDeals
      } : null,
      completedAt: new Date().toISOString()
    });

    // Keep only last 100 entries
    if (this.jobHistory.length > 100) {
      this.jobHistory = this.jobHistory.slice(0, 100);
    }
  }

  /**
   * Close the queue connection
   */
  async close() {
    if (this.queue) {
      await this.queue.close();
      console.log('[FlyerQueue] Queue closed');
    }
  }
}

// Singleton instance
const flyerQueue = new FlyerQueue();

module.exports = flyerQueue;
