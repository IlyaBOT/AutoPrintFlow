"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      toast.error("Choose an image before continuing.");
      return;
    }

    setIsPending(true);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const response = await fetch("/api/stickers/upload", {
        method: "POST",
        body: uploadData,
      });

      const result = (await response.json()) as { error?: string; stickerId?: string };

      if (!response.ok || !result.stickerId) {
        throw new Error(result.error ?? "Upload failed.");
      }

      toast.success("Image uploaded.");
      startTransition(() => {
        router.push(`/editor/${result.stickerId}`);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className="rounded-[36px]">
      <CardHeader className="space-y-3">
        <div className="section-kicker">Step 1</div>
        <CardTitle className="text-3xl">Upload a source image</CardTitle>
        <CardDescription>
          PNG, JPG/JPEG, and WEBP are supported. Square images work best, but the editor can crop and stretch any ratio into the final sticker frame.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleUpload}>
          <label
            htmlFor="file"
            className="group flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-[32px] border border-dashed border-sky-300/80 bg-gradient-to-br from-white/75 to-sky-50/70 p-8 text-center transition hover:border-sky-400 hover:bg-white/85"
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-950 text-white shadow-lg shadow-slate-900/15">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div className="text-xl font-semibold text-slate-950">{fileName ?? "Drop an image here or click to browse"}</div>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              The app stores the original upload privately, generates the 42x42 mm export, and keeps all sticker files protected behind session checks.
            </p>
            <input
              ref={inputRef}
              id="file"
              name="file"
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const nextFile = event.currentTarget.files?.[0];
                setFileName(nextFile?.name ?? null);
              }}
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-slate-600">
              Recommended: upload the highest-resolution original you have for cleaner scaling and safer moderation previews.
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Continue to editor
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
