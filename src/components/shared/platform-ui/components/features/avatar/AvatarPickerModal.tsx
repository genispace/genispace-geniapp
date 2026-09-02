import { useState, useRef, useCallback, useEffect, type ChangeEvent, type SyntheticEvent } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { User, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { AVATAR_STYLES, generateAvatarUrl, type AvatarStyle } from './generateAvatarUrl';

const AVATAR_SIZE = 512;
const CROP_ASPECT = 1;
const MAX_SOURCE_DIM = 1024;
const MAX_DATAURL_LENGTH = 400000;
const OUTPUT_JPEG_QUALITY = 0.92;

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 100 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export interface AvatarPickerLabels {
  title?: string;
  description?: string;
  cropTitle?: string;
  cancelUpload?: string;
  applyCrop?: string;
  preview?: string;
  compressing?: string;
  upload?: string;
  presets?: string;
  cancel?: string;
  save?: string;
  saving?: string;
  invalidFile?: string;
  uploadFailed?: string;
}

const DEFAULT_LABELS: Required<AvatarPickerLabels> = {
  title: 'Set Avatar',
  description: 'Upload a photo or choose a preset avatar',
  cropTitle: 'Adjust the crop, then click Save',
  cancelUpload: 'Back',
  applyCrop: 'Apply',
  preview: 'Preview',
  compressing: 'Processing...',
  upload: 'Upload Photo',
  presets: 'Choose an avatar',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving...',
  invalidFile: 'Please select an image file (JPG, PNG, etc.)',
  uploadFailed: 'Failed to process image',
};

export interface AvatarPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl: string | null | undefined;
  /** Seed used for DiceBear presets. Prefer this over `userName`. */
  seedName?: string;
  /** @deprecated Use `seedName`. Kept for hub Profile compatibility. */
  userName?: string;
  onSave: (avatarUrl: string | null) => Promise<void>;
  labels?: AvatarPickerLabels;
}

export function AvatarPickerModal({
  open,
  onOpenChange,
  currentAvatarUrl,
  seedName,
  userName,
  onSave,
  labels: labelsProp,
}: AvatarPickerModalProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const [selectedUrl, setSelectedUrl] = useState<string | null>(currentAvatarUrl ?? null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressProgress, setCompressProgress] = useState(false);

  const seed = seedName || userName || 'User';

  const downscaleIfNeeded = useCallback((dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        if (w <= MAX_SOURCE_DIM && h <= MAX_SOURCE_DIM) {
          resolve(dataUrl);
          return;
        }
        const scale = MAX_SOURCE_DIM / Math.max(w, h);
        const cw = Math.round(w * scale);
        const ch = Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, cw, ch);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = dataUrl;
    });
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedUrl(currentAvatarUrl ?? null);
      setUploadedFile(null);
      setUploadError(null);
    }
  }, [open, currentAvatarUrl]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError(labels.invalidFile);
      return;
    }
    setCompressProgress(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const toUse = await downscaleIfNeeded(dataUrl);
        setUploadedFile(toUse);
        setCrop(undefined);
        setCompletedCrop(undefined);
      } catch {
        setUploadError(labels.uploadFailed);
      } finally {
        setCompressProgress(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, CROP_ASPECT));
  };

  const getCroppedDataUrl = useCallback((): Promise<string | null> => {
    if (!imgRef.current || !completedCrop) return Promise.resolve(null);
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const isPercent = (completedCrop as Crop & { unit?: string }).unit === '%';
    const x = isPercent ? (completedCrop.x / 100) * image.width : completedCrop.x;
    const y = isPercent ? (completedCrop.y / 100) * image.height : completedCrop.y;
    const w = isPercent ? (completedCrop.width / 100) * image.width : completedCrop.width;
    const h = isPercent ? (completedCrop.height / 100) * image.height : completedCrop.height;
    const cropX = x * scaleX;
    const cropY = y * scaleY;
    const cropW = w * scaleX;
    const cropH = h * scaleY;

    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    let quality = OUTPUT_JPEG_QUALITY;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > MAX_DATAURL_LENGTH && quality > 0.2) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    return Promise.resolve(dataUrl);
  }, [completedCrop]);

  const isCropping = Boolean(uploadedFile);

  const handleBackFromCrop = () => {
    setUploadedFile(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let urlToSave = selectedUrl;
      if (uploadedFile) {
        if (!completedCrop) return;
        const dataUrl = await getCroppedDataUrl();
        if (!dataUrl) return;
        urlToSave = dataUrl;
      }
      await onSave(urlToSave);
      onOpenChange(false);
      setSelectedUrl(null);
      setUploadedFile(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setUploadedFile(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setSelectedUrl(currentAvatarUrl ?? null);
    setUploadError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription className="sr-only">{labels.description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isCropping ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-medium text-content-muted dark:text-content-dark-muted w-full text-center">
                {labels.cropTitle}
              </p>
              <div className="w-full flex justify-center">
                <div className="inline-block max-w-[280px] max-h-[280px] bg-muted/30 rounded-lg overflow-hidden">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
                    aspect={CROP_ASPECT}
                    circularCrop
                    className="inline-block"
                  >
                    <img
                      ref={imgRef}
                      src={uploadedFile!}
                      alt="Crop"
                      onLoad={onImageLoad}
                      className="block max-w-[280px] max-h-[280px] w-auto h-auto"
                      style={{ display: 'block', objectFit: 'contain' }}
                    />
                  </ReactCrop>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm font-medium text-content-muted dark:text-content-dark-muted w-full">
                  {labels.preview}
                </p>
                {compressProgress ? (
                  <div className="w-32 h-32 rounded-full border-2 border-border bg-muted flex flex-col items-center justify-center shrink-0 gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    <span className="text-xs text-muted-foreground">{labels.compressing}</span>
                  </div>
                ) : (
                  <>
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center shrink-0">
                      {selectedUrl ? (
                        <img src={selectedUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-16 h-16 text-muted-foreground" />
                      )}
                    </div>
                    <Button variant="outline" className="h-9 px-4 gap-2" asChild>
                      <label className="cursor-pointer inline-flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        {labels.upload}
                        <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
                      </label>
                    </Button>
                  </>
                )}
                {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-content-muted dark:text-content-dark-muted">
                  {labels.presets}
                </p>
                <ScrollArea className="h-[280px] pr-2">
                  <div className="grid grid-cols-4 gap-3">
                    {AVATAR_STYLES.map((style) => {
                      const url = generateAvatarUrl(seed, style as AvatarStyle, 128);
                      const isSelected = selectedUrl === url;
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setSelectedUrl(url)}
                          className={`size-14 shrink-0 rounded-full p-0 overflow-hidden flex items-center justify-center transition-all ${
                            isSelected
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                              : 'hover:opacity-80'
                          }`}
                        >
                          <img src={url} alt={style} className="size-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          {isCropping ? (
            <>
              <Button type="button" variant="outline" onClick={handleBackFromCrop} disabled={saving}>
                {labels.cancelUpload}
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving || !completedCrop}>
                {saving ? labels.saving : labels.save}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleCancel}>
                {labels.cancel}
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? labels.saving : labels.save}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AvatarPickerModal;
