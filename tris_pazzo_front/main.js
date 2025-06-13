const socket = new WebSocket("wss://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production");

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
    document.getElementById("homePage").style.display = "none";
    document.getElementById("lobbyPage").style.display = "block";   
    document.getElementById("nicknameDisplay").textContent = val;
  };
}

function updateLobbyList(lobbies) {
  const ul = document.getElementById("lobbyList");
  ul.innerHTML = ""; // svuota la lista attuale

  lobbies.forEach(lobby => {
    const li = document.createElement("li");

    // Costruisci la stringa monoriga
    let text = `${lobby.lobby_name} – ${lobby.players}/2 giocatori`;
    if (lobby.private==1) {
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


