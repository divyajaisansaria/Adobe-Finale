FROM python:3.11.9-slim AS runner

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# System deps: ffmpeg for pydub, Node 20 for Next.js
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg git xz-utils procps tini ffmpeg libasound2 \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/* \
 && ffmpeg -version

WORKDIR /app

# Install Node deps
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --include=dev; else npm install --include=dev; fi

# Install Python deps
COPY requirements.txt ./requirements.txt
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Build Next.js
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production

# Download your local model (unchanged)
RUN python3 python/model_2/models/download_model.py

EXPOSE 8080

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["sh","-c","node node_modules/next/dist/bin/next start -p 8080 -H 0.0.0.0"]
