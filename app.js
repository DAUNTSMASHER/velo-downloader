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
  const tabBulk = document.getElementById('tab-bulk');
  const singleModeArea = document.getElementById('single-mode-area');
  const downloaderHeading = document.getElementById('downloader-heading');
  const inputFloatingLabel = document.getElementById('input-floating-label');
  const platformButtons = document.querySelectorAll('.platform-btn');
  
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

  // Review Modal DOM Elements
  const reviewModalOverlay = document.getElementById('review-modal-overlay');
  const btnCloseReviewModal = document.getElementById('btn-close-review-modal');
  const reviewForm = document.getElementById('review-form');
  const starSelectBtns = document.querySelectorAll('.star-select-btn');
  const selectedStarsVal = document.getElementById('selected-stars-val');
  const reviewNameInput = document.getElementById('review-name');
  const reviewCommentInput = document.getElementById('review-comment');

  // Reviews List DOM Elements
  const reviewsList = document.getElementById('reviews-list');
  const avgRatingValue = document.getElementById('avg-rating-value');
  const avgRatingStars = document.getElementById('avg-rating-stars');
  const totalReviewsCount = document.getElementById('total-reviews-count');
  
  const toastContainer = document.getElementById('toast-container');

  // Bulk Mode DOM Elements
  const bulkSection = document.getElementById('bulk-section');
  const bulkError = document.getElementById('bulk-error');
  const bulkResultsContainer = document.getElementById('bulk-results-container');

  // App State
  let currentMode = 'video';
  let currentPlatform = 'auto';
  let activeDownloadInterval = null;
  let isBulkDownload = false;
  let bulkDownloadItems = [];
  let savedMode = 'video';

  // Review Gating State
  let pendingDownloadQuality = null;
  let pendingDownloadExt = null;
  let currentRatingSelection = 5;
  let lastInputUrl = '';

  // Helpers: YouTube ID extraction, file size formatting, HEAD request
  function extractYouTubeVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.+v=([a-zA-Z0-9_-]{11})/
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  }

  function formatFileSize(bytes) {
    if (bytes == null || isNaN(bytes)) return null;
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  async function fetchRealFileSize(url) {
    try {
      const resp = await fetch(url, { method: 'HEAD', mode: 'cors' });
      const len = resp.headers.get('content-length');
      return len ? parseInt(len, 10) : null;
    } catch {
      return null;
    }
  }

  async function fetchYouTubeOEmbed(videoId) {
    try {
      const resp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }

  let pendingRealDownloadUrl = null;
  let pendingDownloadSourceUrl = '';

  // Thumbnail display helper
  function setVideoThumbnail(src) {
    const img = document.getElementById('video-thumbnail');
    const svg = document.querySelector('.preview-svg');
    if (src) {
      img.src = src;
      img.hidden = false;
      svg.style.display = 'none';
    } else {
      img.hidden = true;
      svg.style.display = 'block';
    }
  }

  // Local Review Data Array for dynamic rendering and SEO
  const reviewsData = [
    {
      name: 'Sarah Jenkins',
      rating: 5,
      date: 'July 11, 2026',
      comment: 'Absolutely love VeloDownloader! Downloaded a 1080p YouTube video in literally 3 seconds. The interface is super clean and minimal, no annoying popup ads like other sites. Highly recommended!'
    },
    {
      name: 'Alex Rivera',
      rating: 5,
      date: 'July 10, 2026',
      comment: 'Works perfectly for Instagram Reels and TikTok videos without watermarks. Switched to the image downloader tab and got high-resolution PNG photos instantly too. Great utility page!'
    },
    {
      name: 'David Kim',
      rating: 4,
      date: 'July 08, 2026',
      comment: 'Very solid and quick. I use it to grab background clips and audio MP3 formats. It requires a 5-second review to download but considering it is totally free and safe, it is totally worth it.'
    }
  ];

  // Configuration Templates
  const platformConfigs = {
    video: {
      heading: 'Paste Video URL to Download',
      floatingLabel: 'Paste YouTube, Instagram, TikTok, or Facebook video link...',
      btnText: 'Download Video',
      optionsTitle: 'Available Video Formats',
      formats: [
        { label: '1080p Full HD', ext: 'MP4', detail: 'Full HD video stream', quality: '1080p' },
        { label: '720p HD Quality', ext: 'MP4', detail: 'HD quality video stream', quality: '720p' },
        { label: 'Audio Extract', ext: 'MP3', detail: 'High quality audio', quality: 'mp3' }
      ],
      svgIconPath: 'M65,30 L105,45 L65,60 Z'
    },
    image: {
      heading: 'Paste Image URL to Download',
      floatingLabel: 'Paste Instagram, TikTok, Facebook, or YouTube image/thumbnail link...',
      btnText: 'Download Image',
      optionsTitle: 'Available Image Resolutions',
      formats: [
        { label: 'Original Resolution', ext: 'PNG', detail: 'Lossless quality', quality: 'original' },
        { label: 'High Quality', ext: 'JPG', detail: 'Optimized quality', quality: 'high' },
        { label: 'WebP Compressed', ext: 'WEBP', detail: 'Compressed format', quality: 'webp' }
      ],
      svgIconPath: 'M50 25 h20 v20 h-20 z M40 65 l20 -20 l15 15 l20 -30 l25 35 z'
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
        b.classList.add('active');
      } else if (b.dataset.platform !== 'auto') {
        b.classList.remove('active');
      }
    });

    return detected;
  }

  // 3. Tab Switching Logic
  function switchMode(newMode) {
    if (currentMode === newMode) return;
    if (currentMode !== 'bulk') savedMode = currentMode;
    currentMode = newMode;

    // Reset active tab
    tabVideo.classList.remove('active');
    tabVideo.setAttribute('aria-selected', 'false');
    tabImage.classList.remove('active');
    tabImage.setAttribute('aria-selected', 'false');
    tabBulk.classList.remove('active');
    tabBulk.setAttribute('aria-selected', 'false');

    if (newMode === 'video') {
      tabVideo.classList.add('active');
      tabVideo.setAttribute('aria-selected', 'true');
    } else if (newMode === 'image') {
      tabImage.classList.add('active');
      tabImage.setAttribute('aria-selected', 'true');
    } else {
      tabBulk.classList.add('active');
      tabBulk.setAttribute('aria-selected', 'true');
    }

    const isSingleMode = newMode === 'video' || newMode === 'image';
    singleModeArea.hidden = !isSingleMode;
    bulkSection.hidden = isSingleMode;

    if (isSingleMode) {
      const config = platformConfigs[newMode];
      downloaderHeading.textContent = config.heading;
      fetchBtnText.textContent = config.btnText;

      urlInput.value = '';
      urlError.hidden = true;
      urlInput.classList.remove('invalid');
      resultsCard.hidden = true;
      resetProgress();
      
      currentPlatform = 'auto';
      applyPlatformTheme('auto');
      platformButtons.forEach(b => b.classList.remove('active'));
      document.getElementById('btn-auto').classList.add('active');
    } else {
      downloaderHeading.textContent = 'Bulk Download (Max 5 URLs)';
      resetBulk();
    }
  }

  tabVideo.addEventListener('click', () => switchMode('video'));
  tabImage.addEventListener('click', () => switchMode('image'));
  tabBulk.addEventListener('click', () => switchMode('bulk'));

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

  urlInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      detectPlatform(val);
    } else {
      applyPlatformTheme('auto');
      platformButtons.forEach(b => b.classList.remove('active'));
      document.getElementById('btn-auto').classList.add('active');
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
    platformButtons.forEach(b => b.classList.remove('active'));
    document.getElementById('btn-auto').classList.add('active');
    resultsCard.hidden = true;
    resetProgress();
  });

  const BACKEND = "https://velo-downloader-production.up.railway.app";

  // Get metadata from Railway (returns JSON)
  async function fetchFromCobalt(payload) {
    const res = await fetch(BACKEND + "/info", {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) throw new Error(`Server HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.url) throw new Error('No URL in response');
    return data;
  }

  // Download: Railway POST proxies the file — fetch as blob, then download
  async function fetchAndDownloadCobalt(inputUrl, quality) {
    try {
      const isAudio = quality === 'audio';
      const payload = {
        url: inputUrl,
        videoQuality: isAudio ? '1080' : (quality || '1080'),
        ...(isAudio ? { audioOnly: true } : {})
      };

      const response = await fetch(BACKEND + "/download", {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(300000)
      });

      const contentType = response.headers.get('content-type') || '';

      // Read JSON error body even on non-ok status
      if (!response.ok || contentType.includes('application/json')) {
        let errMsg = `Server HTTP ${response.status}`;
        try { const errData = await response.json(); errMsg = errData.error || errData.detail || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error("Download returned empty file (0 bytes)");

      const objUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      const filename = filenameMatch ? filenameMatch[1].replace(/['"]/g, '') : 'download';

      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      const errEl = document.getElementById('download-error');
      const errText = document.getElementById('download-error-text');
      errText.textContent = `Download failed: ${err.name || 'Error'}: ${err.message}`;
      errEl.hidden = false;
    }
  }

  // Render download option lists
  function renderFormatOptions(mode, realVideoUrl, originalInputUrl, realSizes) {
    const config = platformConfigs[mode];
    optionsTitleTxt.textContent = config.optionsTitle;
    optionsListContainer.innerHTML = '';

    config.formats.forEach(f => {
      const realSize = realSizes && realSizes[f.quality];
      const sizeStr = realSize ? formatFileSize(realSize) : null;
      const detail = sizeStr ? `${f.ext} • ${sizeStr}` : `${f.ext} • ${f.detail}`;
      const row = document.createElement('div');
      row.className = 'option-row';
      row.innerHTML = `
        <div class="option-info">
          <span class="option-quality">${f.label}</span>
          <span class="option-details">${detail}</span>
        </div>
        <button class="download-option-btn" data-quality="${f.quality}" data-ext="${f.ext}">
          Download
        </button>
      `;
      optionsListContainer.appendChild(row);
    });

    // Intercept download button and trigger the review modal!
    optionsListContainer.querySelectorAll('.download-option-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const qualityName = btn.closest('.option-row').querySelector('.option-quality').textContent;
        const extension = btn.dataset.ext;
        
        // Reset real download reference
        pendingRealDownloadUrl = null;

        pendingRealDownloadUrl = originalInputUrl;
        
        // Save pending download info and prompt review modal
        pendingDownloadQuality = qualityName;
        pendingDownloadExt = extension;
        openReviewModal();
      });
    });
  }

  // 4. Submit URL & Analysis
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let url = urlInput.value.trim();

    if (!url) return;

    lastInputUrl = url;

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
      urlInput.value = url;
    }

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

    fetchBtn.disabled = true;
    fetchBtn.classList.add('loading');
    fetchBtnText.textContent = 'Analyzing...';
    fetchBtnText.style.opacity = '0.3';
    fetchBtnLoader.hidden = false;
    urlError.hidden = true;
    urlInput.classList.remove('invalid');
    resultsCard.hidden = true;
    resetProgress();

    // ---- Step 1: Fetch YouTube oEmbed metadata (fast, always works) ----
    const videoId = extractYouTubeVideoId(url);
    let oembedData = null;
    if (videoId) {
      oembedData = await fetchYouTubeOEmbed(videoId);
    }

    // Show the platform accent immediately
    resultsCard.style.setProperty('--platform-accent', platformColors[platform].accent);
    resultsCard.style.setProperty('--platform-glow', platformColors[platform].glow);

    if (oembedData) {
      videoTitle.textContent = oembedData.title;
      metaPlatform.textContent = platformLabel;
      metaAuthor.textContent = oembedData.author_name;
      setVideoThumbnail(oembedData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
    } else {
      videoTitle.textContent = `Extracted ${platformLabel} Content`;
      metaPlatform.textContent = platformLabel;
      metaAuthor.textContent = platform !== 'auto' ? `@creator_${platform}` : '@web_media';
      if (videoId) {
        setVideoThumbnail(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
      }
    }

    const config = platformConfigs[currentMode];
    previewMediaTypeIcon.setAttribute('d', config.svgIconPath);

    const durationBadge = document.getElementById('video-duration');
    if (currentMode === 'video') {
      durationBadge.textContent = 'HD';
      durationBadge.style.display = 'block';
    } else {
      durationBadge.style.display = 'none';
    }

    const previewSvg = resultsCard.querySelector('.preview-svg');
    if (previewSvg) previewSvg.style.setProperty('--platform-accent', platformColors[platform].accent);

    // Show oEmbed metadata immediately, then fetch download URL
    resultsCard.hidden = false;
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // ---- Step 2: Fetch real download URL from Cobalt ----
    let realDownloadUrl = null;
    let realSizes = {};
    const errEl = document.getElementById('download-error');
    const errText = document.getElementById('download-error-text');
    errEl.hidden = true;
    // Download URL will be fetched fresh at download time

    renderFormatOptions(currentMode, realDownloadUrl, url, realSizes);
    fetchBtn.disabled = false;
    fetchBtn.classList.remove('loading');
    fetchBtnText.textContent = 'Fetch';
    fetchBtnText.style.opacity = '1';
    fetchBtnLoader.hidden = true;
  });

  // 4b. Bulk Download Mode
  const bulkInputsContainer = document.getElementById('bulk-inputs');
  const bulkAddBtn = document.getElementById('btn-bulk-add');
  const bulkAddHint = document.getElementById('bulk-add-hint');
  const bulkAnalyzeAllBtn = document.getElementById('btn-bulk-analyze-all');
  const bulkDownloadAllBtn = document.getElementById('btn-bulk-download-all');

  // Store results per row: { url, oembedData, cobaltData, downloadUrl, title, author }
  let bulkResults = [];

  function resetBulk() {
    bulkInputsContainer.innerHTML = '';
    bulkResultsContainer.innerHTML = '';
    bulkError.hidden = true;
    bulkAnalyzeAllBtn.hidden = true;
    bulkDownloadAllBtn.hidden = true;
    bulkResults = [];
    addBulkRow(0);
  }

  function addBulkRow(index) {
    const row = document.createElement('div');
    row.className = 'bulk-input-row';
    row.dataset.index = index;
    row.innerHTML = `
      <div class="input-group">
        <input type="text" class="url-input bulk-url-input" placeholder="Paste URL ${index + 1}" autocomplete="off">
      </div>
      <span class="bulk-row-status" id="bulk-status-${index}"></span>
    `;
    bulkInputsContainer.appendChild(row);

    const input = row.querySelector('.bulk-url-input');

    // Auto-analyze on Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        analyzeBulkRow(index);
      }
    });

    updateAddButton();
    updateActionButtons();
  }

  function removeExtraRows() {
    const rows = bulkInputsContainer.querySelectorAll('.bulk-input-row');
    if (rows.length > 5) {
      for (let i = 5; i < rows.length; i++) {
        rows[i].remove();
      }
    }
  }

  function updateAddButton() {
    const count = bulkInputsContainer.querySelectorAll('.bulk-input-row').length;
    bulkAddBtn.hidden = count >= 5;
    bulkAddHint.hidden = count >= 5;
  }

  function updateActionButtons() {
    const rows = bulkInputsContainer.querySelectorAll('.bulk-input-row');
    const hasAny = rows.length > 0;
    const hasUnanalyzed = Array.from(rows).some(r => !r.dataset.analyzed);
    bulkAnalyzeAllBtn.hidden = !(hasAny && hasUnanalyzed);
    // Download All button visibility is managed separately
  }

  bulkAddBtn.addEventListener('click', () => {
    const rows = bulkInputsContainer.querySelectorAll('.bulk-input-row');
    if (rows.length >= 5) return;
    addBulkRow(rows.length);
  });

  async function analyzeBulkRow(index) {
    const row = bulkInputsContainer.querySelector(`.bulk-input-row[data-index="${index}"]`);
    if (!row) return;
    const input = row.querySelector('.bulk-url-input');
    const statusEl = document.getElementById(`bulk-status-${index}`);

    let url = input.value.trim();
    if (!url) return;

    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    input.value = url;

    statusEl.textContent = 'Analyzing...';
    statusEl.className = 'bulk-row-status loading';

    let oembedData = null;
    let cobaltData = null;
    let downloadUrl = null;
    let title = 'Unknown';
    let author = '';

    try {
      new URL(url);
    } catch {
      statusEl.textContent = 'Invalid URL';
      statusEl.className = 'bulk-row-status error';
      return;
    }

    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      oembedData = await fetchYouTubeOEmbed(videoId);
    }

    try {
      cobaltData = await fetchFromCobalt({ url, videoQuality: "1080" });
      downloadUrl = cobaltData.url;
    } catch { /* cobalt failed */ }

    if (oembedData) {
      title = oembedData.title;
      author = oembedData.author_name;
    } else if (cobaltData) {
      title = (cobaltData.filename || "Extracted Media").replace(/\.[^/.]+$/, "");
    }

    row.dataset.analyzed = 'true';
    bulkResults[index] = { url, oembedData, cobaltData, downloadUrl, title, author };

    // Show result card
    const thumbHtml = oembedData && oembedData.thumbnail_url
      ? `<img src="${oembedData.thumbnail_url}" alt="">`
      : '';
    const platformLabel = oembedData ? 'YouTube' : (cobaltData ? 'Media' : 'Unknown');
    const metaText = author ? `${platformLabel} • ${author}` : platformLabel;

    const card = document.createElement('div');
    card.className = 'bulk-result-card';
    card.id = `bulk-result-card-${index}`;
    card.innerHTML = `
      <div class="bulk-result-body">
        <div class="bulk-result-thumb">${thumbHtml}</div>
        <div class="bulk-result-info">
          <div class="bulk-result-title">${title}</div>
          <div class="bulk-result-meta">${metaText}</div>
          <div class="bulk-result-options" id="bulk-options-${index}"></div>
        </div>
      </div>
    `;
    bulkResultsContainer.appendChild(card);
    card.hidden = false;

    // Render download options
    const optionsEl = document.getElementById(`bulk-options-${index}`);
    const config = platformConfigs[savedMode];
    config.formats.forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'download-option-btn';
      btn.textContent = `Download ${f.label}`;
      btn.addEventListener('click', () => {
        pendingDownloadQuality = f.quality;
        pendingDownloadExt = f.ext;
        pendingRealDownloadUrl = downloadUrl;
        openReviewModal();
      });
      optionsEl.appendChild(btn);
    });

    statusEl.textContent = 'Ready';
    statusEl.className = 'bulk-row-status done';
    input.disabled = true;

    updateActionButtons();
    updateDownloadAllButton();

    showToast(`URL ${index + 1}: ${title}`, 'success');
  }

  function updateDownloadAllButton() {
    const ready = bulkResults.filter(r => r && r.url).length;
    bulkDownloadAllBtn.hidden = ready === 0;
    bulkDownloadAllBtn.querySelector('span').textContent = `Download All (${ready})`;
  }

  // Analyze All button
  bulkAnalyzeAllBtn.addEventListener('click', () => {
    const rows = bulkInputsContainer.querySelectorAll('.bulk-input-row:not([data-analyzed])');
    rows.forEach(row => {
      const index = parseInt(row.dataset.index);
      analyzeBulkRow(index);
    });
  });

  // Download All button
  bulkDownloadAllBtn.addEventListener('click', () => {
    const ready = bulkResults.filter(r => r && r.url);
    if (ready.length === 0) return;

    pendingDownloadQuality = 'Bulk';
    pendingDownloadExt = 'Bulk';
    pendingRealDownloadUrl = null;
    isBulkDownload = true;
    bulkDownloadItems = ready.slice();
    openReviewModal();
  });

  // Initialize with one row
  addBulkRow(0);

  // 5. Review Gating Modal Logic
  function openReviewModal() {
    // Reset Form fields
    reviewNameInput.value = '';
    reviewCommentInput.value = '';
    setStarSelection(5); // Default to 5 stars
    
    // Show Modal
    reviewModalOverlay.classList.add('active');
    reviewNameInput.focus();
  }

  function closeReviewModal() {
    reviewModalOverlay.classList.remove('active');
    // Reset bulk download state if modal closed without submitting
    if (isBulkDownload) {
      isBulkDownload = false;
      bulkDownloadItems = [];
    }
  }

  btnCloseReviewModal.addEventListener('click', () => {
    closeReviewModal();
    showToast('Download locked. Review submission is required to fetch files.', 'error');
  });

  // Star Selection Visual Handlers
  function setStarSelection(rating) {
    currentRatingSelection = rating;
    selectedStarsVal.value = rating;
    
    starSelectBtns.forEach(btn => {
      const val = parseInt(btn.dataset.value);
      if (val <= rating) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  starSelectBtns.forEach(btn => {
    // Handle Hover Highlighting
    btn.addEventListener('mouseover', () => {
      const val = parseInt(btn.dataset.value);
      starSelectBtns.forEach(b => {
        const itemVal = parseInt(b.dataset.value);
        if (itemVal <= val) {
          b.classList.add('hover');
        } else {
          b.classList.remove('hover');
        }
      });
    });

    btn.addEventListener('mouseout', () => {
      starSelectBtns.forEach(b => b.classList.remove('hover'));
    });

    // Handle Selection Lock
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.value);
      setStarSelection(val);
    });
  });

  // Handle Review Form Submission
  reviewForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = reviewNameInput.value.trim();
    const comment = reviewCommentInput.value.trim();
    const rating = currentRatingSelection;

    if (!name || !comment || !rating) return;

    // Create Review Object
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', dateOptions);
    const newReview = {
      name: name,
      rating: rating,
      date: today,
      comment: comment
    };

    // Prepend to array
    reviewsData.unshift(newReview);
    
    // Render reviews list
    renderReviews();
    
    // Close Modal and proceed with download
    closeReviewModal();
    showToast('Review submitted! Starting your download...', 'success');
    
    // Trigger download
    if (isBulkDownload && bulkDownloadItems.length > 0) {
      const items = bulkDownloadItems.slice();
      isBulkDownload = false;
      bulkDownloadItems = [];
      showToast(`Review submitted! Starting ${items.length} downloads...`, 'success');
      items.forEach((r, i) => {
        setTimeout(() => {
          if (r.downloadUrl) {
            const ext = r.downloadUrl.match(/\.(\w+)(?:\?|$)/)?.[1] || 'mp4';
            const label = (r.title || `Bulk_${i + 1}`).substring(0, 60).replace(/[^a-z0-9]/gi, '_');
            downloadViaBlob(r.downloadUrl, `${label}.${ext}`);
          } else {
            downloadBulkFallback(r, i);
          }
        }, i * 600);
      });
    } else if (pendingDownloadQuality && pendingDownloadExt) {
      startMockDownload(pendingDownloadQuality, pendingDownloadExt, pendingRealDownloadUrl);
    }
  });

  // 6. Dynamic Reviews Rendering and SEO Scoring Calculations
  function renderReviews() {
    reviewsList.innerHTML = '';
    let totalStars = 0;
    
    reviewsData.forEach(r => {
      totalStars += r.rating;
      
      const avatarLetter = r.name.charAt(0).toUpperCase();
      const starsStr = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      
      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        <div class="review-card-header">
          <div class="review-card-user">
            <div class="review-user-avatar">${avatarLetter}</div>
            <div>
              <span class="review-user-name">${r.name}</span>
            </div>
          </div>
          <div class="review-card-rating">
            <span class="review-stars">${starsStr}</span>
            <span class="review-date">${r.date}</span>
          </div>
        </div>
        <p class="review-card-comment">"${r.comment}"</p>
      `;
      reviewsList.appendChild(card);
    });

    // Calculate Average
    const avgScore = (totalStars / reviewsData.length).toFixed(1);
    avgRatingValue.textContent = avgScore;
    totalReviewsCount.textContent = (1250 + reviewsData.length).toLocaleString(); // Simulate base stats

    // Update Average Stars Display
    const roundedScore = Math.round(parseFloat(avgScore));
    avgRatingStars.textContent = '★'.repeat(roundedScore) + '☆'.repeat(5 - roundedScore);
  }

  // 7. Fallback — open thumbnail or original source URL
  function triggerActualDeviceDownload(qualityName, extension) {
    const ext = extension.toLowerCase();
    const isImage = ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';

    if (isImage) {
      const thumb = document.getElementById('video-thumbnail');
      const src = thumb && !thumb.hidden ? thumb.src : null;
      if (src) { window.open(src, '_blank'); return; }
    }
    window.open(lastInputUrl, '_blank');
  }

  // 8. Download handler for same-origin blob/data URLs
  function downloadViaBlob(url, filename) {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }

  // Fallback for bulk items without a real download URL
  function downloadBulkFallback(item, index) {
    if (item.oembedData && item.oembedData.thumbnail_url) {
      window.open(item.oembedData.thumbnail_url, '_blank');
      return;
    }
    window.open(item.url, '_blank');
  }

  function startMockDownload(qualityName, extension, realDownloadUrl) {
    resetProgress();

    const optionBtns = optionsListContainer.querySelectorAll('.download-option-btn');
    optionBtns.forEach(b => b.disabled = true);
    
    progressContainer.hidden = false;
    progressContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    let percent = 0;
    const fileLabel = `${qualityName} (${extension})`;
    progressStatus.textContent = `Connecting to server...`;

    if (realDownloadUrl) {
      const qMap = { 'MP3': 'audio', 'MP4': '1080', 'WEBM': '1080', 'JPG': '1080', 'PNG': '1080' };
      fetchAndDownloadCobalt(realDownloadUrl, qMap[extension] || '1080');
    } else {
      triggerActualDeviceDownload(qualityName, extension);
    }

    activeDownloadInterval = setInterval(() => {
      percent += Math.floor(Math.random() * 12) + 6;

      if (percent >= 100) {
        percent = 100;
        clearInterval(activeDownloadInterval);
        activeDownloadInterval = null;
        
        progressPercent.textContent = '100%';
        progressBarFill.style.width = '100%';
        progressStatus.textContent = 'Saving file...';
        
        setTimeout(() => {
          showToast(`Success! Your ${fileLabel} file has been saved to your device.`, 'success');
          optionBtns.forEach(b => b.disabled = false);
          progressContainer.hidden = true;
          
          pendingDownloadQuality = null;
          pendingDownloadExt = null;
          pendingRealDownloadUrl = null;
        }, 600);
      } else {
        if (percent > 10 && percent < 90) {
          progressStatus.textContent = `Downloading ${fileLabel}... ${percent}%`;
        } else if (percent >= 90) {
          progressStatus.textContent = `Wrapping up file packaging...`;
        }
        progressPercent.textContent = `${percent}%`;
        progressBarFill.style.width = `${percent}%`;
      }
    }, 60);
  }

  cancelDownloadBtn.addEventListener('click', () => {
    resetProgress();
    showToast('Download canceled', 'error');
    pendingDownloadQuality = null;
    pendingDownloadExt = null;
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

  // Run initial ratings display
  renderReviews();
});
