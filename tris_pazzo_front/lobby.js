export function requestLobbies() {
  if (socket.readyState === WebSocket.OPEN) {
    console.log("⟳ [requestLobbies] Invio { action: 'lobbylist' }");
    socket.send(JSON.stringify({ action: "lobbylist" }));
  } else {
    console.log("⚠️ [requestLobbies] WebSocket non aperta (readyState =", socket.readyState, ")");
  }
}

export function updateLobbyList(lobbies) {
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
          
          sessionStorage.setItem("currentLobby", lobby.lobby_name);

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

export function createLobby() {
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

export function Send() {
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

