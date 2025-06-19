export function applyFilter() {
  document.querySelectorAll("#lobbyList li").forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(currentFilter) ? "" : "none";
  });
}

export function getNickname() {
  const input = document.getElementById("nickname");
  const nick  = input.value.trim();
  if (!nick) {
    input.style.borderColor = "red";
    return null;
  }
  input.style.borderColor = "";
  return nick;
}

