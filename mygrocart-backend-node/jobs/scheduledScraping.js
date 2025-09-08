const cron = require('node-cron');
const ScrapingOrchestrator = require('../services/ScrapingOrchestrator');

class ScheduledScraping {
  constructor() {
    this.orchestrator = new ScrapingOrchestrator();
    this.jobs = new Map();
    this.isEnabled = process.env.ENABLE_SCHEDULED_SCRAPING === 'true';
  }

  /**
   * Start all scheduled scraping jobs
   */
  start() {
    if (!this.isEnabled) {
      console.log('📅 Scheduled scraping is disabled (set ENABLE_SCHEDULED_SCRAPING=true to enable)');
      return;
    }

    console.log('📅 Starting scheduled scraping jobs...');

    // Daily comprehensive scraping at 2 AM
    this.scheduleJob('daily-comprehensive', '0 2 * * *', async () => {
      await this.runDailyComprehensiveScraping();
    });

    // Quick price updates every 6 hours
    this.scheduleJob('price-updates', '0 */6 * * *', async () => {
      await this.runQuickPriceUpdates();
    });

    // Weekly detailed product scraping on Sundays at 3 AM
    this.scheduleJob('weekly-detailed', '0 3 * * 0', async () => {
      await this.runWeeklyDetailedScraping();
    });

    console.log('📅 Scheduled scraping jobs started');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log('📅 Stopping scheduled scraping jobs...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`  ✓ Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    console.log('📅 All scheduled jobs stopped');
  }

  /**
   * Schedule a new job
   * @param {string} name - Job name
   * @param {string} schedule - Cron schedule
   * @param {Function} task - Task function to execute
   */
  scheduleJob(name, schedule, task) {
    const job = cron.schedule(schedule, async () => {
      console.log(`📅 Starting scheduled job: ${name}`);
      const startTime = Date.now();
      
      try {
        await task();
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`✅ Completed scheduled job: ${name} (${duration}s)`);
      } catch (error) {
        console.error(`❌ Failed scheduled job: ${name}`, error.message);
      }
    }, {
      scheduled: false // Don't start immediately
    });

    this.jobs.set(name, job);
    job.start();
    
    console.log(`  ✓ Scheduled job: ${name} (${schedule})`);
  }

  /**
   * Run daily comprehensive scraping
   */
  async runDailyComprehensiveScraping() {
    const searchTerms = [
      // Dairy & Eggs
      'milk', 'eggs', 'cheese', 'yogurt', 'butter',
      
      // Meat & Poultry
      'chicken breast', 'ground beef', 'salmon', 'turkey',
      
      // Produce
      'bananas', 'apples', 'tomatoes', 'lettuce', 'onions',
      'carrots', 'potatoes', 'broccoli', 'spinach',
      
      // Pantry Staples
      'bread', 'rice', 'pasta', 'cereal', 'oats',
      'flour', 'sugar', 'olive oil', 'salt',
      
      // Beverages
      'orange juice', 'coffee', 'tea', 'water bottles',
      
      // Frozen Foods
      'frozen vegetables', 'ice cream', 'frozen pizza'
    ];

    const results = await this.orchestrator.runComprehensiveScraping({
      searchTerms,
      zipCode: '07001',
      maxResultsPerTerm: 20,
      includeDetailedScraping: false
    });

    console.log('📊 Daily comprehensive scraping results:', {
      totalProducts: results.summary.totalProductsProcessed,
      created: results.summary.totalProductsCreated,
      errors: results.summary.totalErrors
    });

    return results;
  }

  /**
   * Run quick price updates for existing products
   */
  async runQuickPriceUpdates() {
    const quickSearchTerms = [
      'milk', 'bread', 'eggs', 'chicken', 'bananas'
    ];

    const results = await this.orchestrator.scrapeShopRite({
      searchTerms: quickSearchTerms,
      zipCode: '07001',
      maxResultsPerTerm: 10
    });

    console.log('📊 Quick price update results:', {
      totalProducts: results.processingResults.processed,
      updated: results.processingResults.updated,
      errors: results.processingResults.errors
    });

    return results;
  }

  /**
   * Run weekly detailed product scraping
   */
  async runWeeklyDetailedScraping() {
    // This would typically scrape product detail pages for enhanced information
    // For now, we'll run a comprehensive scraping with detailed flag
    
    const weeklySearchTerms = [
      'organic milk', 'whole grain bread', 'free range eggs',
      'grass fed beef', 'organic apples', 'wild salmon'
    ];

    const results = await this.orchestrator.runComprehensiveScraping({
      searchTerms: weeklySearchTerms,
      zipCode: '07001',
      maxResultsPerTerm: 15,
      includeDetailedScraping: true
    });

    console.log('📊 Weekly detailed scraping results:', {
      totalProducts: results.summary.totalProductsProcessed,
      created: results.summary.totalProductsCreated,
      errors: results.summary.totalErrors
    });

    return results;
  }

  /**
   * Get status of all scheduled jobs
   */
  getJobStatus() {
    const status = {
      enabled: this.isEnabled,
      totalJobs: this.jobs.size,
      jobs: []
    };

    this.jobs.forEach((job, name) => {
      status.jobs.push({
        name,
        running: job.running,
        scheduled: job.scheduled
      });
    });

    return status;
  }

  /**
   * Manually trigger a specific job
   * @param {string} jobName - Name of the job to trigger
   */
  async triggerJob(jobName) {
    switch (jobName) {
      case 'daily-comprehensive':
        return await this.runDailyComprehensiveScraping();
      case 'price-updates':
        return await this.runQuickPriceUpdates();
      case 'weekly-detailed':
        return await this.runWeeklyDetailedScraping();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

module.exports = ScheduledScraping;

