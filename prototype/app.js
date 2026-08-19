/* ==========================================================================
   RIL Hub - Application JS Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Current user state
    const currentUser = {
        name: 'Sarah Jenkins',
        avatar: 'assets/avatar_sarah.png',
        title: 'Lead Frontend Developer'
    };

    // DOM Elements
    const postsList = document.getElementById('posts-list');
    const searchInput = document.getElementById('search-input');
    
    // Main composer components
    const postTextarea = document.getElementById('post-textarea');
    const btnSubmitPost = document.getElementById('btn-submit-post');
    const btnAddPhoto = document.getElementById('btn-add-photo');
    const btnAddMood = document.getElementById('btn-add-mood');
    const btnAddTag = document.getElementById('btn-add-tag');

    // Modals
    const composerModal = document.getElementById('composer-modal');
    const modalPostTextarea = document.getElementById('modal-post-textarea');
    const modalBtnSubmit = document.getElementById('modal-btn-submit');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const sidebarCreatePostBtn = document.getElementById('sidebar-create-post-btn');
    const modalBtnAddPhoto = document.getElementById('modal-btn-add-photo');
    const modalBtnAddTag = document.getElementById('modal-btn-add-tag');
    const modalMediaPreview = document.getElementById('modal-media-preview');
    const mediaPreviewImg = document.getElementById('media-preview-img');
    const btnRemoveMedia = document.getElementById('btn-remove-media');
    const modalTagSelector = document.getElementById('modal-tag-selector');
    const postTagsInput = document.getElementById('post-tags-input');

    // Wishes modal
    const wishesModal = document.getElementById('wishes-modal');
    const btnSendWishes = document.getElementById('btn-send-wishes');
    const wishesCloseBtn = document.getElementById('wishes-close-btn');
    const wishesCancelBtn = document.getElementById('wishes-cancel-btn');
    const wishesSendBtn = document.getElementById('wishes-send-btn');
    const customWishText = document.getElementById('custom-wish-text');
    const wishPresets = document.querySelectorAll('.wish-preset');

    // Active filter toast
    const activeFilterToast = document.getElementById('active-filter-toast');
    const filterText = document.getElementById('filter-text');
    const clearFilterBtn = document.getElementById('clear-filter-btn');

    // Notifications
    const notificationTrigger = document.getElementById('notification-trigger');

    // Mock images list for users uploading a photo
    const mockPostImages = [
        'assets/dashboard_preview.png'
    ];
    let selectedMockImage = null;

    /* ==========================================================================
       1. Helper functions
       ========================================================================== */

    // Create Toast notification
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-notice`;
        toast.textContent = message;
        if (type === 'error') {
            toast.style.background = 'rgba(239, 68, 68, 0.95)';
        }
        document.body.appendChild(toast);
        
        // Trigger reflow
        toast.offsetHeight;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 350);
        }, 3000);
    }

    // Dynamic textarea height
    function autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    /* ==========================================================================
       2. Interaction Logic (Likes, Comments, Bookmarks)
       ========================================================================== */

    // Handle all clicks inside the dynamic posts list (event delegation)
    postsList.addEventListener('click', (e) => {
        // Like Button
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            const isLiked = likeBtn.getAttribute('data-liked') === 'true';
            let count = parseInt(likeBtn.getAttribute('data-count'), 10);
            
            if (isLiked) {
                count--;
                likeBtn.setAttribute('data-liked', 'false');
            } else {
                count++;
                likeBtn.setAttribute('data-liked', 'true');
                // Trigger tiny pop scale animation
                likeBtn.querySelector('svg').style.transform = 'scale(1.3)';
                setTimeout(() => {
                    likeBtn.querySelector('svg').style.transform = '';
                }, 200);
            }
            likeBtn.setAttribute('data-count', count);
            likeBtn.querySelector('.like-count').textContent = count;
            return;
        }

        // Bookmark Button
        const bookmarkBtn = e.target.closest('.bookmark-btn');
        if (bookmarkBtn) {
            const isBookmarked = bookmarkBtn.getAttribute('data-bookmarked') === 'true';
            if (isBookmarked) {
                bookmarkBtn.setAttribute('data-bookmarked', 'false');
                showToast('Removed from bookmarks');
            } else {
                bookmarkBtn.setAttribute('data-bookmarked', 'true');
                showToast('Post saved to bookmarks! 🔖');
            }
            return;
        }

        // Comment Toggle Button
        const commentBtn = e.target.closest('.comment-btn');
        if (commentBtn) {
            const postCard = commentBtn.closest('.card-post');
            const commentsSection = postCard.querySelector('.comments-section');
            commentsSection.classList.toggle('hidden');
            if (!commentsSection.classList.contains('hidden')) {
                commentsSection.querySelector('.comment-input').focus();
            }
            return;
        }

        // Add Comment (Reply button)
        const sendCommentBtn = e.target.closest('.btn-send-comment');
        if (sendCommentBtn) {
            const postCard = sendCommentBtn.closest('.card-post');
            const commentInput = postCard.querySelector('.comment-input');
            const commentText = commentInput.value.trim();
            
            if (commentText) {
                addCommentToPost(postCard, commentText);
                commentInput.value = '';
            }
            return;
        }

        // Option ellipsis dropdown
        const optionsBtn = e.target.closest('.post-options-btn');
        if (optionsBtn) {
            showToast('Post option menu under construction ⚙️');
            return;
        }
    });

    // Add Comment item
    function addCommentToPost(postCard, text) {
        const commentList = postCard.querySelector('.comments-list');
        const commentCountEl = postCard.querySelector('.comment-count');
        const currentCount = parseInt(postCard.querySelector('.comment-btn').getAttribute('data-count') || 0, 10);
        
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        commentItem.innerHTML = `
            <img src="${currentUser.avatar}" alt="${currentUser.name}" class="user-avatar-sm">
            <div class="comment-bubble">
                <div class="comment-author-name">${currentUser.name}</div>
                <div class="comment-text">${escapeHtml(text)}</div>
            </div>
        `;
        
        commentList.appendChild(commentItem);
        
        // Update Count
        const newCount = currentCount + 1;
        postCard.querySelector('.comment-btn').setAttribute('data-count', newCount);
        commentCountEl.textContent = newCount;
        
        showToast('Comment posted!');
    }

    // Share Button actions (needs event delegation too, or simple click handlers)
    postsList.addEventListener('click', (e) => {
        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
            let count = parseInt(shareBtn.getAttribute('data-count') || 0, 10);
            count++;
            shareBtn.setAttribute('data-count', count);
            shareBtn.querySelector('.share-count').textContent = count;
            
            // Clipboard simulation
            navigator.clipboard.writeText(window.location.href)
                .then(() => {
                    showToast('Link copied to clipboard! 🔗');
                })
                .catch(() => {
                    showToast('Post shared! 🚀');
                });
        }
    });

    // Escape HTML to prevent basic XSS when prepending posts
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    /* ==========================================================================
       3. Post Creation Logic
       ========================================================================== */

    // Listeners for Composer Textarea
    postTextarea.addEventListener('input', () => {
        autoResizeTextarea(postTextarea);
        btnSubmitPost.disabled = postTextarea.value.trim().length === 0;
    });

    // Handle inline composer submitting
    btnSubmitPost.addEventListener('click', () => {
        const text = postTextarea.value.trim();
        if (text) {
            createNewPost(text);
            postTextarea.value = '';
            btnSubmitPost.disabled = true;
            postTextarea.style.height = 'auto';
        }
    });

    // Create New Post Structure
    function createNewPost(text, imageSrc = null, tagString = '') {
        const tags = tagString.split(',')
            .map(t => t.trim().replace(/#/g, ''))
            .filter(t => t.length > 0);
        
        const tagAttributes = tags.join(', ');
        const tagsHTML = tags.map(tag => `<span class="trend-tag">#${tag}</span>`).join(' ');

        // Format tags dataset attribute
        const datasetTags = tags.length > 0 ? tags.join(',') : 'general';

        const postArticle = document.createElement('article');
        postArticle.className = 'card card-post';
        postArticle.setAttribute('data-tags', datasetTags);
        postArticle.setAttribute('data-author', currentUser.name);

        let imageHTML = '';
        if (imageSrc) {
            imageHTML = `
                <div class="post-image-container">
                    <img src="${imageSrc}" alt="Post uploaded image" class="post-image">
                </div>
            `;
        }

        postArticle.innerHTML = `
            <div class="post-header">
                <div class="post-author-info">
                    <img src="${currentUser.avatar}" alt="${currentUser.name}" class="user-avatar">
                    <div>
                        <h4 class="author-name">${currentUser.name}</h4>
                        <p class="post-time">Just now • ${currentUser.title}</p>
                    </div>
                </div>
                <button class="post-options-btn" aria-label="Post Options">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                </button>
            </div>
            
            <div class="post-content">
                <p class="post-text">${escapeHtml(text)}</p>
                ${tags.length > 0 ? `<p class="post-tags" style="margin-top: 8px; color: var(--accent-blue); font-size: 13px; font-weight: 500;">${tagsHTML}</p>` : ''}
                ${imageHTML}
            </div>
            
            <div class="post-footer">
                <div class="footer-actions-left">
                    <button class="post-action-btn like-btn" data-liked="false" data-count="0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="heart-icon">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span class="like-count">0</span>
                    </button>
                    <button class="post-action-btn comment-btn" data-count="0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        <span class="comment-count">0</span>
                    </button>
                    <button class="post-action-btn share-btn" data-count="0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                        <span class="share-count">0</span>
                    </button>
                </div>
                <button class="post-action-btn bookmark-btn" data-bookmarked="false" aria-label="Bookmark post">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
            </div>

            <!-- Comment Section -->
            <div class="comments-section hidden">
                <div class="comment-composer">
                    <img src="${currentUser.avatar}" alt="Sarah" class="user-avatar-sm">
                    <input type="text" placeholder="Write a comment..." class="comment-input">
                    <button class="btn-send-comment">Reply</button>
                </div>
                <div class="comments-list"></div>
            </div>
        `;

        // Prepend to list with standard entry transition
        postsList.insertBefore(postArticle, postsList.firstChild);
        showToast('Successfully published your post! 🚀');
    }

    // Opening composer modal from buttons
    function openComposerModal() {
        composerModal.classList.remove('hidden');
        modalPostTextarea.focus();
        // Copy whatever text was already written in the main card
        if (postTextarea.value.trim()) {
            modalPostTextarea.value = postTextarea.value;
            autoResizeTextarea(modalPostTextarea);
            modalBtnSubmit.disabled = false;
        }
    }

    sidebarCreatePostBtn.addEventListener('click', openComposerModal);
    
    // Inline composer actions can also trigger the modal for advanced uploads
    btnAddPhoto.addEventListener('click', () => {
        openComposerModal();
        addMockPhotoToModal();
    });
    
    btnAddTag.addEventListener('click', () => {
        openComposerModal();
        modalTagSelector.classList.remove('hidden');
        postTagsInput.focus();
    });

    btnAddMood.addEventListener('click', () => {
        openComposerModal();
        // Insert smiley
        modalPostTextarea.value += ' 😊';
        modalBtnSubmit.disabled = false;
    });

    // Close Modal
    function closeComposerModal() {
        composerModal.classList.add('hidden');
        modalPostTextarea.value = '';
        modalTagSelector.classList.add('hidden');
        postTagsInput.value = '';
        removeModalPhoto();
        modalBtnSubmit.disabled = true;
    }

    modalCloseBtn.addEventListener('click', closeComposerModal);
    
    // Close modal by clicking overlay
    composerModal.addEventListener('click', (e) => {
        if (e.target === composerModal) {
            closeComposerModal();
        }
    });

    // Modal Input Listeners
    modalPostTextarea.addEventListener('input', () => {
        autoResizeTextarea(modalPostTextarea);
        modalBtnSubmit.disabled = modalPostTextarea.value.trim().length === 0;
    });

    // Modal Actions
    function addMockPhotoToModal() {
        selectedMockImage = mockPostImages[Math.floor(Math.random() * mockPostImages.length)];
        mediaPreviewImg.src = selectedMockImage;
        modalMediaPreview.classList.remove('hidden');
        showToast('Image attached!');
    }

    modalBtnAddPhoto.addEventListener('click', addMockPhotoToModal);
    
    modalBtnAddTag.addEventListener('click', () => {
        modalTagSelector.classList.toggle('hidden');
        if (!modalTagSelector.classList.contains('hidden')) {
            postTagsInput.focus();
        }
    });

    function removeModalPhoto() {
        selectedMockImage = null;
        mediaPreviewImg.src = '';
        modalMediaPreview.classList.add('hidden');
    }

    btnRemoveMedia.addEventListener('click', removeModalPhoto);

    // Modal Publish
    modalBtnSubmit.addEventListener('click', () => {
        const text = modalPostTextarea.value.trim();
        if (text) {
            createNewPost(text, selectedMockImage, postTagsInput.value);
            closeComposerModal();
            postTextarea.value = '';
            btnSubmitPost.disabled = true;
        }
    });

    /* ==========================================================================
       4. Search and Filtering Logic
       ========================================================================== */

    function filterPosts(query) {
        query = query.trim().toLowerCase();
        const posts = postsList.querySelectorAll('.card-post');
        
        let hasTagSearch = query.startsWith('#');
        let searchTag = hasTagSearch ? query.substring(1) : '';

        posts.forEach(post => {
            const author = post.getAttribute('data-author').toLowerCase();
            const text = post.querySelector('.post-text').textContent.toLowerCase();
            const tags = post.getAttribute('data-tags').toLowerCase().split(',');

            let match = false;
            
            if (hasTagSearch) {
                match = tags.some(t => t.trim().includes(searchTag));
            } else {
                match = author.includes(query) || 
                        text.includes(query) || 
                        tags.some(t => t.trim().includes(query));
            }

            if (match || query === '') {
                post.style.display = '';
                post.style.animation = 'slideInUp 0.3s ease both';
            } else {
                post.style.display = 'none';
            }
        });

        // Show/Hide filter toast
        if (query) {
            filterText.textContent = query;
            activeFilterToast.classList.remove('hidden');
        } else {
            activeFilterToast.classList.add('hidden');
        }
    }

    // Search Input Listener
    searchInput.addEventListener('input', (e) => {
        filterPosts(e.target.value);
    });

    // Clear filter toast
    clearFilterBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterPosts('');
    });

    // Click trending hashtags
    document.querySelector('.trending-list').addEventListener('click', (e) => {
        const trendingItem = e.target.closest('.trending-item');
        if (trendingItem) {
            const tag = trendingItem.getAttribute('data-tag');
            searchInput.value = `#${tag}`;
            filterPosts(`#${tag}`);
            
            // Auto scroll to feed
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    });

    /* ==========================================================================
       5. Celebrations & Birthday Wishes (Confetti Engine)
       ========================================================================== */

    btnSendWishes.addEventListener('click', () => {
        wishesModal.classList.remove('hidden');
    });

    wishesCloseBtn.addEventListener('click', () => {
        wishesModal.classList.add('hidden');
    });

    wishesCancelBtn.addEventListener('click', () => {
        wishesModal.classList.add('hidden');
    });

    // Option Presets Selection
    wishPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            wishPresets.forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
            customWishText.value = ''; // clear custom
        });
    });

    customWishText.addEventListener('input', () => {
        if (customWishText.value.trim()) {
            wishPresets.forEach(p => p.classList.remove('active'));
        }
    });

    // Send Wishes Event
    wishesSendBtn.addEventListener('click', () => {
        wishesModal.classList.add('hidden');
        
        let message = '';
        const activePreset = document.querySelector('.wish-preset.active');
        if (activePreset) {
            message = activePreset.getAttribute('data-message');
        } else {
            message = customWishText.value.trim();
        }

        if (!message) {
            message = "Happy Birthday from the RIL Hub community! 🎉🎂";
        }

        // Trigger Confetti Effect
        triggerConfettiRain();
        
        // Show Success Toast
        showToast("Birthday wishes dispatched successfully! 🎂✨");
        
        // Clear wishes form
        customWishText.value = '';
        wishPresets.forEach((p, idx) => {
            if (idx === 0) p.classList.add('active');
            else p.classList.remove('active');
        });
    });

    // Confetti particles generator
    function triggerConfettiRain() {
        const colors = ['#1e75ff', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];
        const confettiCount = 120;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // Random styling variables
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.floor(Math.random() * 8) + 6; // 6px - 14px
            const leftPos = Math.random() * 100; // 0vw to 100vw
            const animationDelay = Math.random() * 1.5; // 0s to 1.5s
            const animationDuration = Math.random() * 1.5 + 1.5; // 1.5s to 3.0s

            confetti.style.background = color;
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            confetti.style.left = `${leftPos}vw`;
            confetti.style.top = `-20px`;
            confetti.style.animationDelay = `${animationDelay}s`;
            confetti.style.animationDuration = `${animationDuration}s`;
            
            // Random border radius shape
            if (Math.random() > 0.5) {
                confetti.style.borderRadius = '50%';
            } else if (Math.random() > 0.5) {
                confetti.style.transform = 'skewY(20deg)';
            }

            document.body.appendChild(confetti);

            // Cleanup
            setTimeout(() => {
                confetti.remove();
            }, (animationDelay + animationDuration) * 1000);
        }
    }

    /* ==========================================================================
       6. Additional Micro-interactions
       ========================================================================== */

    // Notification bell interactions
    notificationTrigger.addEventListener('click', () => {
        const badge = notificationTrigger.querySelector('.notification-badge');
        if (badge) {
            badge.style.transform = 'scale(0)';
            setTimeout(() => {
                badge.remove();
            }, 300);
            showToast('You are all caught up! 🔔');
        } else {
            showToast('No new notifications');
        }
    });

    // Side navigation active link shifts
    const sidebarMenu = document.querySelector('.sidebar-menu');
    sidebarMenu.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.menu-item');
        if (menuItem) {
            e.preventDefault();
            sidebarMenu.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
            menuItem.classList.add('active');
            
            const filterType = menuItem.getAttribute('data-filter');
            if (filterType === 'trending') {
                searchInput.value = '';
                filterPosts('');
                showToast('Viewing trending posts list');
            } else if (filterType === 'celebrations') {
                // Focus on Celebrations
                const widgetCel = document.querySelector('.card-celebrations');
                widgetCel.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                widgetCel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    widgetCel.style.borderColor = '';
                }, 1500);
            } else if (filterType === 'engagement') {
                // Focus chart
                const widgetEng = document.querySelector('.card-engagement');
                widgetEng.style.borderColor = 'rgba(30, 117, 255, 0.4)';
                widgetEng.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    widgetEng.style.borderColor = '';
                }, 1500);
            } else if (filterType === 'settings') {
                showToast('Settings pane opened (simulation) ⚙️');
            }
        }
    });

    // Header tabs active click simulation
    const headerTabs = document.querySelector('.header-nav');
    headerTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.nav-tab');
        if (tab) {
            e.preventDefault();
            headerTabs.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabName = tab.getAttribute('data-tab');
            showToast(`Navigated to ${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        }
    });

    // Animate engagement bars on load
    const chartBars = document.querySelectorAll('.chart-bar');
    chartBars.forEach((bar, index) => {
        const targetHeight = bar.style.getPropertyValue('--height');
        bar.style.height = '0%';
        setTimeout(() => {
            bar.style.height = targetHeight;
        }, index * 80); // staggered entry
    });
});
