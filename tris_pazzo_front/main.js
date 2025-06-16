// main.js

// 1) Endpoint del tuo WebSocket
const socket = new WebSocket("wss://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production");

// Variabili globali
let lobbyInterval = null;
let lobbyCreating = false;


let currentFilter = "";  // terrà traccia del testo da filtrare
function applyFilter() {
  document.querySelectorAll("#lobbyList li").forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(currentFilter)
      ? ""
      : "none";
  });
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
        const passwordInput = document.getElementById("lobbyPasswordInput");

        document.getElementById("confirmJoinBtn").onclick = () => {
          const pwd = passwordInput.value.trim();
          if (!pwd) {
            passwordInput.style.borderColor = "red";
            return;
          }
          passwordInput.style.borderColor = "#ccc"; // reset

          socket.send(JSON.stringify({
            action: "joinlobby",
            player: getNickname(),
            lobby_name: lobby.lobby_name,
            password: pwd
          }));

          
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
        socket.send(JSON.stringify({
          action: "joinlobby",
          player: getNickname(),
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
  document.getElementById("nicknameDisplayUnit").textContent = nick;
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

  if (!name) {
    input.style.borderColor = "red";
    lobbyCreating = false;
    return;
  }

  input.style.borderColor = "#ccc";

  console.log("⟳ [createLobby] Invio { action: 'createlobby', lobby:", name, "}");
  socket.send(JSON.stringify({
    action: "lobby",
    player1: getNickname(),
    lobby_name: name,
    password: pwd
  }));

  // reset flag dopo un po’, o quando il server risponde  
  setTimeout(() => { lobbyCreating = false; }, 1000);
}


// 8) Setup al caricamento pagina
window.addEventListener("DOMContentLoaded", () => {

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

      showLobbyPage(nick);
    }
  });


  // ————— 3) CREA LOBBY —————
  const newLobbyNameInput = document.getElementById("newLobbyName");
  newLobbyNameInput.addEventListener("input", () => {
  newLobbyNameInput.style.borderColor = "#ccc"; // oppure "" per tornare al CSS
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
if (savedNick) {
  if (socket.readyState === WebSocket.OPEN) {
    // 1. Mostra subito la lobby
    showLobbyPage(savedNick);
    // 2. Reinvia il nickname al server
    socket.send(JSON.stringify({
      action: "sendnickname",
      nickname: savedNick,
    }));
  } else {
    // Se il socket non è ancora aperto, aspetta e poi esegui entrambi
    socket.addEventListener("open", () => {
      showLobbyPage(savedNick);
      socket.send(JSON.stringify({
        action: "sendnickname",
        nickname: savedNick,
      }));
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

