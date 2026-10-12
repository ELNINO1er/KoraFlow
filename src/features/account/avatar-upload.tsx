"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateProfileImageAction,
  removeProfileImageAction,
  type AccountActionResult,
} from "./actions";

/** Redimensionne une image en carré 256×256 (recadrage « cover ») → data URL JPEG. */
function resizeToSquare(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas indisponible"));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image illisible"));
    };
    img.src = url;
  });
}

export function AvatarUpload({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(image);
  const [dirtyUrl, setDirtyUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AccountActionResult | null>(null);
  const initials = (name || email).charAt(0).toUpperCase();

  async function onPick(file: File | undefined) {
    if (!file) return;
    setResult(null);
    if (file.size > 10 * 1024 * 1024) {
      setResult({ ok: false, error: "Fichier trop volumineux (10 Mo max)." });
      return;
    }
    try {
      const url = await resizeToSquare(file);
      setPreview(url);
      setDirtyUrl(url);
    } catch {
      setResult({ ok: false, error: "Impossible de lire cette image." });
    }
  }

  function save() {
    if (!dirtyUrl) return;
    startTransition(async () => {
      const r = await updateProfileImageAction(dirtyUrl);
      setResult(r);
      if (r.ok) {
        setDirtyUrl(null);
        router.refresh();
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const r = await removeProfileImageAction();
      setResult(r);
      if (r.ok) {
        setPreview(null);
        setDirtyUrl(null);
        router.refresh();
      }
    });
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Photo de profil</CardTitle>
        <CardDescription>
          Visible dans le menu et auprès de votre équipe. Recadrée automatiquement en carré.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Avatar className="size-20">
          {preview ? <AvatarImage src={preview} alt={name || email} /> : null}
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={pending}>
              <Camera className="size-4" />
              Choisir une image
            </Button>
            {dirtyUrl ? (
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Enregistrer
              </Button>
            ) : null}
            {preview && !dirtyUrl ? (
              <Button
                type="button"
                variant="ghost"
                className="text-danger hover:bg-danger/10"
                onClick={remove}
                disabled={pending}
              >
                <Trash2 className="size-4" />
                Retirer
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">PNG, JPEG ou WebP.</p>
          {result ? (
            <p
              role={result.ok ? "status" : "alert"}
              className={result.ok ? "text-sm text-success" : "text-sm text-danger"}
            >
              {result.ok ? result.message : result.error}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
