import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");

  async function updateBio() {
    try {
      const info: any = await invoke("get_lcu_connection");
      const res = await invoke("update_bio", {
        port: info.port,
        token: info.token,
        newBio: bio
      });
      setStatus(String(res));
    } catch (err) {
      setStatus("Error: " + err);
    }
  }

  return (
    <div className="container">
      <h1>League Profile Editor</h1>
      <input
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Nuova Bio"
      />
      <button onClick={updateBio}>Aggiorna</button>
      <p>{status}</p>
    </div>
  );
}

export default App;
