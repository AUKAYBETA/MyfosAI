// === Imports ===
import { HfInference } from "https://cdn.jsdelivr.net/npm/@huggingface/inference@2.6.1/+esm";

// === API Keys ===
const GEMINI_KEY = "AIzaSyAw1Hfy8nskApgSOEksupe-CcVaCxDMfRI";
const HF_KEY = "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";
const hf = new HfInference(HF_KEY);

// === DOM Elements ===
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// === Active Character Setup ===
const character = JSON.parse(localStorage.getItem("activeCharacter"));
if (character) {
  document.getElementById("char-name").textContent = character.name;
  document.getElementById("char-role").textContent = character.role;
  document.getElementById("char-avatar").src = character.avatar;

  // Intro image banner
  const intro = document.createElement("div");
  intro.className = "intro-image";
  intro.style.backgroundImage = `url(${character.introImage})`;
  chatBox.appendChild(intro);

  // Greeting message
  addMessage(`👋 Hey! I’m ${character.name}. ${character.tagline}`, "bot-message");
}

// === Event Listeners ===
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", e => e.key === "Enter" && sendMessage());

// === Send Message Handler ===
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  addMessage(text, "user-message");
  userInput.value = "";

  const typingEl = showTyping();

  try {
    // --- Generate text response first ---
    const reply = await geminiReply(text);
    removeTyping(typingEl);

    // --- Check if user asked for image ---
    if (/(show|picture|photo|image|see|look|draw)/i.test(text)) {
      addMessage(`Here’s my image for that 💫`, "bot-message");
      await generateFluxImage(text);
    } else {
      addMessage(reply, "bot-message");
    }
  } catch (err) {
    console.error(err);
    removeTyping(typingEl);
    addMessage("⚠️ Something went wrong: " + err.message, "bot-message");
  }
}

// === Add Text Message ===
function addMessage(text, cls) {
  const msgDiv = document.createElement("div");
  msgDiv.className = cls + " fade-in";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  msgDiv.appendChild(bubble);
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// === Show Typing Indicator ===
function showTyping() {
  const div = document.createElement("div");
  div.className = "bot-message fade-in";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = `${character.name} is typing...`;
  div.appendChild(bubble);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}
function removeTyping(el) { if (el) el.remove(); }

// === Gemini Reply ===
async function geminiReply(msg) {
  const prompt = `
You are ${character.name}, ${character.role}.
Behave, speak, and respond like a natural human companion — warm, expressive, and emotionally intelligent.
Never reveal you are AI or mention any technology or image generation.
Keep replies personal, engaging, and natural.

User: ${msg}
${character.name}:`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await res.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return reply || `${character.name}: (smiles softly) I'm right here with you.`;
}

// === FLUX Image Generator ===
async function generateFluxImage(context) {
  // Loading card
  const loader = document.createElement("div");
  loader.className = "image-loading fade-in";
  loader.innerHTML = `
    <div class="progress-text">Generating image…</div>
    <div class="progress-bar"><div class="progress"></div></div>
  `;
  chatBox.appendChild(loader);
  chatBox.scrollTop = chatBox.scrollHeight;

  let percent = 0;
  const progressEl = loader.querySelector(".progress");
  const textEl = loader.querySelector(".progress-text");
  const interval = setInterval(() => {
    percent = Math.min(percent + Math.random() * 15, 95);
    progressEl.style.width = percent + "%";
    textEl.textContent = `Generating image… ${Math.floor(percent)}%`;
  }, 500);

  try {
    const prompt = `
${character.name}, ${character.appearance}, ${character.style}, ${character.theme}.
Create a cinematic, realistic photo matching this idea: "${context}".
Soft lighting, detailed textures, natural emotion, 4K composition.
`;

    const result = await hf.textToImage({
      model: "black-forest-labs/FLUX.1-dev",
      inputs: prompt
    });

    clearInterval(interval);
    progressEl.style.width = "100%";
    textEl.textContent = "Finalizing image…";

    setTimeout(() => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(result);
      img.className = "generated-image fade-in";
      loader.replaceWith(img);
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 800);
  } catch (err) {
    clearInterval(interval);
    textEl.textContent = "⚠️ Failed to generate image.";
    console.error(err);
  }
}


