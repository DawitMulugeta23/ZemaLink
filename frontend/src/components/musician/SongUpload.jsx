import { useState } from "react";
import { musicianService } from "../../services/musicianService";

function SongUpload({ onUploaded }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("Pop");
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState("");
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);

  const validateFiles = () => {
    const nextErrors = [];
    if (!file) nextErrors.push("Please select an audio file from your device.");
    if (file && file.size > 25 * 1024 * 1024) {
      nextErrors.push("Audio file must be 25MB or less.");
    }
    if (cover && cover.size > 8 * 1024 * 1024) {
      nextErrors.push("Cover image must be 8MB or less.");
    }
    if (isPremium) {
      const numericPrice = parseFloat(price);
      if (!price || Number.isNaN(numericPrice) || numericPrice <= 0) {
        nextErrors.push("Set a valid PRO price greater than 0.");
      }
    }
    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!validateFiles()) {
      return;
    }
    const fd = new FormData();
    fd.append("title", title);
    fd.append("artist", artist);
    fd.append("album", album);
    fd.append("genre", genre);
    fd.append("is_premium", isPremium ? "1" : "");
    fd.append("price", isPremium ? String(parseFloat(price)) : "0");
    fd.append("file", file);
    if (cover) fd.append("cover", cover);
    setBusy(true);
    try {
      const res = await musicianService.uploadSong(fd);
      if (res.success) {
        setTitle("");
        setArtist("");
        setAlbum("");
        setGenre("Pop");
        setFile(null);
        setCover(null);
        setErrors([]);
        setMsg("Uploaded — pending admin approval.");
        onUploaded?.();
      } else {
        setMsg(res.message || "Upload failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-white">Publish a new track</h3>
      <p className="text-sm text-white/60">
        Add professional metadata, then select files from your local machine.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/60">
          Song title *
          <input
            className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
            placeholder="e.g. Midnight Vibes"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="text-xs text-white/60">
          Primary artist *
          <input
            className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
            placeholder="e.g. Dawit"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            required
          />
        </label>
        <label className="text-xs text-white/60 sm:col-span-2">
          Album / EP
          <input
            className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
            placeholder="Optional release name"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
          />
        </label>
        <label className="text-xs text-white/60 sm:col-span-2">
          Genre
          <select
            className="mt-1 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            <option value="Rock">Rock</option>
            <option value="Pop">Pop</option>
            <option value="Jazz">Jazz</option>
            <option value="Hip-Hop">Hip-Hop</option>
            <option value="Classical">Classical</option>
            <option value="Electronic">Electronic</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPremium}
            onChange={(e) => setIsPremium(e.target.checked)}
          />
          Premium (paid)
        </label>
        {isPremium && (
          <label className="text-xs text-white/70">
            PRO price (USD)
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 1.99"
              className="mt-1 w-36 rounded-lg bg-black/30 border border-white/15 px-2 py-1 text-white"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required={isPremium}
            />
          </label>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block rounded-xl border border-dashed border-white/25 bg-black/20 p-3 text-xs text-white/60">
          Master audio file * (mp3/wav/m4a)
          <input
            type="file"
            accept=".mp3,.wav,.m4a,audio/*"
            className="mt-2 block w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-500/80 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-purple-500"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="mt-2 text-[11px] text-white/45">
            {file
              ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(2)} MB`
              : "No audio file selected"}
          </p>
        </label>
        <label className="block rounded-xl border border-dashed border-white/25 bg-black/20 p-3 text-xs text-white/60">
          Cover image (jpg/png/webp)
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/*"
            className="mt-2 block w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-fuchsia-500/80 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-fuchsia-500"
            onChange={(e) => setCover(e.target.files?.[0] || null)}
          />
          <p className="mt-2 text-[11px] text-white/45">
            {cover
              ? `${cover.name} · ${(cover.size / (1024 * 1024)).toFixed(2)} MB`
              : "No image selected"}
          </p>
        </label>
      </div>
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-100 space-y-1">
          {errors.map((error) => (
            <p key={error}>- {error}</p>
          ))}
        </div>
      )}
      {msg && <p className="text-sm text-amber-200">{msg}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Submit for approval"}
      </button>
    </form>
  );
}

export default SongUpload;
