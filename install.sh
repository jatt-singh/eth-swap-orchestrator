#!/bin/bash
set -euo pipefail    # Exit on error, unset var, or failed pipe

REPO_URL="https://github.com/veltrix-capital/test-devops-orchestrators.git"
REPO_DIR="test-devops-orchestrators"

# Prepare logs
mkdir -p logs
LOG_FILE="logs/install_$(date +'%Y%m%d_%H%M%S').log"
exec > >(tee -a "$LOG_FILE") 2>&1

OS="$(uname -s)"

# Check or install Git
detect_and_install_git() {
    if command -v git >/dev/null 2>&1; then
        GIT_VERSION=$(git --version | awk '{print $3}')
        echo "[INFO] Git is installed, version $GIT_VERSION"
        return
    fi

    echo "[WARN] Git not found. Attempting installation..."

    case "$OS" in
        Linux*)
            if [ -f /etc/debian_version ]; then
                echo "[INFO] Installing Git via apt..."
                sudo apt-get update && sudo apt-get install -y git
            elif [ -f /etc/redhat-release ]; then
                echo "[INFO] Installing Git via yum..."
                sudo yum install -y git
            else
                echo "[ERROR] Unsupported Linux distro. Please install Git manually."
                exit 1
            fi
            ;;
        Darwin*)
            if command -v brew &>/dev/null; then
                echo "[INFO] Installing Git via Homebrew..."
                brew install git
            else
                echo "[ERROR] Homebrew not found. Please install Git manually."
                exit 1
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            echo "[ERROR] Windows detected. Please install Git manually: https://git-scm.com/downloads"
            exit 1
            ;;
        *)
            echo "[ERROR] Unknown OS: $OS"
            exit 1
            ;;
    esac
}

detect_and_install_git

# Clone or update repo
if [ -d "$REPO_DIR/.git" ]; then
    echo "[INFO] Repository exists. Pulling latest changes..."
    cd "$REPO_DIR" || { echo "[ERROR] Failed to enter $REPO_DIR"; exit 1; }
    git pull
else
    echo "[INFO] Cloning repository..."
    git clone "$REPO_URL" "$REPO_DIR"
fi

# Make scripts executable
echo "[INFO] Granting execution permissions..."
chmod +x setup.sh start.sh

# Run setup.sh
echo "[INFO] Running setup.sh..."
./setup.sh

echo "[INFO] Install completed successfully."
exit 0
