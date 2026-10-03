FROM nvidia/cuda:12.8.0-base-ubuntu22.04 AS base
RUN apt update && apt install python3.10-full ffmpeg libatomic1 -y
WORKDIR /app

FROM base AS build
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -U demucs litserve requests "audio-separator[gpu]" pedalboard

FROM base as final
COPY --from=build /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY server.py /app/server.py

CMD ["python3", "server.py"]
