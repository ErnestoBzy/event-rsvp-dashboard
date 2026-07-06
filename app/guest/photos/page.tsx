'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getCurrentRole } from '@/lib/supabase';
import { useT } from '@/lib/i18n';

type Photo = {
  id: string;
  url: string;
  created_at: string;
};

const SIGNED_URL_TTL = 3600; // 1 hour

const MAX_DIMENSION = 3000;
const JPEG_QUALITY = 0.92;
const SKIP_BELOW = 1024 * 1024;

async function compressImage(file: File): Promise<File> {
  if (file.size < SKIP_BELOW) return file;
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height / width) * MAX_DIMENSION);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_DIMENSION);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const newName = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], newName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export default function PhotosPage() {
  const { t } = useT();
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCurrentRole().then((role) => {
      if (!role) {
        router.replace('/');
        return;
      }
      loadPhotos();
    });
  }, [router]);

  const loadPhotos = async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('id, storage_path, created_at')
      .order('created_at', { ascending: false });
    if (error || !data) return;

    const paths = data.map((p) => p.storage_path);
    if (paths.length === 0) {
      setPhotos([]);
      return;
    }
    const { data: signed } = await supabase.storage
      .from('photos')
      .createSignedUrls(paths, SIGNED_URL_TTL);
    if (!signed) return;

    setPhotos(
      data.map((p, i) => ({
        id: String(p.id),
        url: signed[i]?.signedUrl || '',
        created_at: p.created_at,
      }))
    );
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      setError(t('photos.noValidImages'));
      return;
    }

    setError('');
    setUploading(true);
    setProgress({ done: 0, total: fileArray.length });

    for (let i = 0; i < fileArray.length; i++) {
      try {
        const compressed = await compressImage(fileArray[i]);
        const ext = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('photos')
          .upload(path, compressed, { contentType: compressed.type });
        if (upErr) {
          setError(t('photos.uploadFailed'));
        } else {
          const { error: dbErr } = await supabase.from('photos').insert({
            storage_path: path,
            file_size: compressed.size,
            mime_type: compressed.type,
          });
          if (dbErr) setError(t('photos.dbError'));
        }
      } catch {
        setError(t('photos.uploadGenericError'));
      }
      setProgress({ done: i + 1, total: fileArray.length });
    }

    setUploading(false);
    setProgress({ done: 0, total: 0 });
    loadPhotos();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-base">

      {/* Top bar */}
      <header className="px-8 md:px-14 py-6 flex items-center justify-start flex-shrink-0">
        <Link href="/guest/rsvp" className="text-xs tracking-widest text-dim uppercase hover:text-accent transition">
          RSVP
        </Link>
      </header>

      <main className="flex-1 px-8 md:px-14 py-10">
        <div className="max-w-5xl mx-auto">

          <h1 className="font-medium leading-[1.1] text-accent text-5xl md:text-6xl mb-12">
            <span className="block fade-in-up" style={{ animationDelay: '0.2s' }}>{t('photos.line1')}</span>
            <span className="block fade-in-up" style={{ animationDelay: '0.4s' }}>
              <span className="gradient-text">{t('photos.line2')}</span>
            </span>
          </h1>

          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            className={`fade-in-up cursor-pointer border-2 border-dashed transition-all py-12 px-6 text-center mb-12 ${
              dragOver ? 'border-accent bg-surface' : 'border-line hover:border-line-hover'
            } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
            style={{ animationDelay: '0.6s' }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            {uploading ? (
              <p className="text-sm text-accent">
                {t('photos.uploading')} {progress.done} / {progress.total}
              </p>
            ) : (
              <>
                <p className="text-base text-accent mb-1">{t('photos.upload')}</p>
                <p className="text-xs text-dim">{t('photos.dropHere')}</p>
              </>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-500 mb-6">{error}</p>
          )}

          {/* Gallery grid */}
          {photos.length === 0 ? (
            <p className="text-sm text-dim text-center py-16 fade-in-up" style={{ animationDelay: '0.8s' }}>
              {t('photos.empty')}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fade-in-up" style={{ animationDelay: '0.8s' }}>
              {photos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setLightbox(p)}
                  className="aspect-square overflow-hidden bg-surface group"
                >
                  <img
                    src={p.url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out fade-in"
        >
          <img
            src={lightbox.url}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-6 right-6 text-white/70 hover:text-white text-3xl leading-none"
            aria-label={t('photos.close')}
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
}
