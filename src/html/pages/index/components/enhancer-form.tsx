import { useMemo, useRef, useState } from "react";
import { MicIcon, UploadIcon, WandIcon } from "lucide-react";
import { useDropzone } from "react-dropzone";

import ChevronRight from "~/components/icons/chevron-right";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

export default function EnhancerForm() {
  const inputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [dereverb, setDereverb] = useState(true);
  const [dereverbModel, setDereverbModel] = useState("dereverb_mel_band_roformer_anvuew_sdr_19.1729.ckpt");
  const [eq, setEq] = useState(true);
  const [warmth, setWarmth] = useState(2.0);
  const [harshness, setHarshness] = useState(-2.0);
  const [air, setAir] = useState(1.0);
  const [dynamics, setDynamics] = useState(true);
  const [compressorThresh, setCompressorThresh] = useState(-18.0);
  const [compressorRatio, setCompressorRatio] = useState(2.0);

  const { isDragAccept, getRootProps, getInputProps, open, acceptedFiles } =
    useDropzone({
      noClick: true,
      noKeyboard: true,
      accept: {
        "audio/*": [],
      },
      maxFiles: 1,
      multiple: false,
      onDrop: (files) => {
        if (inputRef.current) {
          const dataTransfer = new DataTransfer();
          files.forEach((v) => {
            dataTransfer.items.add(v);
          });
          inputRef.current.files = dataTransfer.files;
        }
      },
    });

  const file = useMemo(() => acceptedFiles[0], [acceptedFiles]);

  return (
    <form
      method="POST"
      action="/enhance"
      encType="multipart/form-data"
      className="flex w-full flex-col items-center space-y-6"
    >
      <div
        {...getRootProps({
          className: cn(
            "flex w-full max-w-lg flex-col items-center space-y-6 rounded-lg bg-card p-8 text-card-foreground shadow-sm outline-dashed outline-2 outline-border",
            isDragAccept && "bg-accent transition-colors dark:bg-accent/50",
          ),
        })}
      >
        {file ? <MicIcon size={48} className="text-primary" /> : <UploadIcon size={48} />}
        <div className="flex flex-col items-center space-y-2 text-center">
          <p>{file ? file.name : "Drag and drop your vocal track here"}</p>
          <p className="text-sm text-muted-foreground">
            {file
              ? "or click to browse another file"
              : "or click to browse a file"}
          </p>
        </div>
        <Button onClick={open} variant="outline" type="button">
          Browse files
        </Button>
        <input
          type="file"
          name="file"
          required
          accept="audio/*"
          className="sr-only"
          ref={inputRef}
        />
        <input {...getInputProps()} />
      </div>

      <div className="flex w-full max-w-lg flex-col space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <WandIcon size={18} /> Enhancement Settings
        </h3>
        
        {/* De-reverb */}
        <div className="space-y-3 rounded-lg border bg-background/50 p-4">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="dereverb" name="dereverb" checked={dereverb} onChange={(e) => setDereverb(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <Label htmlFor="dereverb" className="font-semibold cursor-pointer">De-Reverb (Remove Echo)</Label>
          </div>
          {dereverb && (
            <div className="pl-6">
              <Label htmlFor="dereverb_model" className="text-xs text-muted-foreground mb-1 block">Model</Label>
              <select
                name="dereverb_model"
                id="dereverb_model"
                value={dereverbModel}
                onChange={(e) => setDereverbModel(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="dereverb_mel_band_roformer_anvuew_sdr_19.1729.ckpt">Mel-Band Roformer (Standard)</option>
                <option value="dereverb_mel_band_roformer_less_aggressive_anvuew_sdr_18.8050.ckpt">Mel-Band Roformer (Less Aggressive)</option>
              </select>
            </div>
          )}
        </div>

        {/* EQ / Warmth */}
        <div className="space-y-3 rounded-lg border bg-background/50 p-4">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="eq" name="eq" checked={eq} onChange={(e) => setEq(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <Label htmlFor="eq" className="font-semibold cursor-pointer">Voice EQ (Warmth & Clarity)</Label>
          </div>
          {eq && (
            <div className="pl-6 space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <Label htmlFor="eq_warmth" className="text-xs text-muted-foreground">Warmth (250 Hz)</Label>
                  <span className="text-xs text-muted-foreground">{warmth > 0 ? "+" : ""}{warmth} dB</span>
                </div>
                <input type="range" id="eq_warmth" name="eq_warmth" min="-12" max="12" step="0.5" value={warmth} onChange={(e) => setWarmth(parseFloat(e.target.value))} className="w-full" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <Label htmlFor="eq_harshness" className="text-xs text-muted-foreground">Harshness Cut (4 kHz)</Label>
                  <span className="text-xs text-muted-foreground">{harshness > 0 ? "+" : ""}{harshness} dB</span>
                </div>
                <input type="range" id="eq_harshness" name="eq_harshness" min="-12" max="12" step="0.5" value={harshness} onChange={(e) => setHarshness(parseFloat(e.target.value))} className="w-full" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <Label htmlFor="eq_air" className="text-xs text-muted-foreground">Air / Presence (10 kHz)</Label>
                  <span className="text-xs text-muted-foreground">{air > 0 ? "+" : ""}{air} dB</span>
                </div>
                <input type="range" id="eq_air" name="eq_air" min="-12" max="12" step="0.5" value={air} onChange={(e) => setAir(parseFloat(e.target.value))} className="w-full" />
              </div>
            </div>
          )}
        </div>

        {/* Dynamics */}
        <div className="space-y-3 rounded-lg border bg-background/50 p-4">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="dynamics" name="dynamics" checked={dynamics} onChange={(e) => setDynamics(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <Label htmlFor="dynamics" className="font-semibold cursor-pointer">Dynamics (Compressor / Limiter)</Label>
          </div>
          {dynamics && (
            <div className="pl-6 space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <Label htmlFor="compressor_threshold" className="text-xs text-muted-foreground">Compressor Threshold</Label>
                  <span className="text-xs text-muted-foreground">{compressorThresh} dB</span>
                </div>
                <input type="range" id="compressor_threshold" name="compressor_threshold" min="-40" max="0" step="1" value={compressorThresh} onChange={(e) => setCompressorThresh(parseFloat(e.target.value))} className="w-full" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <Label htmlFor="compressor_ratio" className="text-xs text-muted-foreground">Compressor Ratio</Label>
                  <span className="text-xs text-muted-foreground">{compressorRatio}:1</span>
                </div>
                <input type="range" id="compressor_ratio" name="compressor_ratio" min="1" max="10" step="0.5" value={compressorRatio} onChange={(e) => setCompressorRatio(parseFloat(e.target.value))} className="w-full" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Peak Limiter is automatically set to -1.0 dB.</p>
            </div>
          )}
        </div>
      </div>

      <Button className="group" type="submit" size="lg">
        Enhance Vocal <ChevronRight />
      </Button>
    </form>
  );
}
