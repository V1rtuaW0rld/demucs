import { useMemo, useRef } from "react";
import { FileMusicIcon, UploadIcon } from "lucide-react";
import { useDropzone } from "react-dropzone";

import ChevronRight from "~/components/icons/chevron-right";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

export default function Form() {
  const inputRef = useRef<HTMLInputElement>(null);

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
      action="/"
      encType="multipart/form-data"
      className="flex w-full flex-col items-center space-y-6"
    >
      <div
        {...getRootProps({
          className: cn(
            "flex w-full max-w-sm flex-col items-center space-y-6 rounded-lg bg-card p-8 text-card-foreground shadow-sm outline-dashed outline-2 outline-border",
            isDragAccept && "bg-accent transition-colors dark:bg-accent/50",
          ),
        })}
      >
        {file ? <FileMusicIcon size={48} /> : <UploadIcon size={48} />}
        <div className="flex flex-col items-center space-y-2 text-center">
          <p>{file ? file.name : "Drag and drop your file here"}</p>
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
      <div className="flex w-full max-w-sm flex-col space-y-2">
        <Label htmlFor="model">Separation model</Label>
        <select
          name="model"
          id="model"
          defaultValue="htdemucs"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <optgroup label="Demucs (Multi-tracks)">
            <option value="htdemucs">HTDemucs (4 tracks)</option>
            <option value="htdemucs_ft">HTDemucs FT (4 tracks)</option>
            <option value="htdemucs_6s">HTDemucs 6s (6 tracks)</option>
            <option value="2stems">HTDemucs (2 tracks: Vocals/Instru)</option>
          </optgroup>
          <optgroup label="MDX (Premium Vocals/Instru)">
            <option value="MDX23C-8KFFT-InstVoc_HQ.ckpt">MDX23C (Ultra High Quality)</option>
            <option value="Kim_Vocal_2.onnx">Kim Vocal 2 (High Quality)</option>
          </optgroup>
          <optgroup label="Roformer (State of the Art)">
            <option value="model_bs_roformer_ep_317_sdr_12.9755.ckpt">BS-Roformer (Viper 1297)</option>
            <option value="model_mel_band_roformer_ep_3005_sdr_11.4360.ckpt">Mel-Roformer (Viper 1143)</option>
          </optgroup>
          <optgroup label="Specialized Models">
            <option value="kuielab_a_drums.onnx">MDX Drums (Cleanest)</option>
            <option value="kuielab_a_bass.onnx">MDX Bass (Solid)</option>
          </optgroup>
        </select>
      </div>
      <Button className="group" type="submit">
        Separate <ChevronRight />
      </Button>
    </form>
  );
}
