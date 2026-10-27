//
const app = require('express')();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const WORDS = ['apple', 'bingo', 'candy', 'delta', 'eagle', 'fable', 'grape', 'honey', 'ivory', 'joker']; // Example words

const games = new Map();

app.post("/api/new-game", (req, res) => {
    const gameId = crypto.randomUUID(); // Generate a unique game ID
    const answer = WORDS[Math.floor(Math.random() * WORDS.length)]; // Randomly select a word
    games.set(gameId, {answer, guesses: [], finished: false});
   res.json({gameId, maxAttempts: 6}); // Return the game ID and max attempts
});

app.post("/api/guess", (req, res) => {
    const { gameId, guess } = req.body;
    const game = games.get(gameId);

    if (!game) {
        return res.status(404).json({error: "Game not found"});
    }

    if (game.finished) {
        return res.status(400).json({error: "Game has finished. Start a new game."});
    }

    if (typeof guess !== 'string' || !/^[a-zA-Z]{5}$/.test(guess)
    ) {
        return res.status(400).json({error: "Invalid guess. Please enter a 5-letter word."});
    }
    
    const word = guess.toUpperCase();

    const result = Array(5).fill("gray"); // Default to gray
    const remaining = {};

    for (let i = 0; i<5; i++) {
        if (word[i] === game.answer[i]) {
            result[i] = "green"; // Correct letter and position
        } else {
            const letter = game.answer[i];
            remaining[letter] = (remaining[letter] || 0) + 1; // Count remaining letters
        }
    }

    for (let i = 0; i<5; i++) {
        if (result[i] ==="green") continue; // Skip already matched letters
        const letter = word[i];
        if (remaining[letter] > 0) {
            result[i] = "yellow"; // Correct letter, wrong position
            remaining[letter]--;
        }
    }

    game.guesses.push(word);

    const won = word === game.answer;
    const lost = !won && game.guesses.length >= 6;

    if (won || lost) {
        game.finished = true;
    }

    res.json({guess: word, result, won, lost, attempts: game.guesses.length, answer: game.finished ? game.answer : null});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});