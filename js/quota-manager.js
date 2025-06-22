class QuotaManager {
  constructor() {
    this.tierLimits = {
      basic: 3,
      premium: 25,
      advanced: -1 // unlimited
    };
  }

  async getCurrentTier() {
    try {
      const result = await chrome.storage.sync.get(['userTier']);
      return result.userTier || 'basic';
    } catch (error) {
      console.error('Error getting current tier:', error);
      return 'basic';
    }
  }

  async setTier(tier) {
    try {
      await chrome.storage.sync.set({ userTier: tier });
      console.log(`Tier set to: ${tier}`);
      return true;
    } catch (error) {
      console.error('Error setting tier:', error);
      return false;
    }
  }

  async getTodaysUsage() {
    try {
      const today = new Date().toDateString();
      const result = await chrome.storage.sync.get(['quotaData']);
      const quotaData = result.quotaData || {};
      
      if (quotaData.date !== today) {
        // Reset for new day
        const newQuotaData = {
          date: today,
          used: 0
        };
        await chrome.storage.sync.set({ quotaData: newQuotaData });
        return 0;
      }
      
      return quotaData.used || 0;
    } catch (error) {
      console.error('Error getting today\'s usage:', error);
      return 0;
    }
  }

  async incrementUsage() {
    try {
      const today = new Date().toDateString();
      const result = await chrome.storage.sync.get(['quotaData']);
      const quotaData = result.quotaData || { date: today, used: 0 };
      
      if (quotaData.date !== today) {
        quotaData.date = today;
        quotaData.used = 0;
      }
      
      quotaData.used += 1;
      await chrome.storage.sync.set({ quotaData });
      
      console.log(`Usage incremented to: ${quotaData.used}`);
      return quotaData.used;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return null;
    }
  }

  async canPost() {
    try {
      const tier = await this.getCurrentTier();
      const limit = this.tierLimits[tier];
      
      // Unlimited tier
      if (limit === -1) return true;
      
      const used = await this.getTodaysUsage();
      return used < limit;
    } catch (error) {
      console.error('Error checking if can post:', error);
      return false;
    }
  }

  async getRemainingPosts() {
    try {
      const tier = await this.getCurrentTier();
      const limit = this.tierLimits[tier];
      
      // Unlimited tier
      if (limit === -1) return -1;
      
      const used = await this.getTodaysUsage();
      return Math.max(0, limit - used);
    } catch (error) {
      console.error('Error getting remaining posts:', error);
      return 0;
    }
  }

  async getQuotaInfo() {
    try {
      const tier = await this.getCurrentTier();
      const limit = this.tierLimits[tier];
      const used = await this.getTodaysUsage();
      
      return {
        tier,
        limit: limit === -1 ? '∞' : limit,
        used,
        remaining: limit === -1 ? -1 : Math.max(0, limit - used),
        canPost: limit === -1 ? true : used < limit
      };
    } catch (error) {
      console.error('Error getting quota info:', error);
      return {
        tier: 'basic',
        limit: 3,
        used: 0,
        remaining: 3,
        canPost: true
      };
    }
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.QuotaManager = QuotaManager;
} else if (typeof globalThis !== 'undefined') {
  globalThis.QuotaManager = QuotaManager;
}