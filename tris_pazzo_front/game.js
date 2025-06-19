export function resetGameState() {
  // Reset stato logico
  boardState = Array(9).fill(null);
  currentTurn = 1;
  countdownStarted = false;
  isReady = false;
  otherPlayerReady = false;

  // Reset messaggio finale
  const messageDiv = document.getElementById("gameResultMessage");
  messageDiv.textContent = "";
  messageDiv.style.display = "none";

  // Reset board visiva
  const cells = document.querySelectorAll("#gameBoard .cell");
  cells.forEach(cell => {
    cell.textContent = "";
    cell.style.pointerEvents = "auto";
  });

  // Reset sottolineature nomi
  document.getElementById("gamePlayer1Name").style.textDecoration = "none";
  document.getElementById("gamePlayer2Name").style.textDecoration = "none";

  // Reset pulsanti e stati
  document.getElementById("player1Status").textContent = "⏳ In attesa";
  document.getElementById("player2Status").textContent = "⏳ In attesa";
  document.getElementById("player1ReadyBtn").textContent = "Pronto?";
  document.getElementById("player2ReadyBtn").textContent = "Pronto?";
}

export function handleCellClick(index, cell) {
  
  const nick = sessionStorage.getItem("trisNickname");
  if (!nick || boardState[index]) return;
  const myTurn = (myPlayerNumber === currentTurn);
  if (!myTurn) return;

  console.log(JSON.stringify({
    action: "game",
    move: index,
    lobby_name: sessionStorage.getItem("currentLobby"),
  })
  )
  socket.send(JSON.stringify({
    action: "game",
    move: index,
    lobby_name: sessionStorage.getItem("currentLobby"),
  }));
}

export function setupGameBoard() {
  const board = document.getElementById("gameBoard");
  board.innerHTML = ""; 
  boardState = Array(9).fill(null);
  currentTurn = 1;

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i;

    cell.addEventListener("click", (e) => {
      const index = parseInt(cell.dataset.index);
      handleCellClick(index, cell);
    });

    board.appendChild(cell);
  }
}

export function stopCountdown() {
  clearInterval(countdownInterval);
  countdownStarted = false;
  document.getElementById("countdownTimer").style.display = "none";
}

export function startCountdown() {
  if (countdownStarted) return; // evita doppi countdown
  document.getElementById("nicknameDisplayGame").textContent = sessionStorage.getItem("trisNickname") || "";

  countdownStarted = true;

  const timer = document.getElementById("countdownTimer");
  let count = 5;
  timer.textContent = count;
  timer.style.display = "block";

  countdownInterval = setInterval(() => {
    count--;
    timer.textContent = count;
    if (count <= 0) {
      clearInterval(countdownInterval);
      countdownStarted = false;
      timer.style.display = "none";
      console.log("▶ Inizio partita!");
      document.getElementById("homePage").style.display = "none";
      document.getElementById("lobbyPage").style.display = "none";
      document.getElementById("lobbyPageUnit").style.display = "none";

      // Mostra la pagina di gioco
      document.getElementById("gamePage").style.display = "block";
      document.getElementById("passwordModal").style.display = "none";
      
      document.getElementById("gamePlayer1Name").textContent = currentPlayer1 || "Player 1";
      document.getElementById("gamePlayer2Name").textContent = currentPlayer2 || "Player 2";
      document.getElementById("gamePlayer1Name").style.textDecoration="Underline";
      document.getElementById("gamePlayer2Name").style.textDecoration="none";
      setupGameBoard();

    }
  }, 1000);
}

export function sendReady() {
  isReady = !isReady;

  socket.send(JSON.stringify({
    action: "ready",
    player: sessionStorage.getItem("trisNickname"),
    isReady: isReady,
    richiesta: false
  }));

  const btnId = myPlayerNumber === 1 ? "player1ReadyBtn" : "player2ReadyBtn";
  const statusId = myPlayerNumber === 1 ? "player1Status" : "player2Status";

  document.getElementById(btnId).textContent = isReady ? "Annulla" : "Pronto?";
  document.getElementById(statusId).textContent = isReady ? "✅ Pronto" : "⏳ In attesa";

  if (isReady && otherPlayerReady) {
    startCountdown();
  } else {
    stopCountdown();
  }
}

