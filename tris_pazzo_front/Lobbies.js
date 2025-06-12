// Simulazione di lobby (verranno da server in futuro)
const fakeLobbies = [
    { id: "abc123", name: "Tris con Marco" },
    { id: "xyz789", name: "Sfida veloce" }
];

const container = document.getElementById("lobby-list");

fakeLobbies.forEach(lobby => {
    const div = document.createElement("div");
    div.className = "lobby-card";
    div.innerHTML = `
    <span>${lobby.name}</span>
    <button onclick="joinLobby('${lobby.id}')">Entra</button>
    `;
    container.appendChild(div);
});

function joinLobby(id) {
    console.log("Unisciti alla lobby con ID:", id);
    // Redirect o connessione WebSocket in futuro
    // location.href = `/partita.html?lobby=${id}`;
}