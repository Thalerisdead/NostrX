// DOM Observer - Monitors DOM changes and handles navigation for tweet detection

class DOMObserver {
  constructor(onTweetsAdded) {
    this.observer = null;
    this.debounceTimer = null;
    this.onTweetsAdded = onTweetsAdded;
    this.currentUrl = window.location.href;
  }

  start() {
    this.observeChanges();
    this.handleNavigation();
  }

  observeChanges() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && node.matches('article[data-testid="tweet"]')) {
              shouldProcess = true;
            } else if (node.querySelector && node.querySelector('article[data-testid="tweet"]')) {
              shouldProcess = true;
            }
          }
        });
      });

      if (shouldProcess) {
        this.debouncedCallback();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  debouncedCallback() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.onTweetsAdded();
    }, 200);
  }

  handleNavigation() {
    const checkForNavigation = () => {
      if (window.location.href !== this.currentUrl) {
        this.currentUrl = window.location.href;
        setTimeout(() => {
          this.onTweetsAdded(true); // true indicates navigation occurred
        }, 1000);
      }
    };

    setInterval(checkForNavigation, 1000);
    
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.onTweetsAdded(true);
      }, 1000);
    });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    clearTimeout(this.debounceTimer);
  }
}

// Export for use in other modules
window.DOMObserver = DOMObserver;