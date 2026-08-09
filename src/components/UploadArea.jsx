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

      if (!file) {
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload a valid image file (JPEG, PNG, WEBP, or GIF)');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image file is too large. Maximum size is 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          // Validate image dimensions
          if (img.width < 100 || img.height < 100) {
            setError('Image dimensions are too small. Minimum size is 100x100 pixels.');
            return;
          }
          setPreview(reader.result);
          onImageUpload(file, reader.result, img);
        };
        img.onerror = () => {
          setError('Failed to load image. Please try a different file.');
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    },
    [onImageUpload]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
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
          className={`group relative rounded-3xl p-px cursor-pointer transition-all duration-300
            ${isDragReject
              ? 'border border-2 border-red-500/60'
              : isDragActive
              ? 'gradient-border scale-[1.01]'
              : 'border border-dashed border-white/15 hover:border-white/35'}`}
        >
          <input {...getInputProps()} />
          <div
            className={`rounded-[calc(1.5rem-1px)] px-8 py-14 md:py-20 flex flex-col items-center justify-center text-center
              bg-[#0b0d17]/85 backdrop-blur-xl transition-colors duration-300
              ${isDragActive ? 'bg-[#0d101f]/95' : 'hover:bg-[#0d101f]/70'}`}
          >
            {/* Glowing icon */}
            <div className="relative mb-7">
              <div className="absolute -inset-4 rounded-full bg-violet-600/25 blur-2xl" />
              <div
                className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400
                  flex items-center justify-center transition-transform duration-300
                  shadow-[0_0_40px_-8px_rgba(139,92,246,0.8)]
                  ${isDragActive ? 'scale-110' : 'group-hover:scale-105'}`}
              >
                <FiUpload className="w-7 h-7 text-white" />
              </div>
            </div>

            <p className="font-display text-xl md:text-2xl font-semibold text-white">
              {isDragActive ? 'Drop your image here' : 'Upload a photo to start'}
            </p>
            <p className="mt-2 text-sm text-[#94a0c3]">
              {isDragActive
                ? 'Release to let the AI work its magic'
                : 'Drag & drop or click to browse · PNG, JPG, WEBP, GIF'}
            </p>
            <div className="mt-6 flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-xs text-[#94a0c3]">
              <FiImage className="w-3.5 h-3.5 text-cyan-300" />
              Max 10MB · Min 100×100px
            </div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-3xl p-px gradient-border">
          <div className="rounded-[calc(1.5rem-1px)] overflow-hidden bg-[#0b0d17]">
            <img src={preview} alt="Preview" className="w-full h-auto max-h-[420px] object-contain" />
          </div>
          <button
            onClick={clearImage}
            className="absolute top-3 right-3 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-2.5 backdrop-blur transition-colors"
            aria-label="Remove image"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
          {error}
        </div>
      )}
    </div>
  );
};

export default UploadArea;
