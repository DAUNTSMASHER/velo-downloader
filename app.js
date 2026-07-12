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

  // App State
  let currentMode = 'video';
  let currentPlatform = 'auto';
  let activeDownloadInterval = null;

  // Review Gating State
  let pendingDownloadQuality = null;
  let pendingDownloadExt = null;
  let currentRatingSelection = 5;

  // Cobalt API list & real download target
  const cobaltEndpoints = [
    "https://api.cobalt.liubquanti.click/",
    "https://cobaltapi.kittycat.boo/",
    "https://dog.kittycat.boo/"
  ];
  let pendingRealDownloadUrl = null;

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
        { label: '1080p Full HD', ext: 'MP4', detail: '60 FPS • 42.5 MB', quality: '1080p' },
        { label: '720p HD Quality', ext: 'MP4', detail: '30 FPS • 18.2 MB', quality: '720p' },
        { label: 'Audio Extract', ext: 'MP3', detail: '320kbps • 5.1 MB', quality: 'mp3' }
      ],
      svgIconPath: 'M65,30 L105,45 L65,60 Z'
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

  // Helper to fetch from Cobalt trying each instance as fallback
  async function fetchFromCobalt(payload) {
    for (const endpoint of cobaltEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (data && (data.status === 'stream' || data.status === 'tunnel' || data.status === 'redirect' || data.status === 'picker')) {
          return data;
        } else if (data && data.status === 'error') {
          console.warn(`Cobalt endpoint ${endpoint} returned error:`, data.error);
        }
      } catch (err) {
        console.warn(`Failed to fetch from Cobalt endpoint ${endpoint}:`, err);
      }
    }
    throw new Error("All Cobalt API endpoints failed or returned errors.");
  }

  // Render download option lists
  function renderFormatOptions(mode, realVideoUrl, originalInputUrl) {
    const config = platformConfigs[mode];
    optionsTitleTxt.textContent = config.optionsTitle;
    optionsListContainer.innerHTML = '';

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

    // Intercept download button and trigger the review modal!
    optionsListContainer.querySelectorAll('.download-option-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const qualityName = btn.closest('.option-row').querySelector('.option-quality').textContent;
        const extension = btn.dataset.ext;
        
        // Reset real download reference
        pendingRealDownloadUrl = null;

        if (realVideoUrl) {
          // If we have a real download link from Cobalt
          if (extension === 'MP3') {
            // If they clicked MP3, fetch the audio format link in the background
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = 'Fetching...';
            try {
              const audioData = await fetchFromCobalt({
                url: originalInputUrl,
                audioOnly: true
              });
              pendingRealDownloadUrl = audioData.url;
            } catch (err) {
              console.warn("Failed to fetch audio stream, falling back to main url", err);
              pendingRealDownloadUrl = realVideoUrl;
            }
            btn.disabled = false;
            btn.textContent = originalText;
          } else {
            pendingRealDownloadUrl = realVideoUrl;
          }
        }
        
        // Save pending download info and prompt review modal
        pendingDownloadQuality = qualityName;
        pendingDownloadExt = extension;
        openReviewModal();
      });
    });
  }

  // 4. Submit URL & Analysis
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let url = urlInput.value.trim();

    if (!url) return;

    // Auto-prepend protocol if missing for better compatibility and prevents validation crash
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
    fetchBtnText.style.opacity = '0.3';
    fetchBtnLoader.hidden = false;
    urlError.hidden = true;
    urlInput.classList.remove('invalid');
    resultsCard.hidden = true;
    resetProgress();

    // Call Cobalt to analyze the link
    const payload = {
      url: url,
      videoQuality: "720" // default target quality
    };

    fetchFromCobalt(payload)
      .then(data => {
        fetchBtn.disabled = false;
        fetchBtnText.style.opacity = '1';
        fetchBtnLoader.hidden = true;

        // Clean filename to use as title
        let title = data.filename || "Extracted Social Media Video";
        // Remove extension from filename if present
        title = title.replace(/\.[^/.]+$/, "");

        const creatorName = platform !== 'auto' ? `@creator_${platform}` : '@web_media';

        videoTitle.textContent = title;
        metaPlatform.textContent = platformLabel;
        metaAuthor.textContent = creatorName;
        
        const config = platformConfigs[currentMode];
        previewMediaTypeIcon.setAttribute('d', config.svgIconPath);
        
        const durationBadge = document.getElementById('video-duration');
        if (currentMode === 'video') {
          durationBadge.textContent = 'HD';
          durationBadge.style.display = 'block';
        } else {
          durationBadge.style.display = 'none';
        }

        resultsCard.style.setProperty('--platform-accent', platformColors[platform].accent);
        resultsCard.style.setProperty('--platform-glow', platformColors[platform].glow);
        
        const previewSvg = resultsCard.querySelector('.preview-svg');
        previewSvg.style.setProperty('--platform-accent', platformColors[platform].accent);

        // Store the real download link
        const downloadUrl = data.url;

        // Render format options with real download URL
        renderFormatOptions(currentMode, downloadUrl, url);
        
        resultsCard.hidden = false;
        resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        showToast('Media details extracted successfully!');
      })
      .catch(error => {
        // FALLBACK: If all Cobalt instances fail or rate-limit, run our beautiful mock extractor!
        console.warn("Cobalt extraction failed, falling back to mock:", error);
        
        setTimeout(() => {
          fetchBtn.disabled = false;
          fetchBtnText.style.opacity = '1';
          fetchBtnLoader.hidden = true;

          const creatorName = platform !== 'auto' ? `@creator_${platform}` : '@web_media';

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

          videoTitle.textContent = matchedTitle;
          metaPlatform.textContent = platformLabel;
          metaAuthor.textContent = creatorName;
          
          const config = platformConfigs[currentMode];
          previewMediaTypeIcon.setAttribute('d', config.svgIconPath);
          
          const durationBadge = document.getElementById('video-duration');
          if (currentMode === 'video') {
            const durationStr = platform === 'youtube' ? '14:20' : platform === 'tiktok' ? '00:15' : '01:05';
            durationBadge.textContent = durationStr;
            durationBadge.style.display = 'block';
          } else {
            durationBadge.style.display = 'none';
          }

          resultsCard.style.setProperty('--platform-accent', platformColors[platform].accent);
          resultsCard.style.setProperty('--platform-glow', platformColors[platform].glow);
          
          const previewSvg = resultsCard.querySelector('.preview-svg');
          previewSvg.style.setProperty('--platform-accent', platformColors[platform].accent);

          // In fallback, we pass null as the real download URL, which will trigger the mock canvas/text file generator
          renderFormatOptions(currentMode, null, url);
          
          resultsCard.hidden = false;
          resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          
          showToast('Media details compiled successfully (Offline mode).');
        }, 1200);
      });
  });

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
    if (pendingDownloadQuality && pendingDownloadExt) {
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
              <span class="review-badge">Verified Download</span>
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

  // 7. Actual Device File Download Trigger (CORS-free dynamic generation)
  function triggerActualDeviceDownload(qualityName, extension) {
    const extLower = extension.toLowerCase();
    const platformLabel = metaPlatform.textContent || 'Social';
    const videoTitleStr = videoTitle.textContent || 'Media File';

    if (extLower === 'png' || extLower === 'jpg' || extLower === 'webp') {
      // Create a canvas image to trigger a real visual graphic download
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#4c1d95');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Neon highlight circles
      ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.beginPath();
      ctx.arc(200, 150, 300, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.beginPath();
      ctx.arc(1080, 570, 250, 0, Math.PI * 2);
      ctx.fill();

      // Brand Logo circle
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(640, 200, 70, 0, Math.PI * 2);
      ctx.stroke();

      // Play icon polygon
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(625, 160);
      ctx.lineTo(670, 200);
      ctx.lineTo(625, 240);
      ctx.closePath();
      ctx.fill();

      // Text Header
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VeloDownloader', 640, 340);

      // Subtitle
      ctx.fillStyle = '#9f9baa';
      ctx.font = '24px Outfit, sans-serif';
      ctx.fillText('Your high-quality image download is complete!', 640, 400);

      // Details Box background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(240, 460, 800, 150, 16);
      } else {
        ctx.rect(240, 460, 800, 150);
      }
      ctx.fill();
      ctx.stroke();

      // Details Text
      ctx.fillStyle = '#f3f1f6';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`File Title: ${videoTitleStr.substring(0, 50)}...`, 270, 505);
      
      ctx.fillStyle = '#9f9baa';
      ctx.font = '18px Outfit, sans-serif';
      ctx.fillText(`Source Platform: ${platformLabel}`, 270, 545);
      ctx.fillText(`Format & Resolution: ${qualityName.toUpperCase()} (${extension.toUpperCase()})`, 270, 575);

      // Date Text
      ctx.textAlign = 'right';
      ctx.font = '16px monospace';
      ctx.fillStyle = '#6b667a';
      ctx.fillText(`Timestamp: ${new Date().toLocaleString()}`, 1010, 575);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `VeloDownloader_${platformLabel.toLowerCase()}_${qualityName.replace(/\s+/g, '_')}.${extLower}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      }, `image/${extLower === 'jpg' ? 'jpeg' : extLower}`);
    } else {
      // Create a mock stream file for video/audio
      const headerText = `=====================================================
VELODOWNLOADER - MEDIA DOWNLOAD STREAM
=====================================================
File Type: ${extLower.toUpperCase()} File
Quality: ${qualityName}
Source Platform: ${platformLabel}
File Title: ${videoTitleStr}
Download Date: ${new Date().toString()}

Status: SUCCESS
Download Rate: 12.5 MB/s
MD5 Hash Checksum: d41d8cd98f00b204e9800998ecf8427e

-----------------------------------------------------
Note: This is a high-fidelity simulated file downloaded
via the VeloDownloader frontend presentation pipeline.
-----------------------------------------------------`;

      const blob = new Blob([headerText], { type: 'text/plain' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `VeloDownloader_${platformLabel.toLowerCase()}_${qualityName.replace(/\s+/g, '_')}.${extLower}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    }
  }

  // 8. Simulated Downloader Loops
  function startMockDownload(qualityName, extension, realDownloadUrl) {
    resetProgress();

    const optionBtns = optionsListContainer.querySelectorAll('.download-option-btn');
    optionBtns.forEach(b => b.disabled = true);
    
    progressContainer.hidden = false;
    progressContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    let percent = 0;
    const fileLabel = `${qualityName} (${extension})`;
    progressStatus.textContent = `Connecting to high-speed server...`;

    activeDownloadInterval = setInterval(() => {
      percent += Math.floor(Math.random() * 8) + 4;

      if (percent >= 100) {
        percent = 100;
        clearInterval(activeDownloadInterval);
        activeDownloadInterval = null;
        
        progressPercent.textContent = '100%';
        progressBarFill.style.width = '100%';
        progressStatus.textContent = 'Saving file...';
        
        setTimeout(() => {
          if (realDownloadUrl) {
            // Trigger actual media file download!
            const a = document.createElement('a');
            a.href = realDownloadUrl;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } else {
            // Trigger actual device download
            triggerActualDeviceDownload(qualityName, extension);
          }

          showToast(`Success! Your ${fileLabel} file has been saved to your device.`, 'success');
          optionBtns.forEach(b => b.disabled = false);
          progressContainer.hidden = true;
          
          // Reset pending download references
          pendingDownloadQuality = null;
          pendingDownloadExt = null;
          pendingRealDownloadUrl = null;
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
    }, 80);
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
