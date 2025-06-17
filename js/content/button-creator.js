// Button Creator - Creates and manages NostrX buttons for tweets

class NostrButtonCreator {
  static create(tweetData, clickHandler) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'nostrx-button-container';
    buttonContainer.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0 4px;
    `;

    const button = document.createElement('button');
    button.className = 'nostrx-button';
    button.setAttribute('aria-label', 'Cross-post to Nostr');
    button.setAttribute('data-testid', 'nostrx-button');
    
    // Button styling to match Twitter's design
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34.75px;
      height: 34.75px;
      border: none;
      background: transparent;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      position: relative;
      padding: 0;
      margin: 0;
    `;

    // Create icon container
    const icon = document.createElement('div');
    const svg = SVGIcons.createLightningBolt();
    icon.appendChild(svg);
    icon.style.cssText = `
      color: rgb(113, 118, 123);
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    button.appendChild(icon);
    buttonContainer.appendChild(button);

    // Add hover effects
    this.setupHoverEffects(button, icon);
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clickHandler(button, tweetData);
    });

    return buttonContainer;
  }

  static setupHoverEffects(button, icon) {
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'rgba(124, 58, 237, 0.1)';
      icon.style.color = 'rgb(124, 58, 237)';
    });

    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('posting')) {
        button.style.backgroundColor = 'transparent';
        icon.style.color = 'rgb(113, 118, 123)';
      }
    });
  }

  static setState(button, state) {
    const icon = button.querySelector('div');
    if (!icon) return;
    
    // Clear existing content
    icon.innerHTML = '';
    
    // Add new SVG
    const svg = SVGIcons.createLightningBolt();
    icon.appendChild(svg);
    
    const states = {
      loading: { color: 'rgb(124, 58, 237)', bg: 'rgba(124, 58, 237, 0.1)' },
      success: { color: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.1)' },
      error: { color: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.1)' },
      default: { color: 'rgb(113, 118, 123)', bg: 'transparent' }
    };
    
    const stateConfig = states[state] || states.default;
    icon.style.color = stateConfig.color;
    button.style.backgroundColor = stateConfig.bg;
  }

  static showErrorTooltip(button, errorMessage) {
    const tooltip = document.createElement('div');
    tooltip.className = 'nostrx-error-tooltip';
    tooltip.textContent = errorMessage;
    tooltip.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #dc2626;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 1000;
      margin-bottom: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;

    const buttonContainer = button.closest('.nostrx-button-container');
    buttonContainer.style.position = 'relative';
    buttonContainer.appendChild(tooltip);

    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 3000);
  }
}

// Export for use in other modules
window.NostrButtonCreator = NostrButtonCreator;