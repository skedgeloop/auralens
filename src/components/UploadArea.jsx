import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiX, FiImage } from 'react-icons/fi';

const UploadArea = ({ onImageUpload }) => {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const onDrop = useCallback(
    (acceptedFiles) => {
      setError('');
      const file = acceptedFiles[0];
      if (!file) return;

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setError('nope — PNG, JPG, WEBP, or GIF only');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('that\'s too chunky. max 10mb.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          if (img.width < 100 || img.height < 100) {
            setError('too tiny. at least 100×100 please.');
            return;
          }
          setPreview(reader.result);
          onImageUpload(file, reader.result, img);
        };
        img.onerror = () => setError('couldn\'t load that. try another?');
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    },
    [onImageUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'] },
    maxFiles: 1,
  });

  const clearImage = () => {
    setPreview(null);
    setError('');
    onImageUpload(null, null, null);
  };

  return (
    <div className="w-full">
      {!preview ? (
        <div
          {...getRootProps()}
          role="button"
          aria-label="Upload a photo — drop an image here or click to browse"
          className={`group cursor-pointer border-2 border-dashed rounded-xl p-12 text-center transition-all
            ${isDragActive
              ? 'border-[var(--pink)] bg-[rgba(255,45,111,0.05)]'
              : 'border-[var(--border)] hover:border-[var(--text-dim)]'
            }`}
        >
          <input {...getInputProps({ 'aria-label': 'Upload a photo' })} />

          {/* Upload icon */}
          <div className="mb-6">
            <div className="w-16 h-16 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mx-auto group-hover:border-[var(--pink)]/30 transition-colors">
              <FiUpload className="w-7 h-7 text-[var(--text-dim)] group-hover:text-[var(--pink)] transition-colors" />
            </div>
          </div>

          <p className="font-display text-xl md:text-2xl font-bold text-white mb-2">
            {isDragActive ? 'drop it like it\'s hot' : 'yo, drop a photo'}
          </p>
          <p className="text-sm text-[var(--text-dim)] mb-5">
            {isDragActive
              ? 'let go & watch the AI cook'
              : 'drag & drop · click · png, jpg, webp, gif'}
          </p>

          <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-dim)]">
            <FiImage className="w-3.5 h-3.5 text-pink" />
            max 10mb · no signup · no tracking
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-[var(--border)]">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-auto max-h-[380px] object-contain bg-black"
          />
          <button
            onClick={clearImage}
            className="absolute top-3 right-3 bg-black/70 hover:bg-[var(--pink)] text-white rounded-lg p-2 transition-colors"
            aria-label="Remove image"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 text-sm text-[var(--pink)] bg-[rgba(255,45,111,0.08)] border border-[rgba(255,45,111,0.2)] p-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default UploadArea;
