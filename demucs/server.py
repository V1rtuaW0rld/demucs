from demucs.separate import main as separate
from litserve import LitAPI, LitServer
from typing import TypedDict
import requests
import os
import shutil
import glob
import subprocess

# MODEL = "htdemucs_ft"
# MODEL = "htdemucs"
DEFAULT_MODEL = os.getenv("MODEL", "htdemucs")
MP3_BITRATE = 320
MP3_QUALITY = 2
API_URL = os.getenv("API_URL", "http://localhost:3000")

def mp3_to_wav(mp3_path: str, wav_path: str):
    subprocess.run(["ffmpeg", "-y", "-i", mp3_path, wav_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def wav_to_mp3(wav_path: str, mp3_path: str):
    subprocess.run(["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-b:a", "320k", mp3_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


class DemucsInput(TypedDict):
    id: str
    folder_path: str
    file_path: str
    two_stems: bool
    stems: int
    model: str
    hash: str
    enhancer_settings: dict | None


class DemucsOutput(TypedDict):
    success: bool
    id: str
    folder_path: str
    hash: str
    used_model: str


class DemucsAPI(LitAPI):
    device: str

    def setup(self, device: str):
        self.device = device
        try:
            from audio_separator.separator import Separator
            self.Separator = Separator
            print("audio-separator engine initialized.")
        except ImportError:
            print("audio-separator not installed, Roformer/MDX models will not work.")
            self.Separator = None

    def decode_request(self, request: dict) -> DemucsInput:
        id: str = request["id"]
        filename: str = request["filename"]
        two_stems: bool = request["two_stems"]
        stems: int = request.get("stems", 4)
        model: str = request.get("model", DEFAULT_MODEL)
        hash: str = request["hash"]
        enhancer_settings: dict | None = request.get("enhancer_settings")

        folder_path: str = f"tmp/{id}"
        file_path: str = f"{folder_path}/{filename}"
        os.makedirs(folder_path, exist_ok=True)

        response = requests.get(
            f"{API_URL}/file/{id}/{filename}",
            headers={"Authorization": f"Bearer {hash}"},
        )
        with open(file_path, "wb") as file:
            file.write(response.content)

        return {
            "id": id,
            "folder_path": folder_path,
            "file_path": file_path,
            "two_stems": two_stems,
            "stems": stems,
            "model": model,
            "hash": hash,
            "enhancer_settings": enhancer_settings,
        }

    def predict(self, input: DemucsInput) -> DemucsOutput:
        id: str = input["id"]
        folder_path: str = input["folder_path"]
        file_path: str = input["file_path"]
        two_stems: bool = input["two_stems"]
        stems: int = input["stems"]
        model: str = input["model"]
        hash: str = input["hash"]

        used_model = model
        if model == "2stems":
            used_model = DEFAULT_MODEL
        
        success: bool = False
        enhancer_settings = input.get("enhancer_settings")

        try:
            if model == "vocal-enhancer" and enhancer_settings:
                # Enhance logic
                output_dir = f"{folder_path}/{model}"
                os.makedirs(output_dir, exist_ok=True)
                final_out_path = f"{output_dir}/enhanced.mp3"
                current_audio_path = file_path

                # 1. De-reverb with audio-separator
                if enhancer_settings.get("dereverb") and enhancer_settings.get("dereverb_model"):
                    dereverb_model = enhancer_settings["dereverb_model"]
                    if self.Separator is None:
                        raise Exception("audio-separator is not installed.")
                    print(f"Running De-reverb with model: {dereverb_model}")
                    
                    separator = self.Separator(
                        output_dir=output_dir,
                        output_format="MP3",
                        sample_rate=44100,
                    )
                    separator.onnx_execution_provider = ["CPUExecutionProvider"]
                    separator.load_model(model_filename=dereverb_model)
                    output_files = separator.separate(current_audio_path)
                    
                    # Usually Mel-Band Roformer outputs "(Vocals).mp3" or similar for the dry voice. 
                    # We normalize it first to easily grab it.
                    self._normalize_output_names(output_dir, dereverb_model)
                    
                    # The dry vocal track is now named "vocals.mp3"
                    if os.path.exists(f"{output_dir}/vocals.mp3"):
                        current_audio_path = f"{output_dir}/vocals.mp3"
                    else:
                        raise Exception("De-reverb output 'vocals.mp3' not found.")

                # 2. EQ and Dynamics with Pedalboard
                if enhancer_settings.get("eq") or enhancer_settings.get("dynamics"):
                    print("Running EQ/Dynamics with pedalboard...")
                    from pedalboard import Pedalboard, PeakFilter, HighShelfFilter, Compressor, Limiter, HighpassFilter
                    from pedalboard.io import AudioFile

                    temp_wav = f"{folder_path}/temp.wav"
                    out_wav = f"{folder_path}/out.wav"
                    mp3_to_wav(current_audio_path, temp_wav)

                    board_plugins = []
                    # Basic 80Hz highpass to clean up rumble
                    board_plugins.append(HighpassFilter(cutoff_frequency_hz=80))

                    if enhancer_settings.get("eq"):
                        board_plugins.append(PeakFilter(cutoff_frequency_hz=250, gain_db=enhancer_settings.get("eq_warmth", 0), q=1.0))
                        board_plugins.append(PeakFilter(cutoff_frequency_hz=4000, gain_db=enhancer_settings.get("eq_harshness", 0), q=1.0))
                        board_plugins.append(HighShelfFilter(cutoff_frequency_hz=10000, gain_db=enhancer_settings.get("eq_air", 0)))

                    if enhancer_settings.get("dynamics"):
                        board_plugins.append(Compressor(
                            threshold_db=enhancer_settings.get("compressor_threshold", -18),
                            ratio=enhancer_settings.get("compressor_ratio", 2.0),
                            attack_ms=5.0, release_ms=100.0
                        ))
                        board_plugins.append(Limiter(threshold_db=-1.0))

                    board = Pedalboard(board_plugins)
                    with AudioFile(temp_wav) as f:
                        audio = f.read(f.frames)
                        sr = f.samplerate
                    effected = board(audio, sr)
                    with AudioFile(out_wav, 'w', sr, effected.shape[0]) as f:
                        f.write(effected)
                    
                    wav_to_mp3(out_wav, final_out_path)
                    current_audio_path = final_out_path
                
                # If only dereverb was run, we need to rename vocals.mp3 to enhanced.mp3
                if current_audio_path != final_out_path:
                    shutil.copy(current_audio_path, final_out_path)
                
                # Cleanup everything else in output_dir except enhanced.mp3
                for f in os.listdir(output_dir):
                    if f != "enhanced.mp3":
                        os.remove(os.path.join(output_dir, f))

                success = True

            # Advanced models (Roformer, MDX, MDXC)
            elif model.endswith(".onnx") or model.endswith(".ckpt") or "Roformer" in model:
                if self.Separator is None:
                    raise Exception("audio-separator is not installed.")
                
                output_dir = f"{folder_path}/{model}"
                print(f"Running Advanced Separation with model: {model}")
                
                separator = self.Separator(
                    output_dir=output_dir,
                    output_format="MP3",
                    sample_rate=44100,
                )
                separator.onnx_execution_provider = ["CPUExecutionProvider"]
                
                # Use the exact filename passed from the frontend
                separator.load_model(model_filename=model)
                output_files = separator.separate(file_path)
                
                # Check if files were actually created
                if not os.listdir(output_dir):
                    raise Exception(f"Separation finished but output directory {output_dir} is empty.")
                
                # Normalize output names
                self._normalize_output_names(output_dir, model)
                success = True
            else:
                # Demucs logic
                print(f"Running Demucs separation with model: {used_model}")
                args: list[str] = [
                    file_path,
                    "--name", used_model,
                    "--device", self.device,
                    "--mp3",
                    "--mp3-bitrate", str(MP3_BITRATE),
                    "--mp3-preset", str(MP3_QUALITY),
                    "--out", folder_path,
                    "--filename", "{stem}.{ext}",
                ]

                if two_stems or stems == 2:
                    args.append("--two-stems")
                    args.append("vocals")

                separate(args)
                
                # Verify Demucs output
                if not os.path.exists(f"{folder_path}/{used_model}"):
                    raise Exception(f"Demucs finished but output folder {used_model} not found.")
                
                success = True
        except Exception as e:
            print(f"CRITICAL ERROR during prediction: {e}")
            success = False

        return {
            "success": success,
            "id": id,
            "folder_path": folder_path,
            "hash": hash,
            "used_model": model if (model.endswith(".onnx") or model.endswith(".ckpt")) else used_model,
        }

    def _normalize_output_names(self, output_dir: str, model: str):
        """Rename various engine outputs to standard names expected by the UI."""
        files = os.listdir(output_dir)
        print(f"Normalizing files in {output_dir}: {files}")
        
        # Sort files to process "No ..." files first to avoid collision with main instrument names
        files.sort(key=lambda x: ("(no" in x.lower() or "_no_" in x.lower()), reverse=True)
        
        for f in files:
            lower_f = f.lower()
            target_name = None
            
            # 1. Check for "No" versions first (the accompaniment)
            if "(no " in lower_f or "_no_" in lower_f or "(no_" in lower_f:
                target_name = "no_vocals.mp3"
            elif "(reverb)" in lower_f or "_reverb_" in lower_f or "reverb" in lower_f and "noreverb" not in lower_f:
                target_name = "no_vocals.mp3"
            
            # 2. Check for the main instrument / dry vocal
            elif "(vocals)" in lower_f or "_vocals" in lower_f:
                target_name = "vocals.mp3"
            elif "(noreverb)" in lower_f or "_noreverb_" in lower_f or "noreverb" in lower_f:
                target_name = "vocals.mp3"
            elif "(instrumental)" in lower_f or "_instrumental" in lower_f or "_inst" in lower_f:
                target_name = "no_vocals.mp3"
            elif "(drums)" in lower_f or "_drums" in lower_f:
                target_name = "vocals.mp3"
            elif "(bass)" in lower_f or "_bass" in lower_f:
                target_name = "vocals.mp3"
            
            # Fallback for specific models if not caught by keywords
            if not target_name:
                if "kuielab_a_drums" in lower_f:
                    target_name = "vocals.mp3"
                elif "kuielab_a_bass" in lower_f:
                    target_name = "vocals.mp3"
            
            if target_name:
                src = os.path.join(output_dir, f)
                dst = os.path.join(output_dir, target_name)
                
                # If target already exists, don't overwrite if it's the same category
                if os.path.exists(dst):
                    continue
                    
                print(f"Renaming {f} to {target_name}")
                os.rename(src, dst)

    def encode_response(self, output: DemucsOutput) -> dict:
        success: bool = output["success"]
        id: str = output["id"]
        folder_path: str = output["folder_path"]
        hash: str = output["hash"]
        used_model: str = output["used_model"]

        # If prediction already failed, don't try to process files
        if not success:
            print(f"Skipping response encoding for {id} because prediction failed.")
        else:
            try:
                output_folder: str = f"{folder_path}/{used_model}"
                files = os.listdir(output_folder)
                print(f"Encoding response for {id}. Files found: {files}")
                for filename in files:
                    file_path = f"{output_folder}/{filename}"
                    with open(file_path, "rb") as file:
                        requests.post(
                            f"{API_URL}/file/{id}/{filename}",
                            files={"file": file},
                            headers={"Authorization": f"Bearer {hash}"},
                        )
                shutil.rmtree(folder_path)
                success = True
            except Exception as e:
                print(f"Error during response encoding: {e}")
                success = False

        requests.post(
            f"{API_URL}/api/result/{id}",
            json={"success": success},
            headers={"Authorization": f"Bearer {hash}"},
        )

        return {"id": id, "success": success}


if __name__ == "__main__":
    api = DemucsAPI()
    server = LitServer(api, devices="auto", timeout=3600)
    server.run(port=8000)
