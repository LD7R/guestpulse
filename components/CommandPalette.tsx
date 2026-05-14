"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Settings,
  RefreshCw,
  Plus,
  Sparkles,
  Building2,
} from "lucide-react";

type PlatformKey = "tripadvisor" | "google" | "booking" | "trip" | "expedia" | "yelp";

async function triggerSyncAll() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    toast.error("Sign in to sync reviews.");
    return;
  }

  const { data: hotel } = await supabase
    .from("hotels")
    .select(
      "id, tripadvisor_url, google_url, booking_url, trip_url, expedia_url, yelp_url, active_platforms",
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!hotel?.id) {
    toast.error("No hotel found. Add one in Settings.");
    return;
  }

  const ap = hotel.active_platforms as unknown;
  const apMap: Record<string, boolean> | null =
    ap && typeof ap === "object" && !Array.isArray(ap)
      ? (ap as Record<string, boolean>)
      : Array.isArray(ap)
        ? Object.fromEntries((ap as string[]).map((k) => [k, true]))
        : null;
  const isActive = (k: PlatformKey) => (apMap ? apMap[k] !== false : true);

  const platforms: Array<{ platform: PlatformKey; url: string }> = [];
  const push = (p: PlatformKey, u: string | null) => {
    if (u?.trim() && isActive(p)) platforms.push({ platform: p, url: u.trim() });
  };
  push("tripadvisor", hotel.tripadvisor_url as string | null);
  push("google", hotel.google_url as string | null);
  push("booking", hotel.booking_url as string | null);
  push("trip", hotel.trip_url as string | null);
  push("expedia", hotel.expedia_url as string | null);
  push("yelp", hotel.yelp_url as string | null);

  if (platforms.length === 0) {
    toast.error("No platform URLs configured. Add some in Settings → Platforms.");
    return;
  }

  window.dispatchEvent(
    new CustomEvent("gp:sync-start", {
      detail: { platforms: platforms.map((p) => p.platform) },
    }),
  );

  const results = await Promise.all(
    platforms.map(async ({ platform, url }) => {
      try {
        const res = await fetch("/api/scrape-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hotel_id: hotel.id, url, platform }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          count?: number;
          is_new_platform?: boolean;
        };
        const count = json.count ?? 0;
        const isNew = !!json.is_new_platform;
        window.dispatchEvent(
          new CustomEvent("gp:sync-progress", {
            detail: { platform, status: "done", count },
          }),
        );
        return { platform, count, isNew, error: null as string | null };
      } catch (err) {
        window.dispatchEvent(
          new CustomEvent("gp:sync-progress", {
            detail: { platform, status: "error", count: 0 },
          }),
        );
        return {
          platform,
          count: 0,
          isNew: false,
          error: err instanceof Error ? err.message : "Sync failed",
        };
      }
    }),
  );

  const totalNew = results.reduce((s, r) => s + r.count, 0);
  const errorCount = results.filter((r) => r.error).length;
  const newlyAdded = results.filter((r) => r.isNew && !r.error);

  window.dispatchEvent(new CustomEvent("gp:sync-end", { detail: { totalNew, errorCount } }));

  if (newlyAdded.length > 0) {
    toast.success(
      `🎉 Added ${newlyAdded.length} new platform${newlyAdded.length > 1 ? "s" : ""} — pulled all historical reviews!`,
    );
  }
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void | Promise<void>) => {
    setOpen(false);
    void command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/reviews"))}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Reviews
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/sentiment"))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Sentiment
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/benchmarking"))}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Benchmarking
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(triggerSyncAll)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync reviews now
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard/benchmarking?action=find"))}
          >
            <Plus className="mr-2 h-4 w-4" />
            Find competitors
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard/settings?tab=brand-voice"))}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Train brand voice
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard/settings?tab=hotel"))}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Edit hotel settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
