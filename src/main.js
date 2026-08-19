// Kids Matcher Main Controller
import { gameData } from './data.js';
import { playPop, playCorrect, playIncorrect, playFanfare, speakText, setSoundEnabled, isSoundEnabled } from './audio.js';
import { startConfetti, stopConfetti } from './confetti.js';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

// Google AdMob Configuration
// Keys are loaded from the .env file at build time via Vite's import.meta.env.
// Copy .env.example → .env and fill in your real values. Never commit .env.
const ADMOB_CONFIG = {
  // Loaded from VITE_ADMOB_APP_ID in .env
  appId: import.meta.env.VITE_ADMOB_APP_ID,

  // Loaded from VITE_ADMOB_BANNER_ID in .env
  bannerAdId: import.meta.env.VITE_ADMOB_BANNER_ID,

  // Loaded from VITE_ADMOB_IS_TESTING in .env — set to "false" in production
  isTesting: import.meta.env.VITE_ADMOB_IS_TESTING === 'true',
};

// Game State
let state = {
  stars: parseInt(localStorage.getItem('kid_matcher_stars')) || 0,
  currentMode: 'shadow',
  roundIndex: 0,
  matchedCount: 0,
  activePairsCount: 0,
  roundItems: [],
  soundActive: true
};

// DOM Elements Cache
const elements = {
  btnBack: document.getElementById('btn-back'),
  gameTitle: document.getElementById('game-title'),
  btnSound: document.getElementById('btn-sound'),
  iconSoundOn: document.getElementById('icon-sound-on'),
  iconSoundOff: document.getElementById('icon-sound-off'),
  starCount: document.getElementById('star-count'),
  screenHome: document.getElementById('screen-home'),
  screenGame: document.getElementById('screen-game'),
  gameProgress: document.getElementById('game-progress'),
  gameLevelText: document.getElementById('game-level-text'),
  sourceContainer: document.getElementById('source-container'),
  targetContainer: document.getElementById('target-container'),
  rewardModal: document.getElementById('reward-modal'),
  rewardTitle: document.getElementById('reward-title'),
  rewardSubtitle: document.getElementById('reward-subtitle'),
  btnModalHome: document.getElementById('btn-modal-home'),
  btnModalNext: document.getElementById('btn-modal-next'),
  categoryCards: document.querySelectorAll('.category-card')
};

// Pointer Drag Tracking
let dragInfo = {
  card: null,
  startX: 0,
  startY: 0,
  origX: 0,
  origY: 0,
  currentHoveredTarget: null
};

// Helper: Shuffle Array (Fisher-Yates)
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Initialise Application
function init() {
  // Load stars count in HUD
  elements.starCount.textContent = state.stars;

  // Bind Event Listeners
  elements.btnBack.addEventListener('click', goHome);
  elements.btnSound.addEventListener('click', toggleSound);
  
  elements.categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      startNewGameMode(mode);
    });
  });

  elements.btnModalHome.addEventListener('click', () => {
    elements.rewardModal.classList.add('hidden');
    goHome();
  });

  elements.btnModalNext.addEventListener('click', () => {
    elements.rewardModal.classList.add('hidden');
    nextRound();
  });

  // Sound context activator on click
  document.body.addEventListener('click', () => {
    // Empty trigger to start AudioContext on iOS/Android WebViews
  }, { once: true });

  // Developer Test Cheat: Triple tap/click title to auto-solve for verification
  let titleClicks = 0;
  elements.gameTitle.addEventListener('click', () => {
    titleClicks++;
    if (titleClicks >= 3) {
      titleClicks = 0;
      autoSolveRound();
    }
    setTimeout(() => { titleClicks = 0; }, 1500);
  });

  // Initialize AdMob and load bottom banner ad
  initAdMob();
}

// Navigation: Go back to category list
function goHome() {
  playPop();
  stopConfetti();
  elements.screenGame.classList.add('hidden');
  elements.screenHome.classList.remove('hidden');
  elements.btnBack.classList.add('hidden');
  elements.gameTitle.textContent = "Kids Matcher!";
}

// Toggle sound and speech
function toggleSound() {
  state.soundActive = !state.soundActive;
  setSoundEnabled(state.soundActive);
  playPop();
  
  if (state.soundActive) {
    elements.btnSound.classList.add('active');
    elements.iconSoundOn.classList.remove('hidden');
    elements.iconSoundOff.classList.add('hidden');
  } else {
    elements.btnSound.classList.remove('active');
    elements.iconSoundOn.classList.add('hidden');
    elements.iconSoundOff.classList.remove('hidden');
  }
}

// Load chosen game mode
function startNewGameMode(mode) {
  playPop();
  state.currentMode = mode;
  // Load saved level index for this mode (default to 0 if not found)
  state.roundIndex = parseInt(localStorage.getItem(`kid_matcher_level_${mode}`)) || 0;
  
  elements.screenHome.classList.add('hidden');
  elements.screenGame.classList.remove('hidden');
  elements.btnBack.classList.remove('hidden');
  
  setupRound();
}

// Generate the game board for current round
function setupRound() {
  // Clear containers
  elements.sourceContainer.innerHTML = '';
  elements.targetContainer.innerHTML = '';
  
  // Flatten all items in the current mode to form a full pool
  let fullPool = [];
  const modeCategories = gameData[state.currentMode];
  modeCategories.forEach(cat => {
    fullPool.push(...cat.items);
  });
  
  // Select items with unique matchValues to prevent duplicate matching values in the same round
  const selectedItems = [];
  const selectedMatches = new Set();
  const shuffledPool = shuffle(fullPool);
  
  for (const item of shuffledPool) {
    if (!selectedMatches.has(item.matchValue)) {
      selectedItems.push(item);
      selectedMatches.add(item.matchValue);
      if (selectedItems.length === 5) {
        break;
      }
    }
  }
  
  state.roundItems = selectedItems;
  
  // Custom theme labels based on current mode
  let title = "Find the Match! 🔍";
  if (state.currentMode === 'shadow') title = "Shadow Match! 👥";
  if (state.currentMode === 'word') title = "Word Match! 📝";
  if (state.currentMode === 'alphabet') title = "ABC Match! 🔤";
  if (state.currentMode === 'count') title = "Count Match! 🔢";
  
  elements.gameTitle.textContent = title;
  elements.gameLevelText.textContent = `Level ${state.roundIndex + 1}`;
  
  state.matchedCount = 0;
  state.activePairsCount = state.roundItems.length;
  elements.gameProgress.style.width = '0%';
  
  // Shuffle left (Sources) and right (Targets) columns separately so they aren't lined up
  const sources = shuffle(state.roundItems);
  const targets = shuffle(state.roundItems);
  
  // Render source column (Draggable items)
  sources.forEach(item => {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.id = `src-${item.id}`;
    card.dataset.match = item.matchValue;
    card.dataset.id = item.id;
    card.dataset.text = item.text;
    
    if (state.currentMode === 'alphabet') {
      card.classList.add('text-only');
      card.textContent = item.display;
    } else if (state.currentMode === 'count') {
      card.classList.add('count-dots');
      // Render counts as collections of smaller emojis
      card.textContent = item.display;
    } else {
      // Shadow and Word
      card.textContent = item.display;
    }
    
    // Bind Pointer Events for mobile-optimized dragging
    card.addEventListener('pointerdown', handlePointerDown);
    elements.sourceContainer.appendChild(card);
  });
  
  // Render target column (Drop zones)
  targets.forEach(item => {
    const zone = document.createElement('div');
    zone.className = 'drop-zone';
    zone.dataset.match = item.matchValue;
    zone.id = `target-${item.id}`;
    
    // Create card to display inside target
    const targetCard = document.createElement('div');
    targetCard.className = 'match-card';
    targetCard.dataset.match = item.matchValue;
    
    if (state.currentMode === 'shadow') {
      targetCard.classList.add('silhouette');
      targetCard.textContent = item.display;
    } else if (state.currentMode === 'word') {
      targetCard.classList.add('text-only');
      targetCard.textContent = item.matchValue;
    } else if (state.currentMode === 'alphabet') {
      targetCard.classList.add('text-only');
      targetCard.textContent = item.matchValue; // Lowercase
    } else if (state.currentMode === 'count') {
      targetCard.classList.add('text-only');
      targetCard.textContent = item.matchValue; // Digits (e.g. "3")
    }
    
    zone.appendChild(targetCard);
    elements.targetContainer.appendChild(zone);
  });
}

// Unified Pointer Drag: Start drag
function handlePointerDown(e) {
  if (e.target.classList.contains('match-success')) return;
  e.preventDefault();
  
  const card = e.currentTarget;
  dragInfo.card = card;
  playPop();
  
  // Retrieve initial dimensions
  const rect = card.getBoundingClientRect();
  dragInfo.startX = e.clientX;
  dragInfo.startY = e.clientY;
  dragInfo.origX = rect.left;
  dragInfo.origY = rect.top;
  
  // Apply fixed position dragging styles
  card.style.width = `${rect.width}px`;
  card.style.height = `${rect.height}px`;
  card.style.left = `${rect.left}px`;
  card.style.top = `${rect.top}px`;
  card.classList.add('dragging');
  
  // Bind global pointer listeners
  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerUp);
  
  card.setPointerCapture(e.pointerId);
}

// Unified Pointer Drag: Drag item
function handlePointerMove(e) {
  if (!dragInfo.card) return;
  
  const deltaX = e.clientX - dragInfo.startX;
  const deltaY = e.clientY - dragInfo.startY;
  
  const card = dragInfo.card;
  card.style.left = `${dragInfo.origX + deltaX}px`;
  card.style.top = `${dragInfo.origY + deltaY}px`;
  
  // Detect elements under the current coordinate
  // Temporarily hide the dragged item so elementFromPoint looks beneath it
  card.style.visibility = 'hidden';
  const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
  card.style.visibility = 'visible';
  
  if (!elementBelow) return;
  
  // Find drop zone parent
  const dropZone = elementBelow.closest('.drop-zone');
  
  // If hovering over a dropzone, toggle hover styles
  if (dropZone && !dropZone.querySelector('.match-success')) {
    if (dragInfo.currentHoveredTarget !== dropZone) {
      if (dragInfo.currentHoveredTarget) {
        dragInfo.currentHoveredTarget.classList.remove('hovered');
      }
      dragInfo.currentHoveredTarget = dropZone;
      dropZone.classList.add('hovered');
    }
  } else {
    if (dragInfo.currentHoveredTarget) {
      dragInfo.currentHoveredTarget.classList.remove('hovered');
      dragInfo.currentHoveredTarget = null;
    }
  }
}

// Unified Pointer Drag: Release/Drop item
function handlePointerUp(e) {
  if (!dragInfo.card) return;
  
  const card = dragInfo.card;
  const target = dragInfo.currentHoveredTarget;
  
  // Unbind global event listeners
  document.removeEventListener('pointermove', handlePointerMove);
  document.removeEventListener('pointerup', handlePointerUp);
  
  try {
    card.releasePointerCapture(e.pointerId);
  } catch (err) {}
  
  let matchFound = false;
  
  if (target) {
    target.classList.remove('hovered');
    
    // Check if match value is correct
    if (card.dataset.match === target.dataset.match) {
      matchFound = true;
      handleSuccessfulMatch(card, target);
    }
  }
  
  if (!matchFound) {
    handleIncorrectMatch(card);
  }
  
  // Clear drag data
  dragInfo.card = null;
  dragInfo.currentHoveredTarget = null;
}

// Perform animations and updates for a correct match
function handleSuccessfulMatch(card, targetZone) {
  playCorrect();
  
  // Announce the item name via text to speech
  speakText(card.dataset.text);
  
  // Remove positioning constraints and style as matched
  card.classList.remove('dragging');
  card.removeAttribute('style');
  card.classList.add('match-success');
  
  const targetCard = targetZone.querySelector('.match-card');
  targetCard.classList.add('match-success');
  
  // Move card DOM inside targetZone to snap it into place
  targetZone.innerHTML = '';
  targetZone.appendChild(card);
  
  // Increment matches
  state.matchedCount++;
  
  // Update progress bar
  const progressPercent = (state.matchedCount / state.activePairsCount) * 100;
  elements.gameProgress.style.width = `${progressPercent}%`;
  
  // Check if round is finished
  if (state.matchedCount === state.activePairsCount) {
    setTimeout(handleRoundCompletion, 600);
  }
}

// Snap card back to its original column space if incorrect
function handleIncorrectMatch(card) {
  playIncorrect();
  
  card.classList.remove('dragging');
  // Transition position back to original layout coordinates
  card.style.transition = 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), top 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  card.style.left = `${dragInfo.origX}px`;
  card.style.top = `${dragInfo.origY}px`;
  
  // Clean up inline layout styles after slide transition completes
  setTimeout(() => {
    card.removeAttribute('style');
  }, 320);
}

// Round completion: celebrate and update stars
function handleRoundCompletion() {
  playFanfare();
  startConfetti();
  
  // Add 3 stars
  state.stars += 3;
  localStorage.setItem('kid_matcher_stars', state.stars);
  elements.starCount.textContent = state.stars;
  
  // Show reward modal (Unlimited Levels)
  elements.rewardTitle.textContent = "Super Job! ⭐";
  elements.rewardSubtitle.textContent = `You completed Level ${state.roundIndex + 1}!`;
  elements.btnModalNext.textContent = "Next Level";
  
  elements.rewardModal.classList.remove('hidden');
}

// Progress to the next level/theme
function nextRound() {
  stopConfetti();
  state.roundIndex++;
  // Persist level progress for current game mode in local storage
  localStorage.setItem(`kid_matcher_level_${state.currentMode}`, state.roundIndex);
  setupRound();
}

// Auto-solve matches helper for developer testing
function autoSolveRound() {
  const cards = document.querySelectorAll('.source-column .match-card:not(.match-success)');
  cards.forEach(card => {
    const matchVal = card.dataset.match;
    // Find matching dropzone target that is not yet successfully matched
    const targetZone = Array.from(document.querySelectorAll('.drop-zone')).find(zone => {
      return zone.dataset.match === matchVal && !zone.querySelector('.match-card.match-success');
    });
    if (targetZone) {
      handleSuccessfulMatch(card, targetZone);
    }
  });
}

// Initialize AdMob and show bottom banner ad
async function initAdMob() {
  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      testingDevices: [],
      initializeForTesting: ADMOB_CONFIG.isTesting,
    });
    
    // Show banner ad at the bottom
    await AdMob.showBanner({
      adId: ADMOB_CONFIG.bannerAdId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: ADMOB_CONFIG.isTesting
    });
    console.log("AdMob Banner loaded successfully!");
  } catch (error) {
    console.error("AdMob Error:", error);
  }
}

// Start everything
window.addEventListener('DOMContentLoaded', init);
