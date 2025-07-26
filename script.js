const chatInput = document.querySelector("#chat-input");
const sendButton = document.querySelector("#send-btn");
const chatContainer = document.querySelector(".chat-container");
const themeButton = document.querySelector("#theme-btn");
const deleteButton = document.querySelector("#delete-btn");
const voiceBtn = document.getElementById('voice-btn');
const listeningAnimation = document.getElementById('listening-animation');
const languageSelect = document.getElementById('language-select');
const muteBtn = document.getElementById('mute-btn');

let userText = null;
const API_KEY = "AIzaSyDxEH0xeuFT1mGEyfNozYX4hd__uR0F_kc"; // API key

let isMuted = false;

let queuedText = null;
let currentUtterance = null;


muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? 'volume_off' : 'volume_up';

    // Stop any ongoing speech if muted
    if (isMuted) {
        if (currentUtterance) {
            speechSynthesis.cancel();
            queuedText = currentUtterance.text; // Store the remaining text
        }
    } else if (queuedText) {
        // Resume speaking the queued text
        speakResponse(queuedText);
        queuedText = null; // Clear queued text after resuming
    }
});

const loadDataFromLocalstorage = () => {
    // Load saved chats and theme from local storage and apply/add on the page
    const themeColor = localStorage.getItem("themeColor");

    document.body.classList.toggle("light-mode", themeColor === "light_mode");
    themeButton.innerText = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";

    const defaultText = `<div class="default-text">
                            <h1>Sarvagya says Hi!</h1>
                            <h2>How may I help you?</h2>
                        </div>`

    chatContainer.innerHTML = localStorage.getItem("all-chats") || defaultText;
    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to bottom of the chat container
}

const createChatElement = (content, className) => {
    // Create new div and apply chat, specified class and set html content of div
    const chatDiv = document.createElement("div");
    chatDiv.classList.add("chat", className);
    chatDiv.innerHTML = content;
    return chatDiv; // Return the chat div
}

const getChatResponse = async (incomingChatDiv) => {
    const pElement = document.createElement("p");

    try {
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" + API_KEY,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: userText }] }]
                })
            }
        ); // Send POST request to API, get response and set the response as paragraph element text


        const data = await response.json();
        
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
        
        text = enhanceSpeedFigures(text);
        text = spellCheck(text);
        pElement.textContent = text;
        speakResponse(text); // Voice output for the response

    } catch (error) {
        pElement.classList.add("error");
        pElement.textContent = "Oops! Something went wrong while retrieving the response. Please try again.";
        console.error("API error:", error);
    }
// Removes tying animation
    incomingChatDiv.querySelector(".typing-animation").remove();
    incomingChatDiv.querySelector(".chat-details").appendChild(pElement);
    localStorage.setItem("all-chats", chatContainer.innerHTML);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
};

const enhanceSpeedFigures = (text) => {
    // Enhance the speed figures if needed
    return text.replace(/\b(\d{1,2})(\s?mph|km\/h)\b/g, (match, p1, p2) => {
        let speed = parseInt(p1);
        if (speed < 60) {
            speed *= 1.6; // Assume the user meant kph instead of mph if the speed is low
            return `${Math.round(speed)} kph`;
        }
        return match;
    });
}

const spellCheck = (text) => {
    // Simple spellcheck using browser's built-in spellchecker or any other library if needed
    return text;
}

const speakResponse = (text) => {
    // Stop any ongoing speech
    if (currentUtterance) {
        speechSynthesis.cancel();
    }

    if (!isMuted) {
        // Create a new utterance and speak it
        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = languageSelect.value;
        currentUtterance.addEventListener('end', () => {
            currentUtterance = null; // Clear currentUtterance when speech ends
        });
        speechSynthesis.speak(currentUtterance);
        queuedText = null; // Clear queued text
    } else {
        // Store the text to be spoken when unmuted
        queuedText = text;
    }
}

const copyResponse = (copyBtn) => {
    // Copy the text content of the response to the clipboard
    const responseTextElement = copyBtn.parentElement.querySelector("p");
    navigator.clipboard.writeText(responseTextElement.textContent);
    copyBtn.textContent = "done";
    setTimeout(() => copyBtn.textContent = "content_copy", 1000);
}

const showTypingAnimation = () => {
    // Display the typing animation and call the getChatResponse function
    const html = `<div class="chat-content">
                    <div class="chat-details">
                        <img src="images/ai.jpeg" alt="chatbot-img">
                        <div class="typing-animation">
                            <div class="typing-dot" style="--delay: 0.2s"></div>
                            <div class="typing-dot" style="--delay: 0.3s"></div>
                            <div class="typing-dot" style="--delay: 0.4s"></div>
                        </div>
                    </div>
                    <span onclick="copyResponse(this)" class="material-symbols-rounded">content_copy</span>
                </div>`;
    // Create an incoming chat div with typing animation and append it to chat container
    const incomingChatDiv = createChatElement(html, "incoming");
    chatContainer.appendChild(incomingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    getChatResponse(incomingChatDiv);
}

const handleOutgoingChat = () => {
    userText = chatInput.value.trim(); // Get chatInput value and remove extra spaces
    if (!userText) return; // If chatInput is empty return from here

    // Clear the input field and reset its height
    chatInput.value = "";
    chatInput.style.height = `${initialInputHeight}px`;

    const html = `<div class="chat-content">
                    <div class="chat-details">
                        <img src="images/me.jpeg" alt="user-img">
                        <p>${userText}</p>
                    </div>
                </div>`;

    // Create an outgoing chat div with user's message and append it to chat container
    const outgoingChatDiv = createChatElement(html, "outgoing");
    chatContainer.querySelector(".default-text")?.remove();
    chatContainer.appendChild(outgoingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    setTimeout(showTypingAnimation, 500);
}

deleteButton.addEventListener("click", () => {
    // Remove the chats from local storage and call loadDataFromLocalstorage function
    if (confirm("Are you sure you want to delete all the chats?")) {
        localStorage.removeItem("all-chats");
        loadDataFromLocalstorage();
    }
});

themeButton.addEventListener("click", () => {
    // Toggle body's class for the theme mode and save the updated theme to the local storage 
    document.body.classList.toggle("light-mode");
    localStorage.setItem("themeColor", themeButton.innerText);
    themeButton.innerText = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";
});

const initialInputHeight = chatInput.scrollHeight;

chatInput.addEventListener("input", () => {
    // Adjust the height of the input field dynamically based on its content
    chatInput.style.height = `${initialInputHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
    // If the Enter key is pressed without Shift and the window width is
    // larger than 800 pixels, handle the outgoing chat
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleOutgoingChat();
    }
});

loadDataFromLocalstorage();
sendButton.addEventListener("click", handleOutgoingChat);

document.addEventListener('DOMContentLoaded', () => {
    // Populate the language dropdown
    const languages = [
        { code: 'en-US', name: 'English' },
        { code: 'en-IN', name: 'Hinglish' },
        // Add more languages as needed
    ];

    languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        languageSelect.appendChild(option);
    });

    // Initialize the Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = languageSelect.value;

    // Update recognition language on change
    languageSelect.addEventListener('change', () => {
        recognition.lang = languageSelect.value;
    });

    // Start listening for voice input
    voiceBtn.addEventListener('click', () => {
        recognition.start();
        listeningAnimation.classList.remove('hidden');
    });

    // Handle speech recognition results
    recognition.addEventListener('result', (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        listeningAnimation.classList.add('hidden');

        // Optionally, read out the response
        speakResponse(transcript);
    });

    // Handle recognition end
    recognition.addEventListener('end', () => {
        listeningAnimation.classList.add('hidden');
    });

    // Handle recognition errors
    recognition.addEventListener('error', (event) => {
        console.error('Speech recognition error:', event.error);
        listeningAnimation.classList.add('hidden');
    });

    // Mute/Unmute functionality
});

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => {
    console.log("Available Models:", data);
  })
  .catch(error => {
    console.error("Error listing models:", error);
  });

