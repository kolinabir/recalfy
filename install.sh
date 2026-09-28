#!/usr/bin/env sh
#
# Recalfy installer for a fresh machine.
#
#   curl -fsSL https://raw.githubusercontent.com/kolinabir/recalfy/main/install.sh | sh
#
# Installs what is missing (Docker, Node.js), then hands over to the setup
# wizard, which asks for your bot token and AI key. Safe to run again.
set -eu

say() { printf '\033[1m▸ %s\033[0m\n' "$1"; }
fail() { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  have sudo || fail "Run this as root, or install sudo first."
  SUDO="sudo"
fi

OS="$(uname -s)"

# --- Docker -----------------------------------------------------------------
if ! have docker; then
  if [ "$OS" = "Linux" ]; then
    say "Installing Docker"
    curl -fsSL https://get.docker.com | $SUDO sh
    if [ -n "$SUDO" ]; then
      $SUDO usermod -aG docker "$(id -un)" || true
    fi
  else
    fail "Install Docker Desktop (https://docker.com/products/docker-desktop) or OrbStack (https://orbstack.dev), open it, then run this again."
  fi
fi

if [ "$OS" = "Linux" ] && have systemctl; then
  $SUDO systemctl enable --now docker >/dev/null 2>&1 || true
fi

# A user just added to the docker group only gets it on their next login.
# Until then, the wizard runs its docker commands through `sg docker`.
DOCKER_WRAP=""
if ! docker info >/dev/null 2>&1; then
  if [ -n "$SUDO" ] && have sg && $SUDO docker info >/dev/null 2>&1; then
    DOCKER_WRAP="sg docker -c"
  else
    fail "Docker is installed but not running. Start it, then run this again."
  fi
fi

# --- Node.js ----------------------------------------------------------------
node_ok() {
  have node && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]
}

if ! node_ok; then
  if [ "$OS" = "Linux" ]; then
    say "Installing Node.js 22"
    if have apt-get; then
      curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E sh -
      $SUDO apt-get install -y nodejs
    elif have dnf || have yum; then
      curl -fsSL https://rpm.nodesource.com/setup_22.x | $SUDO sh -
      $SUDO "$(have dnf && echo dnf || echo yum)" install -y nodejs
    else
      fail "Install Node.js 20 or newer (https://nodejs.org), then run this again."
    fi
  else
    fail "Install Node.js 20 or newer (https://nodejs.org, or \`brew install node\`), then run this again."
  fi
fi

# --- Hand over ----------------------------------------------------------------
say "Starting setup"
# Piped through sh, stdin is the script itself — the wizard needs the keyboard.
if [ -n "$DOCKER_WRAP" ]; then
  exec $DOCKER_WRAP "npx -y recalfy@latest $*" </dev/tty
fi
exec npx -y recalfy@latest "$@" </dev/tty
