document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const form = document.getElementById('downloader-form');
  const urlInput = document.getElementById('video-url');
  const clearBtn = document.getElementById('btn-clear');
  const fetchBtn = document.getElementById('btn-fetch');
  const fetchBtnText = fetchBtn.querySelector('.btn-text');
  const fetchBtnLoader = fetchBtn.querySelector('.btn-loader');
  const urlError = document.getElementById('url-error');
  
  const tabVideo = document.getElementById('tab-video');
  const tabImage = document.getElementById('tab-image');
  const downloaderHeading = document.getElementById('downloader-heading');
  const inputFloatingLabel = document.getElementById('input-floating-label');
  const platformButtons = document.querySelectorAll('.platform-btn');
  const platformLabelTxt = document.getElementById('platform-label-txt');
  
  const resultsCard = document.getElementById('results-card');
  const videoTitle = document.getElementById('video-title');
  const videoDuration = document.getElementById('video-duration');
  const metaPlatform = document.getElementById('meta-platform');
  const metaAuthor = document.getElementById('meta-author');
  const previewMediaTypeIcon = document.getElementById('preview-media-type-icon');
  const optionsTitleTxt = document.getElementById('options-title-txt');
  const optionsListContainer = document.getElementById('options-list-container');
  
  const progressContainer = document.getElementById('progress-container');
  const progressStatus = document.getElementById('progress-status');
  const progressPercent = document.getElementById('progress-percent');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const cancelDownloadBtn = document.getElementById('btn-cancel-download');
  
  const toastContainer = document.getElementById('toast-container');

  // App State
  let currentMode = 'video'; // 'video' or 'image'
  let currentPlatform = 'auto';
  let activeDownloadInterval = null;

  // Configuration Templates
  const platformConfigs = {
    video: {
      heading: 'Paste Video URL to Download',
      floatingLabel: 'Paste YouTube, Instagram, TikTok, or Facebook video link...',
      btnText: 'Download Video',
      optionsTitle: 'Available Video Formats',
      formats: [
        { label: '1080p Full HD', ext: 'MP4', detail: '60 FPS • 42.5 MB', quality: '1080p' },
        { label: '720p HD Quality', ext: 'MP4', detail: '30 FPS • 18.2 MB', quality: '720p' },
        { label: 'Audio Extract', ext: 'MP3', detail: '320kbps • 5.1 MB', quality: 'mp3' }
      ],
      svgIconPath: 'M65,30 L105,45 L65,60 Z' // Play icon
    },
    image: {
      heading: 'Paste Image URL to Download',
      floatingLabel: 'Paste Instagram, TikTok, Facebook, or YouTube image/thumbnail link...',
      btnText: 'Download Image',
      optionsTitle: 'Available Image Resolutions',
      formats: [
        { label: 'Original Resolution', ext: 'PNG', detail: 'Lossless Quality • 5.4 MB', quality: 'original' },
        { label: 'High Quality', ext: 'JPG', detail: 'Optimized Size • 2.2 MB', quality: 'high' },
        { label: 'WebP Compressed', ext: 'WEBP', detail: 'Super Small File • 1.1 MB', quality: 'webp' }
      ],
      svgIconPath: 'M50 25 h20 v20 h-20 z M40 65 l20 -20 l15 15 l20 -30 l25 35 z' // Camera landscape icon placeholder path
    }
  };

  const platformColors = {
    auto: { accent: '#a855f7', glow: 'rgba(168, 85, 247, 0.25)', placeholder: 'Paste media link here...' },
    youtube: { accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.25)', placeholder: 'Paste YouTube link...' },
    tiktok: { accent: '#00f2fe', glow: 'rgba(0, 242, 254, 0.2)', placeholder: 'Paste TikTok link...' },
    instagram: { accent: '#f43f5e', glow: 'rgba(244, 63, 94, 0.25)', placeholder: 'Paste Instagram link...' },
    facebook: { accent: '#3b82f6', glow: 'rgba(59, 130, 246, 0.25)', placeholder: 'Paste Facebook link...' }
  };

  // 1. Toast Notification Helper
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconSvg = type === 'success' 
      ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`
      : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">${message}</div>
      <button class="toast-close" aria-label="Close notification">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    toastContainer.appendChild(toast);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.style.animation = 'toastOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'toastOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  // 2. Set Platform Color Theme
  function applyPlatformTheme(platformKey) {
    const root = document.documentElement;
    const theme = platformColors[platformKey];
    root.style.setProperty('--platform-accent', theme.accent);
    root.style.setProperty('--platform-glow', theme.glow);
    
    // Update floating input label text
    const config = platformConfigs[currentMode];
    if (platformKey === 'auto') {
      inputFloatingLabel.textContent = config.floatingLabel;
    } else {
      const displayPlatform = platformKey.charAt(0).toUpperCase() + platformKey.slice(1);
      inputFloatingLabel.textContent = `Paste ${displayPlatform} ${currentMode} link...`;
    }
  }

  // Detect Platform from URL
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
    } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
      detected = 'facebook';
    }

    applyPlatformTheme(detected);

    platformButtons.forEach(b => {
      if (b.dataset.platform === detected) {
        b.style.borderColor = platformColors[detected].accent;
      } else if (b.dataset.platform !== 'auto') {
        b.style.borderColor = '';
      }
    });

    return detected;
  }

  // 3. Tab Switching Logic
  function switchMode(newMode) {
    if (currentMode === newMode) return;
    currentMode = newMode;
    
    // UI states
    if (currentMode === 'video') {
      tabVideo.classList.add('active');
      tabVideo.setAttribute('aria-selected', 'true');
      tabImage.classList.remove('active');
      tabImage.setAttribute('aria-selected', 'false');
    } else {
      tabImage.classList.add('active');
      tabImage.setAttribute('aria-selected', 'true');
      tabVideo.classList.remove('active');
      tabVideo.setAttribute('aria-selected', 'false');
    }

    const config = platformConfigs[currentMode];
    downloaderHeading.textContent = config.heading;
    fetchBtnText.textContent = config.btnText;
    
    // Reset Input
    urlInput.value = '';
    urlError.hidden = true;
    urlInput.classList.remove('invalid');
    resultsCard.hidden = true;
    resetProgress();
    
    currentPlatform = 'auto';
    applyPlatformTheme('auto');
    platformButtons.forEach(b => {
      b.classList.remove('active');
      b.style.borderColor = '';
    });
    document.getElementById('btn-auto').classList.add('active');
  }

  tabVideo.addEventListener('click', () => switchMode('video'));
  tabImage.addEventListener('click', () => switchMode('image'));

  // Listen to platform selector button clicks
  platformButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      platformButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentPlatform = btn.dataset.platform;
      applyPlatformTheme(currentPlatform);
      
      if (currentPlatform === 'auto' && urlInput.value.trim()) {
        detectPlatform(urlInput.value.trim());
      }
    });
  });

  // URL Input event handlers
  urlInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      detectPlatform(val);
    } else {
      applyPlatformTheme('auto');
      platformButtons.forEach(b => b.style.borderColor = '');
    }
    urlError.hidden = true;
    urlInput.classList.remove('invalid');
  });

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    urlInput.focus();
    urlError.hidden = true;
    urlInput.classList.remove('invalid');
    applyPlatformTheme('auto');
    platformButtons.forEach(b => b.style.borderColor = '');
    resultsCard.hidden = true;
    resetProgress();
  });

  // Render format choices inside Results Card
  function renderFormatOptions(mode) {
    const config = platformConfigs[mode];
    optionsTitleTxt.textContent = config.optionsTitle;
    optionsListContainer.innerHTML = ''; // Clear

    config.formats.forEach(f => {
      const row = document.createElement('div');
      row.className = 'option-row';
      row.innerHTML = `
        <div class="option-info">
          <span class="option-quality">${f.label}</span>
          <span class="option-details">${f.ext} • ${f.detail}</span>
        </div>
        <button class="download-option-btn" data-quality="${f.quality}" data-ext="${f.ext}">
          Download
        </button>
      `;
      optionsListContainer.appendChild(row);
    });

    // Attach listeners to newly created buttons
    optionsListContainer.querySelectorAll('.download-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qualityName = btn.closest('.option-row').querySelector('.option-quality').textContent;
        const extension = btn.dataset.ext;
        startMockDownload(qualityName, extension);
      });
    });
  }

  // 4. Submit URL & Mock File Analysis
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();

    if (!url) return;

    try {
      new URL(url);
    } catch (_) {
      urlError.textContent = 'Please enter a valid URL (e.g., https://instagram.com/p/...)';
      urlError.hidden = false;
      urlInput.classList.add('invalid');
      showToast('Invalid URL format', 'error');
      return;
    }

    const platform = currentPlatform === 'auto' ? detectPlatform(url) : currentPlatform;
    const platformLabel = platform === 'auto' ? 'Web Link' : platform.charAt(0).toUpperCase() + platform.slice(1);

    // Button loading animation
    fetchBtn.disabled = true;
    fetchBtnText.style.opacity = '0.3';
    fetchBtnLoader.hidden = false;
    urlError.hidden = true;
    urlInput.classList.remove('invalid');
    resultsCard.hidden = true;
    resetProgress();

    setTimeout(() => {
      fetchBtn.disabled = false;
      fetchBtnText.style.opacity = '1';
      fetchBtnLoader.hidden = true;

      // Mock Titles for Video vs Image
      const titles = {
        video: {
          youtube: 'How to build beautiful Web interfaces in 2026 (Full Tutorial)',
          tiktok: 'Funny cat attempts to jump onto a glass table 😹 #funny #cats',
          instagram: 'Sunset waves on the Amalfi Coast - Cinematic Travel Reels',
          facebook: 'Amazing street food compilation from around the globe',
          auto: 'Extracted Social Video Stream'
        },
        image: {
          youtube: 'HD Video Thumbnail - How to build web interfaces (1920x1080)',
          tiktok: 'Creator Profile Picture (Original High Definition)',
          instagram: 'Aesthetic minimalist home design photography',
          facebook: 'Shared Timeline Photo - Beautiful Autumn forest landscape',
          auto: 'High Resolution Image File'
        }
      };

      const matchedTitle = titles[currentMode][platform] || titles[currentMode]['auto'];
      const creatorName = platform !== 'auto' ? `@creator_${platform}` : '@web_media';

      // Set Info
      videoTitle.textContent = matchedTitle;
      metaPlatform.textContent = platformLabel;
      metaAuthor.textContent = creatorName;
      
      // Update Graphic icon path & Duration badge visibility
      const config = platformConfigs[currentMode];
      previewMediaTypeIcon.setAttribute('d', config.svgIconPath);
      
      const durationBadge = document.getElementById('video-duration');
      if (currentMode === 'video') {
        const durationStr = platform === 'youtube' ? '14:20' : platform === 'tiktok' ? '00:15' : '01:05';
        durationBadge.textContent = durationStr;
        durationBadge.style.display = 'block';
      } else {
        durationBadge.style.display = 'none'; // Images don't have duration
      }

      // Set platform colors on results card
      resultsCard.style.setProperty('--platform-accent', platformColors[platform].accent);
      resultsCard.style.setProperty('--platform-glow', platformColors[platform].glow);
      
      // Set preview SVG highlight
      const previewSvg = resultsCard.querySelector('.preview-svg');
      previewSvg.style.setProperty('--platform-accent', platformColors[platform].accent);

      // Render tab-specific file downloads
      renderFormatOptions(currentMode);
      
      // Reveal results card
      resultsCard.hidden = false;
      resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      showToast('Media details extracted successfully!');
    }, 1500);
  });

  // 5. Simulated Downloader Loops
  function startMockDownload(qualityName, extension) {
    resetProgress();

    // Disable all options while download runs
    const optionBtns = optionsListContainer.querySelectorAll('.download-option-btn');
    optionBtns.forEach(b => b.disabled = true);
    
    progressContainer.hidden = false;
    progressContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    let percent = 0;
    const fileLabel = `${qualityName} (${extension})`;
    progressStatus.textContent = `Connecting to server...`;
    
    showToast(`Download started for ${fileLabel}`, 'success');

    activeDownloadInterval = setInterval(() => {
      percent += Math.floor(Math.random() * 5) + 3;

      if (percent >= 100) {
        percent = 100;
        clearInterval(activeDownloadInterval);
        activeDownloadInterval = null;
        
        progressPercent.textContent = '100%';
        progressBarFill.style.width = '100%';
        progressStatus.textContent = 'Assembly complete!';
        
        setTimeout(() => {
          showToast(`Success! Your ${fileLabel} file has been saved to your device.`, 'success');
          optionBtns.forEach(b => b.disabled = false);
          progressContainer.hidden = true;
        }, 800);
      } else {
        if (percent > 10 && percent < 90) {
          progressStatus.textContent = `Downloading ${fileLabel}... ${percent}%`;
        } else if (percent >= 90) {
          progressStatus.textContent = `Wrapping up file packaging...`;
        }
        progressPercent.textContent = `${percent}%`;
        progressBarFill.style.width = `${percent}%`;
      }
    }, 90);
  }

  cancelDownloadBtn.addEventListener('click', () => {
    resetProgress();
    showToast('Download canceled', 'error');
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
    
    const optionBtns = optionsListContainer.querySelectorAll('.download-option-btn');
    optionBtns.forEach(b => b.disabled = false);
  }
});
