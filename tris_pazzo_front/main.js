const socket = new WebSocket("wss://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com");

function getNickname() {
  const nick = document.getElementById("nickname").value.trim();
  if (!nick) {
    const valore=document.getElementById("nickname");
    valore.style.borderBlockColor="red"
    return null;
  }
  return nick;
}

function Send(){
  const val=getNickname();
  if(val==null) console.log("errore")
  else {
    
    socket.send(JSON.stringify({
    action: "sendnickname",
    nickname: getNickname()
    }));
    
    location.href="FindLobby.html"
  }

}

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


