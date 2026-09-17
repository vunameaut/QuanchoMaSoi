/**
 * Quản Trò Ma Sói - Ứng Dụng Web SPA (Application Controller)
 * Hỗ trợ đồng thời:
 * 1. Chế độ Chơi Trên 1 Máy (Single-Device / Chuyền Tay)
 * 2. Chế độ Phòng Chơi Đa Thiết Bị (Multi-Device P2P / Mỗi người 1 máy)
 */

(function () {
  'use strict';

  // Role metadata definitions
  const ROLE_META = {
    werewolf: { name: 'Ma Sói', team: 'wolf', icon: '🐺', desc: 'Phe Sói • Thức dậy ban đêm cùng bầy săn mồi' },
    seer: { name: 'Tiên Tri', team: 'villager', icon: '🔮', desc: 'Phe Dân • Soi danh tính phe Sói hay phe Dân' },
    guard: { name: 'Bảo Vệ', team: 'villager', icon: '🛡️', desc: 'Phe Dân • Chọn bảo vệ 1 người không bị cắn' },
    witch: { name: 'Phù Thủy', team: 'villager', icon: '🧪', desc: 'Phe Dân • Sở hữu 1 bình cứu và 1 bình độc' },
    hunter: { name: 'Thợ Săn', team: 'villager', icon: '🏹', desc: 'Phe Dân • Kéo theo 1 kẻ khi hy sinh' },
    villager: { name: 'Dân Làng Thường', team: 'villager', icon: '👨‍🌾', desc: 'Phe Dân • Suy luận và biểu quyết ban ngày' }
  };

  // State Management
  const state = {
    gameMode: 'single', // 'single' | 'multi_host' | 'multi_client'
    playerCount: 6,
    roles: {
      werewolf: 1,
      seer: 1,
      guard: 1,
      witch: 1,
      hunter: 0,
      villager: 2
    },
    players: [], // [{ id, name, role, isAlive, peerKey }]
    currentNight: 1,
    currentPhase: 'setup',
    
    // Pass Role Phase State (Chơi 1 máy)
    passIndex: 0,
    isRandomAssignedMode: false,
    selectedRoleForPass: null,

    // Multi-Device Host & Client State
    connectedClients: [],
    myClientData: {
      id: null,
      name: '',
      role: null,
      isAlive: true
    },

    // Witch Potions State
    witchHealUsed: false,
    witchPoisonUsed: false,

    // Night Actions Choice in Current Night
    nightPicks: {
      protectedPlayerId: null,
      attackedPlayerId: null,
      witchHealed: false,
      witchPoisonedPlayerId: null,
      seerCheckedPlayerId: null
    },

    // Auto Night Sequence State
    isAutoNightRunning: false,
    nightStepInterval: null,

    // Morning Discussion Timer State
    discussionTotalSeconds: 180,
    discussionRemainingSeconds: 180,
    isTimerRunning: false,
    timerInterval: null
  };

  const SAMPLE_NAMES = [
    "Arthur", "Morgana", "Merlin", "Galahad", "Robin", 
    "Elena", "Thorin", "Gwen", "Kaelen", "Freya", 
    "Dorian", "Silvia", "Lancelot", "Cedric", "Rowan"
  ];

  // DOM Elements - Mode Nav
  const modeSingleDeviceBtn = document.getElementById('modeSingleDeviceBtn');
  const modeMultiDeviceBtn = document.getElementById('modeMultiDeviceBtn');
  const setupPhaseEl = document.getElementById('setupPhase');
  const multiDeviceLobbyPhaseEl = document.getElementById('multiDeviceLobbyPhase');
  const passRolePhaseEl = document.getElementById('passRolePhase');
  const gameplayPhaseEl = document.getElementById('gameplayPhase');
  const clientPlayerPhaseEl = document.getElementById('clientPlayerPhase');

  // DOM Elements - Setup Phase (1 Máy)
  const playerCountInput = document.getElementById('playerCountInput');
  const decreasePlayerBtn = document.getElementById('decreasePlayerBtn');
  const increasePlayerBtn = document.getElementById('increasePlayerBtn');
  const playerCountError = document.getElementById('playerCountError');
  const playerNamesList = document.getElementById('playerNamesList');
  const randomizeNamesBtn = document.getElementById('randomizeNamesBtn');
  const autoBalanceRolesBtn = document.getElementById('autoBalanceRolesBtn');
  const totalRolesCountEl = document.getElementById('totalRolesCount');
  const targetPlayerCountEl = document.getElementById('targetPlayerCount');
  const validationWarningEl = document.getElementById('validationWarning');
  const startGameBtn = document.getElementById('startGameBtn');

  // DOM Elements - Multi-Device Lobby
  const tabCreateRoomBtn = document.getElementById('tabCreateRoomBtn');
  const tabJoinRoomBtn = document.getElementById('tabJoinRoomBtn');
  const hostRoomCreationView = document.getElementById('hostRoomCreationView');
  const hostActiveLobbyView = document.getElementById('hostActiveLobbyView');
  const clientJoinRoomView = document.getElementById('clientJoinRoomView');
  
  const hostRoomCodeInput = document.getElementById('hostRoomCodeInput');
  const generateRandomRoomCodeBtn = document.getElementById('generateRandomRoomCodeBtn');
  const enablePasswordCheckbox = document.getElementById('enablePasswordCheckbox');
  const hostPasswordInput = document.getElementById('hostPasswordInput');
  const hostCreateRoomSubmitBtn = document.getElementById('hostCreateRoomSubmitBtn');

  const displayActiveRoomCode = document.getElementById('displayActiveRoomCode');
  const displayRoomPassBadge = document.getElementById('displayRoomPassBadge');
  const roomQrCanvas = document.getElementById('roomQrCanvas');
  const shareRoomLinkInput = document.getElementById('shareRoomLinkInput');
  const copyShareLinkBtn = document.getElementById('copyShareLinkBtn');
  const connectedCountBadge = document.getElementById('connectedCountBadge');
  const connectedPlayersGrid = document.getElementById('connectedPlayersGrid');
  const hostTotalRolesCount = document.getElementById('hostTotalRolesCount');
  const hostConnectedTarget = document.getElementById('hostConnectedTarget');
  const hostRoleValidationMsg = document.getElementById('hostRoleValidationMsg');
  const hostStartGameMultiBtn = document.getElementById('hostStartGameMultiBtn');

  const clientRoomCodeInput = document.getElementById('clientRoomCodeInput');
  const clientPlayerNameInput = document.getElementById('clientPlayerNameInput');
  const clientPasswordInput = document.getElementById('clientPasswordInput');
  const clientJoinRoomSubmitBtn = document.getElementById('clientJoinRoomSubmitBtn');

  // DOM Elements - Client Player View
  const clientAvatarDisplay = document.getElementById('clientAvatarDisplay');
  const clientDisplayName = document.getElementById('clientDisplayName');
  const clientSeatBadge = document.getElementById('clientSeatBadge');
  const clientLifeBadge = document.getElementById('clientLifeBadge');
  const toggleSecretVisibilityBtn = document.getElementById('toggleSecretVisibilityBtn');
  const clientSecretRoleCard = document.getElementById('clientSecretRoleCard');
  const clientRoleIcon = document.getElementById('clientRoleIcon');
  const clientRoleName = document.getElementById('clientRoleName');
  const clientRoleTeam = document.getElementById('clientRoleTeam');
  const clientRoleDesc = document.getElementById('clientRoleDesc');
  const clientTeammatesInfo = document.getElementById('clientTeammatesInfo');
  
  const clientSleepingState = document.getElementById('clientSleepingState');
  const clientWakingState = document.getElementById('clientWakingState');
  const clientWakeTitle = document.getElementById('clientWakeTitle');
  const clientWakeInstruction = document.getElementById('clientWakeInstruction');
  const clientTargetsGrid = document.getElementById('clientTargetsGrid');
  const clientSeerRevealBox = document.getElementById('clientSeerRevealBox');
  const clientSeerTargetName = document.getElementById('clientSeerTargetName');
  const clientSeerVerdict = document.getElementById('clientSeerVerdict');
  const clientWitchBox = document.getElementById('clientWitchBox');
  const clientWitchVictimName = document.getElementById('clientWitchVictimName');
  const clientWitchHealBtn = document.getElementById('clientWitchHealBtn');
  const clientWitchPoisonBtn = document.getElementById('clientWitchPoisonBtn');
  const clientWitchPoisonList = document.getElementById('clientWitchPoisonList');
  const clientConfirmActionBtn = document.getElementById('clientConfirmActionBtn');
  const clientPlayersOverviewList = document.getElementById('clientPlayersOverviewList');

  // DOM Elements - Pass Role Phase (Chơi 1 máy)
  const passProgressCounter = document.getElementById('passProgressCounter');
  const randomAssignAllBtn = document.getElementById('randomAssignAllBtn');
  const passLockScreen = document.getElementById('passLockScreen');
  const lockTargetPlayerName = document.getElementById('lockTargetPlayerName');
  const unlockPassBtn = document.getElementById('unlockPassBtn');
  const passUnlockScreen = document.getElementById('passUnlockScreen');
  const unlockPlayerName = document.getElementById('unlockPlayerName');
  const unlockDescText = document.getElementById('unlockDescText');
  const secretRolesSelectorGrid = document.getElementById('secretRolesSelectorGrid');
  const randomRoleDisplayBox = document.getElementById('randomRoleDisplayBox');
  const randomRoleIcon = document.getElementById('randomRoleIcon');
  const randomRoleName = document.getElementById('randomRoleName');
  const randomRoleDesc = document.getElementById('randomRoleDesc');
  const confirmRolePassBtn = document.getElementById('confirmRolePassBtn');

  // DOM Elements - Gameplay Header & Audio Settings
  const gameHeaderBadges = document.getElementById('gameHeaderBadges');
  const nightCountBadge = document.getElementById('nightCountBadge');
  const aliveCountBadge = document.getElementById('aliveCountBadge');
  const micStatusIndicator = document.getElementById('micStatusIndicator');
  const voiceSelect = document.getElementById('voiceSelect');
  const voicePitchSelect = document.getElementById('voicePitchSelect');
  const ambientTrackSelect = document.getElementById('ambientTrackSelect');
  const ambientVolume = document.getElementById('ambientVolume');
  const ambientToggleBtn = document.getElementById('ambientToggleBtn');
  const ambientLabel = document.getElementById('ambientLabel');
  const speechPauseResumeBtn = document.getElementById('speechPauseResumeBtn');
  const pauseResumeIcon = document.getElementById('pauseResumeIcon');
  const pauseResumeLabel = document.getElementById('pauseResumeLabel');
  const speechStopBtn = document.getElementById('speechStopBtn');
  const soundWaveAnimation = document.getElementById('soundWaveAnimation');
  const liveSubtitle = document.getElementById('liveSubtitle');
  const startAutoNightBtn = document.getElementById('startAutoNightBtn');
  const openMorningTimerBtn = document.getElementById('openMorningTimerBtn');
  const morningRecapBanner = document.getElementById('morningRecapBanner');
  const narrateButtons = document.querySelectorAll('.btn-narrate');

  // DOM Elements - Dashboard & Logs
  const playersDashboardGrid = document.getElementById('playersDashboardGrid');
  const nextNightBtn = document.getElementById('nextNightBtn');
  const resetGameBtn = document.getElementById('resetGameBtn');
  const gameLogContent = document.getElementById('gameLogContent');
  const clearLogBtn = document.getElementById('clearLogBtn');

  // DOM Elements - Night Overlay
  const nightInteractiveOverlay = document.getElementById('nightInteractiveOverlay');
  const nightRoleIcon = document.getElementById('nightRoleIcon');
  const nightRoleTitle = document.getElementById('nightRoleTitle');
  const nightStepTimer = document.getElementById('nightStepTimer');
  const nightInstructionText = document.getElementById('nightInstructionText');
  const nightTargetsGrid = document.getElementById('nightTargetsGrid');
  const seerResultBox = document.getElementById('seerResultBox');
  const seerResultName = document.getElementById('seerResultName');
  const seerResultVerdict = document.getElementById('seerResultVerdict');
  const witchControlsBox = document.getElementById('witchControlsBox');
  const witchVictimName = document.getElementById('witchVictimName');
  const witchHealBtn = document.getElementById('witchHealBtn');
  const witchHealStatus = document.getElementById('witchHealStatus');
  const witchPoisonToggleBtn = document.getElementById('witchPoisonToggleBtn');
  const witchPoisonStatus = document.getElementById('witchPoisonStatus');
  const witchPoisonTargetList = document.getElementById('witchPoisonTargetList');
  const nightConfirmDoneBtn = document.getElementById('nightConfirmDoneBtn');

  // DOM Elements - Fullscreen Discussion Timer
  const morningDiscussionModal = document.getElementById('morningDiscussionModal');
  const fullscreenClockTime = document.getElementById('fullscreenClockTime');
  const clockRingOuter = document.querySelector('.clock-ring-outer');
  const clockPhaseLabel = document.getElementById('clockPhaseLabel');
  const timerPlayPauseBtn = document.getElementById('timerPlayPauseBtn');
  const timerPlayPauseIcon = document.getElementById('timerPlayPauseIcon');
  const timerPlayPauseText = document.getElementById('timerPlayPauseText');
  const timerCloseBtn = document.getElementById('timerCloseBtn');
  const add30SecBtn = document.getElementById('add30SecBtn');
  const presetTimeButtons = document.querySelectorAll('.btn-preset-time[data-minutes]');

  /**
   * Khởi tạo ứng dụng
   */
  function init() {
    setupEventListeners();
    setupAudioCallbacks();
    setupNetworkListeners();
    initVoiceDropdown();
    renderPlayerInputs();
    updateRoleCountersUI();
    validateSetupForm();
    checkUrlQueryParams();
  }

  /**
   * Tự động kiểm tra URL nếu có ?room=XYZ để tự chuyển sang tab Vào Phòng
   */
  function checkUrlQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      switchToMultiDeviceMode();
      showJoinRoomTab();
      clientRoomCodeInput.value = roomParam.toUpperCase();
    }
  }

  function setupNetworkListeners() {
    if (!window.networkManager) return;

    // Khi người chơi mới vào phòng (Host nhận)
    window.networkManager.on('onPlayerJoined', (data) => {
      if (state.gameMode === 'multi_host') {
        renderConnectedPlayersGrid(data.clientsList || []);
        validateHostRolesMulti();
      }
    });

    // Khi người chơi rời phòng (Host nhận)
    window.networkManager.on('onPlayerLeft', () => {
      if (state.gameMode === 'multi_host') {
        const list = Object.values(window.networkManager.clients).map(c => ({ id: c.id, name: c.name }));
        renderConnectedPlayersGrid(list);
        validateHostRolesMulti();
      }
    });

    // Client: Khi được Host chấp thuận vào phòng
    window.networkManager.on('onJoinAccepted', (data) => {
      state.gameMode = 'multi_client';
      state.myClientData.id = data.playerId;
      state.myClientData.name = data.playerName;
      
      multiDeviceLobbyPhaseEl.classList.remove('active-phase');
      clientPlayerPhaseEl.classList.add('active-phase');
      
      clientDisplayName.textContent = data.playerName;
      clientSeatBadge.textContent = `Ghế #${data.playerId}`;
      clientAvatarDisplay.textContent = getAvatarForId(data.playerId);
      
      clientRoleName.textContent = "CHỜ HOST CHIA BÀI...";
      clientRoleDesc.textContent = "Vui lòng giữ điện thoại bên mình, ván chơi sắp bắt đầu!";
    });

    // Client: Khi bị từ chối vào phòng
    window.networkManager.on('onJoinRejected', (data) => {
      alert(`❌ Không thể vào phòng: ${data.reason}`);
    });

    // Client: Khi Host bắt đầu ván chơi và gửi vai trò bí mật
    window.networkManager.on('onGameStarted', (data) => {
      state.myClientData.role = data.role;
      state.myClientData.isAlive = true;
      state.players = data.allPlayers;

      const meta = ROLE_META[data.role];
      clientRoleIcon.textContent = meta.icon;
      clientRoleName.textContent = meta.name.toUpperCase();
      clientRoleTeam.textContent = meta.team === 'wolf' ? 'Phe Sói' : 'Phe Dân';
      clientRoleDesc.textContent = meta.desc;

      if (data.teammates && data.teammates.length > 0) {
        clientTeammatesInfo.style.display = 'block';
        clientTeammatesInfo.textContent = `🐺 Đồng đội Sói của bạn: ${data.teammates.join(', ')}`;
      }

      renderClientPlayersOverview();
    });

    // Client: Nhận tín hiệu ban đêm từ Host
    window.networkManager.on('onNightStepReceived', (stepData) => {
      handleClientNightStep(stepData);
    });

    // Client: Nhận tín hiệu đồng bộ buổi sáng từ Host
    window.networkManager.on('onMorningSyncReceived', (syncData) => {
      handleClientMorningSync(syncData);
    });

    // Host nhận hành động từ Client trong đêm
    window.networkManager.on('onNightActionReceived', (actionData) => {
      handleHostReceivedNightAction(actionData);
    });
  }

  function getAvatarForId(id) {
    const avatars = ['🧑', '👩', '🧔', '👱‍♂️', '👩‍🦰', '👨‍🦱', '👵', '🧓', '👱‍♀️', '🧑‍🦱'];
    return avatars[(id - 1) % avatars.length];
  }

  /**
   * Khởi tạo danh sách Giọng đọc vào Dropdown
   */
  function initVoiceDropdown() {
    const populate = (voices) => {
      if (!voiceSelect) return;
      voiceSelect.innerHTML = '';

      const sorted = [...voices].sort((a, b) => {
        const aVi = a.lang.startsWith('vi');
        const bVi = b.lang.startsWith('vi');
        if (aVi && !bVi) return -1;
        if (!aVi && bVi) return 1;
        return a.name.localeCompare(b.name);
      });

      sorted.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} (${v.lang})${v.lang.startsWith('vi') ? ' ★' : ''}`;
        if (v.lang === 'vi-VN' || v.lang.startsWith('vi')) {
          opt.selected = true;
          if (window.audioManager) window.audioManager.setVoiceByURI(v.voiceURI);
        }
        voiceSelect.appendChild(opt);
      });
    };

    if (window.audioManager) {
      const currentVoices = window.audioManager.getVoices();
      if (currentVoices.length > 0) populate(currentVoices);
    }
    window.onVoicesLoaded = populate;
  }

  function setupAudioCallbacks() {
    if (!window.audioManager) return;

    window.audioManager.registerCallbacks({
      onStart: (text) => {
        micStatusIndicator.classList.add('active');
        soundWaveAnimation.classList.add('speaking');
        liveSubtitle.textContent = `"${text}"`;
        speechPauseResumeBtn.disabled = false;
        speechStopBtn.disabled = false;
        pauseResumeIcon.textContent = '⏸️';
        pauseResumeLabel.textContent = 'Tạm dừng';
      },
      onEnd: () => {
        micStatusIndicator.classList.remove('active');
        soundWaveAnimation.classList.remove('speaking');
        speechPauseResumeBtn.disabled = true;
        speechStopBtn.disabled = true;
        narrateButtons.forEach(btn => btn.classList.remove('active-speaking'));
      },
      onPause: () => {
        soundWaveAnimation.classList.remove('speaking');
        pauseResumeIcon.textContent = '▶️';
        pauseResumeLabel.textContent = 'Tiếp tục';
      },
      onResume: () => {
        soundWaveAnimation.classList.add('speaking');
        pauseResumeIcon.textContent = '⏸️';
        pauseResumeLabel.textContent = 'Tạm dừng';
      },
      onError: () => {
        micStatusIndicator.classList.remove('active');
        soundWaveAnimation.classList.remove('speaking');
        speechPauseResumeBtn.disabled = true;
        speechStopBtn.disabled = true;
      }
    });
  }

  /**
   * Đăng ký Event Listeners
   */
  function setupEventListeners() {
    // 0. Chuyển đổi chế độ Chơi 1 máy <-> Phòng chơi đa thiết bị
    modeSingleDeviceBtn.addEventListener('click', switchToSingleDeviceMode);
    modeMultiDeviceBtn.addEventListener('click', switchToMultiDeviceMode);

    tabCreateRoomBtn.addEventListener('click', showCreateRoomTab);
    tabJoinRoomBtn.addEventListener('click', showJoinRoomTab);

    // Multi-Device: Host tạo phòng
    generateRandomRoomCodeBtn.addEventListener('click', generateRandomRoomCode);
    enablePasswordCheckbox.addEventListener('change', () => {
      hostPasswordInput.style.display = enablePasswordCheckbox.checked ? 'block' : 'none';
      if (!enablePasswordCheckbox.checked) hostPasswordInput.value = '';
    });
    hostCreateRoomSubmitBtn.addEventListener('click', handleHostCreateRoomSubmit);
    copyShareLinkBtn.addEventListener('click', copyShareRoomLink);
    hostStartGameMultiBtn.addEventListener('click', handleHostStartGameMulti);

    // Multi-Device: Client vào phòng
    clientJoinRoomSubmitBtn.addEventListener('click', handleClientJoinRoomSubmit);
    toggleSecretVisibilityBtn.addEventListener('click', toggleClientSecretVisibility);
    clientConfirmActionBtn.addEventListener('click', clientConfirmNightDone);

    // 1. Setup Phase Chơi 1 máy
    playerCountInput.addEventListener('input', () => {
      const val = parseInt(playerCountInput.value, 10);
      handlePlayerCountChange(val);
    });

    decreasePlayerBtn.addEventListener('click', () => {
      let val = parseInt(playerCountInput.value, 10) || 5;
      if (val > 5) {
        val -= 1;
        playerCountInput.value = val;
        handlePlayerCountChange(val);
      }
    });

    increasePlayerBtn.addEventListener('click', () => {
      let val = parseInt(playerCountInput.value, 10) || 5;
      if (val < 30) {
        val += 1;
        playerCountInput.value = val;
        handlePlayerCountChange(val);
      }
    });

    randomizeNamesBtn.addEventListener('click', fillRandomNames);
    autoBalanceRolesBtn.addEventListener('click', autoBalanceRoles);

    document.querySelectorAll('.counter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const role = e.currentTarget.dataset.role;
        const action = e.currentTarget.dataset.action;
        adjustRoleCount(role, action);
      });
    });

    startGameBtn.addEventListener('click', goToPassRolePhase);

    // Chuyền máy đăng ký bí mật (1 máy)
    unlockPassBtn.addEventListener('click', unlockPassScreenForCurrentPlayer);
    confirmRolePassBtn.addEventListener('click', confirmRoleForCurrentPlayer);
    randomAssignAllBtn.addEventListener('click', handleRandomAssignAll);

    // Cài đặt Âm thanh
    voiceSelect.addEventListener('change', () => {
      if (window.audioManager) window.audioManager.setVoiceByURI(voiceSelect.value);
    });

    voicePitchSelect.addEventListener('change', () => {
      if (window.audioManager) window.audioManager.setPitch(voicePitchSelect.value);
    });

    ambientTrackSelect.addEventListener('change', () => {
      if (window.audioManager) window.audioManager.setTrack(ambientTrackSelect.value);
    });

    ambientVolume.addEventListener('input', () => {
      if (window.audioManager) window.audioManager.setVolume(ambientVolume.value);
    });

    ambientToggleBtn.addEventListener('click', () => {
      if (window.audioManager) {
        const isPlaying = window.audioManager.toggleAmbient();
        ambientLabel.textContent = isPlaying ? "Nhạc nền: BẬT" : "Nhạc nền: Tắt";
      }
    });

    speechPauseResumeBtn.addEventListener('click', () => {
      if (window.audioManager) window.audioManager.togglePauseResume();
    });

    speechStopBtn.addEventListener('click', () => {
      if (window.audioManager) {
        window.audioManager.stop();
        liveSubtitle.textContent = "Đã dừng âm thanh.";
      }
    });

    narrateButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        narrateButtons.forEach(b => b.classList.remove('active-speaking'));
        btn.classList.add('active-speaking');

        if (action === 'morning') {
          resolveNightAndAnnounceMorning();
        } else if (window.audioManager) {
          window.audioManager.speakRole(action);
          logGameEvent(`Phát lời thoại: "${btn.querySelector('strong').textContent}"`, 'info');
        }
      });
    });

    startAutoNightBtn.addEventListener('click', runFullAutoNightSequence);

    // Đồng hồ Họp ban ngày
    openMorningTimerBtn.addEventListener('click', () => openDiscussionTimer(state.discussionTotalSeconds));
    timerPlayPauseBtn.addEventListener('click', toggleDiscussionTimer);
    timerCloseBtn.addEventListener('click', closeDiscussionTimer);
    add30SecBtn.addEventListener('click', () => addDiscussionTime(30));

    presetTimeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        presetTimeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mins = parseInt(btn.dataset.minutes, 10);
        state.discussionTotalSeconds = mins * 60;
        resetDiscussionTimer(state.discussionTotalSeconds);
      });
    });

    nextNightBtn.addEventListener('click', nextNight);
    resetGameBtn.addEventListener('click', confirmResetGame);
    clearLogBtn.addEventListener('click', () => {
      gameLogContent.innerHTML = '';
      logGameEvent("Nhật ký đã được xóa.", "info");
    });
  }

  /* ===================================================
     CHUYỂN ĐỔI CHẾ ĐỘ CHƠI (SINGLE VS MULTI)
     =================================================== */
  function switchToSingleDeviceMode() {
    state.gameMode = 'single';
    modeSingleDeviceBtn.classList.add('active');
    modeMultiDeviceBtn.classList.remove('active');

    multiDeviceLobbyPhaseEl.classList.remove('active-phase');
    clientPlayerPhaseEl.classList.remove('active-phase');
    setupPhaseEl.classList.add('active-phase');
  }

  function switchToMultiDeviceMode() {
    state.gameMode = 'multi_host';
    modeMultiDeviceBtn.classList.add('active');
    modeSingleDeviceBtn.classList.remove('active');

    setupPhaseEl.classList.remove('active-phase');
    passRolePhaseEl.classList.remove('active-phase');
    multiDeviceLobbyPhaseEl.classList.add('active-phase');
  }

  function showCreateRoomTab() {
    tabCreateRoomBtn.classList.add('active');
    tabJoinRoomBtn.classList.remove('active');
    hostRoomCreationView.style.display = 'flex';
    clientJoinRoomView.style.display = 'none';
  }

  function showJoinRoomTab() {
    tabJoinRoomBtn.classList.add('active');
    tabCreateRoomBtn.classList.remove('active');
    clientJoinRoomView.style.display = 'flex';
    hostRoomCreationView.style.display = 'none';
  }

  function generateRandomRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SOI';
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    hostRoomCodeInput.value = code;
  }

  /* ===================================================
     MULTI-DEVICE: HOST KHỞI TẠO PHÒNG
     =================================================== */
  async function handleHostCreateRoomSubmit() {
    let roomCode = hostRoomCodeInput.value.trim().toUpperCase();
    if (!roomCode) {
      generateRandomRoomCode();
      roomCode = hostRoomCodeInput.value.trim().toUpperCase();
    }

    const password = hostPasswordInput.value.trim();
    hostCreateRoomSubmitBtn.disabled = true;
    hostCreateRoomSubmitBtn.innerHTML = `<span>⏳ Đang khởi tạo phòng P2P...</span>`;

    try {
      await window.networkManager.createRoom(roomCode, password);
      
      // Chuyển sang Sảnh chờ Host
      hostRoomCreationView.style.display = 'none';
      hostActiveLobbyView.style.display = 'flex';
      displayActiveRoomCode.textContent = roomCode;

      if (password) {
        displayRoomPassBadge.textContent = `🔒 Mật khẩu: ${password}`;
        displayRoomPassBadge.className = 'badge night-badge';
      } else {
        displayRoomPassBadge.textContent = `🔓 Không mật khẩu`;
        displayRoomPassBadge.className = 'badge alive-badge';
      }

      // Tạo link chia sẻ
      const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
      shareRoomLinkInput.value = shareUrl;

      // Sinh mã QR Code
      renderQrCode(shareUrl);

      validateHostRolesMulti();
    } catch (err) {
      alert("Không thể khởi tạo phòng. Vui lòng thử lại mã khác!");
      hostCreateRoomSubmitBtn.disabled = false;
      hostCreateRoomSubmitBtn.innerHTML = `<span>🚀 KHỞI TẠO PHÒNG CHƠI & LẤY MÃ QR</span>`;
    }
  }

  function renderQrCode(url) {
    roomQrCanvas.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(roomQrCanvas, {
          text: url,
          width: 160,
          height: 160,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
        return;
      } catch(e){}
    }
    // Fallback nếu không có QRCode.js
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
    img.alt = "QR Code";
    img.style.width = "160px";
    img.style.height = "160px";
    roomQrCanvas.appendChild(img);
  }

  function copyShareRoomLink() {
    shareRoomLinkInput.select();
    navigator.clipboard.writeText(shareRoomLinkInput.value).then(() => {
      const oldText = copyShareLinkBtn.textContent;
      copyShareLinkBtn.textContent = "✅ Đã sao chép!";
      setTimeout(() => copyShareLinkBtn.textContent = oldText, 2000);
    });
  }

  function renderConnectedPlayersGrid(clients) {
    connectedPlayersGrid.innerHTML = '';
    state.connectedClients = clients;
    connectedCountBadge.textContent = clients.length;
    hostConnectedTarget.textContent = clients.length;

    if (clients.length === 0) {
      connectedPlayersGrid.innerHTML = `<div class="empty-players-hint">Đang chờ người chơi quét mã QR hoặc nhập mã phòng để vào...</div>`;
      return;
    }

    clients.forEach((c, idx) => {
      const chip = document.createElement('div');
      chip.className = 'connected-player-badge';
      chip.innerHTML = `
        <span style="font-size: 1.3rem;">${getAvatarForId(c.id || idx + 1)}</span>
        <div>
          <strong>${c.name}</strong>
          <small style="display:block; opacity: 0.7; font-size: 0.75rem;">Ghế #${c.id || idx + 1}</small>
        </div>
      `;
      connectedPlayersGrid.appendChild(chip);
    });
  }

  function validateHostRolesMulti() {
    const totalRoles = Object.values(state.roles).reduce((a, b) => a + b, 0);
    const playerCount = state.connectedClients.length;
    hostTotalRolesCount.textContent = totalRoles;
    hostConnectedTarget.textContent = playerCount;

    if (playerCount < 5) {
      hostRoleValidationMsg.className = 'validation-message error';
      hostRoleValidationMsg.textContent = `(Cần tối thiểu 5 người chơi để bắt đầu, hiện có ${playerCount})`;
      hostStartGameMultiBtn.disabled = true;
      return;
    }

    if (totalRoles === playerCount) {
      hostRoleValidationMsg.className = 'validation-message success';
      hostRoleValidationMsg.textContent = `(Số vai trò hoàn toàn khớp: ${totalRoles}/${playerCount})`;
      hostStartGameMultiBtn.disabled = false;
    } else {
      hostRoleValidationMsg.className = 'validation-message error';
      hostRoleValidationMsg.textContent = `(Vai trò ${totalRoles} != Người chơi ${playerCount})`;
      hostStartGameMultiBtn.disabled = true;
    }
  }

  /* ===================================================
     MULTI-DEVICE: HOST BẮT ĐẦU VÁN CHƠI & GỬI VAI TRÒ BÍ MẬT
     =================================================== */
  function handleHostStartGameMulti() {
    const clients = Object.values(window.networkManager.clients);
    const n = clients.length;

    // Sinh pool vai trò và shuffle
    const pool = [];
    for (const [role, count] of Object.entries(state.roles)) {
      for (let i = 0; i < count; i++) pool.push(role);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    state.players = clients.map((c, idx) => ({
      id: c.id,
      name: c.name,
      role: pool[idx],
      isAlive: true,
      conn: c.conn
    }));

    // Tìm danh sách Ma Sói để báo đồng đội
    const wolfNames = state.players.filter(p => p.role === 'werewolf').map(p => p.name);

    // Gửi vai trò bí mật cho từng Client
    state.players.forEach(p => {
      const payload = {
        type: 'GAME_STARTED_CLIENT',
        data: {
          role: p.role,
          teammates: p.role === 'werewolf' ? wolfNames.filter(name => name !== p.name) : [],
          allPlayers: state.players.map(x => ({ id: x.id, name: x.name, isAlive: x.isAlive }))
        }
      };
      window.networkManager.sendToConn(p.conn, payload);
    });

    // Host chuyển sang Gameplay Phase
    multiDeviceLobbyPhaseEl.classList.remove('active-phase');
    gameplayPhaseEl.classList.add('active-phase');
    gameHeaderBadges.style.display = 'flex';

    updateBadges();
    renderPlayerCards();

    logGameEvent(`Ván chơi đa thiết bị bắt đầu với ${state.players.length} người chơi!`, 'info');
    logGameEvent(`--- Đêm thứ 1 buông xuống. Chúc làng bình an! ---`, 'night');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ===================================================
     MULTI-DEVICE: CLIENT VÀO PHÒNG & THAO TÁC CÁ NHÂN
     =================================================== */
  async function handleClientJoinRoomSubmit() {
    const roomCode = clientRoomCodeInput.value.trim().toUpperCase();
    const name = clientPlayerNameInput.value.trim();
    const password = clientPasswordInput.value.trim();

    if (!roomCode) {
      alert("Vui lòng nhập mã phòng!");
      return;
    }
    if (!name) {
      alert("Vui lòng nhập tên của bạn!");
      return;
    }

    clientJoinRoomSubmitBtn.disabled = true;
    clientJoinRoomSubmitBtn.innerHTML = `<span>⏳ Đang kết nối vào phòng ${roomCode}...</span>`;

    try {
      await window.networkManager.joinRoom(roomCode, name, password);
    } catch (err) {
      alert("Không thể kết nối đến máy chủ phòng. Hãy kiểm tra lại mã phòng!");
      clientJoinRoomSubmitBtn.disabled = false;
      clientJoinRoomSubmitBtn.innerHTML = `<span>🚪 THAM GIA PHÒNG CHƠI</span>`;
    }
  }

  function toggleClientSecretVisibility() {
    const isHidden = clientRoleName.style.filter === 'blur(10px)';
    if (isHidden) {
      clientRoleName.style.filter = 'none';
      clientRoleDesc.style.filter = 'none';
      toggleSecretVisibilityBtn.textContent = '🙈 Ẩn vai trò';
    } else {
      clientRoleName.style.filter = 'blur(10px)';
      clientRoleDesc.style.filter = 'blur(6px)';
      toggleSecretVisibilityBtn.textContent = '👁️ Hiện vai trò';
    }
  }

  function handleClientNightStep(stepData) {
    const { activeRole, victimName, aliveTargets } = stepData;
    const myRole = state.myClientData.role;
    const isAlive = state.myClientData.isAlive;

    // Rung nhẹ khi đến lượt vai trò của người chơi
    if (myRole === activeRole && isAlive) {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      clientSleepingState.style.display = 'none';
      clientWakingState.style.display = 'block';

      const meta = ROLE_META[activeRole];
      clientWakeTitle.textContent = `${meta.name.toUpperCase()} ƠI, ĐẾN LƯỢT BẠN!`;
      clientTargetsGrid.style.display = 'grid';
      clientSeerRevealBox.style.display = 'none';
      clientWitchBox.style.display = 'none';

      if (activeRole === 'witch') {
        clientTargetsGrid.style.display = 'none';
        clientWitchBox.style.display = 'flex';
        clientWitchVictimName.textContent = victimName || 'Không có ai';
      } else {
        renderClientTargets(aliveTargets, activeRole);
      }
    } else {
      clientWakingState.style.display = 'none';
      clientSleepingState.style.display = 'block';
    }
  }

  function renderClientTargets(aliveTargets = [], roleKey) {
    clientTargetsGrid.innerHTML = '';

    aliveTargets.forEach(target => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'night-target-btn';
      btn.innerHTML = `<span>🧑 ${target.name}</span><small>#${target.id}</small>`;

      btn.addEventListener('click', () => {
        clientTargetsGrid.querySelectorAll('.night-target-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        if (roleKey === 'seer') {
          // Tiên tri thấy kết quả
          clientTargetsGrid.style.display = 'none';
          clientSeerRevealBox.style.display = 'flex';
          clientSeerTargetName.textContent = target.name;
          const isWolf = target.team === 'wolf';
          clientSeerVerdict.className = `seer-result-verdict ${isWolf ? 'wolf' : 'villager'}`;
          clientSeerVerdict.textContent = isWolf ? 'PHE MA SÓI 🐺' : 'PHE DÂN LÀNG 🛡️';
        }

        window.networkManager.sendNightActionToHost({
          role: roleKey,
          targetId: target.id
        });
      });

      clientTargetsGrid.appendChild(btn);
    });
  }

  function clientConfirmNightDone() {
    clientWakingState.style.display = 'none';
    clientSleepingState.style.display = 'block';
  }

  function handleClientMorningSync(syncData) {
    const { deadNames, protectedNames, healedNames, alivePlayers } = syncData;
    clientWakingState.style.display = 'none';
    clientSleepingState.style.display = 'block';

    const amIDead = deadNames.includes(state.myClientData.name);
    if (amIDead) {
      state.myClientData.isAlive = false;
      clientLifeBadge.className = 'client-life-badge dead';
      clientLifeBadge.textContent = '💀 Đã chết';
    }

    state.players = alivePlayers;
    renderClientPlayersOverview();
  }

  function renderClientPlayersOverview() {
    clientPlayersOverviewList.innerHTML = '';
    state.players.forEach(p => {
      const chip = document.createElement('div');
      chip.className = `client-player-chip ${p.isAlive ? '' : 'dead'}`;
      chip.innerHTML = `<span>${p.isAlive ? '💚' : '💀'}</span> <span>${p.name}</span>`;
      clientPlayersOverviewList.appendChild(chip);
    });
  }

  function handleHostReceivedNightAction(actionData) {
    const { role, targetId, witchHeal, witchPoisonTargetId } = actionData;
    if (role === 'werewolf') state.nightPicks.attackedPlayerId = targetId;
    if (role === 'guard') state.nightPicks.protectedPlayerId = targetId;
    if (role === 'seer') state.nightPicks.seerCheckedPlayerId = targetId;
    if (role === 'witch') {
      if (witchHeal !== undefined) state.nightPicks.witchHealed = witchHeal;
      if (witchPoisonTargetId !== undefined) state.nightPicks.witchPoisonedPlayerId = witchPoisonTargetId;
    }
  }

  /* ===================================================
     PHASE 1: CHƠI 1 MÁY (SINGLE DEVICE)
     =================================================== */
  function handlePlayerCountChange(count) {
    if (isNaN(count) || count < 5) {
      playerCountError.style.display = 'block';
      state.playerCount = isNaN(count) ? 0 : count;
    } else {
      playerCountError.style.display = 'none';
      state.playerCount = Math.min(30, count);
    }
    targetPlayerCountEl.textContent = state.playerCount;
    renderPlayerInputs();
    validateSetupForm();
  }

  function renderPlayerInputs() {
    const currentInputs = playerNamesList.querySelectorAll('input');
    const existingNames = Array.from(currentInputs).map(inp => inp.value.trim());

    playerNamesList.innerHTML = '';
    const count = state.playerCount >= 5 ? state.playerCount : 0;

    for (let i = 1; i <= count; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'player-input-item';

      const idxSpan = document.createElement('span');
      idxSpan.className = 'player-idx';
      idxSpan.textContent = `#${i}`;

      const input = document.createElement('input');
      input.type = 'text';
      input.id = `playerName_${i}`;
      input.placeholder = `Tên người chơi ${i}`;
      input.value = existingNames[i - 1] || `Người chơi ${i}`;

      wrapper.appendChild(idxSpan);
      wrapper.appendChild(input);
      playerNamesList.appendChild(wrapper);
    }
  }

  function fillRandomNames() {
    const inputs = playerNamesList.querySelectorAll('input');
    const shuffled = [...SAMPLE_NAMES].sort(() => 0.5 - Math.random());
    inputs.forEach((input, idx) => {
      input.value = shuffled[idx % shuffled.length] + (idx >= SAMPLE_NAMES.length ? ` ${idx + 1}` : '');
    });
  }

  function adjustRoleCount(role, action) {
    if (state.roles[role] === undefined) return;
    if (action === 'inc') state.roles[role] += 1;
    else if (action === 'dec' && state.roles[role] > 0) state.roles[role] -= 1;

    updateRoleCountersUI();
    validateSetupForm();
    if (state.gameMode === 'multi_host') validateHostRolesMulti();
  }

  function updateRoleCountersUI() {
    let total = 0;
    for (const [role, count] of Object.entries(state.roles)) {
      const el = document.getElementById(`count-${role}`);
      if (el) el.textContent = count;
      total += count;
    }
    totalRolesCountEl.textContent = total;
  }

  function autoBalanceRoles() {
    const n = state.gameMode === 'multi_host' ? state.connectedClients.length : state.playerCount;
    if (n < 5) return;

    state.roles = { werewolf: 0, seer: 1, guard: 1, witch: 1, hunter: 0, villager: 0 };
    if (n <= 6) {
      state.roles.werewolf = 1;
    } else if (n <= 9) {
      state.roles.werewolf = 2;
      state.roles.hunter = 1;
    } else if (n <= 12) {
      state.roles.werewolf = 3;
      state.roles.hunter = 1;
    } else {
      state.roles.werewolf = 4;
      state.roles.hunter = 1;
    }

    const specialCount = Object.values(state.roles).reduce((a, b) => a + b, 0);
    state.roles.villager = Math.max(0, n - specialCount);

    updateRoleCountersUI();
    validateSetupForm();
    if (state.gameMode === 'multi_host') validateHostRolesMulti();
  }

  function validateSetupForm() {
    const totalRoles = Object.values(state.roles).reduce((a, b) => a + b, 0);
    const playerCount = state.playerCount;

    if (playerCount < 5) {
      validationWarningEl.className = 'validation-message error';
      validationWarningEl.innerHTML = `❌ Cần tối thiểu 5 người chơi để bắt đầu!`;
      startGameBtn.disabled = true;
      return;
    }

    if (totalRoles === playerCount) {
      validationWarningEl.className = 'validation-message success';
      validationWarningEl.innerHTML = `✅ Số chức năng hoàn toàn khớp với số người (${totalRoles}/${playerCount})`;
      startGameBtn.disabled = false;
    } else {
      const diff = Math.abs(totalRoles - playerCount);
      const isSurplus = totalRoles > playerCount;
      validationWarningEl.className = 'validation-message error';
      validationWarningEl.innerHTML = `⚠️ Tổng vai trò (${totalRoles}) ${isSurplus ? 'thừa' : 'thiếu'} ${diff} so với số người chơi (${playerCount})!`;
      startGameBtn.disabled = true;
    }
  }

  function goToPassRolePhase() {
    const nameInputs = playerNamesList.querySelectorAll('input');
    state.players = [];

    nameInputs.forEach((input, index) => {
      const name = input.value.trim() || `Người chơi ${index + 1}`;
      state.players.push({
        id: index + 1,
        name: name,
        role: null,
        isAlive: true
      });
    });

    state.passIndex = 0;
    state.isRandomAssignedMode = false;
    state.selectedRoleForPass = null;

    setupPhaseEl.classList.remove('active-phase');
    passRolePhaseEl.classList.add('active-phase');

    renderLockScreen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderLockScreen() {
    const current = state.players[state.passIndex];
    passProgressCounter.textContent = `${state.passIndex + 1} / ${state.players.length}`;
    lockTargetPlayerName.textContent = `${current.name} (Ghế #${current.id})`;

    passLockScreen.style.display = 'flex';
    passUnlockScreen.style.display = 'none';
  }

  function unlockPassScreenForCurrentPlayer() {
    const current = state.players[state.passIndex];
    unlockPlayerName.textContent = current.name;
    state.selectedRoleForPass = null;
    confirmRolePassBtn.disabled = true;

    passLockScreen.style.display = 'none';
    passUnlockScreen.style.display = 'flex';

    if (state.isRandomAssignedMode) {
      secretRolesSelectorGrid.style.display = 'none';
      randomRoleDisplayBox.style.display = 'flex';
      unlockDescText.textContent = "Đây là vai trò bí mật của bạn. Hãy ghi nhớ thật kỹ:";

      const meta = ROLE_META[current.role];
      randomRoleIcon.textContent = meta.icon;
      randomRoleName.textContent = meta.name.toUpperCase();
      randomRoleDesc.textContent = meta.desc;

      state.selectedRoleForPass = current.role;
      confirmRolePassBtn.disabled = false;
    } else {
      randomRoleDisplayBox.style.display = 'none';
      secretRolesSelectorGrid.style.display = 'grid';
      unlockDescText.textContent = "Hãy chạm chọn vai trò tương ứng với lá bài thật trên tay bạn:";

      renderSecretRoleOptions();
    }
  }

  function renderSecretRoleOptions() {
    secretRolesSelectorGrid.innerHTML = '';

    for (const [roleKey, totalConfigured] of Object.entries(state.roles)) {
      if (totalConfigured === 0) continue;

      const meta = ROLE_META[roleKey];
      const item = document.createElement('div');
      item.className = 'secret-role-item';
      item.dataset.role = roleKey;

      item.innerHTML = `
        <div class="secret-role-item-info">
          <span class="role-icon">${meta.icon}</span>
          <div>
            <div class="secret-role-item-name">${meta.name}</div>
            <small style="color: var(--text-secondary); font-size: 0.75rem;">${meta.team === 'wolf' ? 'Phe Sói' : 'Phe Dân'}</small>
          </div>
        </div>
      `;

      item.addEventListener('click', () => {
        document.querySelectorAll('.secret-role-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        state.selectedRoleForPass = roleKey;
        confirmRolePassBtn.disabled = false;
      });

      secretRolesSelectorGrid.appendChild(item);
    }
  }

  function confirmRoleForCurrentPlayer() {
    if (!state.selectedRoleForPass) return;

    const current = state.players[state.passIndex];
    current.role = state.selectedRoleForPass;
    state.selectedRoleForPass = null;
    confirmRolePassBtn.disabled = true;

    state.passIndex += 1;

    if (state.passIndex >= state.players.length) {
      validateAndFinishRegistration();
    } else {
      renderLockScreen();
    }
  }

  function validateAndFinishRegistration() {
    if (state.isRandomAssignedMode) {
      finishRegistrationAndStartGame();
      return;
    }

    const chosenCounts = { werewolf: 0, seer: 0, guard: 0, witch: 0, hunter: 0, villager: 0 };
    state.players.forEach(p => {
      if (chosenCounts[p.role] !== undefined) chosenCounts[p.role] += 1;
    });

    let isMismatch = false;
    for (const [roleKey, expectedCount] of Object.entries(state.roles)) {
      if (chosenCounts[roleKey] !== expectedCount) {
        isMismatch = true;
        break;
      }
    }

    if (isMismatch) {
      alert("⚠️ Đã có người chơi bấm nhầm vai trò!\n\nĐể đảm bảo bí mật và công bằng, hệ thống sẽ cho mọi người chuyền máy đăng ký lại một lượt.");
      state.passIndex = 0;
      state.players.forEach(p => p.role = null);
      renderLockScreen();
    } else {
      finishRegistrationAndStartGame();
    }
  }

  function handleRandomAssignAll() {
    if (confirm("Hệ thống sẽ tự chia vai trò bí mật cho tất cả mọi người. Bạn có muốn chuyển sang chế độ này?")) {
      state.isRandomAssignedMode = true;

      const pool = [];
      for (const [role, count] of Object.entries(state.roles)) {
        for (let i = 0; i < count; i++) pool.push(role);
      }
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      state.players.forEach((p, idx) => {
        p.role = pool[idx];
      });

      alert("Đã phân bổ vai trò ngẫu nhiên! Bây giờ hãy chuyền máy cho từng người xem lá bài của mình.");
      state.passIndex = 0;
      renderLockScreen();
    }
  }

  /* ===================================================
     PHASE 2: GAMEPLAY DASHBOARD (HOST & SINGLE)
     =================================================== */
  function finishRegistrationAndStartGame() {
    state.currentNight = 1;
    state.currentPhase = 'gameplay';
    state.witchHealUsed = false;
    state.witchPoisonUsed = false;

    passRolePhaseEl.classList.remove('active-phase');
    gameplayPhaseEl.classList.add('active-phase');
    gameHeaderBadges.style.display = 'flex';

    updateBadges();
    renderPlayerCards();

    gameLogContent.innerHTML = '';
    logGameEvent(`Tất cả ${state.players.length} người chơi đã sẵn sàng!`, 'info');
    logGameEvent(`--- Đêm thứ 1 buông xuống. Chúc làng bình an! ---`, 'night');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateBadges() {
    nightCountBadge.textContent = `🌙 Đêm thứ ${state.currentNight}`;
    const aliveCount = state.players.filter(p => p.isAlive).length;
    aliveCountBadge.textContent = `👥 Sống: ${aliveCount}/${state.players.length}`;
  }

  function renderPlayerCards() {
    playersDashboardGrid.innerHTML = '';

    state.players.forEach(player => {
      const card = document.createElement('div');
      card.className = `player-card ${player.isAlive ? 'alive' : 'dead'}`;
      card.id = `player-card-${player.id}`;

      const header = document.createElement('div');
      header.className = 'player-card-header';

      const avatar = document.createElement('div');
      avatar.className = 'player-avatar';
      avatar.textContent = player.isAlive ? getAvatarForId(player.id) : '💀';

      const info = document.createElement('div');
      info.className = 'player-card-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'player-card-name';
      nameEl.textContent = player.name;

      const roleBadge = document.createElement('span');
      roleBadge.className = 'player-card-role-badge';
      roleBadge.textContent = `Ghế #${player.id}`;

      info.appendChild(nameEl);
      info.appendChild(roleBadge);
      header.appendChild(avatar);
      header.appendChild(info);

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'btn-status-toggle';
      toggleBtn.innerHTML = player.isAlive 
        ? `<span>💚</span> <span>Còn sống</span>` 
        : `<span>💀</span> <span>Đã chết</span>`;

      toggleBtn.addEventListener('click', () => {
        togglePlayerStatus(player.id);
      });

      card.appendChild(header);
      card.appendChild(toggleBtn);
      playersDashboardGrid.appendChild(card);
    });
  }

  function togglePlayerStatus(playerId) {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    player.isAlive = !player.isAlive;
    updateBadges();

    const card = document.getElementById(`player-card-${playerId}`);
    if (card) {
      card.className = `player-card ${player.isAlive ? 'alive' : 'dead'}`;
      const avatar = card.querySelector('.player-avatar');
      if (avatar) avatar.textContent = player.isAlive ? getAvatarForId(playerId) : '💀';

      const toggleBtn = card.querySelector('.btn-status-toggle');
      if (toggleBtn) {
        toggleBtn.innerHTML = player.isAlive 
          ? `<span>💚</span> <span>Còn sống</span>` 
          : `<span>💀</span> <span>Đã chết</span>`;
      }
    }

    if (!player.isAlive) {
      logGameEvent(`[Hy sinh] ${player.name} (Ghế #${player.id}) đã rời cuộc chơi.`, 'death');
    } else {
      logGameEvent(`[Hồi sinh] ${player.name} (Ghế #${player.id}) được đánh thức trở lại.`, 'revive');
    }
  }

  /* ===================================================
     HỆ THỐNG ĐIỀU HÀNH ĐÊM TỰ ĐỘNG
     =================================================== */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function runFullAutoNightSequence() {
    if (state.isAutoNightRunning) return;
    state.isAutoNightRunning = true;

    morningRecapBanner.style.display = 'none';

    state.nightPicks = {
      protectedPlayerId: null,
      attackedPlayerId: null,
      witchHealed: false,
      witchPoisonedPlayerId: null,
      seerCheckedPlayerId: null
    };

    if (window.audioManager) {
      window.audioManager.startAmbient();
      ambientLabel.textContent = "Nhạc nền: BẬT";
    }

    logGameEvent(`--- Bắt đầu chuỗi Đêm tự động thứ ${state.currentNight} ---`, 'night');

    // BƯỚC 1: ĐI NGỦ
    await window.audioManager.speakRole('sleep');
    if (state.gameMode === 'multi_host' && window.networkManager) {
      window.networkManager.broadcastToClients({
        type: 'NIGHT_STEP_CLIENT',
        data: { activeRole: 'none' }
      });
    }
    await delay(2500);

    // BƯỚC 2: BẢO VỆ
    const hasGuardAlive = state.players.some(p => p.role === 'guard' && p.isAlive);
    if (hasGuardAlive) {
      broadcastNightStepToClients('guard');
      await runNightRoleStep({
        roleKey: 'guard',
        title: 'BẢO VỆ THỨC DẬY',
        icon: '🛡️',
        audioText: 'Bảo vệ ơi thức dậy. Bảo vệ muốn cứu ai đêm nay?',
        instruction: 'Bảo vệ hãy chạm vào người bạn muốn bảo vệ:',
        duration: 15,
        onAction: (targetId) => {
          state.nightPicks.protectedPlayerId = targetId;
        }
      });
      await window.audioManager.speakRole('guard_sleep');
      await delay(1500);
    }

    // BƯỚC 3: MA SÓI
    const hasWolfAlive = state.players.some(p => p.role === 'werewolf' && p.isAlive);
    if (hasWolfAlive) {
      broadcastNightStepToClients('werewolf');
      await runNightRoleStep({
        roleKey: 'werewolf',
        title: 'MA SÓI THỨC DẬY',
        icon: '🐺',
        audioText: 'Ma sói ơi hãy thức dậy. Sói muốn giết ai đêm nay?',
        instruction: 'Ma Sói hãy cùng thống nhất và chạm vào con mồi:',
        duration: 20,
        onAction: (targetId) => {
          state.nightPicks.attackedPlayerId = targetId;
        }
      });
      await window.audioManager.speakRole('werewolf_sleep');
      await delay(1500);
    }

    // BƯỚC 4: TIÊN TRI
    const hasSeerAlive = state.players.some(p => p.role === 'seer' && p.isAlive);
    if (hasSeerAlive) {
      broadcastNightStepToClients('seer');
      await runNightRoleStep({
        roleKey: 'seer',
        title: 'TIÊN TRI THỨC DẬY',
        icon: '🔮',
        audioText: 'Tiên tri ơi hãy thức dậy. Tiên tri muốn soi ai?',
        instruction: 'Tiên tri hãy chạm vào 1 người để soi danh tính:',
        duration: 18,
        isSeer: true
      });
      await window.audioManager.speakRole('seer_sleep');
      await delay(1500);
    }

    // BƯỚC 5: PHÙ THỦY
    const hasWitchAlive = state.players.some(p => p.role === 'witch' && p.isAlive);
    if (hasWitchAlive) {
      const victim = state.players.find(p => p.id === state.nightPicks.attackedPlayerId);
      broadcastNightStepToClients('witch', victim ? victim.name : null);

      await runNightRoleStep({
        roleKey: 'witch',
        title: 'PHÙ THỦY THỨC DẬY',
        icon: '🧪',
        audioText: 'Phù thủy ơi thức dậy.',
        instruction: 'Phù thủy hãy quyết định dùng bình cứu hoặc bình độc:',
        duration: 20,
        isWitch: true
      });
      await window.audioManager.speakRole('witch_sleep');
      await delay(1500);
    }

    // BƯỚC 6: THỢ SĂN
    const hasHunter = state.players.some(p => p.role === 'hunter' && p.isAlive);
    if (hasHunter) {
      await window.audioManager.speakRole('hunter');
      await delay(2000);
    }

    // BƯỚC 7: TRỜI SÁNG
    nightInteractiveOverlay.style.display = 'none';
    if (window.audioManager) {
      window.audioManager.stopAmbient();
      ambientLabel.textContent = "Nhạc nền: Tắt";
    }

    await delay(1000);
    resolveNightAndAnnounceMorning();
    state.isAutoNightRunning = false;
  }

  function broadcastNightStepToClients(roleKey, victimName = null) {
    if (state.gameMode === 'multi_host' && window.networkManager) {
      const aliveTargets = state.players.filter(p => p.isAlive).map(p => ({
        id: p.id,
        name: p.name,
        team: ROLE_META[p.role]?.team || 'villager'
      }));

      window.networkManager.broadcastToClients({
        type: 'NIGHT_STEP_CLIENT',
        data: {
          activeRole: roleKey,
          victimName: victimName,
          aliveTargets: aliveTargets
        }
      });
    }
  }

  function runNightRoleStep({ title, icon, audioText, instruction, duration, isSeer = false, isWitch = false, onAction }) {
    return new Promise((resolve) => {
      // Nếu là chế độ Multi-Device Host, chỉ hiển thị thông báo tiến độ, máy con sẽ tự bấm!
      nightRoleIcon.textContent = icon;
      nightRoleTitle.textContent = title;
      nightInstructionText.textContent = instruction;
      seerResultBox.style.display = 'none';
      witchControlsBox.style.display = 'none';
      nightTargetsGrid.style.display = 'grid';

      if (window.audioManager && audioText) {
        window.audioManager.speak(audioText);
      }

      if (isWitch) {
        nightTargetsGrid.style.display = 'none';
        witchControlsBox.style.display = 'flex';

        const victim = state.players.find(p => p.id === state.nightPicks.attackedPlayerId);
        witchVictimName.textContent = victim ? victim.name : "Không có ai";

        if (state.witchHealUsed || !victim) {
          witchHealBtn.disabled = true;
          witchHealStatus.textContent = state.witchHealUsed ? "Bình cứu: Đã hết" : "Không có ai bị cắn";
        } else {
          witchHealBtn.disabled = false;
          witchHealBtn.classList.remove('active');
          witchHealStatus.textContent = "Cứu người này";
          witchHealBtn.onclick = () => {
            state.nightPicks.witchHealed = !state.nightPicks.witchHealed;
            witchHealBtn.classList.toggle('active', state.nightPicks.witchHealed);
            witchHealStatus.textContent = state.nightPicks.witchHealed ? "Đã chọn CỨU" : "Cứu người này";
          };
        }

        if (state.witchPoisonUsed) {
          witchPoisonToggleBtn.disabled = true;
          witchPoisonStatus.textContent = "Bình độc: Đã hết";
          witchPoisonTargetList.style.display = 'none';
        } else {
          witchPoisonToggleBtn.disabled = false;
          witchPoisonToggleBtn.classList.remove('active');
          witchPoisonStatus.textContent = "Chọn người để đầu độc";
          witchPoisonTargetList.style.display = 'none';

          witchPoisonToggleBtn.onclick = () => {
            const isShowing = witchPoisonTargetList.style.display === 'grid';
            witchPoisonTargetList.style.display = isShowing ? 'none' : 'grid';
            witchPoisonToggleBtn.classList.toggle('active', !isShowing);
          };

          renderTargetsIntoGrid(witchPoisonTargetList, (targetId) => {
            state.nightPicks.witchPoisonedPlayerId = targetId;
            witchPoisonStatus.textContent = `Đã chọn độc: ${state.players.find(p => p.id === targetId)?.name}`;
          });
        }
      } else {
        renderTargetsIntoGrid(nightTargetsGrid, (targetId) => {
          if (onAction) onAction(targetId);

          if (isSeer) {
            const target = state.players.find(p => p.id === targetId);
            if (target) {
              nightTargetsGrid.style.display = 'none';
              seerResultBox.style.display = 'flex';
              seerResultName.textContent = target.name;
              const isWolf = target.role === 'werewolf';
              seerResultVerdict.className = `seer-result-verdict ${isWolf ? 'wolf' : 'villager'}`;
              seerResultVerdict.textContent = isWolf ? 'PHE MA SÓI 🐺' : 'PHE DÂN LÀNG 🛡️';
            }
          }
        });
      }

      let timeLeft = duration;
      nightStepTimer.textContent = `${timeLeft}s`;

      const countdown = () => {
        timeLeft -= 1;
        nightStepTimer.textContent = `${timeLeft}s`;
        if (timeLeft <= 0) cleanUpAndDone();
      };

      if (state.nightStepInterval) clearInterval(state.nightStepInterval);
      state.nightStepInterval = setInterval(countdown, 1000);

      const cleanUpAndDone = () => {
        clearInterval(state.nightStepInterval);
        state.nightStepInterval = null;
        nightConfirmDoneBtn.onclick = null;
        resolve();
      };

      nightConfirmDoneBtn.onclick = cleanUpAndDone;
      nightInteractiveOverlay.style.display = 'flex';
    });
  }

  function renderTargetsIntoGrid(container, onSelect) {
    container.innerHTML = '';
    const alivePlayers = state.players.filter(p => p.isAlive);

    alivePlayers.forEach(player => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'night-target-btn';
      btn.innerHTML = `<span>🧑 ${player.name}</span><small style="opacity: 0.7;">#${player.id}</small>`;

      btn.addEventListener('click', () => {
        container.querySelectorAll('.night-target-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        onSelect(player.id);
      });

      container.appendChild(btn);
    });
  }

  /* ===================================================
     TÍNH TOÁN BAN ĐÊM & THÔNG BÁO BẢO VỆ / CỨU / HY SINH
     =================================================== */
  function resolveNightAndAnnounceMorning() {
    const { attackedPlayerId, protectedPlayerId, witchHealed, witchPoisonedPlayerId } = state.nightPicks;
    const deadPlayers = [];
    const protectedNames = [];
    const healedNames = [];

    // 1. Kiểm tra nạn nhân bị Sói cắn
    if (attackedPlayerId) {
      const victim = state.players.find(p => p.id === attackedPlayerId);
      const isProtected = protectedPlayerId === attackedPlayerId;
      const isSavedByWitch = witchHealed === true;

      if (isProtected && victim) {
        protectedNames.push(victim.name);
      }

      if (isSavedByWitch && victim) {
        healedNames.push(victim.name);
        state.witchHealUsed = true;
      }

      if (!isProtected && !isSavedByWitch && victim && victim.isAlive) {
        deadPlayers.push(victim);
      }
    }

    // 2. Kiểm tra nạn nhân bị Phù Thủy ném độc
    if (witchPoisonedPlayerId) {
      const poisonVictim = state.players.find(p => p.id === witchPoisonedPlayerId);
      if (poisonVictim && poisonVictim.isAlive && !deadPlayers.includes(poisonVictim)) {
        deadPlayers.push(poisonVictim);
      }
      state.witchPoisonUsed = true;
    }

    // 3. Cập nhật người chết
    const deadNames = deadPlayers.map(p => p.name);
    deadPlayers.forEach(p => {
      p.isAlive = false;
    });

    renderPlayerCards();
    updateBadges();

    // 4. Đồng bộ kết quả sang các máy con nếu đang ở chế độ Multi-Device Host
    if (state.gameMode === 'multi_host' && window.networkManager) {
      window.networkManager.broadcastToClients({
        type: 'MORNING_SYNC_CLIENT',
        data: {
          deadNames: deadNames,
          protectedNames: protectedNames,
          healedNames: healedNames,
          alivePlayers: state.players.map(p => ({ id: p.id, name: p.name, isAlive: p.isAlive }))
        }
      });
    }

    // 5. Hiển thị Banner Tổng kết sáng
    renderMorningRecapBanner({ deadNames, protectedNames, healedNames });

    // 6. Quản trò đọc dõng dạc
    if (window.audioManager) {
      window.audioManager.speakMorningResult({ deadNames, protectedNames, healedNames });
    }

    // 7. Ghi nhật ký
    if (protectedNames.length > 0) {
      logGameEvent(`[Bảo vệ thành công] ${protectedNames.join(', ')} bị Sói tấn công nhưng đã được Bảo Vệ che chở!`, 'revive');
    }
    if (healedNames.length > 0) {
      logGameEvent(`[Phù thủy cứu] ${healedNames.join(', ')} đã được Phù Thủy dùng tiên dược cứu sống!`, 'revive');
    }
    if (deadNames.length > 0) {
      logGameEvent(`[Hy sinh đêm qua] ${deadNames.join(', ')} đã rời cuộc chơi.`, 'death');
    }
    if (deadNames.length === 0 && protectedNames.length === 0 && healedNames.length === 0) {
      logGameEvent(`[Đêm bình yên] Không có ai bị thương cả.`, 'info');
    }

    // Tự động mở đồng hồ họp ban ngày sau 3 giây
    setTimeout(() => {
      openDiscussionTimer(state.discussionTotalSeconds);
    }, 3200);
  }

  function renderMorningRecapBanner({ deadNames, protectedNames, healedNames }) {
    morningRecapBanner.innerHTML = '';
    morningRecapBanner.style.display = 'flex';

    if (protectedNames.length > 0) {
      const div = document.createElement('div');
      div.className = 'recap-item protected';
      div.innerHTML = `<span>🛡️</span> <span><strong>${protectedNames.join(', ')}</strong> đã bị Ma Sói tấn công đêm qua, nhưng may mắn được <strong>BẢO VỆ</strong> che chở an toàn!</span>`;
      morningRecapBanner.appendChild(div);
    }

    if (healedNames.length > 0) {
      const div = document.createElement('div');
      div.className = 'recap-item healed';
      div.innerHTML = `<span>🧪</span> <span><strong>${healedNames.join(', ')}</strong> đã được <strong>PHÙ THỦY</strong> kịp thời dùng tiên dược cứu sống!</span>`;
      morningRecapBanner.appendChild(div);
    }

    if (deadNames.length > 0) {
      const div = document.createElement('div');
      div.className = 'recap-item death';
      div.innerHTML = `<span>💀</span> <span>Người đã hy sinh trong đêm: <strong>${deadNames.join(', ')}</strong></span>`;
      morningRecapBanner.appendChild(div);
    }

    if (deadNames.length === 0 && protectedNames.length === 0 && healedNames.length === 0) {
      const div = document.createElement('div');
      div.className = 'recap-item peaceful';
      div.innerHTML = `<span>🕊️</span> <span>Đêm qua là một đêm thật bình yên, không có ai bị thương!</span>`;
      morningRecapBanner.appendChild(div);
    }
  }

  /* ===================================================
     ĐỒNG HỒ HỌP THẢO LUẬN BAN NGÀY
     =================================================== */
  function openDiscussionTimer(seconds) {
    morningDiscussionModal.style.display = 'flex';
    resetDiscussionTimer(seconds);
    startDiscussionTimer();
  }

  function resetDiscussionTimer(seconds) {
    state.discussionRemainingSeconds = seconds;
    updateClockDisplay();
    clockRingOuter.classList.remove('warning');
    clockPhaseLabel.textContent = "ĐANG THẢO LUẬN";
  }

  function updateClockDisplay() {
    const mins = Math.floor(state.discussionRemainingSeconds / 60);
    const secs = state.discussionRemainingSeconds % 60;
    fullscreenClockTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (state.discussionRemainingSeconds <= 10 && state.discussionRemainingSeconds > 0) {
      clockRingOuter.classList.add('warning');
      clockPhaseLabel.textContent = "SẮP HẾT GIỜ!";
      if (window.audioManager) window.audioManager.playTickSound(true);
    } else {
      clockRingOuter.classList.remove('warning');
      clockPhaseLabel.textContent = "ĐANG THẢO LUẬN";
    }
  }

  function startDiscussionTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.isTimerRunning = true;
    timerPlayPauseIcon.textContent = '⏸️';
    timerPlayPauseText.textContent = 'Tạm dừng';

    state.timerInterval = setInterval(() => {
      if (state.discussionRemainingSeconds > 0) {
        state.discussionRemainingSeconds -= 1;
        updateClockDisplay();

        if (state.discussionRemainingSeconds === 0) {
          clearInterval(state.timerInterval);
          state.isTimerRunning = false;
          clockPhaseLabel.textContent = "HẾT GIỜ TRANH LUẬN!";
          if (window.audioManager) {
            window.audioManager.speak("Đã hết giờ thảo luận ban ngày! Tất cả mọi người hãy bắt đầu biểu quyết bỏ phiếu treo cổ!");
          }
        }
      }
    }, 1000);
  }

  function toggleDiscussionTimer() {
    if (state.isTimerRunning) {
      clearInterval(state.timerInterval);
      state.isTimerRunning = false;
      timerPlayPauseIcon.textContent = '▶️';
      timerPlayPauseText.textContent = 'Tiếp tục';
    } else {
      startDiscussionTimer();
    }
  }

  function addDiscussionTime(sec) {
    state.discussionRemainingSeconds += sec;
    updateClockDisplay();
    if (!state.isTimerRunning) {
      startDiscussionTimer();
    }
  }

  function closeDiscussionTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.isTimerRunning = false;
    morningDiscussionModal.style.display = 'none';
    logGameEvent(`Kết thúc thời gian thảo luận ban ngày. Chuyển sang biểu quyết / đêm tiếp theo.`, 'info');
  }

  function nextNight() {
    state.currentNight += 1;
    updateBadges();
    logGameEvent(`--- Bắt đầu Đêm thứ ${state.currentNight} ---`, 'night');
    morningRecapBanner.style.display = 'none';

    if (window.audioManager) window.audioManager.stop();
    liveSubtitle.textContent = `Đã chuyển sang Đêm thứ ${state.currentNight}. Nhấn "BẮT ĐẦU ĐÊM TỰ ĐỘNG" để bắt đầu lượt mới.`;
  }

  function confirmResetGame() {
    if (confirm("Bạn có chắc muốn kết thúc ván chơi hiện tại và thiết lập lại từ đầu?")) {
      if (window.audioManager) {
        window.audioManager.stop();
        window.audioManager.stopAmbient();
      }
      clearInterval(state.nightStepInterval);
      clearInterval(state.timerInterval);
      nightInteractiveOverlay.style.display = 'none';
      morningDiscussionModal.style.display = 'none';

      state.currentPhase = 'setup';
      gameplayPhaseEl.classList.remove('active-phase');
      passRolePhaseEl.classList.remove('active-phase');
      clientPlayerPhaseEl.classList.remove('active-phase');
      multiDeviceLobbyPhaseEl.classList.remove('active-phase');

      if (state.gameMode === 'multi_host' || state.gameMode === 'multi_client') {
        switchToMultiDeviceMode();
      } else {
        switchToSingleDeviceMode();
      }

      gameHeaderBadges.style.display = 'none';
      validateSetupForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function logGameEvent(message, type = 'info') {
    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    item.innerHTML = `<span style="opacity: 0.6;">[${time}]</span> <span>${message}</span>`;
    gameLogContent.prepend(item);
  }

  // Khởi chạy khi DOM sẵn sàng
  document.addEventListener('DOMContentLoaded', init);

})();
