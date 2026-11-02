"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isImageFile, uploadImage, type UploadTarget, type UploadedImage } from "@/lib/admin-client";

export type UploadJob = {
  key: string;
  name: string;
  size: number;
  previewUrl: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  result?: UploadedImage;
};

type Internal = { file: File; target: UploadTarget; controller?: AbortController };

let counter = 0;

// Many files at once: each gets its own progress; three upload at the same time.
export function useUploadQueue(options: { concurrency?: number; onUploaded?: (job: UploadJob, image: UploadedImage) => void } = {}) {
  const concurrency = options.concurrency ?? 3;
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const internals = useRef(new Map<string, Internal>());
  const running = useRef(new Set<string>());
  const onUploaded = useRef(options.onUploaded);
  onUploaded.current = options.onUploaded;

  const update = useCallback((key: string, patch: Partial<UploadJob>) => {
    setJobs((current) => current.map((job) => (job.key === key ? { ...job, ...patch } : job)));
  }, []);

  // Returns the files that were queued (with their keys) and the names of files skipped because they aren't images.
  const add = useCallback((files: Iterable<File>, target: UploadTarget) => {
    const skipped: string[] = [];
    const added: { key: string; name: string }[] = [];
    const fresh: UploadJob[] = [];
    for (const file of Array.from(files)) {
      if (!isImageFile(file)) {
        skipped.push(file.name);
        continue;
      }
      counter += 1;
      const key = `u${Date.now().toString(36)}${counter}`;
      internals.current.set(key, { file, target });
      fresh.push({ key, name: file.name, size: file.size, previewUrl: URL.createObjectURL(file), progress: 0, status: "queued" });
      added.push({ key, name: file.name });
    }
    if (fresh.length) setJobs((current) => [...current, ...fresh]);
    return { skipped, added };
  }, []);

  const start = useCallback(
    (job: UploadJob) => {
      const internal = internals.current.get(job.key);
      if (!internal || running.current.has(job.key)) return;
      running.current.add(job.key);
      const controller = new AbortController();
      internal.controller = controller;
      update(job.key, { status: "uploading", progress: 0, error: undefined });
      uploadImage(internal.file, internal.target, (fraction) => update(job.key, { progress: fraction }), controller.signal)
        .then((image) => {
          if (!internals.current.has(job.key)) return;
          const done: UploadJob = { ...job, status: "done", progress: 1, result: image };
          update(job.key, { status: "done", progress: 1, result: image });
          onUploaded.current?.(done, image);
        })
        .catch((error: unknown) => {
          if (!internals.current.has(job.key)) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          update(job.key, { status: "error", error: error instanceof Error ? error.message : "Upload failed." });
        })
        .finally(() => {
          running.current.delete(job.key);
        });
    },
    [update]
  );

  useEffect(() => {
    const busy = jobs.filter((job) => job.status === "uploading").length;
    const waiting = jobs.filter((job) => job.status === "queued").slice(0, Math.max(0, concurrency - busy));
    for (const job of waiting) start(job);
  }, [jobs, concurrency, start]);

  const retry = useCallback((key: string) => update(key, { status: "queued", error: undefined, progress: 0 }), [update]);

  const remove = useCallback((key: string) => {
    const internal = internals.current.get(key);
    internal?.controller?.abort();
    internals.current.delete(key);
    setJobs((current) => {
      const job = current.find((entry) => entry.key === key);
      if (job) URL.revokeObjectURL(job.previewUrl);
      return current.filter((entry) => entry.key !== key);
    });
  }, []);

  const clear = useCallback(() => {
    for (const internal of internals.current.values()) internal.controller?.abort();
    internals.current.clear();
    setJobs((current) => {
      for (const job of current) URL.revokeObjectURL(job.previewUrl);
      return [];
    });
  }, []);

  useEffect(
    () => () => {
      for (const internal of internals.current.values()) internal.controller?.abort();
    },
    []
  );

  return { jobs, add, retry, remove, clear };
}
