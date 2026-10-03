import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import {
  AudioLinesIcon,
  DownloadIcon,
  DrumIcon,
  GuitarIcon,
  MicVocalIcon,
  Trash2Icon,
  WandIcon,
} from "lucide-react";

import type { ResultType } from "~/db/schema";
import DeleteItem from "~/components/delete-item";
import { Button } from "~/components/ui/button";

interface Track {
  name: string;
  icon: LucideIcon;
}

const DEFAULT_TRACKS = [
  { name: "vocals.mp3", icon: MicVocalIcon },
  { name: "drums.mp3", icon: DrumIcon },
  { name: "bass.mp3", icon: GuitarIcon },
  { name: "other.mp3", icon: AudioLinesIcon },
] satisfies Track[];

const TWO_STEMS_TRACKS = [
  { name: "vocals.mp3", icon: MicVocalIcon },
  { name: "no_vocals.mp3", icon: AudioLinesIcon },
] satisfies Track[];

const SIX_STEMS_TRACKS = [
  ...DEFAULT_TRACKS,
  { name: "guitar.mp3", icon: GuitarIcon },
  { name: "piano.mp3", icon: AudioLinesIcon },
] satisfies Track[];

interface PlayerProps {
  data: ResultType;
}

export default function Player({ data }: PlayerProps) {
  const sounds = useMemo(() => {
    if (data.model === "vocal-enhancer") {
      return [
        {
          url: `/file/${data.id}/enhanced.mp3`,
          icon: WandIcon,
          name: "Enhanced Voice",
          filename: "enhanced.mp3",
        }
      ];
    }

    let tracks = DEFAULT_TRACKS;
    if (data.stems === 2 || data.twoStems) {
      const modelLower = (data.model || "").toLowerCase();
      if (modelLower.includes("drums")) {
        tracks = [
          { name: "vocals.mp3", icon: DrumIcon },
          { name: "no_vocals.mp3", icon: AudioLinesIcon },
        ];
      } else if (modelLower.includes("bass")) {
        tracks = [
          { name: "vocals.mp3", icon: GuitarIcon },
          { name: "no_vocals.mp3", icon: AudioLinesIcon },
        ];
      } else {
        tracks = TWO_STEMS_TRACKS;
      }
    } else if (data.stems === 6) {
      tracks = SIX_STEMS_TRACKS;
    }
    
    return tracks.map((track) => {
      let label = track.name.replace(".mp3", "").replace("_", " ");
      if (data.stems === 2 || data.twoStems) {
        const modelLower = (data.model || "").toLowerCase();
        if (track.name === "vocals.mp3") {
           if (modelLower.includes("drums")) label = "Drums";
           else if (modelLower.includes("bass")) label = "Bass";
           else label = "Vocals";
        } else if (track.name === "no_vocals.mp3") {
           if (modelLower.includes("drums")) label = "Other";
           else if (modelLower.includes("bass")) label = "Other";
           else label = "Instrumental";
        }
      }

      return {
        url: `/file/${data.id}/${track.name}`,
        icon: track.icon,
        name: label,
        filename: track.name,
      };
    });
  }, [data]);

  return (
    <main className="flex w-full flex-col items-center space-y-6 px-6 py-12">
      <h1 className="text-xl font-semibold text-center max-w-lg">{data.name}</h1>
      <div className="flex w-full flex-col items-center space-y-4">
        {sounds.map(({ url, icon: Icon, name, filename }, i) => (
          <div className="flex w-full max-w-lg items-center space-x-3" key={i}>
            <div className="flex flex-col items-center min-w-[50px]">
              <Icon />
              <span className="text-[10px] uppercase opacity-50 text-center">{name}</span>
            </div>
            <audio src={url} controls className="w-full" key={url} />
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" asChild title={`Download ${name}`}>
                <a href={url} download={filename}>
                  <DownloadIcon />
                </a>
              </Button>
              {data.model !== "vocal-enhancer" && filename === "vocals.mp3" && (
                <form method="POST" action="/enhance" encType="multipart/form-data" className="inline-block">
                  <input type="hidden" name="sourceResultId" value={data.id} />
                  <input type="hidden" name="sourceFilename" value={filename} />
                  <input type="hidden" name="dereverb" value="on" />
                  <input type="hidden" name="dereverb_model" value="dereverb_mel_band_roformer_anvuew_sdr_19.1729.ckpt" />
                  <input type="hidden" name="eq" value="on" />
                  <input type="hidden" name="eq_warmth" value="2.0" />
                  <input type="hidden" name="eq_harshness" value="-2.0" />
                  <input type="hidden" name="eq_air" value="1.0" />
                  <input type="hidden" name="dynamics" value="on" />
                  <input type="hidden" name="compressor_threshold" value="-18.0" />
                  <input type="hidden" name="compressor_ratio" value="2.0" />
                  <Button variant="outline" size="sm" type="submit" className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20" title="Clean & Enhance Vocal">
                    <WandIcon size={14} className="mr-1" /> Enhance
                  </Button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t w-full max-w-xs mx-auto">
        <Button asChild variant="secondary">
          <a href={`/file/${data.id}/original.mp3`} download>
            <DownloadIcon />
            Original File
          </a>
        </Button>
        <DeleteItem id={data.id} name={data.name} variant="destructive">
          <Trash2Icon />
          Delete
        </DeleteItem>
      </div>
    </main>
  );
}
