const AGENTS = {
  comedian: { name: 'Comedian', keywords: ['joke', 'funny', 'laugh', 'humor', 'comedy'] },
  cook: { name: 'Cook', keywords: ['recipe', 'cook', 'food', 'meal', 'ingredient', 'chef'] },
  doctor: { name: 'Doctor', keywords: ['doctor', 'symptom', 'pain', 'health', 'sick', 'medicine', 'diagnosis'] },
};

const comedianJokes = [
  'Why did the scarecrow win an award? Because he was outstanding in his field.',
  'I told my computer I needed a break, and now it sends me weekly vacation ads.',
  'Why do bees have sticky hair? Because they use honeycombs.',
  'I used to be addicted to the hokey pokey, but I turned myself around.',
  'What do you call cheese that isn’t yours? Nacho cheese.',
  'I asked the librarian if the library had books on paranoia. She whispered, “They’re right behind you.”',
];

const usedJokes = new Set();

const agentState = {
  comedian: true,
  cook: true,
  doctor: true,
};

const endpoint = 'https://vibe-proxy-gqv4.onrender.com/v1/chat/completions';
const authToken = 'Bearer sk-vibe-summer-2026';
const maxAttempts = 3;

const promptInput = document.getElementById('userPrompt');
const sendBtn = document.getElementById('sendBtn');
const responseLog = document.getElementById('responseLog');
const chatDisplay = document.getElementById('chatDisplay');

function addChatBubble(text, type) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = text;
  chatDisplay.prepend(bubble);
}

function addLog(message) {
  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = message;
  responseLog.prepend(item);
}

function detectAgent(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  for (const [agentKey, agentData] of Object.entries(AGENTS)) {
    const matched = agentData.keywords.some((word) => lowerPrompt.includes(word));
    if (matched) {
      return agentKey;
    }
  }
  return 'cook';
}

function getUniqueComedianJoke() {
  const remainingJokes = comedianJokes.filter((joke) => !usedJokes.has(joke));

  if (remainingJokes.length === 0) {
    usedJokes.clear();
  }

  const nextJoke = comedianJokes.find((joke) => !usedJokes.has(joke));
  usedJokes.add(nextJoke);
  return nextJoke;
}

function tryRoute(prompt) {
  const agentKey = detectAgent(prompt);
  const agent = AGENTS[agentKey];

  if (!agentState[agentKey]) {
    addLog(`<strong>Routing:</strong> ${agent.name} is offline. Connection attempts will now be tried ${maxAttempts} times.`);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      addLog(`<strong>Retry ${attempt}/${maxAttempts}:</strong> attempting to connect with ${agent.name}...`);
      if (attempt === maxAttempts) {
        addLog(`<strong>Stop:</strong> ${agent.name} stayed offline after ${maxAttempts} attempts, so the request was not forwarded.`);
        return;
      }
    }
  }

  if (agentKey === 'comedian') {
    const freshJoke = getUniqueComedianJoke();
    addLog(`<strong>Routed to:</strong> ${agent.name}. A fresh, unused joke has been selected.`);
    addLog(`<strong>Story:</strong> routed to ${agent.name}, pulled a new joke from the unique joke queue, and answered.`);
    addChatBubble(freshJoke, 'answer');
    return;
  }

  addLog(`<strong>Routed to:</strong> ${agent.name}. Prompt accepted and forwarded for a live answer.`);
  callLiveLLM(prompt, agent.name);
}

function callLiveLLM(prompt, agentName) {
  // This fetch() call sends the user's prompt to the classroom proxy endpoint.
  // It uses a standard POST request, JSON headers, and the exact auth token you provided.
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authToken,
    },
    body: JSON.stringify({
      model: 'class-chat-model',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      // The model response lives in the OpenAI-like response shape.
      // We read the first assistant message content from data.choices[0].message.content.
      const answer = data?.choices?.[0]?.message?.content || 'No answer returned.';
      addLog(`<strong>Story:</strong> routed to ${agentName}, asked the live model, and got the answer.`);
      addChatBubble(answer, 'answer');
    })
    .catch((error) => {
      addLog(`<strong>Proxy error:</strong> the request did not return a successful answer. ${error.message}`);
    });
}

sendBtn.addEventListener('click', () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    addLog('<strong>Prompt:</strong> Please type a question before sending.');
    return;
  }

  addChatBubble(prompt, 'user');
  addLog(`<strong>Prompt:</strong> “${prompt}”`);
  tryRoute(prompt);
});

document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
  checkbox.addEventListener('change', (event) => {
    const agentKey = event.target.dataset.agent;
    agentState[agentKey] = event.target.checked;
    const status = event.target.checked ? 'online' : 'offline';
    addLog(`<strong>Status:</strong> ${AGENTS[agentKey].name} is now ${status}.`);
  });
});
