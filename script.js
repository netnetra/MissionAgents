const AGENTS = {
  comedian: { name: 'Comedian', keywords: ['joke', 'funny', 'laugh', 'humor', 'comedy'] },
  cook: {
    name: 'Cook',
    keywords: [
      'recipe',
      'cook',
      'food',
      'meal',
      'ingredient',
      'chef',
      'boil',
      'boiling',
      'water',
      'steam',
      'kettle',
      'temperature',
      'heat',
      'pressure',
    ],
  },
  doctor: {
    name: 'Doctor',
    keywords: [
      'doctor',
      'symptom',
      'pain',
      'health',
      'sick',
      'medicine',
      'diagnosis',
      'burn',
      'burns',
      'scald',
      'scalds',
      'injury',
      'injuries',
      'wound',
      'wounds',
      'rash',
      'blister',
      'bandage',
      'first aid',
      'emergency',
    ],
  },
};


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

function addChatBubble(text, type, agent = null) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}` + (agent ? ` ${agent}` : '');
  if (agent) {
    bubble.innerHTML = `<span class="agent-label">${agent}</span>${text}`;
  } else {
    bubble.textContent = text;
  }
  chatDisplay.append(bubble);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

function addLog(message) {
  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = message;
  responseLog.append(item);
  responseLog.scrollTop = responseLog.scrollHeight;
}

function detectAgent(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  const scores = Object.fromEntries(Object.keys(AGENTS).map((key) => [key, 0]));

  Object.entries(AGENTS).forEach(([agentKey, agentData]) => {
    agentData.keywords.forEach((word) => {
      if (lowerPrompt.includes(word)) {
        scores[agentKey] += 1;
      }
    });
  });

  const isJokeRequest = /joke|funny|humor|laugh|comedy/.test(lowerPrompt);
  const explanationSignal = /explain|how|why|what|describe|works/.test(lowerPrompt);
  const healthSignal = /burn|burns|scald|scalds|injury|injuries|wound|wounds|rash|blister|bandage|first aid|emergency|medical/.test(lowerPrompt);

  const hasCookTopic = scores.cook > 0;
  const hasDoctorTopic = scores.doctor > 0;
  const hasComedianTopic = scores.comedian > 0;

  if (isJokeRequest && !explanationSignal) {
    return 'comedian';
  }

  if (explanationSignal) {
    if (hasCookTopic && !hasDoctorTopic) {
      return 'cook';
    }
    if (hasDoctorTopic && !hasCookTopic) {
      return 'doctor';
    }
    if (hasCookTopic && hasDoctorTopic) {
      if (healthSignal) {
        return 'doctor';
      }
      return scores.cook >= scores.doctor ? 'cook' : 'doctor';
    }
  }

  if (hasCookTopic || hasDoctorTopic || hasComedianTopic) {
    const agentOrder = ['cook', 'doctor', 'comedian'];
    let bestAgent = agentOrder[0];
    let bestScore = scores[bestAgent];

    agentOrder.forEach((agentKey) => {
      if (scores[agentKey] > bestScore) {
        bestScore = scores[agentKey];
        bestAgent = agentKey;
      }
    });

    if (bestScore > 0) {
      if (bestAgent === 'cook' && isJokeRequest && !explanationSignal) {
        return 'comedian';
      }
      return bestAgent;
    }
  }

  return 'cook';
}

function promptNeedsJoke(prompt) {
  return /joke|funny|humor|laugh|comedy/.test(prompt.toLowerCase());
}

function promptNeedsExplanation(prompt) {
  return /explain|how|why|what|describe|works|steps|instructions|method/.test(prompt.toLowerCase());
}

function getRequestedAgents(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  const needsJoke = promptNeedsJoke(prompt);
  const needsExplanation = promptNeedsExplanation(prompt);

  const hasDoctorTopic = /burn|burns|scald|scalds|injury|injuries|wound|wounds|rash|blister|bandage|first aid|emergency|medical|pain|health|sick|break|broken|leg/.test(lowerPrompt);
  const hasCookTopic = /recipe|cook|food|meal|ingredient|chef|boil|boiling|water|steam|kettle|temperature|heat|pressure/.test(lowerPrompt);

  const agents = new Set();

  if (hasDoctorTopic) {
    agents.add('doctor');
  }
  if (hasCookTopic) {
    agents.add('cook');
  }
  if (needsJoke) {
    agents.add('comedian');
  }

  if (agents.size === 0) {
    if (needsJoke) {
      agents.add('comedian');
    } else if (needsExplanation) {
      agents.add('cook');
    } else {
      agents.add('cook');
    }
  }

  return Array.from(agents);
}

function extractAgentPrompt(prompt, agentKey) {
  const segments = prompt
    .split(/\bthen\b/i)
    .map((segment) => segment.trim().replace(/^(the|and)\s+/i, ''))
    .filter(Boolean);

  const patterns = {
    doctor: /burn|burns|scald|scalds|injury|injuries|wound|wounds|rash|blister|bandage|first aid|emergency|medical|pain|health|sick|break|broken|leg/,
    cook: /recipe|cook|food|meal|ingredient|chef|boil|boiling|water|steam|kettle|temperature|heat|pressure/,
    comedian: /joke|funny|humor|laugh|comedy/,
  };

  const explanationPattern = /explain|how|why|what|describe|works|steps|instructions|method/;
  const doctorPattern = patterns.doctor;
  const cookPattern = patterns.cook;
  const comedianPattern = patterns.comedian;

  let bestMatch = prompt;
  let bestScore = -Infinity;

  segments.forEach((segment) => {
    const lowerSegment = segment.toLowerCase();
    let score = 0;

    if (patterns[agentKey].test(lowerSegment)) {
      score += 4;
    }
    if (agentKey === 'cook' && explanationPattern.test(lowerSegment)) {
      score += 2;
    }
    if (agentKey === 'doctor' && doctorPattern.test(lowerSegment)) {
      score += 2;
    }
    if (agentKey === 'comedian' && comedianPattern.test(lowerSegment)) {
      score += 2;
    }
    if (agentKey === 'cook' && doctorPattern.test(lowerSegment)) {
      score -= 2;
    }
    if (agentKey === 'doctor' && cookPattern.test(lowerSegment)) {
      score -= 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = segment;
    }
  });

  let target = bestMatch;

  if (agentKey === 'comedian') {
    const jokePieces = target
      .split(/\band\b/i)
      .map((piece) => piece.trim())
      .filter((piece) => comedianPattern.test(piece));
    if (jokePieces.length > 0) {
      target = jokePieces.join(' and ');
    }
  }

  if (agentKey === 'cook') {
    const cookPieces = target
      .split(/\band\b/i)
      .map((piece) => piece.trim())
      .filter((piece) => cookPattern.test(piece) || explanationPattern.test(piece));
    if (cookPieces.length > 0) {
      target = cookPieces.join(' and ');
    }
  }

  if (agentKey === 'doctor') {
    const doctorPieces = target
      .split(/\band\b/i)
      .map((piece) => piece.trim())
      .filter((piece) => doctorPattern.test(piece));
    if (doctorPieces.length > 0) {
      target = doctorPieces.join(' and ');
    }
  }

  return target;
}

function tryRoute(prompt) {
  const requestedAgents = getRequestedAgents(prompt);
  const agentNames = requestedAgents.map((key) => AGENTS[key].name).join(', ');
  addLog(`<strong>Routing:</strong> detected agents for this request: ${agentNames}.`);

  requestedAgents.forEach((agentKey) => {
    const agent = AGENTS[agentKey];

    if (!agentState[agentKey]) {
      addLog(`<strong>${agent.name}:</strong> is offline. Trying ${maxAttempts} connection attempts.`);
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        addLog(`<strong>${agent.name} retry ${attempt}/${maxAttempts}:</strong> trying to connect...`);
        if (attempt === maxAttempts) {
          addLog(`<strong>${agent.name}:</strong> stayed offline after ${maxAttempts} attempts. Skipping this agent.`);
          return;
        }
      }
    }

    const agentPrompt = extractAgentPrompt(prompt, agentKey);
    addLog(`<strong>Routed to:</strong> ${agent.name}. Sending the agent-specific prompt for a live answer.`);
    callLiveLLM(agentPrompt, agent.name);
  });
}

function callLiveLLM(prompt, agentName) {
  // Build a system instruction to guide the assigned agent.
  const systemMessage = {
    role: 'system',
    content: `You are ${agentName}, one of the MissionAgents.
- If the user asks for an explanation, answer that part clearly and directly.
- If the user also asks for a joke, append one short, relevant joke at the end of your response.
- Keep the joke related to the topic in the prompt when possible.
- Do not replace the explanation with a joke.
`,
  };

  const userMessage = {
    role: 'user',
    content: prompt,
  };

  const messages = [systemMessage, userMessage];

  if (agentName === 'Cook') {
    systemMessage.content = `You are a helpful cook. Answer only cooking and food questions.
If the user asks about boiling water, explain how to boil water clearly and directly.
Do not provide medical advice. Do not tell jokes.`;
  }

  if (agentName === 'Doctor') {
    systemMessage.content = `You are a caring doctor. Answer only medical and health questions.
If the user asks about burns, give first-aid steps clearly and safely.
Do not provide cooking instructions. Do not tell jokes.`;
  }

  if (agentName === 'Comedian') {
    systemMessage.content = `You are a playful comedian. Tell only a short, relevant joke.
Do not explain how boiling water works. Do not provide cooking instructions or medical advice.`;
  }

  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authToken,
    },
    body: JSON.stringify({
      model: 'class-chat-model',
      messages,
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
      addChatBubble(answer, 'answer', agentName);
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
