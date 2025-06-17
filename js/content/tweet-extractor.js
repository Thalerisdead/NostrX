// Tweet Data Extractor - Extracts tweet data from Twitter/X DOM elements

class TweetDataExtractor {
  static async extract(tweetElement) {
    try {
      // Extract tweet text - improved to handle longer tweets and multiple text elements
      let tweetText = '';
      
      // Primary method: Get text from the main tweet text container
      const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
      if (tweetTextElement) {
        // Only expand "Show more" during publishing, not during normal browsing
        // This prevents auto-opening posts while scrolling
        const showMoreButton = tweetElement.querySelector('[data-testid="tweet-text-show-more-link"]');
        if (showMoreButton && window.nostrx_expanding_text) {
          console.log('NostrX: Found "Show more" button, clicking to expand full text for publishing');
          try {
            showMoreButton.click();
            // Wait a moment for the text to expand
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.warn('NostrX: Error clicking show more button:', error);
          }
        }
        
        tweetText = tweetTextElement.innerText.trim();
      }
      
      // Fallback method: If text is empty or very short, try alternative selectors
      if (!tweetText || tweetText.length < 10) {
        // Try to find text in spans within the tweet
        const textSpans = tweetElement.querySelectorAll('[data-testid="tweetText"] span, [lang] span');
        if (textSpans.length > 0) {
          tweetText = Array.from(textSpans)
            .map(span => span.innerText)
            .filter(text => text && text.trim())
            .join('');
        }
      }
      
      // Additional fallback: Look for any text content in the tweet body
      if (!tweetText || tweetText.length < 10) {
        const tweetBody = tweetElement.querySelector('[data-testid="tweetText"]')?.closest('div[lang]');
        if (tweetBody) {
          tweetText = tweetBody.innerText.trim();
        }
      }
      
      // Final fallback: Get all text content and filter out UI elements
      if (!tweetText) {
        const allTextElements = tweetElement.querySelectorAll('span[dir], div[dir], div[lang]');
        const textParts = Array.from(allTextElements)
          .map(el => el.innerText?.trim())
          .filter(text => text && 
            text.length > 5 && 
            !text.includes('·') && 
            !text.includes('@') && 
            !text.match(/^\d+[smhd]$/) && // Time indicators like "2h", "1d"
            !text.match(/^[\d,]+$/) // Numbers only (likes, retweets, etc.)
          );
        
        if (textParts.length > 0) {
          tweetText = textParts.join(' ').trim();
        }
      }

      // Extract username
      const usernameElement = tweetElement.querySelector('[data-testid="User-Name"] a[role="link"]');
      const username = usernameElement ? usernameElement.getAttribute('href').replace('/', '') : '';

      // Extract timestamp
      const timeElement = tweetElement.querySelector('time');
      const timestamp = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();

      // Extract tweet URL
      const tweetUrlElement = timeElement ? timeElement.closest('a') : null;
      const tweetUrl = tweetUrlElement ? `https://twitter.com${tweetUrlElement.getAttribute('href')}` : '';

      // Log extracted text length for debugging
      console.log('NostrX: Extracted tweet text length:', tweetText.length, 'Preview:', tweetText.substring(0, 100) + '...');

      return {
        text: tweetText,
        username: username,
        timestamp: timestamp,
        url: tweetUrl
      };
    } catch (error) {
      console.error('NostrX: Error extracting tweet data:', error);
      return null;
    }
  }
}

// Export for use in other modules
window.TweetDataExtractor = TweetDataExtractor;