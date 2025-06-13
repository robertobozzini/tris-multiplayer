// main.js

// 1) Endpoint del tuo WebSocket
const socket = new WebSocket("wss://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production");

// Variabili globali
let lobbyInterval = null;

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
    li.textContent = `${lobby.lobby_name} – ${lobby.players} giocatori – ${lobby.stato} ${isPrivate}`;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => {
      console.log("→ click JOIN", lobby.lobby_name);
      socket.send(JSON.stringify({
        action: "joinlobby",
        lobby: lobby.lobby_name
      }));
    });
    ul.appendChild(li);
  });
}

// 4) Mostra/nascondi sezioni
function showHomePage() {
  clearInterval(lobbyInterval);
  document.getElementById("homePage").style.display  = "block";
  document.getElementById("lobbyPage").style.display = "none";
  document.getElementById("gamePage").style.display  = "none";
}

function showLobbyPage(nick) {
  document.getElementById("homePage").style.display  = "none";
  document.getElementById("lobbyPage").style.display = "block";
  document.getElementById("gamePage").style.display  = "none";
  document.getElementById("nicknameDisplay").textContent = nick;

  // richiesta immediata + polling ogni 10s
  requestLobbies();
  lobbyInterval = setInterval(requestLobbies, 10000);
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
      nickname: nick
    }));
    localStorage.setItem("trisNickname", nick);
    showLobbyPage(nick);
  } else {
    console.log("⚠️ [Send] WebSocket non aperta, riprovo fra un momento");
    setTimeout(Send, 500);
  }
}

// 7) Creazione nuova lobby
function createLobby() {
  const name = document.getElementById("newLobbyName").value.trim();
  const pwd  = document.getElementById("newLobbyPassword").value;
  if (!name) {
    alert("Devi specificare un nome per la lobby!");
    return;
  }
  console.log("⟳ [createLobby] Invio { action: 'createlobby', lobby:", name, "}");
  socket.send(JSON.stringify({
    action: "createlobby",
    lobby: name,
    password: pwd
  }));
}

// 8) Setup al caricamento pagina
window.addEventListener("DOMContentLoaded", () => {
  // Invio nickname (pulsante e tasto Invio)
  document.querySelector("#homePage button").addEventListener("click", Send);
  document.getElementById("nickname")
    .addEventListener("keypress", e => { if (e.key === "Enter") Send(); });

  // Logout
  document.getElementById("logoutBtn")
    .addEventListener("click", () => {
      localStorage.removeItem("trisNickname");
      showHomePage();
    });

  // Crea lobby
  document.querySelector("#createLobby button")
    .addEventListener("click", createLobby);

  // 9) Handlers WebSocket
  socket.addEventListener("open", () => {
    console.log("✅ [WebSocket] Aperta (readyState =", socket.readyState, ")");
    const saved = localStorage.getItem("trisNickname");
    if (saved) {
      console.log("→ Nick salvato:", saved, "→ showLobbyPage");
      showLobbyPage(saved);
    }
  });

  socket.addEventListener("message", event => {
    console.log("⚡ [WebSocket message] raw:", event.data);
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error("❌ [message] JSON.parse fallito:", e);
      return;
    }
    console.log("→ [parsed data]:", data);

    // Se il server usa un campo diverso da "lobbies", mostralo qui:
    if (data.lobbies) {
      updateLobbyList(data.lobbies);
    }
    else if (data.lobby_list) {
      console.warn("⚠️ [message] Server usa 'lobby_list' invece di 'lobbies'");
      updateLobbyList(data.lobby_list);
    }
    else {
      console.log("ℹ️ [message] Azione:", data.action, "| Nessuna lista da aggiornare");
    }
  });

  socket.addEventListener("error", err => {
    console.error("❌ [WebSocket error]:", err);
  });

  socket.addEventListener("close", () => {
    console.log("🔌 [WebSocket] Chiusa");
  });

  // 10) Inizio in home
  showHomePage();
});
