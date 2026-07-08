/**
 * AI Interview Coach - Core JavaScript Application
 * 
 * This file coordinates the client-side logic for the single-page application.
 * It manages:
 * - LocalStorage state of the user's Gemini API key (with config.js fallback).
 * - Target job role autocomplete suggestions list.
 * - Form collection, custom validation, and loading animations.
 * - Async/Await calls to the Gemini 2.5 Flash API with JSON schema enforcement.
 * - Dynamic generation and mounting of HTML cards.
 * - Interactivity for tabs on the question cards (Answers, Revision, Pitfalls).
 * - A clean notification toast system.
 * 
 * NEW FEATURES ADDED:
 * - Mock Interview Mode: Live interview flow with 10 sequential questions.
 * - AI-powered Answer Evaluations: Score (0-10) and feedback cards.
 * - Dynamic AI Follow-up Questions based on user responses.
 * - Local Storage Session History page modal (review details or clear records).
 * - Summary scoreboards with circular rings and KPI cards.
 * - Strong vs Weak area visual badge indicators.
 * - Personalized 7-Day Study Roadmap cards.
 */

// ============================================================================
// 1. Application Configurations & Constants
// ============================================================================

// Autocomplete recommendations for the target Job Role input field
const SUGGESTED_ROLES = [
    // Web & Software Development
    "Software Engineer",
    "Frontend Engineer",
    "Backend Engineer",
    "Full Stack Developer",
    "Mobile App Developer (iOS/Android)",
    "Game Developer",
    "Embedded Systems Engineer",
    "Firmware Engineer",
    "Solutions Architect",
    "Systems Engineer",
    
    // QA & Testing
    "QA Manual Tester",
    "QA Automation Engineer",
    "SDET (Software Development Engineer in Test)",
    
    // Data & AI
    "Data Scientist",
    "Machine Learning Engineer",
    "AI / Deep Learning Specialist",
    "Data Engineer",
    "Data Analyst",
    "Business Intelligence (BI) Analyst",
    "Database Administrator (DBA)",
    "Data Warehouse Architect",
    
    // Cloud, DevOps & Infrastructure
    "DevOps Engineer",
    "Site Reliability Engineer (SRE)",
    "Cloud Architect (AWS/GCP/Azure)",
    "Cloud Security Engineer",
    "Systems Administrator (SysAdmin)",
    "Network Engineer",
    "IT Support Specialist",
    
    // Cyber Security
    "Cybersecurity Analyst",
    "Security Consultant",
    "Penetration Tester / Ethical Hacker",
    "Information Security Manager",
    
    // Design & Product Management
    "Product Manager",
    "Project Manager",
    "Program Manager",
    "Scrum Master",
    "Business Analyst",
    "UX/UI Designer",
    "Product Designer",
    "UX Researcher",
    
    // Enterprise Platforms & Technical Specialist
    "Salesforce Developer",
    "Salesforce Administrator",
    "SAP Consultant",
    "CRM Specialist",
    "Technical Writer"
];

// Fun, interactive status messages to cycle through during the Gemini API generation phase
const LOADING_MESSAGES = [
    "Contacting AI Interview Coach...",
    "Analyzing your target job role requirements...",
    "Calibrating question difficulty levels...",
    "Formulating technical interview queries...",
    "Drafting detailed, industry-standard model answers...",
    "Compiling critical revision terms and theoretical concepts...",
    "Summarizing common mistakes candidates usually make...",
    "Polishing response cards and rendering your dashboard..."
];

// ============================================================================
// 2. Global State Variables
// ============================================================================
let appState = {
    apiKey: "",             // Active Gemini API key (from local storage or config.js)
    aiProvider: "gemini",   // Active AI provider: 'gemini' or 'ollama'
    ollamaUrl: "http://localhost:11434", // Local Ollama endpoint
    ollamaModel: "llama3.2:latest",       // Local Ollama model name
    loadingIntervalId: null, // Reference for cycling loading messages
    sessionMode: "prep",    // Active session type: 'prep' (Study Pack) or 'mock' (Live Mock)
    
    // Interactive Mock Interview states
    mockSession: {
        currentQuestionIndex: 0,
        totalQuestions: 10,
        role: "",
        level: "",
        difficulty: "",
        focusArea: "Technical", // 'Technical', 'HR', 'Behavioral', 'System Design', 'Mixed'
        answerStyle: "Detailed", // 'Detailed', 'Short'
        nextQuestionText: "",   // Pre-fetched question from evaluation step
        questionsLog: [],       // Array of { question, userAnswer, evaluation }
        finalReport: null       // Dynamic summary dashboard
    }
};

// ============================================================================
// 3. Initialization & Document Ready Event
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Load active API key from Storage or config.js
    initializeApiKey();

    // 2. Setup all UI Event Listeners
    setupEventListeners();

    // 3. Render Initial API status indicators
    updateApiStatusUI();

    // 4. Initialize Custom Select Dropdowns
    initializeCustomSelects();

    // 5. Initialize SVG Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// ============================================================================
// 4. API Key Management
// ============================================================================

/**
 * Checks for a configured Gemini API key, prioritizing LocalStorage first,
 * and falling back to the GEMINI_CONFIG global variable inside config.js.
 */
function initializeApiKey() {
    // Try browser local storage first
    const savedKey = localStorage.getItem("GEMINI_API_KEY");
    
    if (savedKey && savedKey.trim() !== "") {
        appState.apiKey = savedKey.trim();
    } 
    // Fall back to config.js if defined
    else if (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.API_KEY && GEMINI_CONFIG.API_KEY.trim() !== "") {
        appState.apiKey = GEMINI_CONFIG.API_KEY.trim();
    } else {
        appState.apiKey = "";
    }

    // Load AI provider settings
    const savedProvider = localStorage.getItem("GEMINI_API_PROVIDER");
    if (savedProvider === "gemini" || savedProvider === "ollama") {
        appState.aiProvider = savedProvider;
    }

    const savedOllamaUrl = localStorage.getItem("GEMINI_OLLAMA_URL");
    if (savedOllamaUrl && savedOllamaUrl.trim() !== "") {
        appState.ollamaUrl = savedOllamaUrl.trim();
    }

    const savedOllamaModel = localStorage.getItem("GEMINI_OLLAMA_MODEL");
    if (savedOllamaModel && savedOllamaModel.trim() !== "") {
        appState.ollamaModel = savedOllamaModel.trim();
    }
}

/**
 * Saves a new API key locally in the browser's localStorage.
 * @param {string} newKey - The string to set as the API Key
 */
function saveApiKey(newKey) {
    if (newKey && newKey.trim() !== "") {
        const cleanedKey = newKey.trim();
        localStorage.setItem("GEMINI_API_KEY", cleanedKey);
        appState.apiKey = cleanedKey;
        return true;
    }
    return false;
}

/**
 * Deletes the configured API key from localStorage and resets state.
 */
function clearApiKey() {
    localStorage.removeItem("GEMINI_API_KEY");
    appState.apiKey = "";
    
    // Check fallback config.js again just in case
    if (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.API_KEY && GEMINI_CONFIG.API_KEY.trim() !== "") {
        showToast("Key Reset to Default", "Local key cleared. Falling back to key defined in config.js.", "warning");
        appState.apiKey = GEMINI_CONFIG.API_KEY.trim();
    } else {
        showToast("Key Cleared", "Gemini API key has been removed from browser storage.", "success");
    }
    
    updateApiStatusUI();
}

/**
 * Updates UI markers showing if the Gemini API has been set up successfully.
 */
function updateApiStatusUI() {
    const keyStatusBox = document.getElementById("key-status-box");
    const keyStatusText = document.getElementById("key-status-text");
    const headerStatusBtn = document.getElementById("btn-settings-toggle");
    const warningBanner = document.getElementById("placeholder-api-warning");

    const headerStatusSpan = headerStatusBtn ? headerStatusBtn.querySelector("span") : null;

    if (appState.aiProvider === "ollama") {
        // Local Ollama Active State
        if (keyStatusBox) {
            keyStatusBox.className = "api-key-status-indicator configured";
            keyStatusText.textContent = `Ollama: ${appState.ollamaModel}`;
        }
        if (headerStatusBtn) {
            headerStatusBtn.style.borderColor = "var(--color-primary)";
            if (headerStatusSpan) headerStatusSpan.textContent = `Ollama: ${appState.ollamaModel}`;
        }
        if (warningBanner) {
            warningBanner.classList.add("hidden");
        }
    } else {
        // Google Gemini State
        if (headerStatusSpan) headerStatusSpan.textContent = "API Config";
        
        if (appState.apiKey && appState.apiKey.length > 5) {
            // Connected State
            if (keyStatusBox) {
                keyStatusBox.className = "api-key-status-indicator configured";
                keyStatusText.textContent = "API Key Configured";
            }
            if (headerStatusBtn) {
                headerStatusBtn.style.borderColor = "var(--color-success)";
            }
            if (warningBanner) {
                warningBanner.classList.add("hidden");
            }
        } else {
            // Disconnected State
            if (keyStatusBox) {
                keyStatusBox.className = "api-key-status-indicator unconfigured";
                keyStatusText.textContent = "Not Configured";
            }
            if (headerStatusBtn) {
                headerStatusBtn.style.borderColor = "var(--color-border)";
            }
            if (warningBanner) {
                warningBanner.classList.remove("hidden");
            }
        }
    }
}

// ============================================================================
// 5. Autocomplete & Dropdowns Suggestions
// ============================================================================

/**
 * Connects the Job Role input field to dynamic suggestions.
 */
function setupAutocomplete() {
    const roleInput = document.getElementById("job-role-input");
    const suggestionsList = document.getElementById("autocomplete-suggestions");
    
    if (!roleInput || !suggestionsList) return;

    // Filter and show autocomplete elements on input
    roleInput.addEventListener("input", () => {
        const query = roleInput.value.toLowerCase().trim();
        suggestionsList.innerHTML = "";

        if (query === "") {
            suggestionsList.classList.add("hidden");
            return;
        }

        const matches = SUGGESTED_ROLES.filter(role => role.toLowerCase().includes(query));

        if (matches.length === 0) {
            suggestionsList.classList.add("hidden");
            return;
        }

        // Render matching suggestions
        matches.forEach(match => {
            const div = document.createElement("div");
            div.className = "suggestion-item";
            div.textContent = match;
            
            // Set selection on click
            div.addEventListener("click", () => {
                roleInput.value = match;
                suggestionsList.classList.add("hidden");
            });

            suggestionsList.appendChild(div);
        });

        suggestionsList.classList.remove("hidden");
    });

    // Close suggestions box if user clicks outside
    document.addEventListener("click", (e) => {
        if (e.target !== roleInput && e.target !== suggestionsList) {
            suggestionsList.classList.add("hidden");
        }
    });

    // Keyboard accessibility (Escape to close suggestions)
    roleInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            suggestionsList.classList.add("hidden");
        }
    });
}

// ============================================================================
// 6. UI Navigation & Event Bindings
// ============================================================================

function setupEventListeners() {
    // 1. Navbar Page-scroll Adjustments
    const links = document.querySelectorAll(".nav-link");
    links.forEach(link => {
        link.addEventListener("click", (e) => {
            links.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            resetWorkspacesToHome();
        });
    });
    
    const logoLink = document.getElementById("nav-logo");
    if (logoLink) {
        logoLink.addEventListener("click", () => {
            resetWorkspacesToHome();
        });
    }

    // 2. Settings Modal Event Listeners
    const settingsToggle = document.getElementById("btn-settings-toggle");
    const settingsCancel = document.getElementById("btn-settings-cancel");
    const settingsSave = document.getElementById("btn-settings-save");
    const settingsClear = document.getElementById("btn-settings-clear");
    const settingsClose = document.getElementById("btn-settings-close");
    const heroConfig = document.getElementById("btn-hero-config");
    const keyInput = document.getElementById("settings-api-key");
    const visibilityBtn = document.getElementById("btn-toggle-key-visibility");

    const geminiRadio = document.getElementById("provider-gemini");
    const ollamaRadio = document.getElementById("provider-ollama");
    const geminiSection = document.getElementById("settings-section-gemini");
    const ollamaSection = document.getElementById("settings-section-ollama");

    const toggleProviderSections = () => {
        if (ollamaRadio && ollamaRadio.checked) {
            if (geminiSection) geminiSection.classList.add("hidden");
            if (ollamaSection) ollamaSection.classList.remove("hidden");
        } else {
            if (ollamaSection) ollamaSection.classList.add("hidden");
            if (geminiSection) geminiSection.classList.remove("hidden");
        }
    };

    if (geminiRadio) geminiRadio.addEventListener("change", toggleProviderSections);
    if (ollamaRadio) ollamaRadio.addEventListener("change", toggleProviderSections);

    const modelSelect = document.getElementById("settings-ollama-model-select");
    const customModelGroup = document.getElementById("custom-ollama-model-group");
    const customModelInput = document.getElementById("settings-ollama-model-custom");

    const checkOllamaModelSelection = () => {
        if (modelSelect && modelSelect.value === "custom") {
            if (customModelGroup) customModelGroup.classList.remove("hidden");
        } else {
            if (customModelGroup) customModelGroup.classList.add("hidden");
        }
    };

    if (modelSelect) modelSelect.addEventListener("change", checkOllamaModelSelection);

    const openSettings = () => {
        if (keyInput) {
            keyInput.value = appState.apiKey || "";
        }
        
        // Active provider setup
        if (appState.aiProvider === "ollama") {
            if (ollamaRadio) ollamaRadio.checked = true;
            if (geminiRadio) geminiRadio.checked = false;
        } else {
            if (geminiRadio) geminiRadio.checked = true;
            if (ollamaRadio) ollamaRadio.checked = false;
        }
        toggleProviderSections();

        // Ollama values
        const ollamaUrlInput = document.getElementById("settings-ollama-url");
        if (ollamaUrlInput) {
            ollamaUrlInput.value = appState.ollamaUrl || "http://localhost:11434";
        }

        if (modelSelect) {
            const dropdownOptions = Array.from(modelSelect.options).map(opt => opt.value);
            if (dropdownOptions.includes(appState.ollamaModel)) {
                modelSelect.value = appState.ollamaModel;
                if (customModelInput) customModelInput.value = "";
            } else {
                modelSelect.value = "custom";
                if (customModelInput) {
                    customModelInput.value = appState.ollamaModel || "";
                }
            }
            checkOllamaModelSelection();
            
            // Sync custom visual select styles
            syncCustomSelects();
        }

        document.getElementById("settings-modal").classList.add("active");
    };

    const closeSettings = () => {
        document.getElementById("settings-modal").classList.remove("active");
    };

    if (settingsToggle) settingsToggle.addEventListener("click", openSettings);
    if (heroConfig) heroConfig.addEventListener("click", openSettings);
    if (settingsCancel) settingsCancel.addEventListener("click", closeSettings);
    if (settingsClose) settingsClose.addEventListener("click", closeSettings);

    if (settingsSave) {
        settingsSave.addEventListener("click", () => {
            const activeProvider = (ollamaRadio && ollamaRadio.checked) ? "ollama" : "gemini";
            
            if (activeProvider === "gemini") {
                const enteredKey = keyInput.value.trim();
                if (enteredKey === "") {
                    showToast("Key Cannot Be Empty", "Please enter a valid Gemini API key or click Cancel.", "error");
                    return;
                }
                saveApiKey(enteredKey);
                appState.aiProvider = "gemini";
                localStorage.setItem("GEMINI_API_PROVIDER", "gemini");
            } else {
                // Ollama
                const ollamaUrlInput = document.getElementById("settings-ollama-url");
                const enteredUrl = ollamaUrlInput ? ollamaUrlInput.value.trim() : "http://localhost:11434";
                if (enteredUrl === "") {
                    showToast("Ollama URL Required", "Please enter a valid Ollama endpoint URL.", "error");
                    return;
                }

                let selectedModel = modelSelect ? modelSelect.value : "llama3.2:latest";
                if (selectedModel === "custom") {
                    selectedModel = customModelInput ? customModelInput.value.trim() : "";
                    if (selectedModel === "") {
                        showToast("Model Name Required", "Please enter a custom Ollama model name.", "error");
                        return;
                    }
                }

                appState.aiProvider = "ollama";
                appState.ollamaUrl = enteredUrl;
                appState.ollamaModel = selectedModel;
                
                localStorage.setItem("GEMINI_API_PROVIDER", "ollama");
                localStorage.setItem("GEMINI_OLLAMA_URL", enteredUrl);
                localStorage.setItem("GEMINI_OLLAMA_MODEL", selectedModel);
            }
            
            updateApiStatusUI();
            closeSettings();
            showToast("Settings Updated", "Your AI Provider configuration has been saved.", "success");
        });
    }

    if (settingsClear) {
        settingsClear.addEventListener("click", () => {
            if (confirm("Are you sure you want to clear your AI and model settings?")) {
                if (keyInput) keyInput.value = "";
                localStorage.removeItem("GEMINI_API_KEY");
                localStorage.removeItem("GEMINI_API_PROVIDER");
                localStorage.removeItem("GEMINI_OLLAMA_URL");
                localStorage.removeItem("GEMINI_OLLAMA_MODEL");
                
                appState.apiKey = "";
                appState.aiProvider = "gemini";
                appState.ollamaUrl = "http://localhost:11434";
                appState.ollamaModel = "llama3.2:latest";
                
                if (geminiRadio) geminiRadio.checked = true;
                if (ollamaRadio) ollamaRadio.checked = false;
                toggleProviderSections();

                if (modelSelect) {
                    modelSelect.value = "llama3.2:latest";
                    checkOllamaModelSelection();
                }
                if (customModelInput) customModelInput.value = "";

                syncCustomSelects();
                updateApiStatusUI();
                showToast("Settings Reset", "Settings have been reset to defaults.", "warning");
            }
        });
    }

    if (visibilityBtn && keyInput) {
        visibilityBtn.addEventListener("click", () => {
            const isPassword = keyInput.getAttribute("type") === "password";
            keyInput.setAttribute("type", isPassword ? "text" : "password");
            
            const eyeIcon = visibilityBtn.querySelector("i");
            if (eyeIcon) {
                eyeIcon.setAttribute("data-lucide", isPassword ? "eye-off" : "eye");
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    // 3. History Modal Event Listeners
    const historyToggle = document.getElementById("btn-history-toggle");
    const historyClose = document.getElementById("btn-history-close");
    const historyCancel = document.getElementById("btn-history-cancel");
    const historyClearAll = document.getElementById("btn-history-clear-all");
    const historyModal = document.getElementById("history-modal");

    const openHistory = () => {
        renderHistoryModalList();
        historyModal.classList.add("active");
    };

    const closeHistory = () => {
        historyModal.classList.remove("active");
    };

    if (historyToggle) historyToggle.addEventListener("click", openHistory);
    if (historyClose) historyClose.addEventListener("click", closeHistory);
    if (historyCancel) historyCancel.addEventListener("click", closeHistory);
    if (historyClearAll) {
        historyClearAll.addEventListener("click", () => {
            if (confirm("Are you sure you want to clear your complete interview history? This cannot be undone.")) {
                clearAllHistoryLogs();
                closeHistory();
            }
        });
    }

    // 4. Session Mode Selector Change
    const modePrepRadio = document.getElementById("mode-prep");
    const modeMockRadio = document.getElementById("mode-mock");
    const generateBtn = document.getElementById("btn-generate");
    const updateModeSelectionUI = () => {
        if (!generateBtn) return;
        const span = generateBtn.querySelector("span");
        const icon = generateBtn.querySelector("i") || generateBtn.querySelector("svg");

        if (modeMockRadio && modeMockRadio.checked) {
            appState.sessionMode = "mock";
            if (span) span.textContent = "Start Mock Interview";
            if (icon && typeof icon.setAttribute === 'function') {
                icon.setAttribute("data-lucide", "award");
            }
        } else {
            appState.sessionMode = "prep";
            if (span) span.textContent = "Generate Questions";
            if (icon && typeof icon.setAttribute === 'function') {
                icon.setAttribute("data-lucide", "wand2");
            }
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    if (modePrepRadio) modePrepRadio.addEventListener("change", updateModeSelectionUI);
    if (modeMockRadio) modeMockRadio.addEventListener("change", updateModeSelectionUI);

    // 5. Textarea Character Counter for Mock Mode
    const answerTextarea = document.getElementById("mock-user-answer");
    const charCounter = document.getElementById("mock-char-counter");
    if (answerTextarea && charCounter) {
        answerTextarea.addEventListener("input", () => {
            const count = answerTextarea.value.length;
            charCounter.textContent = `${count} characters`;
            if (count < 10) {
                charCounter.style.color = "var(--color-warning)";
            } else {
                charCounter.style.color = "var(--color-text-muted)";
            }
        });
    }

    // 6. Autocomplete Setup
    setupAutocomplete();

    // 7. Form Submit & Mode Routing
    const form = document.getElementById("interview-generator-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            if (appState.sessionMode === "mock") {
                startMockInterviewFlow();
            } else {
                generateInterviewContent();
            }
        });
    }

    // Retry action inside error workspace state
    const retryBtn = document.getElementById("btn-error-retry");
    if (retryBtn) {
        retryBtn.addEventListener("click", () => {
            if (appState.sessionMode === "mock") {
                startMockInterviewFlow();
            } else {
                generateInterviewContent();
            }
        });
    }

    // 8. Interactive Mock Mode Event bindings
    const mockSubmitBtn = document.getElementById("btn-mock-submit");
    if (mockSubmitBtn) {
        mockSubmitBtn.addEventListener("click", () => {
            submitMockAnswer();
        });
    }

    const evalNextBtn = document.getElementById("btn-eval-next");
    if (evalNextBtn) {
        evalNextBtn.addEventListener("click", () => {
            advanceMockQuestion();
        });
    }

    const reportExitBtn = document.getElementById("btn-report-exit");
    if (reportExitBtn) {
        reportExitBtn.addEventListener("click", () => {
            resetWorkspacesToHome();
        });
    }
}

function resetWorkspacesToHome() {
    // Switch to Home hash
    document.getElementById("link-home").classList.add("active");
    document.getElementById("link-dashboard").classList.remove("active");
    
    toggleWorkspaceState("placeholder");
}

// ============================================================================
// 7. Gemini API Generative Service: STUDY PREP PACK
// ============================================================================

/**
 * Collects form inputs, prepares loading state animations, calls the 
 * Gemini API asynchronously, and triggers output formatting for PREP mode.
 */
/**
 * Cleans markdown code block wraps from JSON string text.
 */
function cleanJsonResponseText(rawText) {
    if (!rawText) return "";
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
}

/**
 * Robust fetch wrapper for local Ollama API generation.
 */
async function performOllamaCall(requestPayload) {
    const promptText = requestPayload.contents?.[0]?.parts?.[0]?.text || "";
    
    // Build parameters payload for Ollama generate API
    const ollamaPayload = {
        model: appState.ollamaModel,
        prompt: promptText,
        format: "json",
        stream: false
    };

    console.log(`[Ollama API] Calling local model: "${appState.ollamaModel}"`);
    console.log(`[Ollama API] URL: ${appState.ollamaUrl}/api/generate`);

    let response;
    try {
        response = await fetch(`${appState.ollamaUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ollamaPayload)
        });
    } catch (networkErr) {
        console.error(`[Ollama API] Connection failed:`, networkErr);
        throw new Error(`Connection to local Ollama failed. Make sure Ollama is running at ${appState.ollamaUrl} and that CORS origins allow your site (e.g., set environment variable OLLAMA_ORIGINS="*" before starting Ollama).`);
    }

    console.log(`[Ollama API] Response status received: ${response.status}`);

    if (!response.ok) {
        throw new Error(`Ollama service returned HTTP status ${response.status}`);
    }

    const data = await response.json();
    let responseText = data.response;
    if (!responseText) {
        throw new Error("Empty response received from the local Ollama model.");
    }

    return cleanJsonResponseText(responseText);
}

/**
 * Centralized, robust wrapper to make calls to the Gemini or Ollama AI services.
 * Handles model fallback (retrying with gemini-1.5-flash if gemini-2.5-flash fails),
 * logs request/response payloads in detail, and parses error responses.
 */
async function callGeminiApi(requestPayload, customErrorMessage = "API call failed") {
    console.log(`[API Log] Central callGeminiApi invoked. Provider: ${appState.aiProvider}`);
    console.log(`[API Log] Request Payload generated:`, JSON.parse(JSON.stringify(requestPayload)));

    if (appState.aiProvider === "ollama") {
        return await performOllamaCall(requestPayload);
    }

    const primaryModel = "gemini-2.5-flash";
    const fallbackModel = "gemini-1.5-flash";
    
    const performCall = async (modelName) => {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${appState.apiKey}`;
        console.log(`[API Log] API request started. URL: https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?...`);
        console.log(`[API Log] Target Model: ${modelName}`);

        let response;
        try {
            response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestPayload)
            });
        } catch (networkErr) {
            console.error(`[API Log] Network error occurred:`, networkErr);
            throw new Error("Network error: Please verify your internet connection or check if the API host is blocked.");
        }

        console.log(`[API Log] API response status received: ${response.status}`);

        if (!response.ok) {
            let errorMsg = `HTTP status ${response.status}`;
            let errorJson = {};
            try {
                errorJson = await response.json();
                if (errorJson.error?.message) {
                    errorMsg = errorJson.error.message;
                }
            } catch (e) {
                // Ignore json parse error
            }

            console.error(`[API Log] Error response payload received:`, errorJson);
            
            // Map specific statuses to human-friendly diagnostic messages
            let resolvedError;
            if (response.status === 400) {
                resolvedError = new Error(`Invalid request format (400): ${errorMsg}`);
                resolvedError.status = 400;
            } else if (response.status === 401 || response.status === 403) {
                resolvedError = new Error(`Invalid API Key (401/403): Please configure a valid Gemini API key in settings.`);
                resolvedError.status = response.status;
            } else if (response.status === 429) {
                resolvedError = new Error(`Rate limit exceeded (429): You have sent too many requests. Please wait a minute and try again.`);
                resolvedError.status = 429;
            } else if (response.status === 503) {
                resolvedError = new Error(`Service Unavailable (503): ${errorMsg}`);
                resolvedError.status = 503;
            } else if (response.status === 404) {
                resolvedError = new Error(`Model not found (404): ${errorMsg}`);
                resolvedError.status = 404;
            } else {
                resolvedError = new Error(`API returned HTTP status ${response.status}: ${errorMsg}`);
                resolvedError.status = response.status;
            }
            throw resolvedError;
        }

        const data = await response.json();
        console.log(`[API Log] Full response payload successfully received. Candidates count: ${data.candidates?.length || 0}`);
        
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) {
            console.error(`[API Log] Candidates parse failed:`, data);
            throw new Error("Empty response received from the Gemini model.");
        }

        return cleanJsonResponseText(jsonText);
    };

    try {
        // Try with primary model first
        return await performCall(primaryModel);
    } catch (err) {
        // If it's a 503 (service unavailable) or 404 (not found), try with fallback
        if (err.status === 503 || err.status === 404) {
            console.warn(`[API Log] Primary model (${primaryModel}) failed (HTTP ${err.status}). Retrying request using stable fallback model (${fallbackModel})...`);
            try {
                return await performCall(fallbackModel);
            } catch (fallbackErr) {
                console.error(`[API Log] Fallback model (${fallbackModel}) also failed.`, fallbackErr);
                throw new Error(`Gemini API Error (Fallback also failed): ${fallbackErr.message}`);
            }
        } else {
            // Throw original error directly (e.g. invalid API key, network error)
            throw err;
        }
    }
}

async function generateInterviewContent() {
    if (appState.aiProvider === "gemini" && (!appState.apiKey || appState.apiKey.trim() === "")) {
        showToast("API Key Required", "Please configure your Gemini API key in settings before generating questions.", "error");
        document.getElementById("settings-modal").classList.add("active");
        return;
    }

    const jobRoleEl = document.getElementById("job-role-input");
    const experienceLevelEl = document.getElementById("experience-level-select");
    const difficultyLevelEl = document.getElementById("difficulty-level-select");
    const focusAreaEl = document.getElementById("focus-area-select");
    const questionsCountEl = document.getElementById("questions-count-select");
    const answerStyleEl = document.getElementById("answer-style-select");

    console.log("[Debug Form Elements - Study Pack]", {
        jobRoleEl: !!jobRoleEl,
        experienceLevelEl: !!experienceLevelEl,
        difficultyLevelEl: !!difficultyLevelEl,
        focusAreaEl: !!focusAreaEl,
        questionsCountEl: !!questionsCountEl,
        answerStyleEl: !!answerStyleEl
    });

    const jobRole = jobRoleEl ? jobRoleEl.value.trim() : "";
    const experienceLevel = experienceLevelEl ? experienceLevelEl.value : "";
    const difficultyLevel = difficultyLevelEl ? difficultyLevelEl.value : "";
    const focusArea = focusAreaEl ? focusAreaEl.value : "";
    const totalQuestions = questionsCountEl ? parseInt(questionsCountEl.value) || 10 : 10;
    const answerStyle = answerStyleEl ? answerStyleEl.value : "";

    if (!jobRole || !experienceLevel || !difficultyLevel || !focusArea || !totalQuestions || !answerStyle) {
        showToast("Missing Parameters", "Please fill in all configuration parameters.", "warning");
        console.warn(`[Validation Warning] 'Generate Questions' clicked, but input fields are missing:`, {
            jobRole, experienceLevel, difficultyLevel, focusArea, totalQuestions, answerStyle
        });
        return;
    }

    console.log(`[Event Log] 'Generate Questions' button clicked. Initializing prep pack creation.`);
    console.log(`[API Log] Input parameters parsed - Job Role: "${jobRole}", Experience Level: "${experienceLevel}", Difficulty: "${difficultyLevel}", Focus Area: "${focusArea}", Total Questions: ${totalQuestions}, Answer Style: "${answerStyle}"`);

    toggleWorkspaceState("loading");
    startLoadingAnimation();

    const systemPrompt = `You are a professional technical recruiter and engineering manager. 
Your task is to generate a comprehensive mock interview preparation pack for a candidate.

Target Job Role: ${jobRole}
Target Experience Level: ${experienceLevel}
Interview Difficulty: ${difficultyLevel}
Interview Focus Area: ${focusArea}
Target Answer Style: ${answerStyle} (Model answers MUST conform to this style: e.g. Short vs Detailed STAR style)

Focus Area Guidelines for generating these questions:
${getFocusAreaGuidelines(focusArea, jobRole)}

You MUST generate exactly ${totalQuestions} relevant questions tailored specifically for this profile.
For each question, provide:
1. "id": The order number of the question, from 1 to ${totalQuestions}.
2. "question": The exact interview question text. Make it realistic, matching the difficulty, experience level, and focus area specified.
3. "answer": A model answer structured in the '${answerStyle}' style. You are encouraged to use standard Markdown formatting extensively to structure this answer professionally. Use bold text, italic highlights, bulleted or numbered lists, headings (h3, h4, h5), tables for comparisons, and code blocks (with programming language specifiers for syntax highlighting, e.g., \`\`\`javascript ... \`\`\`) to display code snippets, diagrams, or system designs.
4. "concepts": An array of 2 to 4 core theoretical concepts or technologies tested. You can use light inline markdown formatting (such as backticks for code elements like \`this\` or asterisks for bolding \`**this**\`) inside these strings.
5. "mistakes": An array of 2 to 3 common mistakes or pitfalls. You can use light inline markdown formatting (such as backticks or bolding) inside these strings.

If the Focus Area is 'Mixed', ensure a balanced combination of Technical, HR, Behavioral, and System Design questions (e.g. for 10 questions: 4 Technical, 2 HR, 2 Behavioral, 2 System Design. Scale this distribution proportionally if a different count is requested).

You MUST respond strictly with a valid JSON document conforming to the requested schema. Return no extra text or markdown formatting tags outside of the JSON representation.`;

    try {
        const requestPayload = {
            contents: [
                {
                    parts: [
                        { text: systemPrompt }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        questions: {
                            type: "ARRAY",
                            description: `List of ${totalQuestions} structured interview questions.`,
                            items: {
                                type: "OBJECT",
                                properties: {
                                    id: { 
                                        type: "INTEGER",
                                        description: `The order number of the question, from 1 to ${totalQuestions}.` 
                                    },
                                    question: { 
                                        type: "STRING", 
                                        description: "The technical interview question." 
                                    },
                                    answer: { 
                                        type: "STRING", 
                                        description: "Detailed, comprehensive model answer." 
                                    },
                                    concepts: { 
                                        type: "ARRAY", 
                                        items: { type: "STRING" },
                                        description: "List of core concepts tested by this question."
                                    },
                                    mistakes: { 
                                        type: "ARRAY", 
                                        items: { type: "STRING" },
                                        description: "Common pitfalls and candidate red flags for this question."
                                    }
                                },
                                required: ["id", "question", "answer", "concepts", "mistakes"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            }
        };

        const candidateJsonText = await callGeminiApi(requestPayload, "Could not generate prep pack");
        const parsedResponse = JSON.parse(candidateJsonText);

        if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions) || parsedResponse.questions.length === 0) {
            throw new Error("Invalid output format: Expected array of questions.");
        }

        renderResultsUI(parsedResponse.questions, jobRole, experienceLevel, difficultyLevel);
        toggleWorkspaceState("results");
        showToast("Generation Successful", `${totalQuestions} questions generated for ${jobRole}.`, "success");

        document.getElementById("workspace-results").scrollIntoView({ behavior: "smooth" });

    } catch (error) {
        console.error("Interview Coach API Error:", error);
        console.error("[Fallback Debug Mode] Study Pack generation diagnostic info:", {
            message: error.message,
            stack: error.stack,
            appState: JSON.parse(JSON.stringify(appState))
        });
        
        const errorTextNode = document.getElementById("error-message-text");
        if (errorTextNode) {
            errorTextNode.textContent = error.message || "An error occurred while compiling your mock interview. Please try again.";
        }
        
        toggleWorkspaceState("error");
        showToast("Generation Failed", "Could not assemble mock interview dataset.", "error");
    } finally {
        stopLoadingAnimation();
    }
}

// ============================================================================
// 8. Gemini API Service: INTERACTIVE MOCK INTERVIEW MODE
// ============================================================================

/**
 * Initializes Mock interview states, requests the first question from Gemini,
 * and renders the active mock workspace state.
 */
async function startMockInterviewFlow() {
    if (appState.aiProvider === "gemini" && (!appState.apiKey || appState.apiKey.trim() === "")) {
        showToast("API Key Required", "Please configure your Gemini API key in settings before starting mock interviews.", "error");
        document.getElementById("settings-modal").classList.add("active");
        return;
    }

    const jobRoleEl = document.getElementById("job-role-input");
    const experienceLevelEl = document.getElementById("experience-level-select");
    const difficultyLevelEl = document.getElementById("difficulty-level-select");
    const focusAreaEl = document.getElementById("focus-area-select");
    const questionsCountEl = document.getElementById("questions-count-select");
    const answerStyleEl = document.getElementById("answer-style-select");

    console.log("[Debug Form Elements - Live Mock]", {
        jobRoleEl: !!jobRoleEl,
        experienceLevelEl: !!experienceLevelEl,
        difficultyLevelEl: !!difficultyLevelEl,
        focusAreaEl: !!focusAreaEl,
        questionsCountEl: !!questionsCountEl,
        answerStyleEl: !!answerStyleEl
    });

    const jobRole = jobRoleEl ? jobRoleEl.value.trim() : "";
    const experienceLevel = experienceLevelEl ? experienceLevelEl.value : "";
    const difficultyLevel = difficultyLevelEl ? difficultyLevelEl.value : "";
    const focusArea = focusAreaEl ? focusAreaEl.value : "";
    const totalQuestions = questionsCountEl ? parseInt(questionsCountEl.value) || 10 : 10;
    const answerStyle = answerStyleEl ? answerStyleEl.value : "";

    if (!jobRole || !experienceLevel || !difficultyLevel || !focusArea || !totalQuestions || !answerStyle) {
        showToast("Missing Parameters", "Please fill in all configuration parameters.", "warning");
        console.warn(`[Validation Warning] 'Start Mock Interview' clicked, but input fields are missing:`, {
            jobRole, experienceLevel, difficultyLevel, focusArea, totalQuestions, answerStyle
        });
        return;
    }

    // Set initial mock states
    appState.mockSession.role = jobRole;
    appState.mockSession.level = experienceLevel;
    appState.mockSession.difficulty = difficultyLevel;
    appState.mockSession.focusArea = focusArea;
    appState.mockSession.totalQuestions = totalQuestions;
    appState.mockSession.answerStyle = answerStyle;
    appState.mockSession.currentQuestionIndex = 0;
    appState.mockSession.questionsLog = [];
    appState.mockSession.nextQuestionText = "";
    appState.mockSession.finalReport = null;

    toggleWorkspaceState("loading");
    startLoadingAnimation();
    updateLoadingTip("Contacting senior recruiter...");

    console.log(`[Event Log] 'Start Mock Interview' button clicked. Initializing mock interview session.`);
    console.log(`[API Log] Mock parameters parsed - Job Role: "${jobRole}", Experience Level: "${experienceLevel}", Difficulty: "${difficultyLevel}", Focus Area: "${focusArea}", Total Questions: ${totalQuestions}, Answer Style: "${answerStyle}"`);

    const promptText = `You are a senior recruiter and interviewer. Your task is to generate the FIRST question of a mock interview session for a ${jobRole} position.

Target Role: ${jobRole}
Experience Level: ${experienceLevel}
Interview Difficulty: ${difficultyLevel}
Interview Focus Area: ${focusArea}
Target Answer Style: ${answerStyle} (questions should prompt this style of answer)

Focus Area Guidelines:
${getFocusAreaGuidelines(focusArea, jobRole)}

Generate a single, realistic, and highly relevant first question. Keep it concise.
You MUST respond strictly with a valid JSON document conforming to the requested schema. Return no extra text or markdown formatting tags outside of the JSON representation.`;

    try {
        const requestPayload = {
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        question: { 
                            type: "STRING", 
                            description: "The first interview question." 
                        }
                    },
                    required: ["question"]
                }
            }
        };

        const jsonText = await callGeminiApi(requestPayload, "Could not initialize mock interview session");
        const parsed = JSON.parse(jsonText);
        if (!parsed.question) throw new Error("Invalid schema: missing question field.");

        // Progress to question 1
        appState.mockSession.currentQuestionIndex = 1;
        appState.mockSession.nextQuestionText = parsed.question;

        // Render Mock Page
        renderMockQuestionPage();
        toggleWorkspaceState("mock-session");
        showToast("Mock Session Initialized", "Read the question, then click 'Start Answer' to begin.", "success");

    } catch (err) {
        console.error("Start Mock Interview Error:", err);
        console.error("[Fallback Debug Mode] Mock Interview initialization diagnostic info:", {
            message: err.message,
            stack: err.stack,
            sessionState: JSON.parse(JSON.stringify(appState.mockSession))
        });
        
        const errorTextNode = document.getElementById("error-message-text");
        if (errorTextNode) {
            errorTextNode.textContent = "Could not initialize interview session: " + err.message;
        }
        toggleWorkspaceState("error");
        showToast("Startup Failed", "Could not request first question.", "error");
    } finally {
        stopLoadingAnimation();
    }
}

/**
 * Renders the active question, updates the progress bar, and prepares the "Start Answer" state.
 */
function renderMockQuestionPage() {
    const session = appState.mockSession;

    // Badges update
    document.getElementById("mock-session-role").textContent = session.role;
    document.getElementById("mock-session-level").textContent = session.level;
    document.getElementById("mock-session-difficulty").textContent = session.difficulty;

    // Progress updates
    const percentage = Math.round((session.currentQuestionIndex / session.totalQuestions) * 100);
    document.getElementById("mock-progress-text").textContent = `Question ${session.currentQuestionIndex} of ${session.totalQuestions}`;
    document.getElementById("mock-progress-percentage").textContent = `${percentage}% Complete`;
    document.getElementById("mock-progress-bar-fill").style.width = `${percentage}%`;

    // Question body
    document.getElementById("mock-question-number-badge").textContent = session.currentQuestionIndex;
    document.getElementById("mock-active-question-text").textContent = session.nextQuestionText;

    // Reset and Enable Answer Inputs
    const textarea = document.getElementById("mock-user-answer");
    if (textarea) {
        textarea.value = "";
        textarea.disabled = false;
        textarea.placeholder = "Type your detailed answer here...";
    }
    const label = document.getElementById("mock-answer-label");
    if (label) {
        label.textContent = "Your Answer";
        label.style.opacity = "1";
    }
    const submitBtn = document.getElementById("btn-mock-submit");
    if (submitBtn) {
        submitBtn.disabled = false;
    }
    const charCounter = document.getElementById("mock-char-counter");
    if (charCounter) charCounter.textContent = "0 characters";

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Auto focus textarea
    if (textarea) {
        textarea.focus();
    }
}

/**
 * Handles validation, submits the user answer and context log to Gemini,
 * and processes the evaluation scores/next question data.
 */
async function submitMockAnswer() {
    const session = appState.mockSession;
    const answerInput = document.getElementById("mock-user-answer");
    let answerText = answerInput ? answerInput.value.trim() : "";

    // Validation checks
    if (answerText.length < 10) {
        showToast("Answer Too Short", "Please write a more detailed response (minimum 10 characters) before submitting.", "warning");
        return;
    }

    toggleWorkspaceState("loading");
    startLoadingAnimation();
    updateLoadingTip("Evaluating technical completeness...");

    // Build chat history for Gemini to provide dynamic follow-ups
    const logHistory = session.questionsLog.map((log, idx) => {
        return `Q${idx + 1}: ${log.question}\nCandidate: ${log.userAnswer}`;
    }).join("\n\n");

    const evalPrompt = `You are a senior recruiter and recruiter coach. You are conducting a live interactive mock interview for a ${session.role} position (${session.level} level).
Interview Focus Area: ${session.focusArea}
Target Answer Style: ${session.answerStyle}

So far, the interview logs are:
${logHistory}

Current Question Asked: ${session.nextQuestionText}
Candidate's Answer: ${answerText}

Your task is to:
1. Evaluate this answer. Provide:
   - score: Overall Score (0 to 10 scale) representing performance.
   - technicalAccuracy: 1 sentence assessment of technical correctness (e.g. Excellent, Good, Average, Needs Improvement) tailored to the focus area '${session.focusArea}'.
   - communication: 1 sentence assessment of how clearly the thoughts were articulated.
   - completeness: 1 sentence assessing if all parts of the question were covered.
   - confidence: Assessment of vocabulary and confidence indicators.
   - feedback: Constructive feedback and actionable improvement suggestions (use inline markdown if helpful).
   - idealAnswer: A model response for this question matching the requested Answer Style (${session.answerStyle}) (use markdown lists or code blocks).
   
   Evaluation Focus Guidelines for '${session.focusArea}':
   ${getEvaluationFocusGuidelines(session.focusArea)}

2. Formulate the nextQuestion:
   - Since this is question ${session.currentQuestionIndex + 1} of ${session.totalQuestions}:
     * If they haven't completed the interview limit, formulate the next question.
     * Keep the follow-up conversational and relevant. If their answer was incomplete, made an error, or raised a topic worth drilling into, ask a dynamic follow-up. Otherwise, introduce a new question.
     * Make sure the next question aligns with the '${session.focusArea}' focus area.
     * MIXED INTERVIEW RULE: If the focus area is 'Mixed', maintain a balanced mix of questions (roughly 40% Technical, 20% HR, 20% Behavioral, 20% System Design). Look at the questions log history, count the question types, and choose the next question type to balance this distribution.

You MUST respond strictly with a valid JSON document conforming to the requested schema. Return no extra text or markdown formatting tags outside of the JSON representation.`;

    try {
        const requestPayload = {
            contents: [{ parts: [{ text: evalPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        evaluation: {
                            type: "OBJECT",
                            properties: {
                                score: { type: "INTEGER" },
                                technicalAccuracy: { type: "STRING" },
                                communication: { type: "STRING" },
                                completeness: { type: "STRING" },
                                confidence: { type: "STRING" },
                                feedback: { type: "STRING" },
                                idealAnswer: { type: "STRING" }
                            },
                            required: ["score", "technicalAccuracy", "communication", "completeness", "confidence", "feedback", "idealAnswer"]
                        },
                        nextQuestion: { 
                            type: "STRING", 
                            description: "The follow-up or new interview question." 
                        }
                    },
                    required: ["evaluation", "nextQuestion"]
                }
            }
        };

        console.log(`[Event Log] Mock answer submitted. Starting API evaluation request.`);
        const jsonText = await callGeminiApi(requestPayload, "Could not evaluate answer");
        const parsed = JSON.parse(jsonText);

        // Save log
        session.questionsLog.push({
            question: session.nextQuestionText,
            userAnswer: answerText,
            evaluation: parsed.evaluation
        });

        // Set next pre-fetched question text
        session.nextQuestionText = parsed.nextQuestion;

        // Render evaluation page
        renderMockEvaluationPage(parsed.evaluation);
        toggleWorkspaceState("mock-evaluation");
        showToast("Answer Evaluated", "Feedback ready.", "success");

    } catch (err) {
        console.error("Evaluation error:", err);
        console.error("[Fallback Debug Mode] Evaluation diagnostic info:", {
            message: err.message,
            stack: err.stack,
            session: JSON.parse(JSON.stringify(appState.mockSession))
        });
        const errorTextNode = document.getElementById("error-message-text");
        if (errorTextNode) {
            errorTextNode.textContent = "Could not evaluate answer: " + err.message;
        }
        toggleWorkspaceState("error");
        showToast("Evaluation Failed", "Model failed to analyze answer.", "error");
    } finally {
        stopLoadingAnimation();
    }
}

/**
 * Fills circular score trackers and sub-score metrics.
 * @param {object} evaluation - The parsed score card object.
 */
function renderMockEvaluationPage(evaluation) {
    const session = appState.mockSession;

    // Set overall score ring
    const scoreNum = evaluation.score;
    document.getElementById("eval-score-num").textContent = scoreNum;
    
    // SVG circle circumference is 251.2
    const offset = 251.2 - (251.2 * scoreNum) / 10;
    const ringFill = document.getElementById("eval-score-ring");
    if (ringFill) ringFill.style.strokeDashoffset = offset;

    // Map Overall status badge
    const statusBadge = document.getElementById("eval-score-status");
    if (statusBadge) {
        statusBadge.textContent = getScoreStatusText(scoreNum);
        statusBadge.className = `badge-status ${getScoreStatusClass(scoreNum)}`;
    }

    // Set Subscores
    const mapSubScoreString = (assessmentStr) => {
        const lowText = assessmentStr.toLowerCase();
        if (lowText.includes("excellent")) return { text: "Excellent", pct: 95 };
        if (lowText.includes("good")) return { text: "Good", pct: 80 };
        if (lowText.includes("average") || lowText.includes("fair")) return { text: "Average", pct: 60 };
        return { text: "Needs Improvement", pct: 40 };
    };

    const techObj = mapSubScoreString(evaluation.technicalAccuracy);
    const commObj = mapSubScoreString(evaluation.communication);
    const compObj = mapSubScoreString(evaluation.completeness);
    const confObj = mapSubScoreString(evaluation.confidence);

    document.getElementById("sub-tech-val").textContent = techObj.text;
    document.getElementById("sub-tech-bar").style.width = `${techObj.pct}%`;

    document.getElementById("sub-comm-val").textContent = commObj.text;
    document.getElementById("sub-comm-bar").style.width = `${commObj.pct}%`;

    document.getElementById("sub-comp-val").textContent = compObj.text;
    document.getElementById("sub-comp-bar").style.width = `${compObj.pct}%`;

    document.getElementById("sub-conf-val").textContent = confObj.text;
    document.getElementById("sub-conf-bar").style.width = `${confObj.pct}%`;

    // Render feedbacks
    document.getElementById("eval-feedback-text").innerHTML = parseMarkdownContent(evaluation.feedback);
    document.getElementById("eval-model-text").innerHTML = parseMarkdownContent(evaluation.idealAnswer);

    // Dynamic next button label
    const nextBtn = document.getElementById("btn-eval-next");
    if (nextBtn) {
        if (session.currentQuestionIndex < session.totalQuestions) {
            nextBtn.querySelector("span").textContent = `Proceed to Question ${session.currentQuestionIndex + 1}`;
        } else {
            nextBtn.querySelector("span").textContent = "Compile Final Report";
        }
    }

    // Reset eval tabs state to first tab
    const tabTriggers = document.querySelectorAll("#workspace-mock-evaluation .tab-trigger");
    const tabPanes = document.querySelectorAll("#workspace-mock-evaluation .tab-pane");
    tabTriggers.forEach(t => t.classList.remove("active"));
    tabPanes.forEach(p => p.classList.remove("active"));
    
    const feedbackTab = document.querySelector("#workspace-mock-evaluation [data-tab='eval-feedback']");
    const feedbackPane = document.getElementById("pane-eval-feedback");
    if (feedbackTab) feedbackTab.classList.add("active");
    if (feedbackPane) feedbackPane.classList.add("active");

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Handles state progression: transitions to next question or compiles final report.
 */
function advanceMockQuestion() {
    const session = appState.mockSession;
    if (session.currentQuestionIndex < session.totalQuestions) {
        // Increment Index
        session.currentQuestionIndex++;
        renderMockQuestionPage();
        toggleWorkspaceState("mock-session");
    } else {
        // Generate complete summary and learning roadmaps
        compileFinalInterviewReport();
    }
}

/**
 * Aggregates all session Q&As and evaluations, calls Gemini to compute
 * overall score, strong/weak areas, and generates a personalized study plan.
 */
async function compileFinalInterviewReport() {
    const session = appState.mockSession;

    toggleWorkspaceState("loading");
    startLoadingAnimation();
    updateLoadingTip("Assembling custom study timeline...");

    // Format logs for request
    const logsPayload = session.questionsLog.map((log, idx) => {
        return `Question ${idx + 1}: ${log.question}
Answer Given: ${log.userAnswer}
Feedback details: score ${log.evaluation.score}/10, tech ${log.evaluation.technicalAccuracy}, communication ${log.evaluation.communication}.`;
    }).join("\n\n");

    const summaryPrompt = `You are a senior recruiter and recruiter coach. Review the complete mock interview session for a candidate preparing for:
Target Job: ${session.role} (${session.level} Level)
Difficulty: ${session.difficulty}
Interview Focus Area: ${session.focusArea}

Questions Log details:
${logsPayload}

Generate a final diagnostic package. Your package MUST include:
1. overallStats:
   - overallScore: Final aggregated integer score (0 to 10 scale).
   - technicalScore: Technical skills rating integer (0 to 10 scale).
   - communicationScore: Communication skills rating integer (0 to 10 scale).
   - confidenceScore: Core vocabulary and presence rating integer (0 to 10 scale).
   - problemSolvingScore: Rating integer for tackling scenarios (0 to 10 scale).
2. strongAreas: Array of 3 to 4 concepts/skills the candidate mastered under the '${session.focusArea}' context for ${session.role}.
3. weakAreas: Array of 3 to 4 conceptual gaps or skill areas they failed to cover.
4. needsImprovement: Array of 2 to 3 suggestions to bridge the gap.
5. roadmap: A structured 7-Day study calendar containing objects day1, day2, ... day7.
   Each day object MUST contain:
   - title: Day title (e.g., "Day 1: STAR Method Practice" or "Day 1: Scalability Patterns")
   - topics: Array of 2 core concepts to study.
   - objectives: A detailed description of what should be read, practiced, or built.
   
   The roadmap MUST adapt specifically to the Interview Focus Area '${session.focusArea}' for the job role '${session.role}'.
   Follow these focus area rules:
   - Technical Interview: Focus on technical topics, coding practice, and project recommendations tailored to ${session.role}.
   - HR Interview: Focus on communication exercises, self-introduction practice, and common HR questions.
   - Behavioral Interview: Focus on STAR method practice, leadership examples, and conflict resolution scenarios.
   - System Design Interview: Focus on architecture concepts, scalability patterns, database design, and API design.
   - Mixed Interview: A combination roadmap covering all of the categories above.
   
You MUST respond strictly with a valid JSON document conforming to the requested schema. Return no extra text or markdown formatting tags outside of the JSON representation.`;

    try {
        const requestPayload = {
            contents: [{ parts: [{ text: summaryPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        overallStats: {
                            type: "OBJECT",
                            properties: {
                                overallScore: { type: "INTEGER" },
                                technicalScore: { type: "INTEGER" },
                                communicationScore: { type: "INTEGER" },
                                confidenceScore: { type: "INTEGER" },
                                problemSolvingScore: { type: "INTEGER" }
                            },
                            required: ["overallScore", "technicalScore", "communicationScore", "confidenceScore", "problemSolvingScore"]
                        },
                        strongAreas: { type: "ARRAY", items: { type: "STRING" } },
                        weakAreas: { type: "ARRAY", items: { type: "STRING" } },
                        needsImprovement: { type: "ARRAY", items: { type: "STRING" } },
                        roadmap: {
                            type: "OBJECT",
                            properties: {
                                day1: {
                                    type: "OBJECT",
                                    properties: {
                                        title: { type: "STRING" },
                                        topics: { type: "ARRAY", items: { type: "STRING" } },
                                        objectives: { type: "STRING" }
                                    },
                                    required: ["title", "topics", "objectives"]
                                },
                                day2: {
                                    type: "OBJECT",
                                    properties: {
                                        title: { type: "STRING" },
                                        topics: { type: "ARRAY", items: { type: "STRING" } },
                                        objectives: { type: "STRING" }
                                    },
                                    required: ["title", "topics", "objectives"]
                                },
                                day3: {
                                    type: "OBJECT",
                                    properties: {
                                        title: { type: "STRING" },
                                        topics: { type: "ARRAY", items: { type: "STRING" } },
                                        objectives: { type: "STRING" }
                                    },
                                    required: ["title", "topics", "objectives"]
                                },
                                day4: {
                                    type: "OBJECT",
                                    properties: {
                                        title: { type: "STRING" },
                                        topics: { type: "ARRAY", items: { type: "STRING" } },
                                        objectives: { type: "STRING" }
                                    },
                                    required: ["title", "topics", "objectives"]
                                },
                                day5: {
                                    type: "OBJECT",
                                    properties: {
                                        title: { type: "STRING" },
                                        topics: { type: "ARRAY", items: { type: "STRING" } },
                                        objectives: { type: "STRING" }
                                    },
                                    required: ["title", "topics", "objectives"]
                                },
                                day6: {
                                    type: "OBJECT",
                                    properties: {
                                        title: { type: "STRING" },
                                        topics: { type: "ARRAY", items: { type: "STRING" } },
                                        objectives: { type: "STRING" }
                                    },
                                    required: ["title", "topics", "objectives"]
                                },
                                day7: {
                                    type: "OBJECT",
                                    properties: {
                                        title: { type: "STRING" },
                                        topics: { type: "ARRAY", items: { type: "STRING" } },
                                        objectives: { type: "STRING" }
                                    },
                                    required: ["title", "topics", "objectives"]
                                }
                            },
                            required: ["day1", "day2", "day3", "day4", "day5", "day6", "day7"]
                        }
                    },
                    required: ["overallStats", "strongAreas", "weakAreas", "needsImprovement", "roadmap"]
                }
            }
        };

        console.log(`[Event Log] Generating final diagnostic interview scoreboard and 7-day study plan.`);
        const jsonText = await callGeminiApi(requestPayload, "Could not generate final interview report");
        const parsedReport = JSON.parse(jsonText);

        session.finalReport = parsedReport;

        // Auto save to Local Storage history list
        saveSessionToLocalStorage(parsedReport);

        // Render Report Dashboard
        renderMockFinalReportPage(parsedReport);
        toggleWorkspaceState("mock-report");
        showToast("Final Report Generated", "Diagnostic report and 7-day study plan are ready.", "success");

    } catch (err) {
        console.error("Compilation error:", err);
        console.error("[Fallback Debug Mode] Final Scoreboard diagnostic info:", {
            message: err.message,
            stack: err.stack,
            session: JSON.parse(JSON.stringify(appState.mockSession))
        });
        const errorTextNode = document.getElementById("error-message-text");
        if (errorTextNode) {
            errorTextNode.textContent = "Could not compile final interview report: " + err.message;
        }
        toggleWorkspaceState("error");
        showToast("Compilation Failed", "Model failed to compile interview dashboard.", "error");
    } finally {
        stopLoadingAnimation();
    }
}

/**
 * Formats score dashboards, badges list, Q&A Accordions, and Study roadmaps.
 * @param {object} report - The parsed final diagnostics log object.
 */
function renderMockFinalReportPage(report) {
    const session = appState.mockSession;

    // 1. Overall Score Ring
    const scoreNum = report.overallStats.overallScore;
    document.getElementById("report-overall-score").textContent = scoreNum;
    
    const offset = 251.2 - (251.2 * scoreNum) / 10;
    const ringFill = document.getElementById("report-overall-ring");
    if (ringFill) ringFill.style.strokeDashoffset = offset;

    // Status Badge
    const statusBadge = document.getElementById("report-overall-status");
    if (statusBadge) {
        statusBadge.textContent = getScoreStatusText(scoreNum);
        statusBadge.className = `badge-status large ${getScoreStatusClass(scoreNum)}`;
    }

    // 2. KPI Cards
    document.getElementById("report-kpi-tech").textContent = `${report.overallStats.technicalScore}/10`;
    document.getElementById("report-kpi-comm").textContent = `${report.overallStats.communicationScore}/10`;
    document.getElementById("report-kpi-conf").textContent = `${report.overallStats.confidenceScore}/10`;
    document.getElementById("report-kpi-solving").textContent = `${report.overallStats.problemSolvingScore}/10`;

    // 3. Strong & Weak Areas badges
    const strongList = document.getElementById("report-strong-areas-list");
    const weakList = document.getElementById("report-weak-areas-list");
    
    if (strongList) {
        strongList.innerHTML = report.strongAreas.map(area => `<span class="area-badge">${escapeHtml(area)}</span>`).join("");
    }
    if (weakList) {
        weakList.innerHTML = report.weakAreas.map(area => `<span class="area-badge">${escapeHtml(area)}</span>`).join("");
    }

    // 4. Accordion QA Logs
    const accordionContainer = document.getElementById("report-log-accordion");
    if (accordionContainer) {
        accordionContainer.innerHTML = "";
        
        session.questionsLog.forEach((log, idx) => {
            const cardIdx = idx + 1;
            const item = document.createElement("div");
            item.className = "accordion-item";
            
            item.innerHTML = `
                <button class="accordion-trigger">
                    <div class="accordion-title">
                        <span>Question ${cardIdx}: ${escapeHtml(log.question)}</span>
                    </div>
                    <span class="accordion-score-badge">Score: ${log.evaluation.score}/10</span>
                    <i data-lucide="chevron-down"></i>
                </button>
                <div class="accordion-content">
                    <div class="log-section">
                        <h5><i data-lucide="message-square"></i> Your Answer</h5>
                        <p>${escapeHtml(log.userAnswer)}</p>
                    </div>
                    <div class="log-section">
                        <h5><i data-lucide="info"></i> Evaluation & Suggestions</h5>
                        <div class="markdown-content">${parseMarkdownContent(log.evaluation.feedback)}</div>
                    </div>
                    <div class="log-section">
                        <h5><i data-lucide="check-circle-2"></i> Ideal Model Answer</h5>
                        <div class="markdown-content">${parseMarkdownContent(log.evaluation.idealAnswer)}</div>
                    </div>
                </div>
            `;
            
            // Connect accordion trigger toggle
            const trigger = item.querySelector(".accordion-trigger");
            trigger.addEventListener("click", () => {
                const isActive = item.classList.contains("active");
                
                // Collapse all other Accordions
                const items = accordionContainer.querySelectorAll(".accordion-item");
                items.forEach(i => i.classList.remove("active"));
                
                if (!isActive) {
                    item.classList.add("active");
                }
            });

            accordionContainer.appendChild(item);
        });
    }

    // 5. 7-Day Roadmap Rendering
    const roadmapContainer = document.getElementById("report-roadmap-content");
    if (roadmapContainer) {
        roadmapContainer.innerHTML = "";
        
        const days = ["day1", "day2", "day3", "day4", "day5", "day6", "day7"];
        let roadmapHtml = `<table class="roadmap-table">
            <thead>
                <tr>
                    <th style="width: 120px;">Timeline</th>
                    <th>Revision Core Topics</th>
                    <th>Practical Objectives & Study Plans</th>
                </tr>
            </thead>
            <tbody>`;

        days.forEach(dayKey => {
            const dayObj = report.roadmap[dayKey];
            if (dayObj) {
                const dayNum = dayKey.replace("day", "Day ");
                roadmapHtml += `
                    <tr>
                        <td style="font-weight: 700; color: var(--color-primary);">${dayNum}</td>
                        <td>
                            <strong>${escapeHtml(dayObj.title)}</strong>
                            <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.4rem;">
                                ${dayObj.topics.map(t => `<span class="concept-badge" style="font-size: 0.7rem;">${escapeHtml(t)}</span>`).join("")}
                            </div>
                        </td>
                        <td class="markdown-content">${parseMarkdownContent(dayObj.objectives)}</td>
                    </tr>
                `;
            }
        });

        roadmapHtml += `</tbody></table>`;
        roadmapContainer.innerHTML = roadmapHtml;
    }

    // Reset report tabs state
    const reportTabTriggers = document.querySelectorAll("#workspace-mock-report .tab-trigger");
    const reportTabPanes = document.querySelectorAll("#workspace-mock-report .tab-pane");
    reportTabTriggers.forEach(t => t.classList.remove("active"));
    reportTabPanes.forEach(p => p.classList.remove("active"));
    
    const logTab = document.querySelector("#workspace-mock-report [data-tab='report-log']");
    const logPane = document.getElementById("pane-report-log");
    if (logTab) logTab.classList.add("active");
    if (logPane) logPane.classList.add("active");

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ============================================================================
// 9. LocalStorage Session History Routines
// ============================================================================

/**
 * Loads interview history list from Local Storage cache.
 */
function getHistoryLogs() {
    const list = localStorage.getItem("INTERVIEW_HISTORY");
    if (!list) return [];
    try {
        return JSON.parse(list);
    } catch (e) {
        return [];
    }
}

/**
 * Appends a completed interview session details object inside storage.
 * @param {object} report - Compiled diagnostics report
 */
function saveSessionToLocalStorage(report) {
    const session = appState.mockSession;
    const historyList = getHistoryLogs();

    const newEntry = {
        id: "session_" + Date.now(),
        date: new Date().toLocaleDateString(),
        role: session.role,
        level: session.level,
        difficulty: session.difficulty,
        focusArea: session.focusArea || "Technical",
        totalQuestions: session.totalQuestions || 10,
        score: report.overallStats.overallScore,
        questionsAttempted: session.questionsLog.length,
        
        // Save full questions logs and diagnostic roadmap to reload later
        questionsLog: JSON.parse(JSON.stringify(session.questionsLog)),
        finalReport: JSON.parse(JSON.stringify(report))
    };

    historyList.unshift(newEntry); // Add to beginning of array
    localStorage.setItem("INTERVIEW_HISTORY", JSON.stringify(historyList));
}

/**
 * Compiles history entries and renders modal tables.
 */
function renderHistoryModalList() {
    const container = document.getElementById("history-items-container");
    if (!container) return;

    container.innerHTML = "";
    const historyList = getHistoryLogs();

    if (historyList.length === 0) {
        container.innerHTML = `<div class="empty-history-text">No completed mock interview logs found. Complete an interview in "Live Mock" mode to track score progress.</div>`;
        return;
    }

    historyList.forEach(entry => {
        const div = document.createElement("div");
        div.className = "history-item";
        
        div.innerHTML = `
            <div class="history-info">
                <h4>${escapeHtml(entry.role)} <span style="font-weight: normal; font-size: 0.85rem; opacity: 0.7;">(${escapeHtml(entry.focusArea || "Technical")})</span></h4>
                <div class="history-meta">
                    <span><i data-lucide="calendar" style="width:0.85rem;height:0.85rem;vertical-align:-1px;"></i> ${escapeHtml(entry.date)}</span>
                    <span>Level: ${escapeHtml(entry.level)}</span>
                    <span>Difficulty: ${escapeHtml(entry.difficulty)}</span>
                    <span>Attempted: ${entry.questionsAttempted}/${entry.totalQuestions || 10} Qs</span>
                </div>
            </div>
            <div class="history-score-badge">
                <div class="history-score">${entry.score}/10</div>
                <button class="btn btn-secondary btn-icon-only btn-view-report" title="Review Report">
                    <i data-lucide="external-link"></i>
                </button>
                <button class="btn btn-secondary btn-icon-only btn-delete-history" style="color:var(--color-danger);" title="Delete Record">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;

        // 1. Hook review actions
        div.querySelector(".btn-view-report").addEventListener("click", () => {
            // Restore session logs
            appState.mockSession.role = entry.role;
            appState.mockSession.level = entry.level;
            appState.mockSession.difficulty = entry.difficulty;
            appState.mockSession.focusArea = entry.focusArea || "Technical";
            appState.mockSession.totalQuestions = entry.totalQuestions || 10;
            appState.mockSession.questionsLog = entry.questionsLog;
            
            // Render Report
            renderMockFinalReportPage(entry.finalReport);
            toggleWorkspaceState("mock-report");
            
            // Close modal
            document.getElementById("history-modal").classList.remove("active");
            showToast("Report Loaded", `Re-study dashboard for ${entry.role} from ${entry.date}.`, "success");
            
            // Scroll to report view
            document.getElementById("workspace-mock-report").scrollIntoView({ behavior: "smooth" });
        });

        // 2. Hook deletion actions
        div.querySelector(".btn-delete-history").addEventListener("click", () => {
            if (confirm(`Delete ${entry.role} session record from ${entry.date}?`)) {
                deleteHistoryEntry(entry.id);
            }
        });

        container.appendChild(div);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Removes individual history item key.
 */
function deleteHistoryEntry(entryId) {
    let historyList = getHistoryLogs();
    historyList = historyList.filter(item => item.id !== entryId);
    localStorage.setItem("INTERVIEW_HISTORY", JSON.stringify(historyList));
    showToast("Record Deleted", "History item has been removed.", "success");
    renderHistoryModalList();
}

/**
 * Clears all cache items.
 */
function clearAllHistoryLogs() {
    localStorage.removeItem("INTERVIEW_HISTORY");
    showToast("History Cleared", "All mock interview session records have been deleted.", "success");
    renderHistoryModalList();
}

// ============================================================================
// 10. DOM Rendering & UI Management
// ============================================================================

/**
 * Transitions the right side dashboard panel to show one of the states:
 * 'placeholder', 'loading', 'error', 'results', 'mock-session', 'mock-evaluation', 'mock-report'
 * @param {string} stateName - The target state to make active.
 */
function toggleWorkspaceState(stateName) {
    const states = ["placeholder", "loading", "error", "results", "mock-session", "mock-evaluation", "mock-report"];
    
    states.forEach(state => {
        const element = document.getElementById(`workspace-${state}`);
        if (element) {
            if (state === stateName) {
                element.classList.add("active");
            } else {
                element.classList.remove("active");
            }
        }
    });

    // Make sure we update Active Nav Tab highlight when on dashboard view
    const dashboardLink = document.getElementById("link-dashboard");
    const homeLink = document.getElementById("link-home");
    
    if (stateName !== "placeholder") {
        if (dashboardLink) dashboardLink.classList.add("active");
        if (homeLink) homeLink.classList.remove("active");
    }
}

/**
 * Starts rotating loading messages to keep visual state dynamic.
 */
function startLoadingAnimation() {
    const tipText = document.getElementById("loading-tip-text");
    if (!tipText) return;

    let index = 0;
    tipText.textContent = LOADING_MESSAGES[index];

    appState.loadingIntervalId = setInterval(() => {
        index = (index + 1) % LOADING_MESSAGES.length;
        
        tipText.style.opacity = 0;
        setTimeout(() => {
            tipText.textContent = LOADING_MESSAGES[index];
            tipText.style.opacity = 1;
        }, 300);
        
    }, 2500);
}

/**
 * Forces a specific prompt inside the loading screen status text.
 */
function updateLoadingTip(customText) {
    const tipText = document.getElementById("loading-tip-text");
    if (tipText) {
        tipText.textContent = customText;
    }
}

/**
 * Clears the active loading text interval.
 */
function stopLoadingAnimation() {
    if (appState.loadingIntervalId) {
        clearInterval(appState.loadingIntervalId);
        appState.loadingIntervalId = null;
    }
}

/**
 * Assembles and mounts the 10 custom cards inside the output dashboard container.
 */
function renderResultsUI(questions, role, level, difficulty) {
    document.getElementById("results-role").textContent = role;
    document.getElementById("results-level").textContent = level;
    document.getElementById("results-difficulty").textContent = difficulty;

    const cardsContainer = document.getElementById("interview-cards-container");
    if (!cardsContainer) return;
    
    cardsContainer.innerHTML = "";

    questions.forEach((q, idx) => {
        const cardIndex = idx + 1;
        const cardElement = document.createElement("div");
        cardElement.className = "interview-card";
        
        const conceptsBadges = q.concepts.map(concept => `<span class="concept-badge">${parseMarkdownInline(concept)}</span>`).join("");
        
        cardElement.innerHTML = `
            <!-- Card Header Area -->
            <div class="card-header-area">
                <div class="card-number">${cardIndex}</div>
                <div class="card-title-group">
                    <h4>${escapeHtml(q.question)}</h4>
                    <div class="card-concept-badges">
                        ${conceptsBadges}
                    </div>
                </div>
            </div>

            <!-- Tab Menu Triggers -->
            <div class="card-tabs-bar">
                <button class="tab-trigger active" data-tab="answer-${cardIndex}">
                    <i data-lucide="check-circle-2"></i>
                    <span>Model Answer</span>
                </button>
                <button class="tab-trigger" data-tab="revise-${cardIndex}">
                    <i data-lucide="book-open"></i>
                    <span>Revision Concepts</span>
                </button>
                <button class="tab-trigger" data-tab="pitfalls-${cardIndex}">
                    <i data-lucide="alert-triangle"></i>
                    <span>Common Mistakes</span>
                </button>
            </div>

            <!-- Tab Content Panes -->
            <div class="card-content-area">
                <!-- Pane 1: Model Answer -->
                <div class="tab-pane active markdown-content" id="pane-answer-${cardIndex}">
                    ${parseMarkdownContent(q.answer)}
                </div>

                <!-- Pane 2: Revision Concepts -->
                <div class="tab-pane markdown-content" id="pane-revise-${cardIndex}">
                    <ul class="revision-list">
                        ${q.concepts.map(concept => `<li>${parseMarkdownInline(concept)}</li>`).join("")}
                    </ul>
                </div>

                <!-- Pane 3: Common Mistakes -->
                <div class="tab-pane markdown-content" id="pane-pitfalls-${cardIndex}">
                    <ul class="bullet-list">
                        ${q.mistakes.map(mistake => `<li>${parseMarkdownInline(mistake)}</li>`).join("")}
                    </ul>
                </div>
            </div>
        `;

        const tabTriggers = cardElement.querySelectorAll(".tab-trigger");
        const tabPanes = cardElement.querySelectorAll(".tab-pane");

        tabTriggers.forEach(trigger => {
            trigger.addEventListener("click", () => {
                const targetTabId = trigger.getAttribute("data-tab");

                tabTriggers.forEach(t => t.classList.remove("active"));
                trigger.classList.add("active");

                tabPanes.forEach(pane => {
                    if (pane.id === `pane-${targetTabId}`) {
                        pane.classList.add("active");
                    } else {
                        pane.classList.remove("active");
                    }
                });
            });
        });

        cardsContainer.appendChild(cardElement);
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Connect layout tab triggers inside mock dashboards dynamically
document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".tab-trigger");
    if (!trigger) return;

    // Check if inside evaluation card or final report card
    const card = trigger.closest(".feedback-details-card, .report-details-tabs-card");
    if (!card) return;

    const targetTabId = trigger.getAttribute("data-tab");
    
    // Toggle active triggers inside the card
    const triggers = card.querySelectorAll(".tab-trigger");
    triggers.forEach(t => t.classList.remove("active"));
    trigger.classList.add("active");

    // Toggle active panes inside the card
    const panes = card.querySelectorAll(".tab-pane");
    panes.forEach(pane => {
        if (pane.id === `pane-${targetTabId}`) {
            pane.classList.add("active");
        } else {
            pane.classList.remove("active");
        }
    });
});

// ============================================================================
// 11. Toast Alerts Notification System
// ============================================================================

function showToast(title, message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    let iconName = "check-circle-2";
    if (type === "error") iconName = "x-circle";
    if (type === "warning") iconName = "alert-triangle";

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i data-lucide="${iconName}"></i>
        </div>
        <div class="toast-body">
            <h4>${escapeHtml(title)}</h4>
            <p>${escapeHtml(message)}</p>
        </div>
        <button class="toast-close" aria-label="Close Notification">
            <i data-lucide="x"></i>
        </button>
    `;

    container.appendChild(toast);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons({
            attrs: { class: 'lucide' },
            nameAttr: 'data-lucide',
            nodeList: toast.querySelectorAll('[data-lucide]')
        });
    }

    const dismissTimer = setTimeout(() => {
        dismissToast(toast);
    }, 4500);

    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            clearTimeout(dismissTimer);
            dismissToast(toast);
        });
    }
}

function dismissToast(toastElement) {
    toastElement.style.opacity = "0";
    toastElement.style.transform = "translateX(50px)";
    toastElement.style.transition = "all 0.3s ease";
    
    setTimeout(() => {
        if (toastElement.parentNode) {
            toastElement.parentNode.removeChild(toastElement);
        }
    }, 300);
}

// ============================================================================
// 12. Helper String Sanitizers & Status Converters
// ============================================================================

/**
 * Escapes special characters to prevent HTML/XSS injection.
 */
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Maps integer scores (0-10) to visual status texts.
 */
function getScoreStatusText(score) {
    if (score >= 9) return "Excellent";
    if (score >= 7) return "Good";
    if (score >= 5) return "Average";
    return "Needs Improvement";
}

/**
 * Maps integer scores (0-10) to visual status CSS classes.
 */
function getScoreStatusClass(score) {
    if (score >= 9) return "excellent";
    if (score >= 7) return "good";
    if (score >= 5) return "average";
    return "poor";
}

/**
 * Parses Markdown content safely using marked.js, or falls back to basic HTML escaping.
 */
function parseMarkdownContent(text) {
    if (!text) return "";
    
    if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
        return marked.parse(text);
    }
    
    return escapeHtml(text).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
}

/**
 * Parses inline Markdown content safely using marked.js, or falls back to basic HTML escaping.
 */
function parseMarkdownInline(text) {
    if (!text) return "";
    
    if (typeof marked !== 'undefined' && typeof marked.parseInline === 'function') {
        return marked.parseInline(text);
    }
    
    return escapeHtml(text);
}

/**
 * Helper to return focus-area specific recruitment guidelines.
 */
function getFocusAreaGuidelines(focusArea, jobRole) {
    switch (focusArea) {
        case "Technical":
            return `Focus on technical topics related to ${jobRole}, such as Programming Concepts, Data Structures, Algorithms, Databases, APIs, Frameworks, and role-specific Technical Skills. For example:
- If Frontend: JavaScript, React/Vue, CSS, browser concepts (DOM, performance).
- If Backend: Node.js/Python, databases (SQL/NoSQL), authentication, APIs, system architecture.
Ensure the question tests direct technical execution or design concepts.`;
        case "HR":
            return `Generate typical HR, behavioral alignment, and cultural fit questions. Examples: 'Tell me about yourself', 'Why should we hire you?', 'What are your strengths and weaknesses?', 'Why do you want to join our company?', 'Where do you see yourself in 5 years?'. Avoid technical or programming questions.`;
        case "Behavioral":
            return `Generate scenario-based behavioral questions that prompt the candidate to use the STAR method. Examples: 'Tell me about a time you handled conflict', 'Describe a challenging project', 'Tell me about a failure and what you learned', 'How do you handle deadlines'. Ensure the question asks for past actions or specific experiences.`;
        case "System Design":
            return `Generate scalability, reliability, databases, APIs, and overall architectural design questions appropriate for ${jobRole}. Examples: 'Design a URL Shortener', 'Design an Online Interview Platform', 'Design a Chat Application', 'Design a Notification System'. Focus on high-level architecture decisions.`;
        case "Mixed":
            return `Generate a balanced question. Since this is the first question, you can start with a general introductory technical question or a warm-up HR question related to their role as ${jobRole}.`;
        default:
            return "Generate a relevant interview question.";
    }
}

/**
 * Helper to return evaluation specific criteria based on focus area.
 */
function getEvaluationFocusGuidelines(focusArea) {
    switch (focusArea) {
        case "Technical":
            return "Focus strongly on technical correctness, coding concepts, accurate programming terminology, and direct problem solving.";
        case "HR":
            return "Focus strongly on communication style, confidence, professionalism, alignment with corporate values, and clarity of self-presentation.";
        case "Behavioral":
            return "Focus strongly on how the candidate structured their answer, specifically looking for STAR method components (Situation, Task, Action, Result) detailing conflict resolution, leadership, or teamwork.";
        case "System Design":
            return "Focus strongly on architectural design trade-offs, scalability considerations, reliability, database choice, API structure, and structural decisions.";
        case "Mixed":
            return "Evaluate the candidate based on the specific category of the question asked (Technical, HR, Behavioral, or System Design).";
        default:
            return "Evaluate general completeness and communication.";
    }
}

/**
 * Transforms all standard select elements inside .select-wrapper elements into
 * highly-stylable custom dark-themed dropdown elements.
 */
function initializeCustomSelects() {
    const wrappers = document.querySelectorAll(".select-wrapper");
    
    wrappers.forEach(wrapper => {
        const select = wrapper.querySelector("select");
        if (!select || wrapper.querySelector(".custom-select")) return;
        
        // Hide native select
        select.style.display = "none";
        
        // Create custom select container
        const customSelect = document.createElement("div");
        customSelect.className = "custom-select";
        customSelect.setAttribute("tabindex", "0");
        
        // Create trigger button
        const trigger = document.createElement("div");
        trigger.className = "custom-select-trigger";
        
        const triggerText = document.createElement("span");
        const activeOption = select.querySelector("option[selected]") || select.options[0];
        triggerText.textContent = activeOption ? activeOption.textContent : "Select option...";
        
        const chevron = document.createElement("i");
        chevron.setAttribute("data-lucide", "chevron-down");
        chevron.className = "chevron";
        
        trigger.appendChild(triggerText);
        trigger.appendChild(chevron);
        customSelect.appendChild(trigger);
        
        // Create options dropdown container
        const optionsContainer = document.createElement("div");
        optionsContainer.className = "custom-select-options";
        
        // Populate options
        Array.from(select.options).forEach(opt => {
            if (opt.disabled && opt.value === "") return;
            
            const optDiv = document.createElement("div");
            optDiv.className = "custom-select-option";
            if (opt.selected) {
                optDiv.classList.add("selected");
            }
            optDiv.setAttribute("data-value", opt.value);
            optDiv.textContent = opt.textContent;
            
            optDiv.addEventListener("click", (e) => {
                e.stopPropagation();
                
                select.value = opt.value;
                triggerText.textContent = opt.textContent;
                
                optionsContainer.querySelectorAll(".custom-select-option").forEach(child => {
                    child.classList.remove("selected");
                });
                optDiv.classList.add("selected");
                
                select.dispatchEvent(new Event("change", { bubbles: true }));
                customSelect.classList.remove("active");
            });
            
            optionsContainer.appendChild(optDiv);
        });
        
        customSelect.appendChild(optionsContainer);
        wrapper.appendChild(customSelect);
        
        // Toggle click event listener
        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            
            document.querySelectorAll(".custom-select").forEach(el => {
                if (el !== customSelect) {
                    el.classList.remove("active");
                }
            });
            
            customSelect.classList.toggle("active");
        });
        
        // Keyboard support
        customSelect.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                trigger.click();
            } else if (e.key === "Escape") {
                customSelect.classList.remove("active");
            }
        });
    });
    
    // Global click outside to close custom dropdowns
    document.addEventListener("click", () => {
        document.querySelectorAll(".custom-select").forEach(el => {
            el.classList.remove("active");
        });
    });
    
    // Make sure chevron-down icons render
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Synchronizes custom selects visual state with their underlying native selects.
 */
function syncCustomSelects() {
    const customSelects = document.querySelectorAll(".custom-select");
    customSelects.forEach(custom => {
        const wrapper = custom.closest(".select-wrapper");
        if (!wrapper) return;
        const select = wrapper.querySelector("select");
        if (!select) return;
        
        const activeVal = select.value;
        const activeOpt = Array.from(select.options).find(opt => opt.value === activeVal);
        
        if (activeOpt) {
            const triggerText = custom.querySelector(".custom-select-trigger span");
            if (triggerText) triggerText.textContent = activeOpt.textContent;
            
            custom.querySelectorAll(".custom-select-option").forEach(optDiv => {
                if (optDiv.getAttribute("data-value") === activeVal) {
                    optDiv.classList.add("selected");
                } else {
                    optDiv.classList.remove("selected");
                }
            });
        }
    });
}
