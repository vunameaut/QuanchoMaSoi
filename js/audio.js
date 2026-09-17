/**
 * Audio Manager - Quản lý Hệ thống Âm thanh, Giọng đọc Web Speech API,
 * Nhiều loại nhạc nền Synthesizer (Web Audio API) & Hiệu ứng đồng hồ đếm ngược.
 */

class WerewolfAudioManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.allVoices = [];
    this.currentVoice = null;
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.isPaused = false;
    
    // Giọng đọc: Pitch & Rate
    this.pitch = 1.0;
    this.rate = 0.95;

    // Web Audio API for Multi-track Ambient Synthesizer
    this.audioCtx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.isAmbientPlaying = false;
    this.currentTrack = 'suspense'; // 'forest' | 'suspense' | 'drums' | 'bloodmoon'
    this.volume = 0.25;

    // Callbacks for UI updates
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onPauseCallback = null;
    this.onResumeCallback = null;
    this.onErrorCallback = null;

    // Kịch bản đọc chuẩn theo yêu cầu
    this.scripts = {
      sleep: "Màn đêm đã buông xuống, tất cả dân làng nhắm mắt đi ngủ.",
      guard: "Bảo vệ ơi thức dậy. Bảo vệ muốn cứu ai đêm nay?",
      guard_sleep: "Bảo vệ đã xong, bảo vệ nhắm mắt lại.",
      guard_timeout: "Đã hết thời gian! Bảo vệ nhắm mắt lại.",
      werewolf: "Ma sói ơi hãy thức dậy. Sói muốn giết ai đêm nay?",
      werewolf_sleep: "Ma sói đã chọn xong, ma sói nhắm mắt lại.",
      werewolf_timeout: "Đã hết thời gian! Ma sói nhắm mắt lại.",
      seer: "Tiên tri ơi hãy thức dậy. Tiên tri muốn soi ai?",
      seer_sleep: "Tiên tri đã soi xong, tiên tri nhắm mắt lại.",
      seer_timeout: "Đã hết thời gian! Tiên tri nhắm mắt lại.",
      witch: "Phù thủy ơi thức dậy.",
      witch_sleep: "Phù thủy đã xong, phù thủy nhắm mắt lại.",
      witch_timeout: "Đã hết thời gian! Phù thủy nhắm mắt lại.",
      hunter: "Thợ săn ơi thức dậy. Nếu đêm nay thợ săn bị hạ gục, thợ săn muốn bắn ai? ... Thợ săn nhắm mắt lại.",
      morning: "Trời sáng rồi, tất cả mọi người mở mắt ra."
    };

    this.initVoices();
  }

  /**
   * Khởi tạo danh sách giọng đọc từ trình duyệt
   */
  initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      this.allVoices = this.synth.getVoices();
      
      // Ưu tiên chọn giọng tiếng Việt
      const viVoice = this.allVoices.find(v => v.lang === 'vi-VN' || v.lang.startsWith('vi'));
      if (viVoice && !this.currentVoice) {
        this.currentVoice = viVoice;
      }
      
      // Kích hoạt event để UI cập nhật dropdown nếu cần
      if (window.onVoicesLoaded) {
        window.onVoicesLoaded(this.allVoices);
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  getVoices() {
    return this.allVoices.length > 0 ? this.allVoices : (this.synth ? this.synth.getVoices() : []);
  }

  setVoiceByURI(uri) {
    const voice = this.allVoices.find(v => v.voiceURI === uri);
    if (voice) {
      this.currentVoice = voice;
      return true;
    }
    return false;
  }

  setPitch(val) {
    this.pitch = parseFloat(val) || 1.0;
  }

  setRate(val) {
    this.rate = parseFloat(val) || 0.95;
  }

  registerCallbacks({ onStart, onEnd, onPause, onResume, onError }) {
    this.onStartCallback = onStart;
    this.onEndCallback = onEnd;
    this.onPauseCallback = onPause;
    this.onResumeCallback = onResume;
    this.onErrorCallback = onError;
  }

  /**
   * Phát giọng đọc bằng Promise
   */
  speak(text) {
    return new Promise((resolve) => {
      if (!this.synth) {
        if (this.onErrorCallback) this.onErrorCallback("Trình duyệt không hỗ trợ Web Speech");
        resolve();
        return;
      }

      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.currentVoice ? this.currentVoice.lang : 'vi-VN';
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;

      if (this.currentVoice) {
        utterance.voice = this.currentVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.isPaused = false;
        if (this.onStartCallback) this.onStartCallback(text);
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentUtterance = null;
        if (this.onEndCallback) this.onEndCallback();
        resolve();
      };

      utterance.onerror = (e) => {
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentUtterance = null;
        if (this.onErrorCallback) this.onErrorCallback(e.error);
        resolve();
      };

      this.currentUtterance = utterance;
      window.speechUtteranceRef = utterance;

      this.synth.speak(utterance);
    });
  }

  speakRole(roleKey) {
    const text = this.scripts[roleKey];
    if (text) {
      this.speak(text);
      return text;
    }
    return null;
  }

  /**
   * ĐỌC KẾT QUẢ BUỔI SÁNG - CHI TIẾT CẢ KHI ĐƯỢC BẢO VỆ, CỨU HOẶC SÓI HÒA VOTE MẤT LƯỢT
   */
  speakMorningResult({ deadNames = [], protectedNames = [], healedNames = [], werewolfTiedVote = false }) {
    let parts = [];
    parts.push("Trời sáng rồi, tất cả mọi người mở mắt ra!");

    // 0. Thông báo nếu Sói hòa vote bất đồng dẫn đến mất lượt
    if (werewolfTiedVote) {
      parts.push("Đêm qua bầy Ma Sói đã bất đồng quan điểm và hòa số phiếu vote, nên Sói đã bị mất lượt và không thể cắn ai!");
    }

    // 1. Thông báo nếu có người được Bảo vệ cứu sống
    if (protectedNames.length > 0) {
      const namesStr = protectedNames.join(", ");
      parts.push(`Đêm qua, ${namesStr} đã bị Ma Sói tấn công, nhưng rất may mắn đã được Bảo Vệ che chở an toàn!`);
    }

    // 2. Thông báo nếu có người được Phù Thủy dùng tiên dược cứu sống
    if (healedNames.length > 0) {
      const namesStr = healedNames.join(", ");
      parts.push(`Đêm qua, ${namesStr} đã bị cắn, nhưng đã được Phù Thủy kịp thời dùng tiên dược cứu sống!`);
    }

    // 3. Thông báo những người đã hy sinh
    if (deadNames.length > 0) {
      if (deadNames.length === 1) {
        parts.push(`Người đã hy sinh đêm qua là: ${deadNames[0]}!`);
      } else {
        parts.push(`Những người đã hy sinh đêm qua là: ${deadNames.join(" và ")}!`);
      }
    }

    // 4. Nếu đêm hoàn toàn bình yên
    if (!werewolfTiedVote && deadNames.length === 0 && protectedNames.length === 0 && healedNames.length === 0) {
      parts.push("Đêm qua là một đêm thật bình yên, không có ai bị thương cả!");
    }

    const fullAnnouncement = parts.join(" ");
    this.speak(fullAnnouncement);
    return fullAnnouncement;
  }

  togglePauseResume() {
    if (!this.synth || !this.isSpeaking) return false;

    if (this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      if (this.onResumeCallback) this.onResumeCallback();
      return false;
    } else {
      this.synth.pause();
      this.isPaused = true;
      if (this.onPauseCallback) this.onPauseCallback();
      return true;
    }
  }

  stop() {
    if (!this.synth) return;
    this.synth.cancel();
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentUtterance = null;
    if (this.onEndCallback) this.onEndCallback();
  }

  /* ===================================================
     HỆ THỐNG NHẠC NỀN ĐA DẠNG (MULTI-TRACK SYNTHESIZER)
     =================================================== */
  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setTrack(trackKey) {
    this.currentTrack = trackKey;
    if (this.isAmbientPlaying) {
      this.stopAmbient();
      this.startAmbient();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, parseFloat(vol) || 0.25));
    if (this.ambientGain && this.audioCtx) {
      this.ambientGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  startAmbient() {
    try {
      this.initAudioContext();
      if (this.isAmbientPlaying) return;

      this.activeNodes = [];
      this.ambientGain = this.audioCtx.createGain();
      this.ambientGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      this.ambientGain.connect(this.audioCtx.destination);

      if (this.currentTrack === 'forest') {
        this.playForestTrack();
      } else if (this.currentTrack === 'suspense') {
        this.playSuspenseTrack();
      } else if (this.currentTrack === 'drums') {
        this.playDrumsTrack();
      } else if (this.currentTrack === 'bloodmoon') {
        this.playBloodMoonTrack();
      }

      this.isAmbientPlaying = true;
    } catch (e) {
      console.warn("Lỗi phát nhạc nền:", e);
    }
  }

  // 1. Rừng Đêm & Tiếng Gió (Forest & Wind)
  playForestTrack() {
    const bufferSize = this.audioCtx.sampleRate * 2;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 2.5;
    }

    const noiseSource = this.audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const windFilter = this.audioCtx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(340, this.audioCtx.currentTime);

    noiseSource.connect(windFilter);
    windFilter.connect(this.ambientGain);
    noiseSource.start();

    // Dế kêu
    const cricketOsc = this.audioCtx.createOscillator();
    cricketOsc.type = 'sine';
    cricketOsc.frequency.setValueAtTime(4500, this.audioCtx.currentTime);

    const cricketGain = this.audioCtx.createGain();
    cricketGain.gain.setValueAtTime(0.015, this.audioCtx.currentTime);

    const cricketLfo = this.audioCtx.createOscillator();
    cricketLfo.frequency.setValueAtTime(5, this.audioCtx.currentTime);
    const lfoGain = this.audioCtx.createGain();
    lfoGain.gain.setValueAtTime(0.015, this.audioCtx.currentTime);

    cricketLfo.connect(lfoGain.gain);
    cricketOsc.connect(cricketGain);
    cricketGain.connect(this.ambientGain);

    cricketOsc.start();
    cricketLfo.start();

    this.activeNodes.push(noiseSource, cricketOsc, cricketLfo);
  }

  // 2. Hồi Hộp & Kịch Tính (Suspense Minor Drone)
  playSuspenseTrack() {
    // 2 Detuned low drone oscillators
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const subOsc = this.audioCtx.createOscillator();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(65.41, this.audioCtx.currentTime); // C2
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(65.8, this.audioCtx.currentTime); // Detuned C2
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(32.7, this.audioCtx.currentTime); // C1 Sub

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, this.audioCtx.currentTime);

    const droneGain = this.audioCtx.createGain();
    droneGain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    subOsc.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(this.ambientGain);

    osc1.start();
    osc2.start();
    subOsc.start();

    this.activeNodes.push(osc1, osc2, subOsc);
  }

  // 3. Nhịp Trống Thảo Luận Ban Ngày (Discussion Cadence)
  playDrumsTrack() {
    // Heartbeat pulse interval
    this.drumInterval = setInterval(() => {
      if (!this.audioCtx || !this.isAmbientPlaying) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.audioCtx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ambientGain);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.3);
    }, 1100);
  }

  // 4. Đêm Trăng Máu (Blood Moon Drone)
  playBloodMoonTrack() {
    const rootOsc = this.audioCtx.createOscillator();
    const fifthOsc = this.audioCtx.createOscillator();
    rootOsc.type = 'triangle';
    rootOsc.frequency.setValueAtTime(55, this.audioCtx.currentTime); // A1
    fifthOsc.type = 'sine';
    fifthOsc.frequency.setValueAtTime(82.41, this.audioCtx.currentTime); // E2 (Fifth)

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, this.audioCtx.currentTime);

    rootOsc.connect(filter);
    fifthOsc.connect(filter);
    filter.connect(this.ambientGain);

    rootOsc.start();
    fifthOsc.start();
    this.activeNodes.push(rootOsc, fifthOsc);
  }

  stopAmbient() {
    try {
      if (this.drumInterval) {
        clearInterval(this.drumInterval);
        this.drumInterval = null;
      }
      if (this.activeNodes) {
        this.activeNodes.forEach(node => {
          try { node.stop(); } catch(e){}
        });
        this.activeNodes = [];
      }
      this.isAmbientPlaying = false;
    } catch (e) {
      this.isAmbientPlaying = false;
    }
  }

  toggleAmbient() {
    if (this.isAmbientPlaying) {
      this.stopAmbient();
      return false;
    } else {
      this.startAmbient();
      return true;
    }
  }

  /**
   * Phát âm thanh Tick / Tock cho 5 giây đếm ngược cuối
   */
  playTickSound(isHigh = false) {
    try {
      this.initAudioContext();
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Âm thanh tích tắc rõ ràng, chuyển điệu giữa tích (cao) và tắc (trầm)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isHigh ? 950 : 650, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e){}
  }

  /**
   * Phát tiếng chuông báo Hết giờ (Bell Ring) âm vang bằng Web Audio API
   */
  playBellRing() {
    try {
      this.initAudioContext();
      const now = this.audioCtx.currentTime;

      // Các họa âm của tiếng chuông kim loại ngân dài (587Hz D5, 1174Hz, 1760Hz)
      const freqs = [587.33, 1174.66, 1760.0];
      const gains = [0.35, 0.18, 0.08];

      freqs.forEach((f, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(gains[i], now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 1.8);
      });
    } catch (e){}
  }

  /**
   * Cảnh báo Hết giờ: Đánh chuông + Đọc lời thoại
   */
  async playTimeUpAlert(customText = "Đã hết thời gian!") {
    this.playBellRing();
    await new Promise(r => setTimeout(r, 600));
    if (customText) {
      await this.speak(customText);
    }
  }
}

// Khởi tạo instance duy nhất
window.audioManager = new WerewolfAudioManager();
