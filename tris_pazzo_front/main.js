const socket = new WebSocket("wss://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production");

window.addEventListener("DOMContentLoaded", () => {
  const nick = localStorage.getItem("trisNickname");
  if (nick) {
    // Se c'è un nickname salvato, vado direttamente in lobby
    initSocket(() => showLobbyPage(nick));
  } else {
    // Altrimenti rimango in home
    showHomePage();
    initSocket();
  }
});

function initSocket(onOpenCallback) {
  socket.onopen = () => {
    console.log("✅ Connesso al WebSocket AWS");
    if (onOpenCallback) onOpenCallback();
  };

  socket.onmessage = event => {
    let data;
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

  // Chiedo subito la lista
  socket.send(JSON.stringify({ action: "lobbylist" }));
}

//logout
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Rimuove il nickname dallo storage
      localStorage.removeItem("trisNickname");
      // Torna alla home
      showHomePage()
    });
  }
});

function getNickname() {
  const nick = document.getElementById("nickname").value.trim();
  if (!nick) {
    const valore=document.getElementById("nickname");
    valore.style.borderBlockColor="red"
    return null;
  }
  return nick;
}

function Send() {
  const val = getNickname();
  if (val == null) {
    console.log("errore");
    return;
  }

  if (socket.readyState === WebSocket.OPEN) {
    console.log(val)
    socket.send(JSON.stringify({
      "action": "sendnickname",
      "nickname": val
    }))
    localStorage.setItem("trisNickname", val);
    showLobbyPage(val);
  };
}

function updateLobbyList(lobbies) {
  const ul = document.getElementById("lobbyList");
  ul.innerHTML = ""; // svuota la lista attuale

  lobbies.forEach(lobby => {
    const li = document.createElement("li");

    // Estrai i valori dal singolo oggetto
    const name       = lobby.lobby_name || "—";
    const players    = lobby.players ?? 0;
    const status     = lobby.status || "sconosciuto";
    const isPrivate  = lobby.private == 1;  // o true/false a seconda della tua Lambda

    // Costruisci la stringa monoriga
    let text = `${name} – ${players} giocatori – ${status}`;
    if (isPrivate) {
      text += " – 🔒";
    }

    li.textContent = text;
    ul.appendChild(li);
  });
}



//gestione websocket
socket.onopen = () => {
  console.log("✅ Connesso al WebSocket AWS");

  socket.send(JSON.stringify({
  "action": "lobbylist"
  }));
};

// Quando ricevi un messaggio dal server
socket.onmessage = (event) => {
  console.log("📨 Messaggio ricevuto:", event.data);

  let data;
  try {
    data = JSON.parse(event.data);
  } catch (e) {
    console.error("❌ Errore JSON:", e);
    return;
  }

  switch (data.action) {
    case "lobbylist":
      updateLobbyList(data.lobbies);
      break;
  }
};

// Gestione errori
socket.onerror = (err) => {
  console.error("❌ Errore WebSocket:", err);
};

// Connessione chiusa
socket.onclose = () => {
  console.log("🔌 Connessione chiusa");
};


