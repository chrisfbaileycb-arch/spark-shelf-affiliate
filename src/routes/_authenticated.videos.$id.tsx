import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getVideoBundle, deleteVideo } from "@/lib/videos.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Pause, Download, Copy, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/videos/$id")({
  component: VideoDetail,
});

function VideoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const gv = useServerFn(getVideoBundle);
  const dv = useServerFn(deleteVideo);
  const q = useQuery({ queryKey: ["video", id], queryFn: () => gv({ data: { id } }), refetchInterval: (data) => (data.state.data?.video?.status === "ready" || data.state.data?.video?.status === "failed" ? false : 3000) });

  const delMut = useMutation({
    mutationFn: () => dv({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); navigate({ to: "/videos" }); },
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!q.data) return <p>Not found</p>;
  const { video, audio_url, scenes } = q.data;

  const isReady = video.status === "ready";

  return (
    <div className="space-y-8">
      <Link to="/videos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Videos
      </Link>

      <header className="flex items-end justify-between gap-4">
        <div>
          <Badge variant={isReady ? "default" : video.status === "failed" ? "destructive" : "secondary"}>{video.status}</Badge>
          <h1 className="mt-3 font-display text-4xl leading-tight">{video.hook || "Generating…"}</h1>
        </div>
        <button onClick={() => { if (confirm("Delete?")) delMut.mutate(); }} className="text-sm text-destructive hover:underline inline-flex items-center gap-1">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </header>

      {video.status === "failed" && (
        <Card className="border-destructive bg-destructive/5 p-6">
          <p className="font-medium text-destructive">Generation failed</p>
          <p className="mt-1 text-sm text-muted-foreground">{video.error || "Unknown error"}</p>
        </Card>
      )}

      {!isReady && video.status !== "failed" && (
        <Card className="p-10 text-center">
          <div className="mx-auto h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse bg-primary" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Status: <strong>{video.status}</strong>… polling every 3s</p>
        </Card>
      )}

      {isReady && (
        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <ReelPlayer scenes={scenes} audioUrl={audio_url} caption={video.hook || ""} script={video.script || ""} />

          <div className="space-y-4">
            <Card className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hook</p>
              <p className="mt-2 font-display text-xl">{video.hook}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Script</p>
              <p className="mt-2 leading-relaxed">{video.script}</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caption</p>
                <button onClick={() => { navigator.clipboard.writeText(video.caption || ""); toast.success("Copied"); }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Copy className="h-3 w-3" /> Copy</button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{video.caption}</p>
              <div className="mt-4 flex flex-wrap gap-1">
                {(video.hashtags ?? []).map((h: string) => <Badge key={h} variant="secondary">#{h}</Badge>)}
              </div>
              <button onClick={() => { navigator.clipboard.writeText((video.hashtags ?? []).map((h: string) => "#" + h).join(" ")); toast.success("Hashtags copied"); }} className="mt-3 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Copy className="h-3 w-3" /> Copy all hashtags</button>
            </Card>

            <Card className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asset pack</p>
              <p className="mt-2 text-sm text-muted-foreground">Download the voiceover and scene images. Drop them into CapCut / Premiere with your captions for a 15s reel.</p>
              <div className="mt-4 space-y-2">
                {audio_url && <AssetRow label="Voiceover (mp3)" url={audio_url} />}
                {scenes.map((s, i) => <AssetRow key={i} label={`Scene ${i + 1} (image)`} url={s.url} />)}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function AssetRow({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm hover:bg-surface-muted">
      <span>{label}</span>
      <Download className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

// Vertical 9:16 player: cycles through scene images and plays the voiceover.
function ReelPlayer({ scenes, audioUrl, caption, script }: { scenes: { url: string; prompt: string }[]; audioUrl: string | null; caption: string; script: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(15);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onLoad = () => setDuration(a.duration || 15);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoad);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("loadedmetadata", onLoad); a.removeEventListener("ended", onEnd); };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  }

  const ratio = duration > 0 ? time / duration : 0;
  const sceneIdx = scenes.length ? Math.min(scenes.length - 1, Math.floor(ratio * scenes.length)) : 0;
  // Show a chunk of script as caption based on time
  const words = script.split(/\s+/);
  const wordsPerSec = words.length / Math.max(duration, 1);
  const visibleWords = Math.max(3, Math.floor(time * wordsPerSec));
  const start = Math.max(0, visibleWords - 6);
  const captionLine = words.slice(start, visibleWords).join(" ");

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-3xl bg-secondary shadow-pop">
        {scenes.length ? (
          scenes.map((s, i) => (
            <img
              key={i}
              src={s.url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
              style={{ opacity: i === sceneIdx ? 1 : 0 }}
            />
          ))
        ) : (
          <div className="grid h-full place-items-center text-secondary-foreground/50">No scenes</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
          <p className="font-display text-2xl leading-tight">{caption}</p>
          <p className="mt-3 min-h-[3rem] text-sm font-medium opacity-90">{captionLine || (playing ? "" : "Press play to preview")}</p>
        </div>
        <button onClick={toggle} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-foreground backdrop-blur hover:bg-white">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </button>
        <div className="absolute inset-x-3 bottom-2 h-1 overflow-hidden rounded-full bg-white/20">
          <div className="h-full bg-accent" style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}
      <Button onClick={toggle} className="w-full" size="lg">
        {playing ? <><Pause className="mr-2 h-4 w-4" /> Pause preview</> : <><Play className="mr-2 h-4 w-4" /> Play preview</>}
      </Button>
    </div>
  );
}
