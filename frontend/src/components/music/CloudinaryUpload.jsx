import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../constants";

function UploadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CloseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function FileIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ImageIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

const ACCEPTED_TYPES = {
  image: {
    mime: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    ext: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    maxSize: 5 * 1024 * 1024,
    label: "Image",
  },
  audio: {
    mime: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a", "audio/aac"],
    ext: [".mp3", ".wav", ".ogg", ".m4a", ".aac"],
    maxSize: 50 * 1024 * 1024,
    label: "Audio",
  },
  video: {
    mime: ["video/mp4", "video/webm", "video/ogg", "video/mov", "video/m4v"],
    ext: [".mp4", ".webm", ".ogv", ".mov", ".m4v"],
    maxSize: 200 * 1024 * 1024,
    label: "Video",
  },
};

export default function CloudinaryUpload({ onUpload, type = "image", buttonText }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [useCloudinary, setUseCloudinary] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const config = ACCEPTED_TYPES[type] || ACCEPTED_TYPES.image;
  const defaultButtonText = buttonText || `Upload ${config.label}`;

  // Load Cloudinary widget script
  useEffect(() => {
    if (!useCloudinary) return;
    if (document.querySelector('script[src*="upload-widget.cloudinary.com"]')) return;
    const script = document.createElement("script");
    script.src = "https://upload-widget.cloudinary.com/global/all.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      const existing = document.querySelector('script[src*="upload-widget.cloudinary.com"]');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    };
  }, [useCloudinary]);

  const validateFile = useCallback(
    (file) => {
      if (!file) return "No file selected";
      if (file.size > config.maxSize) {
        const mb = config.maxSize / 1024 / 1024;
        return `File too large. Maximum size is ${mb}MB.`;
      }
      const ext = "." + file.name.split(".").pop().toLowerCase();
      if (!config.ext.includes(ext)) {
        return `Invalid file type. Accepted: ${config.ext.join(", ")}`;
      }
      return null;
    },
    [config],
  );

  const handleFileSelect = useCallback(
    (file) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
      setSelectedFile(file);
      if (type === "image") {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    },
    [type, validateFile],
  );

  const handleInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      e.target.value = "";
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setProgress(0);
  }, []);

  // Local upload via API
  const handleLocalUpload = useCallback(async () => {
    if (!selectedFile) return;
    if (!user) {
      toast.error("Please log in to upload.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", type);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
        }
      };

      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error("Invalid response from server"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.ontimeout = () => reject(new Error("Upload timed out"));
        xhr.timeout = 300000;
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      if (result.success) {
        setProgress(100);
        const uploadData = {
          url: result.url || result.file_url,
          publicId: result.public_id || result.file_id,
          format: selectedFile.name.split(".").pop(),
          bytes: selectedFile.size,
          duration: result.duration || null,
          name: selectedFile.name,
        };
        setPreview(uploadData.url);
        onUpload?.(uploadData);
        toast.success(`${config.label} uploaded successfully`);
        setTimeout(() => {
          setProgress(0);
          setSelectedFile(null);
        }, 2000);
      } else {
        toast.error(result.error || result.message || "Upload failed");
      }
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [selectedFile, user, type, config.label, API_BASE, onUpload]);

  // Cloudinary upload widget
  const handleCloudinaryUpload = useCallback(() => {
    if (!window.cloudinary) {
      toast.info("Cloudinary widget loading...");
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default";

    if (!cloudName) {
      toast.error("Cloudinary not configured. Use local upload instead.");
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName,
        uploadPreset,
        sources: ["local", "url", "camera", "dropbox"],
        multiple: false,
        cropping: type === "image",
        showAdvancedOptions: false,
        croppingAspectRatio: type === "image" ? 1 : null,
        folder: `zemalink/${type === "image" ? "covers" : "media"}`,
        resourceType: type === "image" ? "image" : "auto",
        clientAllowedFormats:
          type === "image"
            ? ["jpg", "png", "jpeg", "webp", "gif"]
            : type === "video"
              ? ["mp4", "webm", "mov", "m4v"]
              : ["mp3", "m4a", "wav", "ogg", "aac"],
        maxFileSize: config.maxSize,
        context: { uploader: user?.id?.toString() || "anonymous" },
        styles: {
          palette: {
            window: "#0f172a",
            windowBorder: "#334155",
            tabIcon: "#a855f7",
            menuIcons: "#94a3b8",
            textDark: "#0f172a",
            textLight: "#f8fafc",
            link: "#a855f7",
            action: "#ec4899",
            inactiveTabIcon: "#475569",
            error: "#ef4444",
            inProgress: "#a855f7",
            complete: "#22c55e",
            sourceBg: "#1e293b",
          },
        },
      },
      (error, result) => {
        if (error) {
          toast.error("Upload failed");
          setUploading(false);
          return;
        }
        if (result.event === "success") {
          const uploadData = {
            url: result.info.secure_url,
            publicId: result.info.public_id,
            format: result.info.format,
            bytes: result.info.bytes,
            duration: result.info.duration || null,
          };
          setPreview(uploadData.url);
          setProgress(100);
          onUpload?.(uploadData);
          toast.success(`${config.label} uploaded successfully`);
          setTimeout(() => setProgress(0), 2000);
        }
        if (result.event === "close") {
          setUploading(false);
        }
      },
    );

    widget.open();
    setUploading(true);
  }, [type, config, user, onUpload]);

  const handleUpload = useCallback(() => {
    if (useCloudinary) {
      handleCloudinaryUpload();
    } else {
      handleLocalUpload();
    }
  }, [useCloudinary, handleCloudinaryUpload, handleLocalUpload]);

  const hasCloudinaryConfig = !!(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);

  return (
    <div className="space-y-3">
      {/* Toggle between Cloudinary and local */}
      {hasCloudinaryConfig && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUseCloudinary(false)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              !useCloudinary
                ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                : "bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400 border border-transparent hover:border-surface-300 dark:hover:border-surface-600"
            }`}
          >
            Local Upload
          </button>
          <button
            type="button"
            onClick={() => setUseCloudinary(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              useCloudinary
                ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                : "bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400 border border-transparent hover:border-surface-300 dark:hover:border-surface-600"
            }`}
          >
            Cloudinary
          </button>
        </div>
      )}

      {/* Upload area */}
      {!useCloudinary ? (
        <>
          {/* Drag & drop zone */}
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
              dragOver
                ? "border-primary-500 bg-primary-500/10 scale-[1.02]"
                : selectedFile
                  ? "border-primary-400/50 bg-primary-500/5"
                  : "border-surface-300 dark:border-surface-600 hover:border-primary-400/50 hover:bg-surface-50 dark:hover:bg-surface-700/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={config.ext.join(",")}
              onChange={handleInputChange}
              className="hidden"
              aria-label={`Select ${config.label} file`}
            />

            {preview && type === "image" ? (
              <div className="relative w-full max-w-[200px]">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full aspect-square rounded-lg object-cover shadow-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                  aria-label="Remove file"
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              </div>
            ) : selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  {type === "image" ? (
                    <ImageIcon className="w-6 h-6 text-primary-400" />
                  ) : (
                    <FileIcon className="w-6 h-6 text-primary-400" />
                  )}
                </div>
                <p className="text-sm font-medium text-surface-800 dark:text-white truncate max-w-[200px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-surface-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center mb-3">
                  <UploadIcon className="w-6 h-6 text-surface-400" />
                </div>
                <p className="text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">
                  Drop your {config.label.toLowerCase()} file here
                </p>
                <p className="text-xs text-surface-400 mb-2">
                  or click to browse
                </p>
                <p className="text-[10px] text-surface-400">
                  {config.ext.join(", ").toUpperCase()} &middot; Max{" "}
                  {(config.maxSize / 1024 / 1024).toFixed(0)}MB
                </p>
              </>
            )}
          </div>

          {/* Upload button */}
          {selectedFile && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-primary-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {uploading ? `Uploading... ${progress}%` : `Upload ${selectedFile.name}`}
            </button>
          )}

          {/* Progress bar */}
          {uploading && progress > 0 && progress < 100 && (
            <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </>
      ) : (
        /* Cloudinary widget button */
        <button
          type="button"
          onClick={handleCloudinaryUpload}
          disabled={uploading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-primary-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : defaultButtonText}
        </button>
      )}

      {/* Success preview for non-image types */}
      {preview && type !== "image" && !selectedFile && (
        <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-700/50 border border-surface-200 dark:border-surface-700">
          <p className="text-xs font-medium text-emerald-500 flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Uploaded successfully
          </p>
          {type === "audio" && (
            <audio controls className="w-full h-8 rounded-lg">
              <source src={preview} />
            </audio>
          )}
          {type === "video" && (
            <video controls className="w-full rounded-lg max-h-48">
              <source src={preview} />
            </video>
          )}
        </div>
      )}
    </div>
  );
}
