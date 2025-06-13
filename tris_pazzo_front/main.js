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

  // ————— 1) INVIO NICKNAME —————
  document.querySelector("#homePage button")
    .addEventListener("click", Send);
  document.getElementById("nickname")
    .addEventListener("keypress", e => {
      if (e.key === "Enter") Send();
    });

  // ————— 2) LOGOUT —————
  document.getElementById("logoutBtn")
    .addEventListener("click", () => {
      localStorage.removeItem("trisNickname");
      const nickInput = document.getElementById("nickname");
      socket.send(JSON.stringify({
        action: "logout",
        }));
      nickInput.value = "";
      nickInput.style.borderColor = "";
      showHomePage();
    });

  // ————— 3) CREA LOBBY —————
  document.querySelector("#createLobby button")
    .addEventListener("click", createLobby);

  // ————— 4) HANDLER WEBSOCKET —————
  socket.addEventListener("open", () => {
    console.log("✅ WebSocket aperta");
    const saved = localStorage.getItem("trisNickname");
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
const savedNick = localStorage.getItem("trisNickname");
if (savedNick) {
  if (socket.readyState === WebSocket.OPEN) {
    // 1. Mostra subito la lobby
    showLobbyPage(savedNick);
    // 2. Reinvia il nickname al server
    socket.send(JSON.stringify({
      action: "sendnickname",
      nickname: savedNick
    }));
  } else {
    // Se il socket non è ancora aperto, aspetta e poi esegui entrambi
    socket.addEventListener("open", () => {
      showLobbyPage(savedNick);
      socket.send(JSON.stringify({
        action: "sendnickname",
        nickname: savedNick
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

