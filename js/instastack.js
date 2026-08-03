/* INSTASTACK — full setup generator (ported from standalone app) */
let currentTab = 'script';
  let activePreset = null;

  const presets = {
    fullstack: {
      os: 'linux_mint',
      tools: ['git', 'nodejs', 'docker', 'postgresql', 'redis', 'vscode', 'cursor', 'postman']
    },
    flutter: {
      os: 'linux_mint',
      tools: ['git', 'flutter', 'android_studio', 'vscode', 'sqlite']
    },
    datascience: {
      os: 'linux_mint',
      tools: ['git', 'python', 'docker', 'sqlite', 'vscode', 'cursor']
    },
    minimal: {
      os: 'linux_mint',
      tools: ['git', 'zsh', 'starship']
    }
  };

  const packages = {
    git: {
      linux_mint: "sudo apt update && sudo apt install -y git",
      macos: "brew install git",
      windows: "winget install --id Git.Git -e --source winget",
      docker: "RUN apt-get update && apt-get install -y git",
      desc: "Git Version Control"
    },
    nodejs: {
      linux_mint: "sudo apt update && sudo apt install -y nodejs npm",
      macos: "brew install node",
      windows: "winget install --id OpenJS.NodeJS -e --source winget",
      docker: "RUN apt-get update && apt-get install -y nodejs npm",
      desc: "Node.js JavaScript Runtime"
    },
    python: {
      linux_mint: "sudo apt update && sudo apt install -y python3 python3-pip python3-venv",
      macos: "brew install python",
      windows: "winget install --id Python.Python.3.11 -e --source winget",
      docker: "RUN apt-get update && apt-get install -y python3 python3-pip python3-venv",
      desc: "Python 3 Development Environment"
    },
    go: {
      linux_mint: "sudo apt update && sudo apt install -y golang-go",
      macos: "brew install go",
      windows: "winget install --id GoLang.Go -e --source winget",
      docker: "RUN apt-get update && apt-get install -y golang-go",
      desc: "Go (Golang)"
    },
    rust: {
      linux_mint: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && source \"$HOME/.cargo/env\"",
      macos: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && source \"$HOME/.cargo/env\"",
      windows: "winget install --id Rustlang.Rustup -e --source winget",
      docker: "RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
      desc: "Rust Toolchain (rustup)"
    },
    java: {
      linux_mint: "sudo apt update && sudo apt install -y openjdk-17-jdk",
      macos: "brew install openjdk@17",
      windows: "winget install --id Microsoft.OpenJDK.17 -e --source winget",
      docker: "RUN apt-get update && apt-get install -y openjdk-17-jdk",
      desc: "Java & OpenJDK"
    },
    php: {
      linux_mint: "sudo apt update && sudo apt install -y php php-cli php-mbstring php-xml php-curl unzip && curl -sS https://getcomposer.org/installer | php && sudo mv composer.phar /usr/local/bin/composer",
      macos: "brew install php composer",
      windows: "winget install --id PHP.PHP -e --source winget && winget install --id Composer.Composer -e --source winget",
      docker: "RUN apt-get update && apt-get install -y php php-cli php-mbstring php-xml php-curl unzip && curl -sS https://getcomposer.org/installer | php && mv composer.phar /usr/local/bin/composer",
      desc: "PHP & Composer"
    },
    ruby: {
      linux_mint: "sudo apt update && sudo apt install -y git curl libssl-dev libreadline-dev zlib1g-dev autoconf bison build-essential libyaml-dev libncurses5-dev libffi-dev libgdbm-dev && curl -fsSL https://github.com/rbenv/rbenv-installer/raw/main/bin/rbenv-installer | bash && echo 'export PATH=\"$HOME/.rbenv/bin:$PATH\"' >> ~/.bashrc && echo 'eval \"$(rbenv init - bash)\"' >> ~/.bashrc && export PATH=\"$HOME/.rbenv/bin:$PATH\" && eval \"$(rbenv init - bash)\" && rbenv install -s 3.3.0 && rbenv global 3.3.0",
      macos: "brew install rbenv ruby-build && echo 'eval \"$(rbenv init - zsh)\"' >> ~/.zshrc && eval \"$(rbenv init -)\" && rbenv install -s 3.3.0 && rbenv global 3.3.0",
      windows: "winget install --id RubyInstallerTeam.RubyWithDevKit -e --source winget",
      docker: "RUN apt-get update && apt-get install -y ruby ruby-dev bundler",
      desc: "Ruby & rbenv"
    },
    flutter: {
      linux_mint: "sudo snap install flutter --classic",
      macos: "brew install --cask flutter",
      windows: "winget install --id Flutter.Flutter -e --source winget",
      docker: "# Note: Flutter requires custom manual SDK download in Docker",
      desc: "Flutter SDK for Cross-Platform Apps"
    },
    docker: {
      linux_mint: "sudo apt update && sudo apt install -y docker.io docker-compose && sudo usermod -aG docker $USER",
      macos: "brew install --cask docker",
      windows: "winget install --id Docker.DockerDesktop -e --source winget",
      docker: "# Docker-in-Docker setup required if running inside containers",
      desc: "Docker & Container Runtime"
    },
    postgresql: {
      linux_mint: "sudo apt update && sudo apt install -y postgresql postgresql-contrib && sudo systemctl enable --now postgresql",
      macos: "brew install postgresql@16 && brew services start postgresql@16",
      windows: "winget install --id PostgreSQL.PostgreSQL -e --source winget",
      docker: "RUN apt-get update && apt-get install -y postgresql postgresql-contrib",
      desc: "PostgreSQL Database Server"
    },
    mysql: {
      linux_mint: "sudo apt update && sudo apt install -y mysql-server && sudo systemctl enable --now mysql",
      macos: "brew install mysql && brew services start mysql",
      windows: "winget install --id Oracle.MySQL -e --source winget",
      docker: "RUN apt-get update && apt-get install -y mysql-server",
      desc: "MySQL Database Server"
    },
    redis: {
      linux_mint: "sudo apt update && sudo apt install -y redis-server && sudo systemctl enable --now redis-server",
      macos: "brew install redis && brew services start redis",
      windows: "winget install --id Redis.Redis -e --source winget",
      docker: "RUN apt-get update && apt-get install -y redis-server",
      desc: "Redis In-Memory Cache"
    },
    sqlite: {
      linux_mint: "sudo apt update && sudo apt install -y sqlite3 libsqlite3-dev",
      macos: "brew install sqlite",
      windows: "winget install --id SQLite.SQLite -e --source winget",
      docker: "RUN apt-get update && apt-get install -y sqlite3 libsqlite3-dev",
      desc: "SQLite Local Database Tools"
    },
    vscode: {
      linux_mint: "sudo snap install code --classic",
      macos: "brew install --cask visual-studio-code",
      windows: "winget install --id Microsoft.VisualStudioCode -e --source winget",
      docker: "# IDEs are typically installed on host OS",
      desc: "VS Code Editor"
    },
    cursor: {
      linux_mint: "curl -fsSL https://www.cursor.com/install.sh | bash || echo \"Download Cursor from https://cursor.com\"",
      macos: "brew install --cask cursor",
      windows: "winget install --id Anysphere.Cursor -e --source winget",
      docker: "# IDEs are typically installed on host OS",
      desc: "Cursor Pro AI Editor"
    },
    android_studio: {
      linux_mint: "sudo snap install android-studio --classic",
      macos: "brew install --cask android-studio",
      windows: "winget install --id Google.AndroidStudio -e --source winget",
      docker: "# IDEs are typically installed on host OS",
      desc: "Android Studio IDE"
    },
    postman: {
      linux_mint: "sudo snap install postman",
      macos: "brew install --cask postman",
      windows: "winget install --id Postman.Postman -e --source winget",
      docker: "# Desktop apps are typically installed on host OS",
      desc: "Postman API Client"
    },
    insomnia: {
      linux_mint: "sudo snap install insomnia",
      macos: "brew install --cask insomnia",
      windows: "winget install --id Insomnia.Insomnia -e --source winget",
      docker: "# Desktop apps are typically installed on host OS",
      desc: "Insomnia API Client"
    },
    zsh: {
      linux_mint: "sudo apt update && sudo apt install -y zsh && chsh -s $(which zsh) && RUNZSH=no CHSH=no sh -c \"$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)\"",
      macos: "brew install zsh && RUNZSH=no CHSH=no sh -c \"$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)\"",
      windows: "winget install --id JanDeDobbeleer.OhMyPosh -e --source winget || echo \"On Windows, use Oh My Posh or WSL + Oh-My-Zsh\"",
      docker: "RUN apt-get update && apt-get install -y zsh && sh -c \"$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)\" \"\" --unattended",
      desc: "Zsh + Oh-My-Zsh"
    },
    starship: {
      linux_mint: "curl -sS https://starship.rs/install.sh | sh -s -- -y && echo 'eval \"$(starship init bash)\"' >> ~/.bashrc && mkdir -p ~/.config && starship preset nerd-font-symbols -o ~/.config/starship.toml 2>/dev/null || true",
      macos: "brew install starship && echo 'eval \"$(starship init zsh)\"' >> ~/.zshrc",
      windows: "winget install --id Starship.Starship -e --source winget",
      docker: "RUN curl -sS https://starship.rs/install.sh | sh -s -- -y",
      desc: "Starship Cross-Shell Prompt"
    },
    gitkraken: {
      linux_mint: "sudo snap install gitkraken --classic || echo \"Download GitKraken from https://www.gitkraken.com/download\"",
      macos: "brew install --cask gitkraken",
      windows: "winget install --id Axosoft.GitKraken -e --source winget",
      docker: "# Desktop apps are typically installed on host OS",
      desc: "GitKraken Git GUI"
    },
    github_desktop: {
      linux_mint: "wget -qO /tmp/GitHubDesktop.deb https://github.com/shiftkey/desktop/releases/latest/download/GitHubDesktop-linux-amd64.deb && sudo apt install -y /tmp/GitHubDesktop.deb || echo \"Download GitHub Desktop from https://github.com/shiftkey/desktop/releases\"",
      macos: "brew install --cask github",
      windows: "winget install --id GitHub.GitHubDesktop -e --source winget",
      docker: "# Desktop apps are typically installed on host OS",
      desc: "GitHub Desktop"
    }
  };


  const architectureNodes = [
    {
      id: 'react',
      layer: 'frontend',
      label: 'React',
      role: 'Web UI client',
      icon: 'devicon-react-original colored',
      derivedFrom: 'nodejs',
      detail: 'React serves the browser UI and talks to your API over HTTP/JSON. Enabled when Node.js is selected.'
    },
    {
      id: 'flutter',
      layer: 'frontend',
      label: 'Flutter',
      role: 'Mobile / multi-platform UI',
      icon: 'devicon-flutter-plain colored',
      detail: 'Flutter apps call your backend APIs for auth, data, and business logic.'
    },
    {
      id: 'nodejs',
      layer: 'backend',
      label: 'Node.js',
      role: 'API / server runtime',
      icon: 'devicon-nodejs-plain colored',
      detail: 'Node.js handles HTTP routes, auth, and orchestration between the client and data stores.'
    },
    {
      id: 'python',
      layer: 'backend',
      label: 'Python',
      role: 'API / services',
      icon: 'devicon-python-plain colored',
      detail: 'Python backends (FastAPI, Django, Flask) expose APIs and talk to SQL/cache layers.'
    },
    {
      id: 'go',
      layer: 'backend',
      label: 'Go',
      role: 'High-performance API',
      icon: 'devicon-go-original-wordmark',
      detail: 'Go services excel at concurrent APIs and stream data to PostgreSQL, Redis, and beyond.'
    },
    {
      id: 'rust',
      layer: 'backend',
      label: 'Rust',
      role: 'Systems / API services',
      icon: 'devicon-rust-original',
      detail: 'Rust backends deliver safe, fast services that sit between clients and your data tier.'
    },
    {
      id: 'java',
      layer: 'backend',
      label: 'Java',
      role: 'Enterprise API',
      icon: 'devicon-java-plain colored',
      detail: 'Java services power durable APIs and integrate with relational databases and caches.'
    },
    {
      id: 'php',
      layer: 'backend',
      label: 'PHP',
      role: 'Web API / app server',
      icon: 'devicon-php-plain colored',
      detail: 'PHP backends serve web APIs and persist state in PostgreSQL, MySQL, or Redis.'
    },
    {
      id: 'ruby',
      layer: 'backend',
      label: 'Ruby',
      role: 'Web API / app server',
      icon: 'devicon-ruby-plain colored',
      detail: 'Ruby (Rails/Sinatra) apps expose endpoints and connect to your chosen data stores.'
    },
    {
      id: 'postgresql',
      layer: 'data',
      label: 'PostgreSQL',
      role: 'Primary SQL database',
      icon: 'devicon-postgresql-plain colored',
      detail: 'PostgreSQL is the system of record — backends read/write relational data here.'
    },
    {
      id: 'mysql',
      layer: 'data',
      label: 'MySQL',
      role: 'Relational database',
      icon: 'devicon-mysql-plain colored',
      detail: 'MySQL stores structured application data accessed by your backend services.'
    },
    {
      id: 'redis',
      layer: 'data',
      label: 'Redis',
      role: 'Cache / sessions',
      icon: 'devicon-redis-plain colored',
      detail: 'Redis sits beside the primary DB for caching, sessions, queues, and fast ephemeral state.'
    },
    {
      id: 'sqlite',
      layer: 'data',
      label: 'SQLite',
      role: 'Embedded local DB',
      icon: 'devicon-sqlite-plain colored',
      detail: 'SQLite is a file-backed database ideal for local apps, tests, and lightweight backends.'
    }
  ];

  let archFocusId = null;

  function getSelectedOS() {
    return document.querySelector('input[name="os"]:checked').value;
  }

  function getSelectedTools() {
    return Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
  }

  function isArchNodeActive(node, tools) {
    const selected = new Set(tools);
    if (node.derivedFrom) return selected.has(node.derivedFrom);
    return selected.has(node.id);
  }

  function activeArchNodes(tools) {
    return architectureNodes.filter(node => isArchNodeActive(node, tools));
  }

  function renderArchLayer(layer, tools) {
    const host = document.getElementById('arch-' + layer);
    if (!host) return;
    const nodes = architectureNodes.filter(n => n.layer === layer);
    host.innerHTML = nodes.map(node => {
      const active = isArchNodeActive(node, tools);
      return `
        <button type="button"
          class="arch-node${active ? ' active' : ''}"
          data-id="${node.id}"
          data-layer="${node.layer}"
          ${active ? '' : 'tabindex="-1" aria-disabled="true"'}
          aria-pressed="${active && archFocusId === node.id ? 'true' : 'false'}"
          title="${node.detail}">
          <span class="arch-node-icon"><i class="${node.icon}" aria-hidden="true"></i></span>
          <span class="arch-node-meta">
            <span class="arch-node-name">${node.label}</span>
            <span class="arch-node-role">${node.role}</span>
          </span>
        </button>
      `;
    }).join('');

    host.querySelectorAll('.arch-node.active').forEach(btn => {
      btn.addEventListener('mouseenter', () => setArchFocus(btn.dataset.id));
      btn.addEventListener('focus', () => setArchFocus(btn.dataset.id));
      btn.addEventListener('click', () => {
        setArchFocus(archFocusId === btn.dataset.id ? null : btn.dataset.id);
      });
    });
  }

  function describeArchFlow(tools) {
    const active = activeArchNodes(tools);
    const frontend = active.filter(n => n.layer === 'frontend').map(n => n.label);
    const backend = active.filter(n => n.layer === 'backend').map(n => n.label);
    const data = active.filter(n => n.layer === 'data').map(n => n.label);
    const docker = tools.includes('docker');

    if (!frontend.length && !backend.length && !data.length) {
      return 'Select a frontend, backend, or database tool above to visualize your architecture.';
    }

    const parts = [];
    if (frontend.length && backend.length) {
      parts.push(`<strong>${frontend.join(' / ')}</strong> clients call <strong>${backend.join(' / ')}</strong> over HTTP/API`);
    } else if (frontend.length) {
      parts.push(`Frontend ready: <strong>${frontend.join(' / ')}</strong> — add a backend to complete the request path`);
    } else if (backend.length) {
      parts.push(`Backend ready: <strong>${backend.join(' / ')}</strong> — add a client and/or database to complete the flow`);
    }

    if (backend.length && data.length) {
      parts.push(`persisting through <strong>${data.join(' + ')}</strong>`);
    } else if (data.length && !backend.length) {
      parts.push(`Data layer selected: <strong>${data.join(' + ')}</strong> — pair it with a backend service`);
    }

    let summary = parts.join(', ') + '.';
    if (docker) summary += ' Docker can package and run this stack as containers.';
    return summary;
  }

  function setArchFocus(id) {
    archFocusId = id;
    const detail = document.getElementById('arch-detail');
    const tools = getSelectedTools();
    const nodes = document.querySelectorAll('.arch-node');

    nodes.forEach(node => {
      node.classList.remove('focused', 'linked');
      node.setAttribute('aria-pressed', 'false');
    });

    if (!id) {
      detail.classList.remove('has-focus');
      detail.innerHTML = describeArchFlow(tools);
      return;
    }

    const focused = architectureNodes.find(n => n.id === id);
    if (!focused || !isArchNodeActive(focused, tools)) {
      archFocusId = null;
      detail.classList.remove('has-focus');
      detail.innerHTML = describeArchFlow(tools);
      return;
    }

    const focusEl = document.querySelector(`.arch-node[data-id="${id}"]`);
    if (focusEl) {
      focusEl.classList.add('focused');
      focusEl.setAttribute('aria-pressed', 'true');
    }

    // Highlight the path: frontend ↔ backend ↔ data
    if (focused.layer === 'frontend' || focused.layer === 'data') {
      document.querySelectorAll('.arch-node.active[data-layer="backend"]').forEach(el => el.classList.add('linked'));
    }
    if (focused.layer === 'backend') {
      document.querySelectorAll('.arch-node.active[data-layer="frontend"], .arch-node.active[data-layer="data"]').forEach(el => el.classList.add('linked'));
    }
    if (focused.layer === 'frontend') {
      document.querySelectorAll('.arch-node.active[data-layer="data"]').forEach(el => el.classList.add('linked'));
    }
    if (focused.layer === 'data') {
      document.querySelectorAll('.arch-node.active[data-layer="frontend"]').forEach(el => el.classList.add('linked'));
    }

    detail.classList.add('has-focus');
    const peers = activeArchNodes(tools).filter(n => n.layer !== focused.layer).map(n => n.label);
    const peerText = peers.length
      ? ` Connected path: <strong>${focused.label}</strong> ↔ <strong>${peers.join(' / ')}</strong>.`
      : ' Add tools in the other layers to complete the architectural path.';
    detail.innerHTML = `<strong>${focused.label}</strong> — ${focused.detail}${peerText}`;
  }

  function updateArchitecture() {
    const tools = getSelectedTools();
    const active = activeArchNodes(tools);
    const canvas = document.getElementById('arch-canvas');
    const hasArch = active.length > 0;

    renderArchLayer('frontend', tools);
    renderArchLayer('backend', tools);
    renderArchLayer('data', tools);

    canvas.classList.toggle('is-empty', !hasArch);
    canvas.classList.toggle('docker-active', tools.includes('docker'));

    const hasFrontend = active.some(n => n.layer === 'frontend');
    const hasBackend = active.some(n => n.layer === 'backend');
    const hasData = active.some(n => n.layer === 'data');

    document.getElementById('arch-edge-api').classList.toggle('active', hasFrontend && hasBackend);
    document.getElementById('arch-edge-data').classList.toggle('active', hasBackend && hasData);

    if (archFocusId && !active.some(n => n.id === archFocusId)) {
      archFocusId = null;
    }

    if (archFocusId) {
      setArchFocus(archFocusId);
    } else {
      const detail = document.getElementById('arch-detail');
      detail.classList.remove('has-focus');
      detail.innerHTML = describeArchFlow(tools);
    }
  }

  function getEnvConfig() {
    return {
      gitName: document.getElementById('git-name').value.trim(),
      gitEmail: document.getElementById('git-email').value.trim(),
      installDir: document.getElementById('install-dir').value.trim()
    };
  }

  function shellQuote(value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
  }

  function psQuote(value) {
    return "'" + String(value).replace(/'/g, "''") + "'";
  }

  function syncEnvFlagsPreview() {
    const { gitName, gitEmail, installDir } = getEnvConfig();
    const os = getSelectedOS();
    const preview = document.getElementById('env-flags-preview');
    const cmd = os === 'windows' ? '.\\setup.ps1' : './setup.sh';
    const parts = [cmd];

    if (gitName) parts.push(os === 'windows' ? `-GitName ${psQuote(gitName)}` : `--git-name ${shellQuote(gitName)}`);
    if (gitEmail) parts.push(os === 'windows' ? `-GitEmail ${psQuote(gitEmail)}` : `--git-email ${shellQuote(gitEmail)}`);
    if (installDir) parts.push(os === 'windows' ? `-InstallDir ${psQuote(installDir)}` : `--install-dir ${shellQuote(installDir)}`);

    const hasCustom = Boolean(gitName || gitEmail || installDir);
    preview.textContent = hasCustom
      ? parts.join(' ')
      : `${cmd}   # optional: --git-name --git-email --install-dir`;
    preview.classList.toggle('is-empty', !hasCustom);
  }

  function generateBashFlagParser(env) {
    const defaultName = env.gitName ? shellQuote(env.gitName) : "''";
    const defaultEmail = env.gitEmail ? shellQuote(env.gitEmail) : "''";
    // Keep ~ unexpanded here; the runtime case below resolves it to $HOME.
    const defaultDir = env.installDir ? shellQuote(env.installDir) : '"$HOME/Projects"';

    return `# -----------------------------------------------------------------------------
# Variable customization (override with CLI flags)
#   --git-name "Your Name"
#   --git-email "you@example.com"
#   --install-dir "~/Projects"
# -----------------------------------------------------------------------------
GIT_USER_NAME=${defaultName}
GIT_USER_EMAIL=${defaultEmail}
INSTALL_DIR=${defaultDir}

usage() {
  cat <<'USAGE'
Usage: ./setup.sh [options]

Options:
  --git-name NAME       Git global user.name
  --git-email EMAIL     Git global user.email
  --install-dir PATH    Preferred installation / projects directory
  -h, --help            Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --git-name)
      GIT_USER_NAME="\${2:-}"; shift 2 ;;
    --git-email)
      GIT_USER_EMAIL="\${2:-}"; shift 2 ;;
    --install-dir|--dir)
      INSTALL_DIR="\${2:-}"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      fail "Unknown option: $1"
      usage
      exit 1 ;;
  esac
done

# Expand leading ~ in INSTALL_DIR
case "$INSTALL_DIR" in
  "~") INSTALL_DIR="$HOME" ;;
  "~/"*) INSTALL_DIR="$HOME/\${INSTALL_DIR#~/}" ;;
esac

`;
  }

  function generateBashEnvApply() {
    return `banner "Custom Environment"
info "Applying machine-specific variables..."

if [[ -n "$GIT_USER_NAME" ]]; then
  if command -v git >/dev/null 2>&1; then
    git config --global user.name "$GIT_USER_NAME"
    success "Git user.name → $GIT_USER_NAME"
  else
    warn "Git not available yet — skipped user.name"
  fi
else
  info "GIT_USER_NAME not set (pass --git-name to configure)"
fi

if [[ -n "$GIT_USER_EMAIL" ]]; then
  if command -v git >/dev/null 2>&1; then
    git config --global user.email "$GIT_USER_EMAIL"
    success "Git user.email → $GIT_USER_EMAIL"
  else
    warn "Git not available yet — skipped user.email"
  fi
else
  info "GIT_USER_EMAIL not set (pass --git-email to configure)"
fi

if [[ -n "$INSTALL_DIR" ]]; then
  mkdir -p "$INSTALL_DIR"
  SHELL_RC="$HOME/.bashrc"
  [[ -f "$HOME/.zshrc" ]] && SHELL_RC="$HOME/.zshrc"
  touch "$SHELL_RC"
  if grep -q 'export INSTALL_DIR=' "$SHELL_RC" 2>/dev/null; then
    # shellcheck disable=SC2016
    sed -i.bak "s|^export INSTALL_DIR=.*|export INSTALL_DIR=\\"$INSTALL_DIR\\"|" "$SHELL_RC" 2>/dev/null || true
  else
    echo "export INSTALL_DIR=\\"$INSTALL_DIR\\"" >> "$SHELL_RC"
  fi
  # Keep PROJECTS_DIR as an alias for compatibility
  grep -q 'export PROJECTS_DIR=' "$SHELL_RC" 2>/dev/null || echo "export PROJECTS_DIR=\\"$INSTALL_DIR\\"" >> "$SHELL_RC"
  success "Installation directory → $INSTALL_DIR"
else
  info "INSTALL_DIR not set (pass --install-dir to configure)"
fi

echo ""

`;
  }

  function generatePowerShellParams(env) {
    const defaultName = env.gitName ? psQuote(env.gitName) : "''";
    const defaultEmail = env.gitEmail ? psQuote(env.gitEmail) : "''";
    const defaultDir = env.installDir
      ? psQuote(env.installDir)
      : '"$env:USERPROFILE\\Projects"';

    return `param(
  [string]$GitName = ${defaultName},
  [string]$GitEmail = ${defaultEmail},
  [string]$InstallDir = ${defaultDir}
)

# Override examples:
#   .\\setup.ps1 -GitName "Ada Lovelace" -GitEmail "ada@example.com" -InstallDir "$HOME\\Projects"

`;
  }

  function generatePowerShellEnvApply() {
    return `Write-Banner "Custom Environment"
Write-Info "Applying machine-specific variables..."

if (-not [string]::IsNullOrWhiteSpace($GitName)) {
  if (Get-Command git -ErrorAction SilentlyContinue) {
    git config --global user.name $GitName
    Write-Success "Git user.name → $GitName"
  } else {
    Write-Warn "Git not available yet — skipped user.name"
  }
} else {
  Write-Info "GitName not set (pass -GitName to configure)"
}

if (-not [string]::IsNullOrWhiteSpace($GitEmail)) {
  if (Get-Command git -ErrorAction SilentlyContinue) {
    git config --global user.email $GitEmail
    Write-Success "Git user.email → $GitEmail"
  } else {
    Write-Warn "Git not available yet — skipped user.email"
  }
} else {
  Write-Info "GitEmail not set (pass -GitEmail to configure)"
}

if (-not [string]::IsNullOrWhiteSpace($InstallDir)) {
  $resolvedDir = $InstallDir
  if ($resolvedDir.StartsWith('~/') -or $resolvedDir -eq '~') {
    $resolvedDir = Join-Path $HOME $resolvedDir.TrimStart('~').TrimStart('/', '\\')
  }
  New-Item -ItemType Directory -Force -Path $resolvedDir | Out-Null
  [Environment]::SetEnvironmentVariable('INSTALL_DIR', $resolvedDir, 'User')
  [Environment]::SetEnvironmentVariable('PROJECTS_DIR', $resolvedDir, 'User')
  $env:INSTALL_DIR = $resolvedDir
  Write-Success "Installation directory → $resolvedDir"
} else {
  Write-Info "InstallDir not set (pass -InstallDir to configure)"
}

Write-Host ""

`;
  }

  const osLabels = {
    linux_mint: 'Linux Mint / Ubuntu',
    macos: 'macOS (Homebrew)',
    windows: 'Windows (Winget / PowerShell)'
  };

  const verifyCommands = {
    git: 'git --version',
    nodejs: 'node --version && npm --version',
    python: 'python3 --version && pip3 --version',
    go: 'go version',
    rust: 'rustc --version && cargo --version',
    java: 'java -version',
    php: 'php --version && composer --version',
    ruby: 'ruby --version',
    flutter: 'flutter --version',
    docker: 'docker --version',
    postgresql: 'psql --version',
    mysql: 'mysql --version',
    redis: 'redis-cli --version',
    sqlite: 'sqlite3 --version',
    zsh: 'zsh --version',
    starship: 'starship --version'
  };

  function generateScript(os, tools) {
    if (os === 'windows') {
      return generatePowerShellScript(tools);
    }
    return generateBashScript(tools, os);
  }

  function generateBashScript(tools, os) {
    const env = getEnvConfig();
    let script = `#!/usr/bin/env bash
# =============================================================================
# INSTASTACK — Automated Environment Setup
# Target OS: ${osLabels[os] || os}
# Generated: ${new Date().toISOString().slice(0, 10)}
# =============================================================================
set -euo pipefail

BOLD='\\033[1m'
CYAN='\\033[0;36m'
GREEN='\\033[0;32m'
YELLOW='\\033[0;33m'
RED='\\033[0;31m'
NC='\\033[0m'

banner() {
  echo ""
  echo -e "\${CYAN}============================================================\${NC}"
  echo -e "\${CYAN}\${BOLD}  $1\${NC}"
  echo -e "\${CYAN}============================================================\${NC}"
}

info()    { echo -e "\${CYAN}➜\${NC}  $1"; }
success() { echo -e "\${GREEN}✔\${NC}  $1"; }
warn()    { echo -e "\${YELLOW}!\${NC}  $1"; }
fail()    { echo -e "\${RED}✖\${NC}  $1" >&2; }

on_error() {
  fail "Setup failed on line $1 (exit code $2)."
  fail "Fix the error above, then re-run this script."
  exit "$2"
}
trap 'on_error $LINENO $?' ERR

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Required command not found: $1"
    exit 1
  fi
}

${generateBashFlagParser(env)}banner "INSTASTACK Setup"
info "Starting environment bootstrap..."
info "Shell: $SHELL | User: $(whoami) | Host: $(hostname)"
info "Install dir: $INSTALL_DIR"
echo ""

`;

    if (os === 'linux_mint') {
      script += `info "Refreshing apt package index..."
sudo apt-get update -y
success "Package index updated"
echo ""

`;
    } else if (os === 'macos') {
      script += `if ! command -v brew >/dev/null 2>&1; then
  warn "Homebrew not found — installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  success "Homebrew installed"
else
  success "Homebrew already available"
fi
echo ""

`;
    }

    const installable = tools.filter(tool => packages[tool] && packages[tool][os]);
    installable.forEach((tool, index) => {
      const pkg = packages[tool];
      const step = index + 1;
      const total = installable.length;
      script += `banner "[${step}/${total}] ${pkg.desc}"
info "Installing ${pkg.desc}..."
${pkg[os]}
success "${pkg.desc} installed"
echo ""

`;
    });

    script += generateBashEnvApply();

    script += `banner "Setup Complete"
success "All selected tools were installed successfully."
warn "Restart your terminal (or log out/in) so PATH and group changes take effect."
echo ""
`;
    return script;
  }

  function generatePowerShellScript(tools) {
    const env = getEnvConfig();
    let script = `# =============================================================================
# INSTASTACK — Automated Environment Setup (Windows / PowerShell)
# Generated: ${new Date().toISOString().slice(0, 10)}
# =============================================================================
${generatePowerShellParams(env)}$ErrorActionPreference = 'Stop'

function Write-Banner([string]$Message) {
  Write-Host ""
  Write-Host "============================================================" -ForegroundColor Cyan
  Write-Host "  $Message" -ForegroundColor Cyan
  Write-Host "============================================================" -ForegroundColor Cyan
}

function Write-Info([string]$Message)    { Write-Host "➜  $Message" -ForegroundColor Cyan }
function Write-Success([string]$Message) { Write-Host "✔  $Message" -ForegroundColor Green }
function Write-Warn([string]$Message)    { Write-Host "!  $Message" -ForegroundColor Yellow }

Write-Banner "INSTASTACK Setup"
Write-Info "Starting environment bootstrap..."
Write-Info ("User: {0} | Host: {1}" -f $env:USERNAME, $env:COMPUTERNAME)
Write-Info "Install dir: $InstallDir"
Write-Host ""

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "winget is required. Install App Installer from the Microsoft Store, then re-run."
}
Write-Success "winget is available"
Write-Host ""

`;

    const installable = tools.filter(tool => packages[tool] && packages[tool].windows);
    installable.forEach((tool, index) => {
      const pkg = packages[tool];
      const step = index + 1;
      const total = installable.length;
      script += `Write-Banner "[${step}/${total}] ${pkg.desc}"
Write-Info "Installing ${pkg.desc}..."
${pkg.windows}
Write-Success "${pkg.desc} installed"
Write-Host ""

`;
    });

    script += generatePowerShellEnvApply();

    script += `Write-Banner "Setup Complete"
Write-Success "All selected tools were installed successfully."
Write-Warn "Restart your terminal (or sign out/in) so PATH changes take effect."
Write-Host ""
`;
    return script;
  }

  function generateDockerfile(tools) {
    const installable = [];
    const skipped = [];

    tools.forEach(tool => {
      const pkg = packages[tool];
      if (!pkg) return;
      if (pkg.docker && !pkg.docker.startsWith('#')) {
        installable.push(tool);
      } else {
        skipped.push(tool);
      }
    });

    const labels = installable.map(t => packages[t].desc).join(', ') || 'base toolchain';
    let dockerfile = `# =============================================================================
# INSTASTACK — Development Container
# Includes: ${labels}
# Build:  docker build -t instastack-dev .
# Run:    docker run -it --rm -v "$PWD":/workspace instastack-dev
# =============================================================================
FROM ubuntu:22.04

LABEL org.opencontainers.image.title="INSTASTACK Dev Environment"
LABEL org.opencontainers.image.description="Ready-to-run container with selected languages and dependencies"
LABEL org.opencontainers.image.source="https://instastack.app"

ENV DEBIAN_FRONTEND=noninteractive \\
    LANG=C.UTF-8 \\
    LC_ALL=C.UTF-8 \\
    PATH="/root/.cargo/bin:/root/.rbenv/bin:/root/.rbenv/shims:\${PATH}"

# Base OS tooling required by most language installers
RUN apt-get update && apt-get install -y --no-install-recommends \\
    ca-certificates \\
    curl \\
    wget \\
    gnupg \\
    unzip \\
    zip \\
    git \\
    build-essential \\
    software-properties-common \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

`;

    installable.forEach((tool, index) => {
      const pkg = packages[tool];
      const step = index + 1;
      dockerfile += `# --- [${step}/${installable.length}] ${pkg.desc} ---\n`;
      // Strip leading "RUN " so we can wrap with cleanup consistently when it's an apt install
      const cmd = pkg.docker.trim();
      if (cmd.startsWith('RUN apt-get update')) {
        dockerfile += cmd.replace(
          /RUN apt-get update && apt-get install -y (.+)/,
          'RUN apt-get update && apt-get install -y --no-install-recommends $1 \\\n    && rm -rf /var/lib/apt/lists/*'
        ) + '\n\n';
      } else {
        dockerfile += cmd + '\n\n';
      }
    });

    if (skipped.length) {
      dockerfile += `# Host-only tools (skipped in container):\n`;
      skipped.forEach(tool => {
        dockerfile += `# - ${packages[tool].desc}\n`;
      });
      dockerfile += '\n';
    }

    const { gitName, gitEmail, installDir } = getEnvConfig();
    if (gitName || gitEmail || installDir) {
      dockerfile += `# Custom environment configuration\n`;
      if (gitName) dockerfile += `RUN git config --global user.name ${shellQuote(gitName)}\n`;
      if (gitEmail) dockerfile += `RUN git config --global user.email ${shellQuote(gitEmail)}\n`;
      if (installDir) {
        const dir = installDir.replace(/^~(?=\/|$)/, '/workspace');
        dockerfile += `ENV INSTALL_DIR=${shellQuote(dir)}\n`;
        dockerfile += `ENV PROJECTS_DIR=${shellQuote(dir)}\n`;
        dockerfile += `RUN mkdir -p "$INSTALL_DIR"\n`;
      }
      dockerfile += '\n';
    }

    dockerfile += `# Default to an interactive shell in the project workspace
CMD ["/bin/bash"]
`;
    return dockerfile;
  }

  function generateReadme(tools) {
    const os = getSelectedOS();
    const env = getEnvConfig();
    const date = new Date().toISOString().slice(0, 10);
    const scriptName = os === 'windows' ? 'setup.ps1' : 'setup.sh';
    const stackList = tools.filter(t => packages[t]);

    let md = `# Development Environment Setup

> Generated by **INSTASTACK** on \`${date}\`  
> Target OS: **${osLabels[os] || os}**

This guide bootstraps a complete local toolchain for this project. Pick the path that fits your workflow: automated script, Docker, or manual install steps.

## Stack

| Tool | Description |
|------|-------------|
`;

    stackList.forEach(tool => {
      md += `| \`${tool}\` | ${packages[tool].desc} |\n`;
    });

    if (!stackList.length) {
      md += `| — | No tools selected yet |\n`;
    }

    md += `
## Prerequisites

- A machine running **${osLabels[os] || os}**
`;
    if (os === 'linux_mint') {
      md += '- `sudo` privileges for package installation\n';
    } else if (os === 'macos') {
      md += '- [Homebrew](https://brew.sh) (the setup script installs it if missing)\n';
    } else {
      md += '- [winget](https://learn.microsoft.com/windows/package-manager/winget/) (App Installer)\n';
      md += '- PowerShell 5.1+ or PowerShell 7+\n';
    }

    md += `
## Quick Start

### Option A — Automated script (\`${scriptName}\`)

`;

    if (os === 'windows') {
      md += `\`\`\`powershell
# From the repo root
Set-ExecutionPolicy -Scope Process Bypass -Force
.\\setup.ps1
\`\`\`
`;
    } else {
      md += `\`\`\`bash
# From the repo root
chmod +x setup.sh
./setup.sh
\`\`\`
`;
    }

    md += `
### Option B — Docker development container

\`\`\`bash
docker build -t instastack-dev .
docker run -it --rm -v "$PWD":/workspace instastack-dev
\`\`\`

The container lands you in \`/workspace\` with the selected languages and dependencies preinstalled.

## Manual Installation

If you prefer to install tools one-by-one on **${osLabels[os] || os}**:

`;

    stackList.forEach(tool => {
      const cmd = packages[tool][os];
      md += `### ${packages[tool].desc}

\`\`\`${os === 'windows' ? 'powershell' : 'bash'}
${cmd}
\`\`\`

`;
    });

    md += `## Variable Customization

The setup script accepts machine-specific defaults (baked in from INSTASTACK) and CLI overrides:

`;
    if (os === 'windows') {
      md += `\`\`\`powershell
.\\setup.ps1 \`
  -GitName "${env.gitName || 'Your Name'}" \`
  -GitEmail "${env.gitEmail || 'you@example.com'}" \`
  -InstallDir "${env.installDir || '~/Projects'}"
\`\`\`
`;
    } else {
      md += `\`\`\`bash
./setup.sh \\
  --git-name "${env.gitName || 'Your Name'}" \\
  --git-email "${env.gitEmail || 'you@example.com'}" \\
  --install-dir "${env.installDir || '~/Projects'}"
\`\`\`
`;
    }

    if (env.gitName || env.gitEmail || env.installDir) {
      md += `
### Defaults included in this export

`;
      if (env.gitName) md += `- Git user.name: \`${env.gitName}\`\n`;
      if (env.gitEmail) md += `- Git user.email: \`${env.gitEmail}\`\n`;
      if (env.installDir) md += `- Preferred installation directory: \`${env.installDir}\`\n`;
      md += '\n';
    } else {
      md += `\nPass the flags above (or fill them in INSTASTACK before exporting) to customize Git identity and install path.\n\n`;
    }

    const verifiable = stackList.filter(t => verifyCommands[t]);
    if (verifiable.length) {
      md += `## Verification

Confirm the toolchain is on your \`PATH\`:

\`\`\`bash
`;
      verifiable.forEach(tool => {
        md += `${verifyCommands[tool]}\n`;
      });
      md += `\`\`\`

`;
    }

    md += `## What's Next?

1. Clone this repository (if you haven't already)
2. Run the setup script **or** start the Docker container
3. Open the project in your preferred editor
4. Install project-level dependencies (e.g. \`npm install\`, \`pip install -r requirements.txt\`)

---

<sub>Scaffolded with [INSTASTACK](https://instastack.app) — regenerate anytime your stack changes.</sub>
`;
    return md;
  }

  function currentFilename() {
    if (currentTab === 'dockerfile') return 'Dockerfile';
    if (currentTab === 'readme') return 'README.md';
    return getSelectedOS() === 'windows' ? 'setup.ps1' : 'setup.sh';
  }

  function downloadLabel() {
    return 'Download ' + currentFilename();
  }

  function downloadMimeType(filename) {
    if (filename.endsWith('.sh')) return 'application/x-sh';
    if (filename.endsWith('.ps1')) return 'text/plain';
    if (filename === 'Dockerfile') return 'text/x-dockerfile';
    if (filename.endsWith('.md')) return 'text/markdown';
    return 'text/plain;charset=utf-8';
  }

  function curlButtonLabel() {
    const os = getSelectedOS();
    if (currentTab === 'dockerfile' || currentTab === 'readme') return 'Copy Curl Command';
    if (os === 'windows') return '1-Click Install Command';
    return '1-Click Curl Command';
  }

  function prismLanguage() {
    if (currentTab === 'dockerfile') return 'docker';
    if (currentTab === 'readme') return 'markdown';
    return getSelectedOS() === 'windows' ? 'powershell' : 'bash';
  }

  function renderHighlighted(output) {
    const codeEl = document.getElementById('output-code');
    const preEl = codeEl.parentElement;
    const lang = prismLanguage();
    codeEl.className = 'language-' + lang;
    preEl.className = 'language-' + lang;
    codeEl.textContent = output;
    if (window.Prism) {
      Prism.highlightElement(codeEl);
    }
  }

  function toBase64Url(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  function fromBase64Url(str) {
    const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
    return decodeURIComponent(escape(atob(b64)));
  }

  function buildConfigSlug() {
    const payload = {
      os: getSelectedOS(),
      tools: getSelectedTools(),
      env: getEnvConfig(),
      tab: currentTab === 'script' ? undefined : currentTab
    };
    return toBase64Url(JSON.stringify(payload));
  }

  function shareSlug() {
    // Short stable token for the share URL; full config stays in the page hash.
    const full = buildConfigSlug();
    return (full.slice(0, 16) || 'config').replace(/[^a-zA-Z0-9_-]/g, 'x');
  }

  function quickRunCommand() {
    const slug = shareSlug();
    const os = getSelectedOS();
    if (currentTab === 'dockerfile') {
      return `curl -sSL https://instastack.app/s/${slug} -o Dockerfile`;
    }
    if (currentTab === 'readme') {
      return `curl -sSL https://instastack.app/s/${slug} -o README.md`;
    }
    if (os === 'windows') {
      return `irm https://instastack.app/s/${slug} | iex`;
    }
    return `curl -sSL https://instastack.app/s/${slug} | bash`;
  }

  function quickRunHint() {
    if (currentTab === 'dockerfile') {
      return 'Downloads your generated Dockerfile into the current directory.';
    }
    if (currentTab === 'readme') {
      return 'Downloads a GitHub-ready README.md for this stack.';
    }
    if (getSelectedOS() === 'windows') {
      return 'Paste into PowerShell to download and execute this stack installer in one shot.';
    }
    return 'Paste into your terminal to fetch and run this stack installer in one shot.';
  }

  function syncQuickRun() {
    document.getElementById('quick-run-cmd').textContent = quickRunCommand();
    document.getElementById('quick-run-hint').textContent = quickRunHint();
    document.getElementById('quick-run-meta').textContent =
      getSelectedOS() === 'windows' && currentTab === 'script' ? '1-Click Install' : '1-Click Curl';

    const curlBtn = document.getElementById('curl-btn');
    curlBtn.textContent = curlButtonLabel();
    curlBtn.dataset.label = curlButtonLabel();

    const slug = buildConfigSlug();
    const url = new URL(window.location.href);
    url.hash = 's=' + slug;
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function flashButton(btn, label) {
    const original = btn.dataset.label || btn.textContent;
    btn.dataset.label = original;
    btn.textContent = label;
    setTimeout(() => { btn.textContent = btn.dataset.label; }, 1600);
  }

  function setChecks(tools) {
    const wanted = new Set(tools);
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = wanted.has(cb.value);
    });
  }

  function setOS(os) {
    const radio = document.querySelector(`input[name="os"][value="${os}"]`);
    if (radio) radio.checked = true;
  }

  function setPresetActive(name) {
    activePreset = name;
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === name);
    });
  }

  function applyPreset(name) {
    const preset = presets[name];
    if (!preset) return;
    setOS(preset.os);
    setChecks(preset.tools);
    setPresetActive(name);
    generate();
  }

  function onManualChange() {
    setPresetActive(null);
    generate();
  }

  function currentOutput() {
    const os = getSelectedOS();
    const tools = getSelectedTools();
    if (currentTab === 'dockerfile') return generateDockerfile(tools);
    if (currentTab === 'readme') return generateReadme(tools);
    return generateScript(os, tools);
  }

  function generate() {
    const output = currentOutput();
    const filename = currentFilename();
    renderHighlighted(output);
    document.getElementById('output-filename').textContent = filename;
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.textContent = downloadLabel();
    downloadBtn.dataset.label = downloadLabel();
    syncQuickRun();
    syncEnvFlagsPreview();
    updateArchitecture();
  }

  function switchTab(tab, btn) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    generate();
  }

  function copyOutput() {
    const code = document.getElementById('output-code').innerText;
    navigator.clipboard.writeText(code).then(() => {
      flashButton(document.getElementById('copy-btn'), 'Copied!');
    }).catch(() => {
      flashButton(document.getElementById('copy-btn'), 'Copy failed');
    });
  }

  function copyQuickRun() {
    const cmd = quickRunCommand();
    navigator.clipboard.writeText(cmd).then(() => {
      flashButton(document.getElementById('curl-btn'), 'Copied to clipboard!');
      flashButton(document.getElementById('quick-copy-btn'), 'Copied!');
    }).catch(() => {
      flashButton(document.getElementById('curl-btn'), 'Copy failed');
    });
  }

  function downloadOutput() {
    const content = currentOutput();
    const filename = currentFilename();
    const blob = new Blob([content], { type: downloadMimeType(filename) });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flashButton(document.getElementById('download-btn'), 'Saved!');
  }

  function applySharedConfig() {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash.startsWith('s=')) return;
    try {
      const raw = fromBase64Url(hash.slice(2));
      const data = JSON.parse(raw);
      if (data.os) setOS(data.os);
      if (Array.isArray(data.tools)) setChecks(data.tools);
      if (data.env) {
        document.getElementById('git-name').value = data.env.gitName || '';
        document.getElementById('git-email').value = data.env.gitEmail || '';
        document.getElementById('install-dir').value = data.env.installDir || data.env.projectDir || '';
      }
      if (data.tab) {
        currentTab = data.tab === 'checklist' ? 'readme' : data.tab;
        document.querySelectorAll('.tab-btn').forEach(el => {
          el.classList.toggle('active', el.dataset.tab === currentTab);
        });
      }
      setPresetActive(null);
    } catch (err) {
      console.warn('Could not restore shared INSTASTACK config', err);
    }
  }

  applySharedConfig();
  generate();

  // Expose interactive entry points for inline onclick handlers
  Object.assign(window, {
    applyPreset,
    onManualChange,
    generate,
    switchTab,
    copyOutput,
    copyQuickRun,
    downloadOutput,
    setArchFocus,
  });
