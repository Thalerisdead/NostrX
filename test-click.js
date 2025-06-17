// Simple test to verify NostrX button functionality
// Paste this into the Twitter/X console to test

console.log('=== NostrX Button Test ===');

// Check if content script is loaded
console.log('1. NostrX instance:', typeof nostrX);

// Check if buttons exist
const buttons = document.querySelectorAll('.nostrx-button');
console.log('2. Lightning buttons found:', buttons.length);

// Check button styling
if (buttons.length > 0) {
  const firstButton = buttons[0];
  console.log('3. First button element:', firstButton);
  console.log('4. Button styles:', {
    display: firstButton.style.display,
    cursor: firstButton.style.cursor,
    pointerEvents: firstButton.style.pointerEvents
  });
  
  // Check for event listeners
  console.log('5. Button has click listener:', firstButton.onclick !== null);
  
  // Try to find parent tweet
  const tweetElement = firstButton.closest('article[data-testid="tweet"]');
  console.log('6. Parent tweet found:', tweetElement !== null);
  
  if (tweetElement) {
    // Try to extract tweet data
    const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
    console.log('7. Tweet text found:', tweetTextElement !== null);
    if (tweetTextElement) {
      console.log('8. Tweet text:', tweetTextElement.innerText.substring(0, 100) + '...');
    }
  }
}

// Test chrome.runtime
console.log('9. Chrome runtime available:', typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined');

// Test manual click
if (buttons.length > 0) {
  console.log('10. Attempting manual click...');
  buttons[0].click();
} else {
  console.log('10. No buttons to click');
}

console.log('=== Test Complete ===');