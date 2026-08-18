/* XYZ School ERP - Shared AI Assistant Widget JS */
(function() {
  // CONFIGURATION & STATE
  let role = "student";
  let userName = "Rahul Sharma";
  let activeLanguage = "english";
  let isChatOpen = false;
  let isVoiceMode = false;
  let isListening = false;
  let isSpeaking = false;
  let conversationHistory = [];
  let speechRecognition = null;
  let currentUtterance = null;
  let lipSyncInterval = null;
  
  // Web Audio Context for synthesized sound FX (Zero-file dependency!)
  let audioCtx = null;

  // Get API Base URL (relative if on the same server, or fallback to the deployed Render URL if running locally from files)
  const API_BASE_URL = (window.location.origin.includes('file://') || window.location.origin.includes('null'))
    ? "https://xyz-ai-human-like-ai-school-assistant-3.onrender.com"
    : "";

  // Language tags map for STT / TTS
  const LANG_TAGS = {
    english: { tag: "en-US", label: "English" },
    hindi: { tag: "hi-IN", label: "हिन्दी (Hindi)" },
    tamil: { tag: "ta-IN", label: "தமிழ் (Tamil)" },
    telugu: { tag: "te-IN", label: "తెలుగు (Telugu)" },
    marathi: { tag: "mr-IN", label: "मराठी (Marathi)" },
    bengali: { tag: "bn-IN", label: "বাংলা (Bengali)" },
    gujarati: { tag: "gu-IN", label: "ગુજરાતી (Gujarati)" },
    punjabi: { tag: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
    kannada: { tag: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
    malayalam: { tag: "ml-IN", label: "മലയാളം (Malayalam)" },
    urdu: { tag: "ur-PK", label: "اردو (Urdu)" }
  };

  // Role details mapping
  const ROLE_CONFIGS = {
    student: {
      accent: "#6366f1",
      accentRgb: "99, 102, 241",
      title: "XYZ AI • Academic Assistant",
      greeting: "Hello Rahul! How is your study prep going today? Need help checking attendance?",
      avatarIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 14c4 0 6-2 6-6V5c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v3c0 4 2 6 6 6z"/><path d="M6 11h12M12 14v5M9 22h6"/></svg>`
    },
    parent: {
      accent: "#10b981",
      accentRgb: "16, 185, 129",
      title: "XYZ AI • Parent Assistant",
      greeting: "Welcome, Mrs. Sharma. How can I help you regarding Rahul's academic records or attendance today?",
      avatarIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
    },
    teacher: {
      accent: "#f43f5e",
      accentRgb: "244, 63, 94",
      title: "XYZ AI • Teaching Assistant",
      greeting: "Hello Mr. Kumar! Roster is ready. Say 'Mark Rahul absent today' or ask me about student analytics.",
      avatarIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V3.5A2.5 2.5 0 0 1 6.5 1M20 3.5V22M12 6v6m-3-3h6"/></svg>`
    },
    principal: {
      accent: "#f59e0b",
      accentRgb: "245, 158, 11",
      title: "XYZ AI • ERP Analytics Bot",
      greeting: "Good day, Principal. I am ready to present attendance dashboards and department analytics. What would you like to review?",
      avatarIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`
    }
  };

  // INJECT HTML STRUCTURE
  function injectWidget() {
    // Detect context
    role = document.body.getAttribute('data-user-role') || role;
    userName = document.body.getAttribute('data-user-name') || userName;
    
    // Check url params override
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('role')) role = urlParams.get('role');
    if (urlParams.has('name')) userName = urlParams.get('name');

    const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.student;

    // Apply CSS Variables to root
    document.documentElement.style.setProperty('--role-accent', config.accent);
    document.documentElement.style.setProperty('--role-accent-rgb', config.accentRgb);
    document.documentElement.style.setProperty('--role-glow', `rgba(${config.accentRgb}, 0.3)`);

    // Injected elements container
    const root = document.createElement('div');
    root.id = "xyz-widget-root";
    
    // Check if widget CSS is loaded, if not load it
    if (!document.querySelector('link[href*="xyz-ai-widget.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/shared/xyz-ai-widget.css';
      document.head.appendChild(link);
    }

    // SVG graphics injection
    const chatIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    const sendIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    const micIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
    const keyboardIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="10.01" y2="8"/><line x1="14" y1="8" x2="14.01" y2="8"/><line x1="18" y1="8" x2="18.01" y2="8"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`;
    const voiceCloseIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    
    // Generate Language Selector Options
    let langOptions = "";
    for (let key in LANG_TAGS) {
      langOptions += `<option value="${key}">${LANG_TAGS[key].label}</option>`;
    }

    // Avatar Face SVG
    const avatarFaceSvg = `
      <svg class="xyz-avatar-face" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <!-- Skin / Base glow -->
        <circle cx="60" cy="60" r="50" fill="rgba(${config.accentRgb}, 0.05)" stroke="var(--role-accent)" stroke-width="1.5" />
        
        <!-- Left Eyebrow -->
        <path id="eyebrow-left" d="M 38,42 Q 45,38 52,43" stroke="var(--role-accent)" stroke-width="2" fill="none" stroke-linecap="round"/>
        <!-- Right Eyebrow -->
        <path id="eyebrow-right" d="M 68,43 Q 75,38 82,42" stroke="var(--role-accent)" stroke-width="2" fill="none" stroke-linecap="round"/>

        <!-- Left Eye Outer -->
        <circle cx="45" cy="52" r="6" stroke="var(--role-accent)" stroke-width="1.5" fill="none"/>
        <!-- Left Pupil -->
        <circle id="pupil-left" cx="45" cy="52" r="3" fill="var(--role-accent)"/>
        
        <!-- Right Eye Outer -->
        <circle cx="75" cy="52" r="6" stroke="var(--role-accent)" stroke-width="1.5" fill="none"/>
        <!-- Right Pupil -->
        <circle id="pupil-right" cx="75" cy="52" r="3" fill="var(--role-accent)"/>
        
        <!-- Interactive Mouth Path -->
        <path id="avatar-mouth" d="M 48,75 Q 60,88 72,75" stroke="var(--role-accent)" stroke-width="3" fill="none" stroke-linecap="round"/>
        
        <!-- Decorative Circuits -->
        <path d="M 15,60 L 25,60 L 28,65" stroke="var(--role-accent)" stroke-width="1" fill="none" opacity="0.3"/>
        <path d="M 105,60 L 95,60 L 92,65" stroke="var(--role-accent)" stroke-width="1" fill="none" opacity="0.3"/>
      </svg>
    `;

    root.innerHTML = `
      <!-- Floating Action Button -->
      <button class="xyz-fab" id="xyz-fab-btn" aria-label="Open School AI Assistant">
        ${chatIcon}
      </button>

      <!-- Main Chat panel -->
      <div class="xyz-container" id="xyz-chat-panel">
        <!-- Header -->
        <div class="xyz-header">
          <div class="xyz-profile">
            <div class="xyz-avatar-mini">${config.avatarIcon}</div>
            <div class="xyz-info-text">
              <span class="xyz-info-title">${config.title}</span>
              <span class="xyz-info-status">Online Assistant</span>
            </div>
          </div>
          <div class="xyz-header-controls">
            <select class="xyz-lang-select" id="xyz-lang-picker">
              ${langOptions}
            </select>
            <button class="xyz-btn-close" id="xyz-close-btn" title="Close">
              ${voiceCloseIcon}
            </button>
          </div>
        </div>

        <!-- Chat Bubble Area -->
        <div class="xyz-messages" id="xyz-message-log"></div>

        <!-- Avatar Voice Screen Overlay (Voice-First screen) -->
        <div class="xyz-avatar-overlay" id="xyz-avatar-overlay-panel">
          <div class="xyz-avatar-svg-container">
            ${avatarFaceSvg}
          </div>
          <!-- Visualizer audio waves -->
          <div class="xyz-wave-container" id="xyz-audio-waves">
            <div class="xyz-wave-bar"></div>
            <div class="xyz-wave-bar"></div>
            <div class="xyz-wave-bar"></div>
            <div class="xyz-wave-bar"></div>
            <div class="xyz-wave-bar"></div>
          </div>
          <div class="xyz-voice-status" id="xyz-voice-status-text">Voice Active</div>
          <div class="xyz-voice-transcript" id="xyz-voice-speech-text"></div>
          <div style="margin-top: 24px;">
            <button class="xyz-mic-pulse-btn" id="xyz-mic-speech-btn" title="Toggle Mic">
              ${micIcon}
            </button>
          </div>
        </div>

        <!-- Footer / Input Form -->
        <div class="xyz-footer">
          <button class="xyz-btn-icon" id="xyz-voice-toggle-btn" title="Toggle Voice/Avatar Mode">
            ${micIcon}
          </button>
          <div class="xyz-input-wrap">
            <input type="text" class="xyz-input" id="xyz-input-box" placeholder="Ask attendance or help...">
            <button class="xyz-btn-send" id="xyz-send-btn" title="Send message">
              ${sendIcon}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    setupEventListeners();

    // Add initial bot greeting
    appendMessage("bot", config.greeting);
  }

  // SOUND SYNTHESIS FX
  function playSound(type) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'sent') {
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'received') {
        // High-low gentle chime
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'mic_on') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'mic_off') {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
      console.warn("AudioContext failed or blocked by autoplay policy", e);
    }
  }

  // WIDGET UI EVENT LISTENERS
  function setupEventListeners() {
    const fabBtn = document.getElementById("xyz-fab-btn");
    const closeBtn = document.getElementById("xyz-close-btn");
    const sendBtn = document.getElementById("xyz-send-btn");
    const inputBox = document.getElementById("xyz-input-box");
    const voiceToggleBtn = document.getElementById("xyz-voice-toggle-btn");
    const micSpeechBtn = document.getElementById("xyz-mic-speech-btn");
    const langPicker = document.getElementById("xyz-lang-picker");

    // Open/Close
    fabBtn.addEventListener("click", () => {
      isChatOpen = !isChatOpen;
      document.getElementById("xyz-chat-panel").classList.toggle("active", isChatOpen);
      fabBtn.classList.toggle("active", isChatOpen);
      if (isChatOpen) {
        inputBox.focus();
        // Trigger AudioContext resume on interaction
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      } else {
        stopAllSpeech();
      }
    });

    closeBtn.addEventListener("click", () => {
      isChatOpen = false;
      document.getElementById("xyz-chat-panel").classList.remove("active");
      fabBtn.classList.remove("active");
      stopAllSpeech();
    });

    // Send text message
    sendBtn.addEventListener("click", handleTextInput);
    inputBox.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleTextInput();
    });

    // Toggle Voice Mode
    voiceToggleBtn.addEventListener("click", toggleVoiceMode);

    // Mic push-button inside Voice Mode
    micSpeechBtn.addEventListener("click", toggleSpeechRecognition);

    // Language Change Handler
    langPicker.addEventListener("change", (e) => {
      activeLanguage = e.target.value;
      stopAllSpeech();
      appendMessage("bot", `Selected language: ${LANG_TAGS[activeLanguage].label}. Ask me anything!`);
    });

    // Avatar Eyes follow cursor (Subtle micro-interaction)
    const overlay = document.getElementById("xyz-avatar-overlay-panel");
    overlay.addEventListener("mousemove", (e) => {
      const rect = document.querySelector(".xyz-avatar-svg-container").getBoundingClientRect();
      const faceCenterX = rect.left + rect.width / 2;
      const faceCenterY = rect.top + rect.height / 2;
      
      const angle = Math.atan2(e.clientY - faceCenterY, e.clientX - faceCenterX);
      const dist = Math.min(2.5, Math.hypot(e.clientX - faceCenterX, e.clientY - faceCenterY) / 40);
      
      const pupilL = document.getElementById("pupil-left");
      const pupilR = document.getElementById("pupil-right");
      
      if (pupilL && pupilR) {
        pupilL.setAttribute("cx", 45 + Math.cos(angle) * dist);
        pupilL.setAttribute("cy", 52 + Math.sin(angle) * dist);
        pupilR.setAttribute("cx", 75 + Math.cos(angle) * dist);
        pupilR.setAttribute("cy", 52 + Math.sin(angle) * dist);
      }
    });

    // Animate Blinking Eyes periodically
    setInterval(() => {
      const leftEyebrow = document.getElementById("eyebrow-left");
      const rightEyebrow = document.getElementById("eyebrow-right");
      
      if (leftEyebrow && rightEyebrow) {
        // Simulating blinking by moving eyebrows or shifting eyes - in standard SVG we can alter scale
        // Let's perform a simple blink CSS scale animation on pupils
        const pupilL = document.getElementById("pupil-left");
        const pupilR = document.getElementById("pupil-right");
        
        if (pupilL && pupilR) {
          pupilL.setAttribute("r", 0.5);
          pupilR.setAttribute("r", 0.5);
          setTimeout(() => {
            pupilL.setAttribute("r", 3);
            pupilR.setAttribute("r", 3);
          }, 150);
        }
      }
    }, 4500);
  }

  // TOGGLE VOICE MODE SCREEN
  function toggleVoiceMode() {
    isVoiceMode = !isVoiceMode;
    const overlay = document.getElementById("xyz-avatar-overlay-panel");
    const voiceToggleBtn = document.getElementById("xyz-voice-toggle-btn");
    
    if (isVoiceMode) {
      overlay.classList.add("active");
      voiceToggleBtn.classList.add("active");
      startSpeechRecognition();
    } else {
      overlay.classList.remove("active");
      voiceToggleBtn.classList.remove("active");
      stopAllSpeech();
    }
  }

  // DISPLAY MESSAGE BUBBLE
  function appendMessage(sender, text, options = {}) {
    const msgLog = document.getElementById("xyz-message-log");
    
    // Remove typing indicator if present
    const typing = document.querySelector(".xyz-typing");
    if (typing) typing.remove();

    const msg = document.createElement("div");
    msg.className = `xyz-msg ${sender}`;
    msg.innerHTML = `<div>${text}</div>`;

    // Handle Custom Escalation Actions Buttons Injection
    if (options.actions === "escalate") {
      const actionsPanel = document.createElement("div");
      actionsPanel.className = "xyz-actions-panel";
      
      const teacherBtn = document.createElement("button");
      teacherBtn.className = "xyz-action-btn";
      teacherBtn.innerText = "Talk to Teacher";
      teacherBtn.onclick = () => handleEscalationSubmit("Teacher Call", "Mrs. Sharma requested call regarding student.");
      
      const mgmtBtn = document.createElement("button");
      mgmtBtn.className = "xyz-action-btn";
      mgmtBtn.innerText = "Contact School Management";
      mgmtBtn.onclick = () => handleEscalationSubmit("Management Call", "Mrs. Sharma requested direct school management contact.");
      
      actionsPanel.appendChild(teacherBtn);
      actionsPanel.appendChild(mgmtBtn);
      msg.appendChild(actionsPanel);
    }

    msgLog.appendChild(msg);
    msgLog.scrollTop = msgLog.scrollHeight;
    
    // Add to history
    conversationHistory.push({ sender, text });
    if (conversationHistory.length > 20) conversationHistory.shift();

    if (sender === 'bot') {
      playSound('received');
      // Sync DB states across pages on bot action
      triggerPageSyncNotification();
    }
  }

  // SYNC NOTIFICATION DISPATCHER
  function triggerPageSyncNotification() {
    // Notify iframe/parent window about backend data change
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'XYZ_DATA_SYNC' }, '*');
    }
    // Custom trigger event locally
    const syncEvent = new CustomEvent('xyz-erp-sync');
    document.dispatchEvent(syncEvent);
  }

  // DISPLAY TYPING INDICATOR
  function showTypingIndicator() {
    const msgLog = document.getElementById("xyz-message-log");
    const typing = document.createElement("div");
    typing.className = "xyz-msg bot xyz-typing";
    typing.innerHTML = `<span></span><span></span><span></span>`;
    msgLog.appendChild(typing);
    msgLog.scrollTop = msgLog.scrollHeight;
  }

  // ESCALATION DIRECT DATABASE REGISTER
  function handleEscalationSubmit(type, message) {
    appendMessage("user", `I want to proceed with: ${type}`);
    showTypingIndicator();
    
    fetch(`${API_BASE_URL}/api/escalation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: role,
        name: userName,
        type: type,
        message: message
      })
    })
    .then(res => res.json())
    .then(data => {
      setTimeout(() => {
        const target = (type === "Teacher Call") ? "Teacher" : "School Management";
        appendMessage("bot", `Your call request has been submitted successfully to the ${target}. They will get back to you shortly.`);
        triggerPageSyncNotification();
      }, 800);
    })
    .catch(err => {
      console.error(err);
      appendMessage("bot", "Unable to log request at this moment, please try again.");
    });
  }

  // INPUT LOGIC
  function handleTextInput() {
    const inputBox = document.getElementById("xyz-input-box");
    const text = inputBox.value.trim();
    if (!text) return;

    inputBox.value = "";
    sendMessage(text);
  }

  // CORE CHAT API CALL
  function sendMessage(text) {
    appendMessage("user", text);
    playSound('sent');
    showTypingIndicator();

    // Prepare API body
    const body = {
      message: text,
      role: role,
      language: activeLanguage,
      history: conversationHistory.slice(0, -1) // remove the one just added
    };

    const savedKey = localStorage.getItem('gemini_api_key') || "";
    const headers = { 'Content-Type': 'application/json' };
    if (savedKey) {
      headers['x-gemini-key'] = savedKey;
    }

    fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
      const typing = document.querySelector(".xyz-typing");
      if (typing) typing.remove();
      
      const responseText = data.response;
      
      // Handle special action triggers in frontend UI
      let options = {};
      if (data.actionTriggered === "escalate_offer") {
        options.actions = "escalate";
      }

      appendMessage("bot", responseText, options);

      // Speak if in voice mode
      if (isVoiceMode) {
        speakResponse(responseText);
      }
    })
    .catch(err => {
      console.error("Chat service error:", err);
      const typing = document.querySelector(".xyz-typing");
      if (typing) typing.remove();
      appendMessage("bot", "I am having trouble connecting to the school network right now. Please try again.");
    });
  }

  // SPEECH-TO-TEXT (RECOGNITION)
  function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      document.getElementById("xyz-voice-speech-text").innerText = "Speech input is not supported in this browser. Try Chrome.";
      return;
    }

    if (speechRecognition) speechRecognition.abort();

    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = true;
    speechRecognition.lang = LANG_TAGS[activeLanguage].tag;

    const speechText = document.getElementById("xyz-voice-speech-text");
    const statusText = document.getElementById("xyz-voice-status-text");
    const waves = document.getElementById("xyz-audio-waves");
    const micBtn = document.getElementById("xyz-mic-speech-btn");

    speechRecognition.onstart = () => {
      isListening = true;
      playSound('mic_on');
      statusText.innerText = "Listening...";
      speechText.innerText = "";
      waves.classList.add("listening");
      micBtn.classList.add("listening");
    };

    speechRecognition.onresult = (e) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        transcript += e.results[i][0].transcript;
      }
      speechText.innerText = transcript;
    };

    speechRecognition.onerror = (e) => {
      console.error("STT Error:", e);
      statusText.innerText = "Listening failed.";
      waves.classList.remove("listening");
      micBtn.classList.remove("listening");
      isListening = false;
    };

    speechRecognition.onend = () => {
      waves.classList.remove("listening");
      micBtn.classList.remove("listening");
      isListening = false;
      playSound('mic_off');
      statusText.innerText = "Tap mic to speak";
      
      const text = speechText.innerText.trim();
      if (text) {
        sendMessage(text);
      }
    };

    speechRecognition.start();
  }

  function toggleSpeechRecognition() {
    if (isListening) {
      speechRecognition.stop();
    } else {
      // If bot is speaking, stop it first
      if (isSpeaking) stopAllSpeech();
      startSpeechRecognition();
    }
  }

  // TEXT-TO-SPEECH (SYNTHESIS) & AVATAR LIP-SYNC
  function speakResponse(text) {
    if (!window.speechSynthesis) return;
    
    stopAllSpeech();

    // Clean text for speech synthesis (strip code blocks, markers, emojis)
    let cleanText = text.replace(/[*#`_\-]/g, "")
                        .replace(/:[a-z0-9_]+:/g, "")
                        .replace(/[^\w\s\u00C0-\u1FFF\u2C00-\uD7FF\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0C80-\u0CFF\u0D00-\u0D7F.,?!\u0600-\u06FF]/g, "");

    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.lang = LANG_TAGS[activeLanguage].tag;
    
    // Pick an appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(LANG_TAGS[activeLanguage].tag.slice(0, 2)));
    if (voice) currentUtterance.voice = voice;

    const statusText = document.getElementById("xyz-voice-status-text");

    currentUtterance.onstart = () => {
      isSpeaking = true;
      statusText.innerText = "Speaking...";
      startLipSync();
    };

    currentUtterance.onend = () => {
      isSpeaking = false;
      statusText.innerText = "Tap mic to speak";
      stopLipSync();
      // Auto resume listening after bot is done speaking
      setTimeout(() => {
        if (isVoiceMode && !isListening) {
          startSpeechRecognition();
        }
      }, 300);
    };

    currentUtterance.onerror = (e) => {
      console.error("TTS Error:", e);
      isSpeaking = false;
      stopLipSync();
    };

    window.speechSynthesis.speak(currentUtterance);
  }

  function stopAllSpeech() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (speechRecognition) {
      speechRecognition.abort();
    }
    isSpeaking = false;
    isListening = false;
    stopLipSync();
    
    const waves = document.getElementById("xyz-audio-waves");
    const micBtn = document.getElementById("xyz-mic-speech-btn");
    const statusText = document.getElementById("xyz-voice-status-text");
    if (waves) waves.classList.remove("listening");
    if (micBtn) micBtn.classList.remove("listening");
    if (statusText) statusText.innerText = "Tap mic to speak";
  }

  // AVATAR LIP-SYNC ANIMATOR
  // Cycles path strings for the SVG mouth to simulate lip movements matching speaking cadences.
  function startLipSync() {
    const mouth = document.getElementById("avatar-mouth");
    if (!mouth) return;

    // Define 4 phoneme mouth shapes (Mouth coordinate space is X:0-120, Y:0-120)
    const shapes = [
      "M 46,75 Q 60,95 74,75",   // Open 'A' (Wide oval)
      "M 52,70 C 52,85 68,85 68,70", // Open 'O' (Taller oval)
      "M 48,76 Q 60,82 72,76",   // Open 'E' (Flat oval)
      "M 50,78 L 70,78"          // Neutral flat line
    ];

    let cycle = 0;
    lipSyncInterval = setInterval(() => {
      // Pick a random shape from the set, simulating mouth movements
      const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
      mouth.setAttribute("d", randomShape);
      
      // Pulse the wave visualizer bars slightly during speech
      const waveBars = document.querySelectorAll("#xyz-audio-waves .xyz-wave-bar");
      waveBars.forEach(bar => {
        const height = Math.floor(Math.random() * 24) + 6;
        bar.style.height = `${height}px`;
      });
    }, 110);
  }

  function stopLipSync() {
    if (lipSyncInterval) clearInterval(lipSyncInterval);
    const mouth = document.getElementById("avatar-mouth");
    if (mouth) {
      // Restore standard smiling mouth path
      mouth.setAttribute("d", "M 48,75 Q 60,88 72,75");
    }
    // Flatten wave bars
    const waveBars = document.querySelectorAll("#xyz-audio-waves .xyz-wave-bar");
    waveBars.forEach(bar => {
      bar.style.height = `6px`;
    });
  }

  // AUTO INITIALIZATION ON PAGE LOAD
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectWidget);
  } else {
    injectWidget();
  }
})();
