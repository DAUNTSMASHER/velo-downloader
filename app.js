document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const form = document.getElementById('downloader-form');
  const urlInput = document.getElementById('video-url');
  const clearBtn = document.getElementById('btn-clear');
  const fetchBtn = document.getElementById('btn-fetch');
  const fetchBtnText = fetchBtn.querySelector('.btn-text');
  const fetchBtnLoader = fetchBtn.querySelector('.btn-loader');
  const urlError = document.getElementById('url-error');
  const platformButtons = document.querySelectorAll('.platform-btn');
  
  const resultsCard = document.getElementById('results-card');
  const videoTitle = document.getElementById('video-title');
  const videoDuration = document.getElementById('video-duration');
  const metaPlatform = document.getElementById('meta-platform');
  const metaAuthor = document.getElementById('meta-author');
  
  const progressContainer = document.getElementById('progress-container');
  const progressStatus = document.getElementById('progress-status');
  const progressPercent = document.getElementById('progress-percent');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const cancelDownloadBtn = document.getElementById('btn-cancel-download');
  const downloadOptionBtns = document.querySelectorAll('.download-option-btn');
  
  const toastContainer = document.getElementById('toast-container');

  // App State
  let currentPlatform = 'auto';
  let activeDownloadInterval = null;

  // Platform Colors Map (HSL for beautiful glows)
  const platformColors = {
    auto: { accent: '#a855f7', glow: 'rgba(168, 85, 247, 0.25)', placeholder: 'Paste video or media link here...' },
    youtube: { accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.25)', placeholder: 'Paste YouTube video or Shorts URL...' },
    tiktok: { accent: '#00f2fe', glow: 'rgba(0, 242, 254, 0.2)', placeholder: 'Paste TikTok video URL...' },
    instagram: { accent: '#f43f5e', glow: 'rgba(244, 63, 94, 0.25)', placeholder: 'Paste Instagram Reel or Post URL...' },
    twitter: { accent: '#ffffff', glow: 'rgba(255, 255, 255, 0.15)', placeholder: 'Paste Twitter/X video post URL...' },
    facebook: { accent: '#3b82f6', glow: 'rgba(59, 130, 246, 0.25)', placeholder: 'Paste Facebook video URL...' }
  };

  // 1. Toast Notification Helper
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Select Icon based on Type
    const iconSvg = type === 'success' 
      ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`
      : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">${message}</div>
      <button class="toast-close" aria-label="Close message">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    toastContainer.appendChild(toast);

    // Setup Close Listener
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.style.animation = 'toastOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    });

    // Auto Remove
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'toastOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  // 2. Set Active Platform Styling
  function applyPlatformTheme(platformKey) {
    const root = document.documentElement;
    const theme = platformColors[platformKey];
    
    root.style.setProperty('--platform-accent', theme.accent);
    root.style.setProperty('--platform-glow', theme.glow);
    
    // Update Input Placeholder
    urlInput.nextElementSibling.textContent = theme.placeholder;
  }

  // Handle Platform Buttons Click
  platformButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      platformButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentPlatform = btn.dataset.platform;
      applyPlatformTheme(currentPlatform);
      
      // Re-trigger auto detect if there is text already
      if (currentPlatform === 'auto' && urlInput.value.trim()) {
        detectPlatform(urlInput.value.trim());
      }
    });
  });

  // 3. Platform URL Auto-Detection
  function detectPlatform(url) {
    if (currentPlatform !== 'auto') return;

    let detected = 'auto';
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      detected = 'youtube';
    } else if (lowerUrl.includes('tiktok.com')) {
      detected = 'tiktok';
    } else if (lowerUrl.includes('instagram.com')) {
      detected = 'instagram';
    } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
      detected = 'twitter';
    } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
      detected = 'facebook';
    }

    applyPlatformTheme(detected);
    
    // Highlight the detected button visually (without breaking user's chosen active button mode)
    platformButtons.forEach(b => {
      if (b.dataset.platform === detected) {
        b.style.borderColor = platformColors[detected].accent;
      } else if (b.dataset.platform !== 'auto') {
        b.style.borderColor = ''; // reset
      }
    });

    return detected;
  }

  // Listen to inputs for auto-detection
  urlInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      detectPlatform(val);
    } else {
      applyPlatformTheme(currentPlatform);
      platformButtons.forEach(b => b.style.borderColor = '');
    }
    // Clear error on input change
    urlError.hidden = true;
    urlInput.classList.remove('invalid');
  });

  // Clear Input Button
  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    urlInput.focus();
    urlError.hidden = true;
    urlInput.classList.remove('invalid');
    applyPlatformTheme(currentPlatform);
    platformButtons.forEach(b => b.style.borderColor = '');
    resultsCard.hidden = true;
    resetProgress();
  });

  // 4. Form Submission and Mock Analysis
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();

    if (!url) return;

    // Simple URL validation
    try {
      new URL(url);
    } catch (_) {
      urlError.textContent = 'Please enter a valid absolute URL (e.g., https://example.com)';
      urlError.hidden = false;
      urlInput.classList.add('invalid');
      showToast('Invalid URL format', 'error');
      return;
    }

    // Determine platform
    const platform = currentPlatform === 'auto' ? detectPlatform(url) : currentPlatform;
    const platformLabel = platform === 'auto' ? 'Web Video' : platform.charAt(0).toUpperCase() + platform.slice(1);

    // Show Loading state on submit button
    fetchBtn.disabled = true;
    fetchBtnText.style.opacity = '0.3';
    fetchBtnLoader.hidden = false;
    urlError.hidden = true;
    urlInput.classList.remove('invalid');
    resultsCard.hidden = true;
    resetProgress();

    // Mock API Fetch delay (1.5 seconds)
    setTimeout(() => {
      fetchBtn.disabled = false;
      fetchBtnText.style.opacity = '1';
      fetchBtnLoader.hidden = true;

      // Mock Video Details Generation
      const parsedUrl = new URL(url);
      const titleSuggestions = {
        youtube: 'Awesome Travel Vlogs 2026 (4K Ultra HD)',
        tiktok: 'Viral Dance Trend Tutorial #fyp #trending',
        instagram: 'Creative Aesthetic Cinematic Reel by Explorer',
        twitter: 'Breaking Space Launch Updates & Telemetry Feed',
        facebook: 'Easy 15-Minute Gourmet Dinner Recipe Guide'
      };

      const defaultTitle = `Video from ${parsedUrl.hostname}`;
      const videoName = titleSuggestions[platform] || defaultTitle;
      const creatorName = platform !== 'auto' ? `@creator_${platform}` : '@web_media';
      const durationStr = platform === 'youtube' ? '12:40' : platform === 'tiktok' ? '00:45' : '02:15';

      // Set Info
      videoTitle.textContent = videoName;
      videoDuration.textContent = durationStr;
      metaPlatform.textContent = platformLabel;
      metaAuthor.textContent = creatorName;
      
      // Update result card platform theme
      resultsCard.style.setProperty('--platform-accent', platformColors[platform].accent);
      resultsCard.style.setProperty('--platform-glow', platformColors[platform].glow);
      
      // Set preview SVG element background highlight
      const previewSvg = resultsCard.querySelector('.preview-svg');
      previewSvg.style.setProperty('--platform-accent', platformColors[platform].accent);
      
      // Unhide Results Card
      resultsCard.hidden = false;
      resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      showToast('Video details extracted successfully!');
    }, 1500);
  });

  // 5. Download Quality Option Triggers
  downloadOptionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const quality = btn.dataset.quality;
      startMockDownload(quality);
    });
  });

  // Start Download simulation
  function startMockDownload(quality) {
    resetProgress();

    // Disable all options while download is active
    downloadOptionBtns.forEach(b => b.disabled = true);
    progressContainer.hidden = false;
    progressContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    let percent = 0;
    const targetQuality = quality === 'mp3' ? 'MP3 Audio' : `${quality} Video`;
    progressStatus.textContent = `Preparing ${targetQuality}...`;
    
    showToast(`Downloading started for ${targetQuality}`, 'success');

    activeDownloadInterval = setInterval(() => {
      percent += Math.floor(Math.random() * 4) + 2; // Increments randomly by 2-5%

      if (percent >= 100) {
        percent = 100;
        clearInterval(activeDownloadInterval);
        activeDownloadInterval = null;
        
        progressPercent.textContent = '100%';
        progressBarFill.style.width = '100%';
        progressStatus.textContent = 'Download Complete!';
        
        setTimeout(() => {
          showToast(`Success! Your ${targetQuality} file has been saved.`, 'success');
          // Reset controls
          downloadOptionBtns.forEach(b => b.disabled = false);
          progressContainer.hidden = true;
        }, 800);
      } else {
        if (percent > 15 && percent < 90) {
          progressStatus.textContent = `Downloading ${targetQuality} (${(percent * 0.4).toFixed(1)} MB / 42.5 MB)`;
        } else if (percent >= 90) {
          progressStatus.textContent = `Finalizing output file...`;
        }
        progressPercent.textContent = `${percent}%`;
        progressBarFill.style.width = `${percent}%`;
      }
    }, 80);
  }

  // Cancel Download logic
  cancelDownloadBtn.addEventListener('click', () => {
    resetProgress();
    showToast('Download was canceled by user', 'error');
  });

  function resetProgress() {
    if (activeDownloadInterval) {
      clearInterval(activeDownloadInterval);
      activeDownloadInterval = null;
    }
    progressContainer.hidden = true;
    progressBarFill.style.width = '0%';
    progressPercent.textContent = '0%';
    progressStatus.textContent = 'Preparing...';
    downloadOptionBtns.forEach(b => b.disabled = false);
  }
});
