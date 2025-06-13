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
    }));
  } else if (socket.readyState === WebSocket.CONNECTING) {
    console.warn("⚠️ WebSocket in connessione... aspetta");
    // opzionale: ritenta tra 100ms
    setTimeout(Send, 100);
  } else {
    console.error("❌ WebSocket non disponibile. Stato:", socket.readyState);
  }
}

//gestione websocket
socket.onopen = () => {
  console.log("✅ Connesso al WebSocket AWS");
};

// Quando ricevi un messaggio dal server
socket.onmessage = (event) => {
  console.log("📨 Messaggio ricevuto:", event.data);
};

// Gestione errori
socket.onerror = (err) => {
  console.error("❌ Errore WebSocket:", err);
};

// Connessione chiusa
socket.onclose = () => {
  console.log("🔌 Connessione chiusa");
};


