const socket = new WebSocket("wss://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production");

let askedOnce = false;

function requestLobbies() {
  if (!askedOnce && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "lobbylist" }));
    askedOnce = true;
    console.log("invio");
  }
}

// All’avvio della SPA: monta tutto
window.addEventListener("DOMContentLoaded", () => {
  // 1) Gestione logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("trisNickname");
      askedOnce=false;
      showHomePage();
    });
  }

  // 2) Controllo se c'è già un nickname salvato
  const savedNick = localStorage.getItem("trisNickname");
  if (savedNick) {
    initSocket(() => showLobbyPage(savedNick));
  } else {
    showHomePage();
    initSocket();
  }
});

function initSocket(onOpenCallback) {
  socket.onopen = () => {
    console.log("✅ Connesso al WebSocket AWS");
    requestLobbies();
    if (onOpenCallback) onOpenCallback();
  };

  socket.onmessage = event => {
    console.log("messaggio arrivato")
    let data;
    console.log(data)
    try { data = JSON.parse(event.data); }
    catch { return; }

    if (data.action === "lobbylist") {
      updateLobbyList(data.lobbies);
    }
  };

  socket.onerror = err => console.error("❌ Errore WS:", err);
  socket.onclose = () => console.log("🔌 Connessione chiusa");
}

function showHomePage() {
  document.getElementById("homePage").style.display  = "block";
  document.getElementById("lobbyPage").style.display = "none";
}

function showLobbyPage(nick) {
  document.getElementById("homePage").style.display  = "none";
  document.getElementById("lobbyPage").style.display = "block";
  document.getElementById("nicknameDisplay").textContent = nick;

  // Richiedo immediatamente la lista
  requestLobbies();
}

function getNickname() {
  const nickInput = document.getElementById("nickname");
  const nick = nickInput.value.trim();
  if (!nick) {
    nickInput.style.borderBlockColor = "red";
    return null;
  }
  return nick;
}

function Send() {
  const val = getNickname();
  if (!val) return;

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: "sendnickname",
      nickname: val
    }));
    console.log("inviato")
    localStorage.setItem("trisNickname", val);
    showLobbyPage(val);
  }
}

function updateLobbyList(lobbies) {
  if (!Array.isArray(lobbies)) return;

  const ul = document.getElementById("lobbyList");
  ul.innerHTML = "";

  lobbies.forEach(lobby => {
    const li = document.createElement("li");
    const name      = lobby.lobby_name    || "—";
    const players   = lobby.players       ?? 0;
    const status    = lobby.status        || "sconosciuto";
    const isPrivate = lobby.private == 1;

    let text = `${name} – ${players} giocatori – ${status}`;
    if (isPrivate) text += " – 🔒";

    li.textContent = text;
    ul.appendChild(li);
  });
}
