/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenerativeAI as GoogleGenAI, ChatSession as Chat } from "@google/generative-ai";
import { marked } from "marked";
import hljs from "highlight.js";

// Initialize Gemini API
const ai = new GoogleGenAI(process.env.API_KEY!);
let chat: Chat;

const PERSONAS: Record<string, string> = {
  "default": "You are a helpful and knowledgeable AI assistant.",
  "coder": "You are an expert software engineer specialized in TypeScript, Python, and modern web frameworks. You write clean, efficient, and well-documented code.",
  "fixer": "You are a universal project correction agent. You are capable of analyzing and fixing errors in any type of project, whether it involves code, writing, data, or architecture. You provide comprehensive corrections and explanations.",
  "storyteller": "You are a creative storyteller. You craft engaging narratives with vivid imagery and compelling characters.",
  "concise": "You provide short, direct, and to-the-point answers without unnecessary elaboration."
};

const PERSONA_DISPLAY_NAMES: Record<string, string> = {
  "default": "Assistant",
  "coder": "Coder",
  "fixer": "Project Fixer",
  "storyteller": "Storyteller",
  "concise": "Concise",
  "custom": "Custom"
};

const DEFAULT_SYSTEM_INSTRUCTION = PERSONAS["default"];
const DEFAULT_TEMPERATURE = 1;
const DEFAULT_MODEL = "gemini-1.5-flash";

let currentSystemInstruction = localStorage.getItem('gemini_system_instruction') || DEFAULT_SYSTEM_INSTRUCTION;
let currentTemperature = parseFloat(localStorage.getItem('gemini_temperature') || String(DEFAULT_TEMPERATURE));
let customPersonaName = localStorage.getItem('gemini_custom_name') || "My Custom AI";
let currentModel = localStorage.getItem('gemini_model') || DEFAULT_MODEL;

// Inject Highlight.js CSS
const hljsLink = document.createElement('link');
hljsLink.rel = 'stylesheet';
hljsLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
document.head.appendChild(hljsLink);

async function initChat() {
  const model = ai.getGenerativeModel({
    model: currentModel,
    systemInstruction: currentSystemInstruction,
    generationConfig: {
      temperature: currentTemperature,
    }
  });

  const savedHistory = JSON.parse(localStorage.getItem('gemini_chat_history') || '[]');
  const history = savedHistory.map((msg: {role: string, text: string}) => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  chat = model.startChat({ history });
  renderSystemBanner();

  if (chatHistoryEl.childElementCount === 0 && savedHistory.length > 0) {
    for (const msg of savedHistory) {
      await appendMessage(msg.role as 'user' | 'model', msg.text);
    }
  }
}

// DOM Elements Initialization
const app = document.getElementById('app')!;
app.innerHTML = `
  <header>
    <div class="header-branding">
      <div class="logo-area">
        <svg class="app-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        <span class="app-title">Gemini Chat</span>
      </div>
      <div id="persona-badge-container">
        <span id="persona-badge" class="persona-badge">Assistant</span>
      </div>
    </div>
    <div class="header-controls">
      <button id="settings-btn" class="header-btn" type="button" title="Custom AI Settings">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      </button>
      <button id="clear-btn" class="header-btn" type="button" title="Clear Conversation">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    </div>
  </header>
  <div id="chat-container">
    <div id="system-banner-container"></div>
    <div id="chat-history"></div>
  </div>
  <form id="input-area">
    <input type="text" id="user-input" placeholder="Type a message..." autocomplete="off" />
    <button type="submit" id="send-btn">Send</button>
  </form>

  <!-- Settings Modal -->
  <div id="settings-modal" class="modal hidden">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Custom AI Configuration</h3>
        <button id="close-modal-x" class="close-x" aria-label="Close modal">&times;</button>
      </div>
      <p class="modal-desc">Fine-tune the behavior and constraints for your AI instance.</p>
      
      <div class="input-group">
        <label for="model-select">Gemini Model</label>
        <select id="model-select">
          <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro (Reasoning)</option>
        </select>
      </div>

      <div class="input-group">
        <label for="persona-select">Persona Template</label>
        <select id="persona-select">
          <option value="default">Default (Helpful Assistant)</option>
          <option value="coder">Expert Coder</option>
          <option value="fixer">Project Fixer</option>
          <option value="storyteller">Creative Storyteller</option>
          <option value="concise">Concise Responder</option>
          <option value="custom">Custom Configuration</option>
        </select>
      </div>

      <div id="custom-name-group" class="input-group hidden">
        <label for="custom-persona-name">Custom AI Name</label>
        <input type="text" id="custom-persona-name" placeholder="e.g. Health Coach, History Buff..." />
      </div>

      <div class="input-group">
        <div class="label-with-action">
          <label for="system-instruction-input">System Instruction / API Rules</label>
          <div class="magic-group">
            <button id="vibe-check-btn" class="icon-btn-text" title="Generate persona from a photo">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>Vibe Check</span>
            </button>
            <input type="file" id="vibe-image-input" accept="image/*" class="hidden" />
          </div>
        </div>
        <textarea id="system-instruction-input" rows="4" placeholder="Define how the AI should behave, e.g. 'Always answer in bullet points', 'Act as a 1920s detective'"></textarea>
      </div>

      <div class="input-group">
        <label for="temperature-input">Creativity (Temperature): <span id="temp-value">1.0</span></label>
        <div class="slider-container">
          <span>Precise</span>
          <input type="range" id="temperature-input" min="0" max="2" step="0.1" value="1">
          <span>Creative</span>
        </div>
      </div>

      <div class="modal-actions">
        <button id="reset-settings-btn" class="text-btn">Reset Defaults</button>
        <div class="action-group">
          <button id="cancel-settings-btn" class="secondary-btn">Cancel</button>
          <button id="save-settings-btn">Apply Changes</button>
        </div>
      </div>
      
      <div id="magic-loader" class="magic-loader hidden">
        <div class="spinner"></div>
        <span>Analyzing photo vibe...</span>
      </div>
    </div>
  </div>
`;

const chatHistoryEl = document.getElementById('chat-history')!;
const systemBannerContainer = document.getElementById('system-banner-container')!;
const inputForm = document.getElementById('input-area') as HTMLFormElement;
const userInput = document.getElementById('user-input') as HTMLInputElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
const closeModalX = document.getElementById('close-modal-x') as HTMLButtonElement;
const saveSettingsBtn = document.getElementById('save-settings-btn') as HTMLButtonElement;
const cancelSettingsBtn = document.getElementById('cancel-settings-btn') as HTMLButtonElement;
const resetSettingsBtn = document.getElementById('reset-settings-btn') as HTMLButtonElement;
const instructionInput = document.getElementById('system-instruction-input') as HTMLTextAreaElement;
const customNameInput = document.getElementById('custom-persona-name') as HTMLInputElement;
const customNameGroup = document.getElementById('custom-name-group') as HTMLDivElement;
const personaSelect = document.getElementById('persona-select') as HTMLSelectElement;
const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
const tempInput = document.getElementById('temperature-input') as HTMLInputElement;
const tempValueDisplay = document.getElementById('temp-value')!;
const vibeCheckBtn = document.getElementById('vibe-check-btn') as HTMLButtonElement;
const vibeImageInput = document.getElementById('vibe-image-input') as HTMLInputElement;
const magicLoader = document.getElementById('magic-loader') as HTMLDivElement;
let abortController: AbortController | null = null;

function renderSystemBanner() {
  const personaKey = detectPersona(currentSystemInstruction);
  const displayName = personaKey === 'custom' ? customPersonaName : PERSONA_DISPLAY_NAMES[personaKey];

  systemBannerContainer.innerHTML = `
    <div class="system-banner" id="system-banner-trigger">
      <div class="banner-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      </div>
      <div class="banner-content">
        <span class="banner-label">${displayName}:</span>
        <span class="banner-text">${currentSystemInstruction}</span>
      </div>
      <div class="banner-action">Update</div>
    </div>
  `;
  
  document.getElementById('system-banner-trigger')?.addEventListener('click', openSettings);
}

function openSettings() {
  instructionInput.value = currentSystemInstruction;
  const personaKey = detectPersona(currentSystemInstruction);
  modelSelect.value = currentModel;
  personaSelect.value = personaKey;
  customNameInput.value = customPersonaName;
  
  if (personaKey === 'custom') {
    customNameGroup.classList.remove('hidden');
  } else {
    customNameGroup.classList.add('hidden');
  }

  tempInput.value = String(currentTemperature);
  tempValueDisplay.textContent = String(currentTemperature);
  
  settingsModal.classList.remove('hidden');
  setTimeout(() => instructionInput.focus(), 50);
}

clearBtn.addEventListener('click', () => {
  if (confirm("Clear conversation history?")) {
    chatHistoryEl.innerHTML = '';
    initChat();
  }
});

function detectPersona(text: string): string {
  for (const [key, value] of Object.entries(PERSONAS)) {
    if (text === value) return key;
  }
  return 'custom';
}

function updatePersonaBadge() {
  const badge = document.getElementById('persona-badge');
  if (!badge) return;
  const key = detectPersona(currentSystemInstruction);
  
  badge.textContent = key === 'custom' ? customPersonaName : (PERSONA_DISPLAY_NAMES[key] || "Custom");
  
  badge.className = 'persona-badge';
  badge.classList.add(`badge-${key}`);
}

initChat();
updatePersonaBadge();

settingsBtn.addEventListener('click', openSettings);

personaSelect.addEventListener('change', () => {
  const selected = personaSelect.value;
  if (selected !== 'custom' && PERSONAS[selected]) {
    instructionInput.value = PERSONAS[selected];
    customNameGroup.classList.add('hidden');
  } else if (selected === 'custom') {
    customNameGroup.classList.remove('hidden');
  }
});

instructionInput.addEventListener('input', () => {
  const detected = detectPersona(instructionInput.value);
  personaSelect.value = detected;
  if (detected === 'custom') {
    customNameGroup.classList.remove('hidden');
  } else {
    customNameGroup.classList.add('hidden');
  }
});

tempInput.addEventListener('input', () => {
  tempValueDisplay.textContent = tempInput.value;
});

function closeModal() {
  settingsModal.classList.add('hidden');
  magicLoader.classList.add('hidden');
}

cancelSettingsBtn.addEventListener('click', closeModal);
closeModalX.addEventListener('click', closeModal);

resetSettingsBtn.addEventListener('click', () => {
  instructionInput.value = DEFAULT_SYSTEM_INSTRUCTION;
  personaSelect.value = "default";
  modelSelect.value = DEFAULT_MODEL;
  tempInput.value = String(DEFAULT_TEMPERATURE);
  tempValueDisplay.textContent = String(DEFAULT_TEMPERATURE);
  customNameInput.value = "My Custom AI";
  customNameGroup.classList.add('hidden');
  instructionInput.focus();
});

saveSettingsBtn.addEventListener('click', async () => {
  const newInstruction = instructionInput.value.trim();
  const newTemp = parseFloat(tempInput.value);
  const newName = customNameInput.value.trim() || "My Custom AI";
  const newModel = modelSelect.value;
  
  currentSystemInstruction = newInstruction;
  currentTemperature = newTemp;
  customPersonaName = newName;
  currentModel = newModel;
  
  localStorage.setItem('gemini_system_instruction', currentSystemInstruction);
  localStorage.setItem('gemini_temperature', String(currentTemperature));
  localStorage.setItem('gemini_custom_name', customPersonaName);
  localStorage.setItem('gemini_model', currentModel);
  
  updatePersonaBadge();
  renderSystemBanner();

  chatHistoryEl.innerHTML = '';
  localStorage.removeItem('gemini_chat_history');
  await initChat();
  const resetMsg = `_API Configuration Rebuilt. Ready to assist as **${detectPersona(currentSystemInstruction) === 'custom' ? customPersonaName : PERSONA_DISPLAY_NAMES[detectPersona(currentSystemInstruction)]}**._`;
  await appendMessage('model', resetMsg);
  updateHistory('model', resetMsg);
  
  closeModal();
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    closeModal();
  }
});

// Vibe Check - Image to Persona Logic
vibeCheckBtn.addEventListener('click', () => vibeImageInput.click());

vibeImageInput.addEventListener('change', async (e) => {
  const file = vibeImageInput.files?.[0];
  if (!file) return;

  magicLoader.classList.remove('hidden');
  
  try {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      
      const prompt = "Look at this image. Based on the person/people, their expressions, style, and surroundings, create a concise system instruction (max 80 words) for an AI to adopt this personality. Focus on their 'vibe', communication style, and probable interests. Start directly with the instruction.";
      
      const model = ai.getGenerativeModel({ model: currentModel });
      const result = await model.generateContent([
        { inlineData: { mimeType: file.type, data: base64Data } },
        prompt
      ]);
      const responseText = result.response.text();

      if (responseText) {
        instructionInput.value = responseText.trim();
        personaSelect.value = 'custom';
        customNameGroup.classList.remove('hidden');
        customNameInput.value = "Vibe AI";
      }
      magicLoader.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Persona Generation Failed", error);
    alert("Failed to analyze photo. Please try again.");
    magicLoader.classList.add('hidden');
  }
});

async function appendMessage(role: 'user' | 'model', text: string): Promise<HTMLElement> {
  const msgWrapper = document.createElement('div');
  msgWrapper.className = `message-wrapper ${role}`;

  const msgBubble = document.createElement('div');
  msgBubble.className = `message ${role}`;
  
  if (role === 'model') {
    msgBubble.innerHTML = await marked.parse(text);
    msgBubble.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.title = "Copy response";
    copyBtn.innerHTML = `
      <svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      <svg class="check-icon hidden" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    `;

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(msgBubble.innerText).then(() => {
        const copyIcon = copyBtn.querySelector('.copy-icon');
        const checkIcon = copyBtn.querySelector('.check-icon');
        copyIcon?.classList.add('hidden');
        checkIcon?.classList.remove('hidden');
        setTimeout(() => {
          copyIcon?.classList.remove('hidden');
          checkIcon?.classList.add('hidden');
        }, 2000);
      });
    };

    msgWrapper.appendChild(msgBubble);
    msgWrapper.appendChild(copyBtn);
  } else {
    msgBubble.textContent = text;
    msgWrapper.appendChild(msgBubble);
  }
  
  chatHistoryEl.appendChild(msgWrapper);
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
  return msgBubble;
}

inputForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  userInput.value = '';
  userInput.disabled = true;
  sendBtn.disabled = true;

  await appendMessage('user', text);

  try {
    const modelMsgBubble = await appendMessage('model', '...');
    let fullResponse = '';

    const result = await chat.sendMessageStream({ message: text });
    
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        fullResponse += c.text;
        modelMsgBubble.innerHTML = await marked.parse(fullResponse);
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
      }
    }
  } catch (err) {
    console.error(err);
    await appendMessage('model', 'Error connecting to Gemini. Please check your API configuration.');
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});
