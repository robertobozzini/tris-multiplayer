export const socket = new WebSocket("wss://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production");

export function startWebSocketPing(socket) {
  if (pingIntervalActive) return; // avoid duplicates
  pingIntervalActive = true;

  while (pingIntervalActive) {
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
    if (socket.readyState === WebSocket.OPEN) {
      console.log("Sending ping to WebSocket...");
      socket.send("ping");
    } else {
      console.warn("WebSocket not open. Ping skipped.");
    }
  }
}

export function handleSocketMessage(event) {
  const raw = event.data;
  if (!raw || raw.trim() === "") return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.warn("⚠️ JSON non valido, skip:", raw);
    return;
  }
  console.log("→ [parsed data]:", data);


  // Gestione joinlobby
  if (data.result === "joined") {
    const myNickn = sessionStorage.getItem("trisNickname");
    currentPlayer1=data.player1;
    currentPlayer2=data.player2;
  
    if ((myNickn === currentPlayer1 && currentPlayer2) || (myNickn === currentPlayer2 && currentPlayer1)) {
      
      socket.send(JSON.stringify({ action:"ready", player:myNickn, isReady:false, richiesta:false }));
      // aspetta 50 ms, poi chiedi lo stato
      setTimeout(() => {
        socket.send(JSON.stringify({ action:"ready", player:myNickn, richiesta:true }));
      }, 50);
    }
    document.getElementById("passwordModal").style.display = "none";
  
    showLobbyPageUnit();
    // Aggiorna il nome della lobby
    document.getElementById("lobbyNameDisplay").textContent = `Lobby: ${data.lobby}`;
    sessionStorage.setItem("currentLobby", data.lobby);

    const myNick = sessionStorage.getItem("trisNickname");
    const p1 = data.player1;
    const p2 = data.player2;

    document.getElementById("player1Name").innerHTML = p1 ? `${p1} <span class="player-symbol-x">❌</span>` : "In attesa...";
    document.getElementById("player2Name").innerHTML = p2 ? `${p2} <span class="player-symbol-o">⭕</span>` : "In attesa...";


    document.getElementById("player1Status").textContent = "⏳ In attesa";
    document.getElementById("player2Status").textContent = "⏳ In attesa";
    document.getElementById("player1ReadyBtn").textContent = "Pronto?";
    document.getElementById("player2ReadyBtn").textContent = "Pronto?";

    isReady = false;

    socket.send(JSON.stringify({
      action: "ready",
      player: sessionStorage.getItem("trisNickname"),
      isReady: false,
      richiesta: false
    }));

    otherPlayerReady = false;

    // Nascondi entrambi i pulsanti
    document.getElementById("player1ReadyBtn").style.display = "none";
    document.getElementById("player2ReadyBtn").style.display = "none";


    if (myNick === p1) {
      myPlayerNumber = 1;
      sessionStorage.setItem("symbol", "X");
      document.getElementById("player1ReadyBtn").style.display = "inline-block";
      document.getElementById("player1ReadyBtn").textContent = "Pronto?";
    } else if (myNick === p2) {
      myPlayerNumber = 2;
      sessionStorage.setItem("symbol", "O");
      document.getElementById("player2ReadyBtn").style.display = "inline-block";
      document.getElementById("player2ReadyBtn").textContent = "Pronto?";
    }
  }
  else if (data.result === "feedback") {
    if (!Array.isArray(data.board)) return;
    setupGameBoard();
    boardState = data.board;
    currentTurn = data.turn;
    console.log(boardState)
      
    const player1Name = document.getElementById("gamePlayer1Name");
    const player2Name = document.getElementById("gamePlayer2Name");

    if (currentTurn === 1) {
      player1Name.style.textDecoration = "underline";
      player2Name.style.textDecoration = "none";
    } else if (currentTurn === 2) {
      player1Name.style.textDecoration = "none";
      player2Name.style.textDecoration = "underline";
    }

    const cells = document.querySelectorAll("#gameBoard .cell");
    cells.forEach((cell, i) => {
      const val = boardState[i];
      console.log(i);
      console.log(boardState);
      console.log(boardState[i]);
      console.log(val === 'X' || val === 'O')
      cell.textContent = (val === 'X' || val === 'O') ? val : '';
      
    });
    if (data.risultato === "win" || data.risultato==="draw") {
      const winnerSymbol = data.winner;
      const mySymbol = sessionStorage.getItem("symbol");

      console.log(data.symbol, winnerSymbol);
      console.log(mySymbol, sessionStorage.getItem("symbol"));
      console.log(winnerSymbol === mySymbol);
      const messageDiv = document.getElementById("gameResultMessage");
      if(data.risultato==="draw")
      {
        messageDiv.textContent = "Pareggio!";
        messageDiv.style.color = "orange";        
      }
      else if (winnerSymbol === mySymbol) {
        messageDiv.textContent = data.resigned===1 ? "Hai vinto per abbandono!" : "Hai vinto!";
        messageDiv.style.color = "green";
      } else {
        messageDiv.textContent = data.resigned===1 ? "Hai perso per abbandono!" : "Hai perso!";
        messageDiv.style.color = "red";
      }

      messageDiv.style.display = "block";

      // Disattiva la board
      document.querySelectorAll(".cell").forEach(cell => {
        cell.style.pointerEvents = "none";
      });

      const nick = sessionStorage.getItem("trisNickname");

      setTimeout(() => {
        resetGameState(); 
        showLobbyPageUnit(nick);
      }, 1500);
            

      
      // const lobby = sessionStorage.getItem("currentLobby");
      // const password = sessionStorage.getItem("currentLobbyPass") || "";
      
      // const delayPlayer = myPlayerNumber === 1 ? 0 : 500; // Player 2 aspetta 0.5s in più
      // const baseDelay = 2500; // mostra messaggio per 2.5s

      // setTimeout(() => {
      //   // 1. LEAVE
      //   setTimeout(() => {
      //     if (nick) {
      //       socket.send(JSON.stringify({
      //         action: "leavelobby",
      //         player: nick
      //       }));
      //       console.log(`[LEAVE] Inviato da ${nick}`);
      //     }
      //   }, 500 + delayPlayer); // P1: 0.5s — P2: 1.0s
      //   setTimeout(() => {
      //     if (nick) {
      //       socket.send(JSON.stringify({
      //         action: "joinlobby",
      //         player: nick,
      //         lobby_name: lobby,
      //         password: password
      //       }));
      //       console.log(`[JOIN] Inviato da ${nick}`);
      //     }

      //     document.getElementById("gameResultMessage").style.display = "none";
      //     if (nick) showLobbyPageUnit(nick);

      //   }, 1000 + delayPlayer); // P1: 1.0s — P2: 1.5s

      // }, baseDelay); // attesa iniziale di 2.5s



      return; // esci dal blocco feedback
    }

  }
  else if (data.result === "lobbyupdate") {

    document.getElementById("player1Status").textContent = "⏳ In attesa";
    document.getElementById("player2Status").textContent = "⏳ In attesa";
    document.getElementById("player1ReadyBtn").textContent = "Pronto?";
    document.getElementById("player2ReadyBtn").textContent = "Pronto?";
    isReady = false;
    otherPlayerReady = false;

    const p1 = data.player1;
    const p2 = data.player2;
    currentPlayer1 = data.player1;
    currentPlayer2 = data.player2;
    const myNick = sessionStorage.getItem("trisNickname");

    document.getElementById("player1Name").innerHTML = p1 ? `${p1} <span style="color: #0099ff;">❌</span>` : "In attesa...";
    document.getElementById("player2Name").innerHTML = p2 ? `${p2} <span style="color: red;">⭕</span>` : "In attesa...";


    // Nasconde entrambi i pulsanti
    document.getElementById("player1ReadyBtn").style.display = "none";
    document.getElementById("player2ReadyBtn").style.display = "none";

    // Aggiorna myPlayerNumber e mostra il bottone corretto
    if (myNick === p1) {
      myPlayerNumber = 1;
      sessionStorage.setItem("symbol", "X");
      document.getElementById("player1ReadyBtn").style.display = "inline-block";
      document.getElementById("player1ReadyBtn").textContent = "Pronto?";
    } else if (myNick === p2) {
      myPlayerNumber = 2;
      sessionStorage.setItem("symbol", "O");
      document.getElementById("player2ReadyBtn").style.display = "inline-block";
      document.getElementById("player2ReadyBtn").textContent = "Pronto?";
    }

    showLobbyPageUnit();
  }
  else if (data.result === "ready") {
    const nick = data.player;
    const myNick = sessionStorage.getItem("trisNickname");
    const isPlayerReady = (data.isReady === true); // undefined → false

    const isOther = nick !== myNick;

    let statusId = "";
    if (nick === currentPlayer1) {
      statusId = "player1Status";
    } else if (nick === currentPlayer2) {
      statusId = "player2Status";
    }


    if (statusId) {
      document.getElementById(statusId).textContent = isPlayerReady ? "✅ Pronto" : "⏳ In attesa";
    }
    if (!isOther) {
      const btnId = myPlayerNumber === 1 ? "player1ReadyBtn" : "player2ReadyBtn";
      document.getElementById(btnId).textContent = isPlayerReady ? "Annulla" : "Pronto?";
    }

    if (isOther) {
      otherPlayerReady = isPlayerReady;
    } else {
      isReady = isPlayerReady;
    }

    if (isReady && otherPlayerReady) {
      startCountdown();
    } else {
      stopCountdown();
    }
  }
  else if (data.result==="Lobby name already taken") {
    const input = document.getElementById("newLobbyName");
    input.value = "";
    input.style.borderColor = "red";
    input.placeholder = "lobby già esistente";
    lobbyCreating = false;
    return;
  }
  else if (data.result === "error") {
    // il server segnala un errore (es. password sbagliata)
    const pwdInput = document.getElementById("lobbyPasswordInput");
    pwdInput.style.borderColor = "red";
    // facoltativo: mostra data.message come alert o sotto l’input
    //alert(data.message || "Errore durante l’accesso alla lobby");
    return;
  }


  if (Array.isArray(data.lobbies)) {
    updateLobbyList(data.lobbies);
  }
  else if (Array.isArray(data.lobby_list)) {
    updateLobbyList(data.lobby_list);
  }
  else {
    console.log("ℹ️ Azione:", data.action, "| nessuna lista da aggiornare");
  }
}

