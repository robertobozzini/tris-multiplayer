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



let currentFilter = "";  // terrà traccia del testo da filtrare
function applyFilter() {
  document.querySelectorAll("#lobbyList li").forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(currentFilter)
      ? ""
      : "none";
  });
}

function sendReady() {
  if (isReady) return;
  isReady = true;
  socket.send(JSON.stringify({
    action: "ready",
    player: getNickname()
  }));
}

function startCountdown() {
  const timer = document.getElementById("countdownTimer");
  let count = 10;
  timer.textContent = count;
  timer.style.display = "block";

  countdownInterval = setInterval(() => {
    count--;
    timer.textContent = count;
    if (count <= 0) {
      clearInterval(countdownInterval);
      timer.style.display = "none";
      console.log("▶ Inizio partita!");
      // Puoi qui attivare la funzione per mostrare il gioco
    }
  }, 1000);
}

// 2) Richiesta lista lobby (sempre, quando il WS è OPEN)
function requestLobbies() {
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
    ul.appendChild(li);
    return;
  }

  lobbies.forEach(lobby => {
    console.log("· lobby:", lobby);
    const li = document.createElement("li");
    const isPrivate = lobby.private === '1' ? "🔒" : "";
    li.textContent = `${lobby.lobby_name} – ${lobby.players}/2 giocatori – ${lobby.stato} ${isPrivate}`;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => {
      console.log("→ click JOIN", lobby.lobby_name);
      if(lobby.players==2) return
      if (lobby.private === '1') {
        // Mostra il modal per la password
        document.getElementById("passwordModal").style.display = "flex";
        document.getElementById("lobbyPasswordInput").value = ""; // reset campo
        document.getElementById("lobbyPasswordInput").style.borderColor = "#ccc"; // reset colore bordo

        const passwordInput = document.getElementById("lobbyPasswordInput");

        document.getElementById("confirmJoinBtn").onclick = () => {
          const pwd = passwordInput.value.trim();
          if (!pwd) {
            passwordInput.style.borderColor = "red";
            return;
          }
          passwordInput.style.borderColor = "#ccc"; // reset

          sessionStorage.setItem("currentLobbyPass", pwd);

          socket.send(JSON.stringify({
            action: "joinlobby",
            player: sessionStorage.getItem("trisNickname"),
            lobby_name: lobby.lobby_name,
            password: pwd
          }));
          
          sessionStorage.setItem("trisLobby", lobby.lobby_name);

        };

        // Quando l’utente modifica il campo, resetta il bordo
        passwordInput.addEventListener("input", () => {
          passwordInput.style.borderColor = "#ccc";
        });

        document.getElementById("cancelJoinBtn").onclick = () => {
          document.getElementById("passwordModal").style.display = "none";
        };

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
  document.getElementById("homePage").style.display  = "block";
  document.getElementById("lobbyPage").style.display = "none";
  document.getElementById("gamePage").style.display  = "none";
  document.getElementById("lobbyPageUnit").style.display = "none";
}

function showLobbyPage(nick) {
  document.getElementById("homePage").style.display  = "none";
  document.getElementById("lobbyPageUnit").style.display = "none";
  document.getElementById("lobbyPage").style.display = "block";
  document.getElementById("gamePage").style.display  = "none";
  document.getElementById("nicknameDisplay").textContent = nick;

  // richiesta immediata + polling ogni 10s
  requestLobbies();
  //lobbyInterval = setInterval(requestLobbies, 5000);
}

function showLobbyPageUnit() {
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



// 5) Ottieni nickname dall’input
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
    console.log("⟳ [Send] Invio { action: 'sendnickname', nickname:", nick, "}");
    socket.send(JSON.stringify({
      action: "sendnickname",
      nickname: nick,
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


// 8) Setup al caricamento pagina
window.addEventListener("DOMContentLoaded", () => {

// Nascondi subito tutte le pagine per evitare il "flash"
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

  // ————— 5) BOOTSTRAP INIZIALE —————
const savedNick = sessionStorage.getItem("trisNickname");
const currentLobby = sessionStorage.getItem("currentLobby");


if (savedNick) {
  if (socket.readyState === WebSocket.OPEN) {
    console.log("nick presente");
    // 1. Reinvia il nickname al server
    socket.send(JSON.stringify({
      action: "sendnickname",
      nickname: savedNick,
    }));

    if(currentLobby){
      const currentLobbyPass = sessionStorage.getItem("currentLobbyPass");
      console.log("[DEBUG] currentLobbyPass recuperata al bootstrap:", currentLobbyPass);

      console.log("🔐 Invio richiesta joinlobby con:", {
        action: "joinlobby",
        player: savedNick,
        lobby_name: currentLobby,
        password: currentLobbyPass
      });

      console.log("lobby presente");
      socket.send(JSON.stringify({
        action: "joinlobby",
        player: savedNick,
        lobby_name: currentLobby,
        password: currentLobbyPass
      }));

    } else{
      showLobbyPage(savedNick);
    }

  } else {
    // Se il socket non è ancora aperto, aspetta e poi esegui entrambi
    socket.addEventListener("open", () => {
      
      socket.send(JSON.stringify({
        action: "sendnickname",
        nickname: savedNick,
      }));

      if(currentLobby){
        const currentLobbyPass = sessionStorage.getItem("currentLobbyPass");

        console.log("[DEBUG] currentLobbyPass recuperata al bootstrap:", currentLobbyPass);

        console.log("🔐 Invio richiesta joinlobby con:", {
          action: "joinlobby",
          player: savedNick,
          lobby_name: currentLobby,
          password: currentLobbyPass
        });

        console.log("lobby presente");
        socket.send(JSON.stringify({
          action: "joinlobby",
          player: savedNick,
          lobby_name: currentLobby,
          password: currentLobbyPass
        }));

      } else{
        showLobbyPage(savedNick);
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
    // il server conferma l’entrata
    document.getElementById("passwordModal").style.display = "none";
  
    showLobbyPageUnit();
    // Aggiorna il nome della lobby
    document.getElementById("lobbyNameDisplay").textContent = `Lobby: ${data.lobby}`;
    sessionStorage.setItem("currentLobby", data.lobby);

    const myNick = sessionStorage.getItem("trisNickname");
    const p1 = data.player1;
    const p2 = data.player2;

    document.getElementById("player1Name").textContent = p1 || "In attesa...";
    document.getElementById("player2Name").textContent = p2 || "In attesa...";

    document.getElementById("player1Status").textContent = "⏳ In attesa";
    document.getElementById("player2Status").textContent = "⏳ In attesa";


    isReady = false;
    otherPlayerReady = false;

    // Nascondi entrambi i pulsanti
    document.getElementById("player1ReadyBtn").style.display = "none";
    document.getElementById("player2ReadyBtn").style.display = "none";


    if (myNick === p1) {
      myPlayerNumber = 1;
      document.getElementById("player1ReadyBtn").style.display = "inline-block";
    } else if (myNick === p2) {
      myPlayerNumber = 2;
      document.getElementById("player2ReadyBtn").style.display = "inline-block";
    }
  }
  else if (data.action === "lobbyupdate") {
    const p1 = data.player1;
    const p2 = data.player2;
    const myNick = sessionStorage.getItem("trisNickname");

    document.getElementById("player1Name").textContent = p1 || "In attesa...";
    document.getElementById("player2Name").textContent = p2 || "In attesa...";

    // Se ora entrambi i giocatori sono presenti, valuta se aggiornare i pulsanti o lo stato
    if (p1 && p2) {
      if (myNick === p1) {
        myPlayerNumber = 1;
        document.getElementById("player1ReadyBtn").style.display = "inline-block";
      } else if (myNick === p2) {
        myPlayerNumber = 2;
        document.getElementById("player2ReadyBtn").style.display = "inline-block";
      }
    }
  }
  else if (data.action === "ready") {
    const nick = data.player;
    const myNick = sessionStorage.getItem("trisNickname");

    if (nick !== myNick) {
      otherPlayerReady = true;
      const statusId = myPlayerNumber === 1 ? "player2Status" : "player1Status";
      document.getElementById(statusId).textContent = "✅ Pronto";
    } else {
      const statusId = myPlayerNumber === 1 ? "player1Status" : "player2Status";
      document.getElementById(statusId).textContent = "✅ Pronto";
    }

    if (isReady && otherPlayerReady) {
      startCountdown();
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

