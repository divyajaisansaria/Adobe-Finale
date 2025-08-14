#!/bin/bash

# 1️⃣ Create Python virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "Created Python virtual environment in ./venv"
fi

# 2️⃣ Activate venv
source venv/bin/activate

# 3️⃣ Upgrade pip
pip install --upgrade pip

# 4️⃣ Install Python dependencies
if [ -f "requirements.txt" ]; then
  pip install -r requirements.txt
  echo "Installed Python packages from requirements.txt"
else
  echo "No requirements.txt found, skipping Python packages"
fi

# 5️⃣ Install Node.js dependencies
if [ -f "package.json" ]; then
  npm install
  echo "Installed Node.js packages from package.json"
else
  echo "No package.json found, skipping npm install"
fi

echo "✅ Setup complete!"
echo "To activate Python venv later: source venv/bin/activate"
echo "To run Next.js dev server: npm run dev"
