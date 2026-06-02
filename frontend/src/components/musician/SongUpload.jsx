import { useState } from "react";

function SongUpload() {
  const [page, setPage] = useState("select");

  if (page === "select") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Upload Media</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setPage("audio")}
            style={{
              flex: 1, padding: "20px 0", borderRadius: 10, border: "2px solid #e2e8f0",
              background: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer",
            }}
          >
            Upload Audio
          </button>
          <button
            onClick={() => setPage("video")}
            style={{
              flex: 1, padding: "20px 0", borderRadius: 10, border: "2px solid #e2e8f0",
              background: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer",
            }}
          >
            Upload Video
          </button>
        </div>
      </div>
    );
  }

  if (page === "audio") return <AudioUpload onBack={() => setPage("select")} />;
  if (page === "video") return <VideoUpload onBack={() => setPage("select")} />;
}

function AudioUpload({ onBack }) {
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const handleUpload = () => {
    alert(`Audio: ${audioFile?.name}\nCover: ${coverFile?.name}`);
    console.log("Audio:", audioFile?.name, "Cover:", coverFile?.name);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", padding: 0, marginBottom: 12, fontSize: 13 }}>
        &larr; Change Selection
      </button>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Upload Audio</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>
          Audio file *
          <input type="file" accept=".mp3,.wav,.aac,.ogg,.m4a,audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} style={{ display: "block", marginTop: 6 }} />
          <span style={{ fontSize: 12, color: "#64748b" }}>{audioFile ? audioFile.name : "No file selected"}</span>
        </label>
        <label style={{ fontSize: 13, fontWeight: 500 }}>
          Cover image *
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} style={{ display: "block", marginTop: 6 }} />
          <span style={{ fontSize: 12, color: "#64748b" }}>{coverFile ? coverFile.name : "No file selected"}</span>
        </label>
        <button onClick={handleUpload} disabled={!audioFile || !coverFile} style={{ marginTop: 4, padding: "10px 0", borderRadius: 8, border: "none", background: audioFile && coverFile ? "#7c3aed" : "#cbd5e1", color: "#fff", fontWeight: 600, fontSize: 14, cursor: audioFile && coverFile ? "pointer" : "not-allowed" }}>
          Upload
        </button>
      </div>
    </div>
  );
}

function VideoUpload({ onBack }) {
  const [videoFile, setVideoFile] = useState(null);

  const handleUpload = () => {
    alert(`Video: ${videoFile?.name}`);
    console.log("Video:", videoFile?.name);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", padding: 0, marginBottom: 12, fontSize: 13 }}>
        &larr; Change Selection
      </button>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Upload Video</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>
          Video file *
          <input type="file" accept=".mp4,.mov,.avi,.mkv,.webm,video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} style={{ display: "block", marginTop: 6 }} />
          <span style={{ fontSize: 12, color: "#64748b" }}>{videoFile ? videoFile.name : "No file selected"}</span>
        </label>
        <button onClick={handleUpload} disabled={!videoFile} style={{ marginTop: 4, padding: "10px 0", borderRadius: 8, border: "none", background: videoFile ? "#7c3aed" : "#cbd5e1", color: "#fff", fontWeight: 600, fontSize: 14, cursor: videoFile ? "pointer" : "not-allowed" }}>
          Upload
        </button>
      </div>
    </div>
  );
}

export default SongUpload;
