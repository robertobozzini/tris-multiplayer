export function showHomePage() {
  clearInterval(lobbyInterval);
  lobbyPageShown = false;
  document.getElementById("homePage").style.display  = "block";
  document.getElementById("lobbyPage").style.display = "none";
  document.getElementById("gamePage").style.display  = "none";
  document.getElementById("lobbyPageUnit").style.display = "none";
}

export function showLobbyPage(nick) {
  if (lobbyPageShown) return;
  lobbyPageShown = true;
  document.getElementById("homePage").style.display  = "none";
  document.getElementById("lobbyPageUnit").style.display = "none";
  document.getElementById("lobbyPage").style.display = "block";
  document.getElementById("gamePage").style.display  = "none";
  document.getElementById("nicknameDisplay").textContent = nick;

  // richiesta immediata + polling ogni 10s
  requestLobbies();
  lobbyInterval = setInterval(requestLobbies, 1000);
}

export function showLobbyPageUnit() {
  clearInterval(lobbyInterval);
  lobbyPageShown = false;
  document.getElementById("homePage").style.display = "none";
  document.getElementById("lobbyPage").style.display = "none";
  document.getElementById("gamePage").style.display = "none";
  document.getElementById("lobbyPageUnit").style.display = "block";

  const nick = sessionStorage.getItem("trisNickname");
  const lobbyName = sessionStorage.getItem("currentLobby");
  
  if (nick) {
    document.getElementById("nicknameDisplayUnit").textContent = nick;
  }
  
  if (lobbyName) {
    document.getElementById("lobbyNameDisplay").textContent = `Lobby: ${lobbyName}`;
  }
}

