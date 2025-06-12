function getNickname() {
  const nick = document.getElementById("nickname").value.trim();
  if (!nick) {
    alert("Inserisci un nickname prima di continuare.");
    return null;
  }
  return nick;
}

function Send(){
  const val=getNickname();
  if(val==null) console.log("errore")
  else console.log(val);

}