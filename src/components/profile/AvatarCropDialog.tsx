import { useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

import { getCroppedImageBlob, type CroppedAreaPixels } from "@/utils/image-crop";

type Props = {
  open: boolean;
  file: File | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (blob: Blob) => void;
};

export default function AvatarCropDialog({ open, file, onOpenChange, onConfirm }: Props) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const imageUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setSubmitting(false);
  }, [open]);

  const handleConfirm = async () => {
    if (!imageUrl || !croppedAreaPixels) return;

    setSubmitting(true);
    const blob = await getCroppedImageBlob({
      imageSrc: imageUrl,
      crop: croppedAreaPixels,
      outputSize: 512,
      mimeType: "image/jpeg",
      quality: 0.92,
    });

    onConfirm(blob);
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-lg rounded-3xl border border-border bg-background p-0">
        <DialogHeader className="px-5 pb-2 pt-5">
          <DialogTitle className="text-base">Ajustar foto</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/30">
            <div className="relative h-72 w-full sm:h-80">
              {imageUrl ? (
                <Cropper
                  image={imageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels as CroppedAreaPixels)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Nenhuma imagem selecionada.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Zoom</span>
              <span className="font-medium text-foreground">{Math.round(zoom * 100)}%</span>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={(v) => setZoom(v[0] ?? 1)}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            className="h-10 rounded-full"
            onClick={() => void handleConfirm()}
            disabled={!imageUrl || !croppedAreaPixels || submitting}
          >
            {submitting ? "Aplicando..." : "Usar esta foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}