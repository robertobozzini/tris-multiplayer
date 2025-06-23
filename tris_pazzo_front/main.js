// main.js

// 1) Endpoint del tuo WebSocket
const socket = new WebSocket("wss://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production");

// Variabili globali
let lobbyInterval = null;
let lobbyCreating = false;
let isReady = false;
let otherPlayerReady = false;
let myPlayerNumber = null; // 1 o 2
let countdownInterval = null;
let lobbyPageShown = false;
let countdownStarted = false;
let currentPlayer1 = null;
let currentPlayer2 = null;
let currentTurn = 1; // 1 = player1, 2 = player2
let boardState = Array(9).fill(null); // "X", "O" o null

function getMyPlayerNumber() {
  return parseInt(sessionStorage.getItem("myPlayerNumber"));
}

let currentFilter = "";  // terrà traccia del testo da filtrare
function applyFilter() {
  document.querySelectorAll("#lobbyList li").forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(currentFilter) ? "" : "none";
  });
}

function resetGameState() {
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


function handleCellClick(index, cell) {
  
  const nick = sessionStorage.getItem("trisNickname");
  if (!nick || boardState[index]) return;
  const myTurn = (getMyPlayerNumber() === currentTurn);
  if (!myTurn) return;

  console.log(JSON.stringify({
    action: "game",
    move: index,
    feedback: "i",
    lobby_name: sessionStorage.getItem("currentLobby"),
  })
  )
  socket.send(JSON.stringify({
    action: "game",
    move: index,
    feedback: "s",
    lobby_name: sessionStorage.getItem("currentLobby")
  }));
}


function setupGameBoard() {
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



function stopCountdown() {
  clearInterval(countdownInterval);
  countdownStarted = false;
  document.getElementById("countdownTimer").style.display = "none";
}

function startCountdown() {
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
      sessionStorage.setItem("inGame", true);
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


function sendReady() {
  isReady = !isReady;

  socket.send(JSON.stringify({
    action: "ready",
    player: sessionStorage.getItem("trisNickname"),
    isReady: isReady,
    richiesta: false
  }));

  const btnId = getMyPlayerNumber() === 1 ? "player1ReadyBtn" : "player2ReadyBtn";
  const statusId = getMyPlayerNumber() === 1 ? "player1Status" : "player2Status";

  document.getElementById(btnId).textContent = isReady ? "Annulla" : "Pronto?";
  document.getElementById(statusId).textContent = isReady ? "✅ Pronto" : "⏳ In attesa";

  if (isReady && otherPlayerReady) {
    startCountdown();
  } else {
    stopCountdown();
  }
}


// 2) Richiesta lista lobby (sempre, quando il WS è OPEN)
function requestLobbies() {
  if(sessionStorage.getItem("inGame")==="true") return
  if (socket.readyState === WebSocket.OPEN) {
    console.log("⟳ [requestLobbies] Invio { action: 'lobbylist' }");
    socket.send(JSON.stringify({ action: "lobbylist" }));
  } else {
    console.log("⚠️ [requestLobbies] WebSocket non aperta (readyState =", socket.readyState, ")");
  }
}

// 3) Aggiorna il DOM con le lobby
function updateLobbyList(lobbies) {
  console.log("🔄 [updateLobbyList] ricevuto array:", lobbies);
  const ul = document.getElementById("lobbyList");
  ul.innerHTML = ""; // svuota

  if (!Array.isArray(lobbies) || lobbies.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nessuna lobby disponibile";
    li.style.justifyContent = "center";
    li.style.fontStyle = "italic";
    li.style.color = "#666";
    ul.appendChild(li);
    return;
  }

lobbies.forEach(lobby => {
  console.log("· lobby:", lobby);
  const li = document.createElement("li");
  li.style.cursor = "pointer";

  // ELEMENTI INTERNI
  const nameSpan = document.createElement("span");
  nameSpan.className = "lobby-name";
  nameSpan.textContent = lobby.lobby_name;

  const playersSpan = document.createElement("span");
  playersSpan.className = "lobby-players";
  playersSpan.textContent = `${lobby.players}/2`;

  const statoSpan = document.createElement("span");
  statoSpan.className = "lobby-stato";
  statoSpan.textContent = lobby.stato;

  const lockSpan = document.createElement("span");
  lockSpan.className = "lobby-lock";
  lockSpan.textContent = lobby.private === '1' ? "🔒" : "";

  // ASSEMBLA
  li.appendChild(nameSpan);
  li.appendChild(playersSpan);
  li.appendChild(statoSpan);
  li.appendChild(lockSpan); 

  // CLICK
  li.addEventListener("click", () => {
    console.log("→ click JOIN", lobby.lobby_name);
    if (lobby.players == 2) return;

    if (lobby.private === '1') {
      // Mostra il modal per la password
      document.getElementById("passwordModal").style.display = "flex";
      const passwordInput = document.getElementById("lobbyPasswordInput");
      passwordInput.value = "";
      passwordInput.style.borderColor = "#ccc";

      document.getElementById("confirmJoinBtn").onclick = () => {
        const pwd = passwordInput.value.trim();
        if (!pwd) {
          passwordInput.style.borderColor = "red";
          return;
        }
        passwordInput.style.borderColor = "#ccc";
        sessionStorage.setItem("currentLobbyPass", pwd);
        sessionStorage.setItem("currentLobby", lobby.lobby_name);

        socket.send(JSON.stringify({
          action: "joinlobby",
          player: sessionStorage.getItem("trisNickname"),
          lobby_name: lobby.lobby_name,
          password: pwd
        }));
      };

      document.getElementById("cancelJoinBtn").onclick = () => {
        document.getElementById("passwordModal").style.display = "none";
      };

      passwordInput.addEventListener("input", () => {
        passwordInput.style.borderColor = "#ccc";
      });

      passwordInput.addEventListener("keypress", e => {
        if (e.key === "Enter") {
          confirmJoinBtn.click();
        }
      });

    } else {
      sessionStorage.setItem("trisLobby", lobby.lobby_name);
      sessionStorage.setItem("currentLobbyPass", "");

      socket.send(JSON.stringify({
        action: "joinlobby",
        player: sessionStorage.getItem("trisNickname"),
        lobby_name: lobby.lobby_name,
        password: ""
      }));
    }
  });

  ul.appendChild(li);
});

  applyFilter()
}

// 4) Mostra/nascondi sezioni
function showHomePage() {
  clearInterval(lobbyInterval);
  lobbyPageShown = false;
  document.getElementById("homePage").style.display  = "block";
  document.getElementById("lobbyPage").style.display = "none";
  document.getElementById("gamePage").style.display  = "none";
  document.getElementById("lobbyPageUnit").style.display = "none";
}

function showLobbyPage(nick) {
  if (lobbyPageShown) return;
  lobbyPageShown = true;
  document.getElementById("homePage").style.display  = "none";
  document.getElementById("lobbyPageUnit").style.display = "none";
  document.getElementById("lobbyPage").style.display = "block";
  document.getElementById("gamePage").style.display  = "none";
  document.getElementById("nicknameDisplay").textContent = nick;

  // richiesta immediata + polling ogni 10s
  requestLobbies();
  lobbyInterval = setInterval(requestLobbies, 1000);
}

function showLobbyPageUnit() {
  clearInterval(lobbyInterval);
  lobbyPageShown = false;
  document.getElementById("homePage").style.display = "none";
  document.getElementById("lobbyPage").style.display = "none";
  document.getElementById("gamePage").style.display = "none";
  document.getElementById("lobbyPageUnit").style.display = "block";

  const nick = sessionStorage.getItem("trisNickname");
  const lobbyName = sessionStorage.getItem("currentLobby");
  
  if (nick) {
    document.getElementById("nicknameDisplayUnit").textContent = nick;
  }
  
  if (lobbyName) {
    document.getElementById("lobbyNameDisplay").textContent = `Lobby: ${lobbyName}`;
  }
}

function getNickname() {
  const input = document.getElementById("nickname");
  const nick  = input.value.trim();
  if (!nick) {
    input.style.borderColor = "red";
    return null;
  }
  input.style.borderColor = "";
  return nick;
}

// 6) Invia nickname e vai in lobby
function Send() {
  const nick = getNickname();
  if (!nick) return;
  if (socket.readyState === WebSocket.OPEN) {
    console.log("⟳ [Send] Invio { action: 'sendnickname', nickname:", nick, " oldId: ", sessionStorage.getItem("connectionID") || "", "}");
    console.log(JSON.stringify({
      action: "sendnickname",
      nickname: nick,
      oldId: sessionStorage.getItem("connectionID") || ""
    }));
    socket.send(JSON.stringify({
      action: "sendnickname",
      nickname: nick,
      oldId: sessionStorage.getItem("connectionID") || ""
    }));
    sessionStorage.setItem("trisNickname", nick);
    showLobbyPage(nick);
  } else {
    console.log("⚠️ [Send] WebSocket non aperta, riprovo fra un momento");
    setTimeout(Send, 500);
  }
}

// 7) Creazione nuova lobby
function createLobby() {
  if (lobbyCreating) return; // evita doppio invio
  lobbyCreating = true;

  const input = document.getElementById("newLobbyName");
  const name = input.value.trim();
  const pwd  = document.getElementById("newLobbyPassword").value;

  sessionStorage.setItem("currentLobbyPass", pwd);

  if (!name) {
    input.style.borderColor = "red";
    lobbyCreating = false;
    return;
  }

  input.style.borderColor = "#ccc";

  console.log("⟳ [createLobby] Invio", JSON.stringify({
    action: "lobby",
    player1: sessionStorage.getItem("trisNickname"),
    lobby_name: name,
    password: pwd
  }));

  socket.send(JSON.stringify({
    action: "lobby",
    player1: sessionStorage.getItem("trisNickname"),
    lobby_name: name,
    password: pwd
  }));



  // reset flag dopo un po’, o quando il server risponde  
  setTimeout(() => { lobbyCreating = false; }, 1000);
}


window.addEventListener("DOMContentLoaded", () => {


  document.getElementById("homePage").style.display = "none";
  document.getElementById("lobbyPage").style.display = "none";
  document.getElementById("gamePage").style.display = "none";
  document.getElementById("lobbyPageUnit").style.display = "none";
  
  document.getElementById("player1ReadyBtn").addEventListener("click", () => sendReady());
  document.getElementById("player2ReadyBtn").addEventListener("click", () => sendReady());


  // ————— 1) INVIO NICKNAME —————
  document.querySelector("#homePage button")
    .addEventListener("click", Send);
  document.getElementById("nickname")
    .addEventListener("keypress", e => {
      if (e.key === "Enter") Send();
    });

  // ————— 2) LOGOUT —————
  document.getElementById("logoutBtn").addEventListener("click", () => {
    const nick = sessionStorage.getItem("trisNickname");
    if (nick) {
      socket.send(JSON.stringify({
        action: "logout",
        player: nick
      }));
    }
    sessionStorage.removeItem("trisNickname");
    // Pulizia input
    document.getElementById("nickname").value = "";
    document.getElementById("nickname").style.borderColor = "";
    document.getElementById("newLobbyName").value = "";
    document.getElementById("newLobbyPassword").value = "";

    showHomePage();
  });

  document.getElementById("logoutBtnUnit").addEventListener("click", () => {
    const nick = sessionStorage.getItem("trisNickname");
    if (nick) {
      socket.send(JSON.stringify({
        action: "logout",
        player: nick
      }));
    }
    sessionStorage.removeItem("trisNickname");
    // Pulizia input
    document.getElementById("nickname").value = "";
    document.getElementById("nickname").style.borderColor = "";
    document.getElementById("newLobbyName").value = "";
    document.getElementById("newLobbyPassword").value = "";

    showHomePage();
  });

  document.getElementById("exitLobbyBtn").addEventListener("click", () => {
    const nick = sessionStorage.getItem("trisNickname");

    if (nick) {
      socket.send(JSON.stringify({
        action: "leavelobby",
        player: nick
      }));
      sessionStorage.removeItem("currentLobby");
      document.getElementById("nickname").value = "";
      document.getElementById("nickname").style.borderColor = "";
      document.getElementById("newLobbyName").value = "";
      document.getElementById("newLobbyPassword").value = "";
      showLobbyPage(nick);
    }
  });
// chat
  const chatInput = document.getElementById("chatInput");
  const chatInput2 = document.getElementById("chatInput2"); // aggiunto
  const chatSendBtn = document.getElementById("chatSendBtn");
  const chatSendBtnLobby = document.getElementById("chatSendBtnLobby");

  function sendChatMessage(a) {
    const message = (a === 1 ? chatInput : chatInput2).value.trim();
    if (!message) return;

    let msgObj;
    if (a === 1) {
      msgObj = {
        action: "chat",
        msg: message
      };
      console.log(msgObj);
    } else {
      msgObj = {
        action: "chatlobby",
        msg: message,
        lobby_name: sessionStorage.getItem("currentLobby")
      };
      console.log(msgObj);
    }

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msgObj));
      (a === 1 ? chatInput : chatInput2).value = ""; // pulizia campo giusto
    } else {
      alert("Connessione WebSocket non attiva.");
    }
  }

  // Event listener click e invio con enter
  chatSendBtn.addEventListener("click", () => sendChatMessage(1));
  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendChatMessage(1);
    }
  });

  chatSendBtnLobby.addEventListener("click", () => sendChatMessage(2));
  chatInput2.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendChatMessage(2);
    }
  });


  // ————— 3) CREA LOBBY —————
  const newLobbyNameInput = document.getElementById("newLobbyName");
  newLobbyNameInput.addEventListener("input", () => {
  newLobbyNameInput.style.borderColor = "#ccc"; // oppure "" per tornare al CSS
  if (newLobbyNameInput.value === "lobby già esistente") {
    newLobbyNameInput.value = "";
  }
  });
  newLobbyNameInput.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      createLobby();
    }
  });
  document.querySelector("#createLobby button")
    .addEventListener("click", createLobby);

  //filtro
  const searchInput = document.getElementById("searchLobby");
  searchInput.addEventListener("input", () => {
    currentFilter = searchInput.value.trim().toLowerCase();
    applyFilter();
  });

  const newLobbyPassInput = document.getElementById("newLobbyPassword");
  newLobbyPassInput.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    createLobby();
  }
  });

  // ————— 4) HANDLER WEBSOCKET —————
  socket.addEventListener("open", () => {
    console.log("✅ WebSocket aperta");
    const saved = sessionStorage.getItem("trisNickname");
    if (saved) {
      // se c'è un nick salvato, entri in lobby subito
      showLobbyPage(saved);
    }
  });

  // Unico listener per tutti i message
  socket.addEventListener("message", handleSocketMessage);

  socket.addEventListener("error", err =>
    console.error("❌ WebSocket error:", err)
  );
  socket.addEventListener("close", () =>
    console.log("🔌 WebSocket chiusa")
  );



  // Mostra nickname anche nella schermata di gioco
  document.getElementById("nicknameDisplayGame").textContent = sessionStorage.getItem("trisNickname") || "";

  // Bottone Logout (uscita completa dal gioco)
  document.getElementById("logoutBtnGame").addEventListener("click", () => {
    const nick = sessionStorage.getItem("trisNickname");
    if (nick) {
      socket.send(JSON.stringify({
        action: "logout",
        player: nick
      }));
    }
    sessionStorage.clear(); // svuota tutto (nickname e lobby)

    const nicknameInput = document.getElementById("nickname");
    nicknameInput.value = "";
    nicknameInput.style.borderColor = "";

    document.getElementById("newLobbyName").value = "";
    document.getElementById("newLobbyPassword").value = "";

    showHomePage();         
  });


  document.getElementById("resignBtnGame").addEventListener("click", () => {
    const nick = sessionStorage.getItem("trisNickname");
    const lobby = sessionStorage.getItem("currentLobby");
    sessionStorage.removeItem("inGame");
    if (nick && lobby) {
      socket.send(JSON.stringify({
        action: "game",
        feedback: "resign",
        move: 0,
        lobby_name: sessionStorage.getItem("currentLobby")
      }));
    }
  });


  // Bottone Leave (lascia solo la lobby, torna alla lobby list)
  document.getElementById("exitGameBtn").addEventListener("click", () => {
    const nick = sessionStorage.getItem("trisNickname");
    if (nick) {
      socket.send(JSON.stringify({
        action: "leavelobby",
        player: nick
      }));
      sessionStorage.removeItem("currentLobby"); 
      sessionStorage.removeItem("inGame")
      showLobbyPage(nick); // torna alla pagina con la lista delle lobby
    }
  });



  // ————— 5) BOOTSTRAP INIZIALE —————
const savedNick = sessionStorage.getItem("trisNickname");
const currentLobby = sessionStorage.getItem("currentLobby");
const wasInGame = sessionStorage.getItem("inGame") === "true";

if (savedNick) {
  console.log("nickkkk");
  if (socket.readyState === WebSocket.OPEN) {
    console.log("nick presente");
    // 1. Reinvia il nickname al server
    socket.send(JSON.stringify({
      action: "sendnickname",
      nickname: savedNick,
      oldId: sessionStorage.getItem("connectionID") || ""
    }));

    if (currentLobby) {
      if (wasInGame) {
   
        document.getElementById("homePage").style.display = "none";
        document.getElementById("lobbyPage").style.display = "none";
        document.getElementById("lobbyPageUnit").style.display = "none";
        document.getElementById("gamePage").style.display = "block";

        document.getElementById("nicknameDisplayGame").textContent = savedNick;

        setTimeout(() => {
          socket.send(JSON.stringify({
            action: "game",
            feedback: "resend",
            move: 0,
            lobby_name: currentLobby
          }));
        }, 300);
      } else {
        console.log("wsss");
        const currentLobbyPass = sessionStorage.getItem("currentLobbyPass");
        socket.send(JSON.stringify({
          action: "joinlobby",
          player: savedNick,
          lobby_name: currentLobby,
          password: currentLobbyPass
        }));
      }
    }
 else{
       if (!wasInGame) showLobbyPage(savedNick);
    }

  } else {
    console.log("1");
    // Se il socket non è ancora aperto, aspetta e poi esegui entrambi
    socket.addEventListener("open", () => {
      
      socket.send(JSON.stringify({
        action: "sendnickname",
        nickname: savedNick,
        oldId: sessionStorage.getItem("connectionID") || ""
      }));
      setTimeout(() => {
          // codice da eseguire dopo 500ms (0.5 secondi)
        console.log("Eseguito dopo mezzo secondo");
      }, 500);

      if(currentLobby){
        if(wasInGame)
        {
          console.log("2");
          document.getElementById("homePage").style.display = "none";
          document.getElementById("lobbyPage").style.display = "none";
          document.getElementById("lobbyPageUnit").style.display = "none";
          document.getElementById("gamePage").style.display = "block";

          document.getElementById("nicknameDisplayGame").textContent = savedNick;
          console.log(JSON.stringify({
              action: "game",
              feedback: "resend",
              move: 0, 
              lobby_name: currentLobby
            }));
            
            setTimeout(() => {
              socket.send(JSON.stringify({
                action: "game",
                feedback: "resend",
                move: 0, 
                lobby_name: currentLobby
              }));
            }, 200);
        }
        // const currentLobbyPass = sessionStorage.getItem("currentLobbyPass");

        // console.log("[DEBUG] currentLobbyPass recuperata al bootstrap:", currentLobbyPass);

        // console.log("🔐 Invio richiesta joinlobby con:", {
        //   action: "joinlobby",
        //   player: savedNick,
        //   lobby_name: currentLobby,
        //   password: currentLobbyPass
        // });

        // console.log("lobby presente");
        // socket.send(JSON.stringify({
        //   action: "joinlobby",
        //   player: savedNick,
        //   lobby_name: currentLobby,
        //   password: currentLobbyPass
        // }));

      } else{
        if (!wasInGame) showLobbyPage(savedNick);
      }
    }, { once: true });
  }
  } else {
    showHomePage();
  }

});

// ————— Funzione centralizzata per i message —————
function handleSocketMessage(event) {
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
    sessionStorage.setItem("player1", data.player1 || "");
    sessionStorage.setItem("player2", data.player2 || "");
    if ((myNickn === currentPlayer1 && currentPlayer2) || (myNickn === currentPlayer2 && currentPlayer1)) {
      
      socket.send(JSON.stringify({ action:"ready", player:myNickn, isReady:false, richiesta:false }));
      // aspetta 50 ms, poi chiedi lo stato
      setTimeout(() => {
        socket.send(JSON.stringify({ action:"ready", player:myNickn, richiesta:true }));
      }, 50);
    }
    document.getElementById("passwordModal").style.display = "none";
  
    if (sessionStorage.getItem("inGame") !== "true") {
      showLobbyPageUnit();
    }

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
      sessionStorage.setItem("myPlayerNumber", "1");
      sessionStorage.setItem("symbol", "X");
      document.getElementById("player1ReadyBtn").style.display = "inline-block";
      document.getElementById("player1ReadyBtn").textContent = "Pronto?";
    } else if (myNick === p2) {
      myPlayerNumber = 2;
      sessionStorage.setItem("myPlayerNumber", "2");
      sessionStorage.setItem("symbol", "O");
      document.getElementById("player2ReadyBtn").style.display = "inline-block";
      document.getElementById("player2ReadyBtn").textContent = "Pronto?";
    }
  }
  else if (data.result === "feedback") {
    sessionStorage.setItem("inGame", "true");
    if (!Array.isArray(data.board)) return;
    setupGameBoard();
    boardState = data.board;
    currentTurn = data.turn;
    console.log(boardState)
      
    const player1Name = document.getElementById("gamePlayer1Name");
    const player2Name = document.getElementById("gamePlayer2Name");

    player1Name.textContent=sessionStorage.getItem("player1") || player1;
    player2Name.textContent=sessionStorage.getItem("player2") || player2;

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
      sessionStorage.removeItem("inGame");
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


      const backBtn = document.createElement("button");
      backBtn.textContent = "Torna alla lobby";
      backBtn.id = "returnToLobbyBtn";

      backBtn.style.display = "block";
      backBtn.style.margin = "20px auto 0"; 
      backBtn.style.padding = "10px 20px";
      backBtn.style.fontSize = "16px";
      backBtn.style.cursor = "pointer";

      messageDiv.appendChild(backBtn);

      backBtn.addEventListener("click", () => {
        resetGameState();
        messageDiv.style.display = "none";
        backBtn.remove();
        showLobbyPageUnit(nick);
      });

      return; // esci dal blocco feedback
    }

  }
  else if(data.result==="connection")
  {
    sessionStorage.setItem("connectionID", data.val)
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
    sessionStorage.setItem("player1", data.player1 || "");
    sessionStorage.setItem("player2", data.player2 || "");
    const myNick = sessionStorage.getItem("trisNickname");

    document.getElementById("player1Name").innerHTML = p1 ? `${p1} <span style="color: #0099ff;">❌</span>` : "In attesa...";
    document.getElementById("player2Name").innerHTML = p2 ? `${p2} <span style="color: red;">⭕</span>` : "In attesa...";


    // Nasconde entrambi i pulsanti
    document.getElementById("player1ReadyBtn").style.display = "none";
    document.getElementById("player2ReadyBtn").style.display = "none";

    // Aggiorna myPlayerNumber e mostra il bottone corretto
    if (myNick === p1) {
      myPlayerNumber = 1;
      sessionStorage.setItem("myPlayerNumber", "1");
      sessionStorage.setItem("symbol", "X");
      document.getElementById("player1ReadyBtn").style.display = "inline-block";
      document.getElementById("player1ReadyBtn").textContent = "Pronto?";
    } else if (myNick === p2) {
      myPlayerNumber = 2;
      sessionStorage.setItem("myPlayerNumber", "1");
      sessionStorage.setItem("symbol", "O");
      document.getElementById("player2ReadyBtn").style.display = "inline-block";
      document.getElementById("player2ReadyBtn").textContent = "Pronto?";
    }

    showLobbyPageUnit();
  }
  else if (data.result === "chat") {
    const chatMessages = document.getElementById("chatMessages");
    chatMessages.innerHTML = ""; // Pulisci la chat attuale

    data.messages.forEach(msgString => {
      const messageDiv = document.createElement("div");
      messageDiv.textContent = msgString;  // msgString è già "player: message"
      messageDiv.style.padding = "4px 8px";
      messageDiv.style.borderBottom = "1px solid #ddd";

      chatMessages.appendChild(messageDiv);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight; // scrolla in basso
    return;
  }
  else if(data.result==="namelist")
  {
    const listnames = document.getElementById("onlinePlayersList");
    listnames.innerHTML = "";   
    data.users.forEach(playerString => {
      const messageDiv = document.createElement("div");
      messageDiv.textContent = playerString["nickname"];  
      messageDiv.style.padding = "4px 8px";
      messageDiv.style.borderBottom = "1px solid #ddd";

      listnames.appendChild(messageDiv);
    });

    listnames.scrollTop = listnames.scrollHeight; // scrolla in basso
    return;
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
      const btnId = getMyPlayerNumber() === 1 ? "player1ReadyBtn" : "player2ReadyBtn";
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

let pingIntervalActive = false;

async function startWebSocketPing(socket) {
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
