function getNickname() {
  const nick = document.getElementById("nickname").value.trim();
  if (!nick) {
    alert("Inserisci un nickname prima di continuare.");
    return null;
  }
  return encodeURIComponent(nick);
}

