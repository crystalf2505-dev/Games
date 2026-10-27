const word_length = 5;
const max_attempts = 6;

const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const message = document.getElementById("message");
const newGameButton = document.getElementById("new-game");

let gameId = null;
let currentGuess = "";
let currentRow = 0;
let gameOver = false;
let submitting = false;

const keyboardColors = {};

function createBoard() {
    board.innerHTML = "";
    for(let row = 0; row < max_attempts; row++) {
        const rowElement = document.createElement("div");
        rowElement.className = "row";
        for(let col = 0; col < word_length; col++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.id = 'tile-${row}-${col}';
            rowElement.appendChild(tile);
        }
        board.appendChild(rowElement);
    }
}

function createKeyboard() {
    keyboard.innerHTML = "";
    const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
    rows.forEach((letters,rowIndex) => {
        const row = document.createElement("div");
        row.className = "keyboard-row";

        if(rowIndex === 2) {
            const enter = createKey("ENTER", true);
            row.appendChild(enter);
        }

        for(const letter of letters) {
            row.appendChild(createKey(letter));
        }

        if(rowIndex === 2) {
            const backspace = createKey("←", true);
            row.appendChild(backspace);
        }
        keyboard.appendChild(row);
    });
}

function createKey(value, wide = false) {
    const button = document.createElement("button");
    button.className = wide ? "key wide" : "key";
    button.textContent = value;
    button.type = "button";
    button.addEventListener("click", () => handleInput(value));
    return button;
}

async function startNewGame() {
    gameOver = true;
    submitting = false;
    message.textContent = "Starting new game...";
    try{
        const response = await fetch("/api/new-game", {
            method: "POST"
        });
        if(!response.ok) {
            throw new Error("Failed to start a new game");
        }
        const data = await response.json();
        gameId = data.gameId;
        currentGuess = "";
        currentRow = 0;
        gameOver = false;

        for(const key in keyboardColors) {
            delete keyboardColors[key];
        }
        createBoard();
        createKeyboard();
        message.textContent = "New game started! Make your guess.";
    } catch(error) {
        message.textContent = "Error starting new game: " + error.message;  
    }
}

function handleInput(value) {
    if(gameOver || submitting || !gameId) return;

    if(value === "ENTER") {
        submitGuess();
        return;
    }

    if((value === "←") || value === "BACKSPACE") {
        currentGuess = currentGuess.slice(0, -1);
        updatecurrentRow();
        return;
    }

    if((/^[A-Z]$/.test(value) && currentGuess.length < word_length)) {
        currentGuess += value.toUpperCase();
        updatecurrentRow();
    }
}

function updatecurrentRow() {
    for(let col = 0; col < word_length; col++) {
        const tile = document.getElementById(`tile-${currentRow}-${col}`);
        const letter = currentGuess[col] || "";
        tile.textContent = letter;
        tile.classList.toggle("filled", letter !== "");
    }
}

async function submitGuess() {
    if(currentGuess.length !== word_length) {
        message.textContent = "Please enter a 5-letter word.";
        return;
    }
    submitting = true;
    try {
        const response = await fetch("/api/guess", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({gameId, guess: currentGuess})
        });
        const data = await response.json();
        if(!response.ok) {
            throw new Error(data.error || "Failed to submit guess");
        }

        for(let col = 0; col < word_length; col++) {
            const tile = document.getElementById(`tile-${currentRow}-${col}`);
            const letter = currentGuess[col];
            const color = data.result[col];
            tile.classList.remove("filled");
            tile.classList.add(color);
            updateKeyboardColor(letter, color);
        }
        currentRow++;
        currentGuess = "";
        if(data.won) {
            message.textContent = "Congratulations! You've guessed the word!";
            gameOver = true;
        } else if(data.lost) {
            message.textContent = `Game over! The correct word was: ${data.answer}`;
            gameOver = true;
        } else { 
            message.textContent = `Attempts: ${data.attempts}/${max_attempts}. Keep guessing!`;
        }
    } catch(error) {
        message.textContent = "Error submitting guess: " + error.message;
    } finally {
        submitting = false;
    }   
}

function updaterKeyboardColor(letter, color) {
    const priority = { green: 3, yellow: 2, gray: 1 };
    const existing = keyboardColors[letter];
    if(!existing || priority[color] > priority[existing]) {
        keyboardColors[letter] = color;
    }
    documnent.querySelectorAll(".key").forEach(key => {
        if(key.textContent === letter) {
            key.classList.remove("green", "yellow", "gray");
            key.classList.add(keyboardColors[letter]);
        }  
    });
}

document.addEventListener("keydown", (event) => {
    if(event.ctrlKey || event.metaKey || event.altKey) return;
    if(event.key === "Enter") {
        handleInput("ENTER");
    } else if(event.key === "Backspace") {
        handleInput("←");
    } else if(/^[a-zA-Z]$/.test(event.key)) {
        handleInput(event.key);
    }
});

newGameButton.addEventListener("click", startNewGame);

createBoard();
createKeyboard();
startNewGame();