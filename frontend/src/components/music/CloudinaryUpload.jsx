import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

function CloudinaryUpload({ onUploadSuccess, type = "image" }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const widgetRef = useRef(null);

  // Cloudinary configuration
  const cloudName = "YOUR_CLOUD_NAME"; // Replace with your cloud name
  const uploadPreset = "music_upload"; // Create this in Cloudinary dashboard

  // Initialize Cloudinary widget
  useEffect(() => {
    // Load Cloudinary widget script
    const script = document.createElement("script");
    script.src = "https://upload-widget.cloudinary.com/global/all.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const openUploadWidget = () => {
    if (!window.cloudinary) {
      toast.info("Cloudinary widget loading...");
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        sources: ["local", "url", "camera"],
        multiple: false,
        cropping: type === "image",
        showAdvancedOptions: false,
        croppingAspectRatio: type === "image" ? 1 : null,
        folder: `zema_music/${type === "image" ? "covers" : "songs"}`,
        resourceType: type === "image" ? "image" : "video",
        clientAllowedFormats:
          type === "image"
            ? ["jpg", "png", "jpeg"]
            : type === "video"
              ? ["mp4", "webm", "mov", "m4v"]
              : ["mp3", "m4a", "wav"],
        maxFileSize: type === "image" ? 5000000 : 15000000, // 5MB for images, 15MB for audio
        styles: {
          palette: {
            window: "#FFFFFF",
            windowBorder: "#90A0B3",
            tabIcon: "#0078FF",
            menuIcons: "#5A616A",
            textDark: "#000000",
            textLight: "#FFFFFF",
            link: "#0078FF",
            action: "#FF620C",
            inactiveTabIcon: "#0E2F5A",
            error: "#F44235",
            inProgress: "#0078FF",
            complete: "#20B832",
            sourceBg: "#E4EBF1",
          },
        },
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          const uploadData = {
            url: result.info.secure_url,
            publicId: result.info.public_id,
            format: result.info.format,
            bytes: result.info.bytes,
            duration: result.info.duration || null,
          };

          setPreview(uploadData.url);
          onUploadSuccess(uploadData);
          setUploading(false);
          setProgress(100);

          setTimeout(() => setProgress(0), 2000);
        } else if (error) {
          console.error("Upload error:", error);
          toast.error("Upload failed: " + error.message);
          setUploading(false);
        }
      },
    );

    widget.open();
    setUploading(true);
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={openUploadWidget}
        disabled={uploading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-105 transition disabled:opacity-50"
      >
        {uploading
          ? "Uploading..."
          : `Upload ${
              type === "image"
                ? "Cover Image"
                : type === "video"
                  ? "Video File"
                  : "Audio File"
            }`}
      </button>

      {progress > 0 && progress < 100 && (
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {preview && type === "image" && (
        <div className="mt-4">
          <p className="text-sm text-white/50 mb-2">Preview:</p>
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 rounded-lg object-cover"
          />
        </div>
      )}

      {preview && type === "audio" && (
        <div className="mt-4 p-3 rounded-xl bg-white/10">
          <p className="text-sm text-white/70">✓ Audio uploaded successfully</p>
          <audio controls className="w-full mt-2">
            <source src={preview} />
          </audio>
        </div>
      )}

      {preview && type === "video" && (
        <div className="mt-4 p-3 rounded-xl bg-white/10">
          <p className="text-sm text-white/70">✓ Video uploaded successfully</p>
          <video controls className="w-full mt-2 rounded-lg">
            <source src={preview} />
          </video>
        </div>
      )}
    </div>
  );
}

export default CloudinaryUpload;
