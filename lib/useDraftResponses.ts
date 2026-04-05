"use client";

import { useCallback, useEffect, useState } from "react";

export const DRAFT_RESPONSES_STORAGE_KEY = "guestpulse_draft_responses";

const TTL_MS = 24 * 60 * 60 * 1000;

export type DraftResponseEntry = {
  isOpen: boolean;
  status: "idle" | "loading" | "done" | "error";
  text: string;
  copied: boolean;
  markingResponded: boolean;
  markError: string | null;
  savedAt?: number;
};

/** Shape written to sessionStorage (24h expiry). */
export type PersistedDraft = {
  text: string;
  isOpen: boolean;
  savedAt: number;
  /** Omitted in legacy stored entries — treated as "done". */
  status?: "done" | "error";
};

export function defaultDraftResponse(): DraftResponseEntry {
  return {
    isOpen: false,
    status: "idle",
    text: "",
    copied: false,
    markingResponded: false,
    markError: null,
  };
}

function restoredFromPersisted(v: PersistedDraft): DraftResponseEntry {
  const st = v.status === "error" ? "error" : "done";
  return {
    isOpen: v.isOpen,
    status: v.text ? st : "idle",
    text: v.text,
    copied: false,
    markingResponded: false,
    markError: null,
    savedAt: v.savedAt,
  };
}

function persistToStorage(map: Record<string, DraftResponseEntry>) {
  const payload: Record<string, PersistedDraft> = {};
  for (const [id, d] of Object.entries(map)) {
    if (d.status === "loading") continue;
    if ((d.status === "done" || d.status === "error") && d.text.trim()) {
      payload[id] = {
        text: d.text,
        isOpen: d.isOpen,
        savedAt: d.savedAt ?? Date.now(),
        status: d.status === "error" ? "error" : "done",
      };
    }
  }
  try {
    if (Object.keys(payload).length === 0) {
      sessionStorage.removeItem(DRAFT_RESPONSES_STORAGE_KEY);
    } else {
      sessionStorage.setItem(DRAFT_RESPONSES_STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function useDraftResponses() {
  const [draftResponses, setDraftResponsesState] = useState<Record<string, DraftResponseEntry>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_RESPONSES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, PersistedDraft>;
      const now = Date.now();
      const fresh = Object.fromEntries(
        Object.entries(parsed).filter(([, v]) => now - v.savedAt < TTL_MS),
      );
      if (Object.keys(fresh).length === 0) {
        sessionStorage.removeItem(DRAFT_RESPONSES_STORAGE_KEY);
        return;
      }
      const restored: Record<string, DraftResponseEntry> = {};
      for (const [id, v] of Object.entries(fresh)) {
        restored[id] = restoredFromPersisted(v);
      }
      setDraftResponsesState(restored);
      if (Object.keys(fresh).length !== Object.keys(parsed).length) {
        sessionStorage.setItem(DRAFT_RESPONSES_STORAGE_KEY, JSON.stringify(fresh));
      }
    } catch {
      try {
        sessionStorage.removeItem(DRAFT_RESPONSES_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const patchDraftResponse = useCallback((reviewId: string, patch: Partial<DraftResponseEntry>) => {
    setDraftResponsesState((prev) => {
      const merged: DraftResponseEntry = {
        ...defaultDraftResponse(),
        ...prev[reviewId],
        ...patch,
      };
      if (
        patch.text !== undefined ||
        patch.status === "done" ||
        patch.status === "error"
      ) {
        if (
          (merged.status === "done" || merged.status === "error") &&
          merged.text.trim()
        ) {
          merged.savedAt = Date.now();
        }
      }
      const next = { ...prev, [reviewId]: merged };
      persistToStorage(next);
      return next;
    });
  }, []);

  const removeDraft = useCallback((reviewId: string) => {
    setDraftResponsesState((prev) => {
      const next = { ...prev };
      delete next[reviewId];
      persistToStorage(next);
      return next;
    });
  }, []);

  return { draftResponses, patchDraftResponse, removeDraft };
}
