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
    location.href="FindLobby.html"
  }

}
const socket = new WebSocket('wss://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com');

// Quando il socket si connette con successo
socket.onopen = function(event) {
  console.log("Connesso al WebSocket");

  // Esempio di payload da inviare
  const payload = {
    action: 'sendMessage',  // deve corrispondere a una route definita nel WebSocket API Gateway
    data: 
    {
      nickname: "alice",
      message: "Ciao dal client!"
    }
  }
  socket.send(JSON.stringify(payload));
}