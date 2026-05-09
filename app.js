const config = window.EMAILASSIST_DOWNLOAD_CONFIG ?? {};
const releaseRepository = config.releaseRepository ?? "GachonCapstone4/App_Front";
const releaseEndpoint = `https://api.github.com/repos/${releaseRepository}/releases/latest`;

const versionNode = document.querySelector("#release-version");
const dateNode = document.querySelector("#release-date");
const releaseLinkNode = document.querySelector("#release-link");
const primaryDownloadNode = document.querySelector("#primary-download");
const assetsNode = document.querySelector("#download-assets");
const scenarioStageNode = document.querySelector(".scenario-stage");
const storyStepNodes = Array.from(document.querySelectorAll(".story-step"));

const installerExtensions = [".dmg", ".exe", ".msi", ".appimage", ".deb"];

function formatSize(bytes) {
  if (!bytes) {
    return "";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function getPlatformLabel(assetName) {
  const name = assetName.toLowerCase();

  if (name.endsWith(".dmg")) {
    return "macOS";
  }

  if (name.endsWith(".exe") || name.endsWith(".msi")) {
    return "Windows";
  }

  if (name.endsWith(".appimage") || name.endsWith(".deb")) {
    return "Linux";
  }

  return "설치 파일";
}

function isInstaller(asset) {
  const name = asset.name.toLowerCase();
  return installerExtensions.some((extension) => name.endsWith(extension));
}

function pickPrimaryAsset(assets) {
  const platform = navigator.platform.toLowerCase();

  if (platform.includes("win")) {
    return assets.find((asset) => asset.name.toLowerCase().endsWith(".exe"));
  }

  if (platform.includes("mac")) {
    return assets.find((asset) => asset.name.toLowerCase().endsWith(".dmg"));
  }

  if (platform.includes("linux")) {
    return assets.find((asset) => asset.name.toLowerCase().endsWith(".appimage"));
  }

  return assets[0];
}

function renderEmptyState(message, detail) {
  assetsNode.innerHTML = `
    <div class="empty-state">
      <strong>${message}</strong>
      <span>${detail}</span>
    </div>
  `;
}

function renderRelease(release) {
  const assets = release.assets.filter(isInstaller);
  const primaryAsset = pickPrimaryAsset(assets);

  versionNode.textContent = release.tag_name;
  releaseLinkNode.href = release.html_url;

  if (release.published_at) {
    dateNode.dateTime = release.published_at;
    dateNode.textContent = new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(release.published_at));
  }

  if (primaryAsset) {
    primaryDownloadNode.href = primaryAsset.browser_download_url;
  } else {
    primaryDownloadNode.href = release.html_url;
  }

  if (assets.length === 0) {
    renderEmptyState(
      "아직 내려받을 수 있는 설치 파일이 없습니다.",
      "릴리스에 dmg, exe, msi, AppImage, deb 파일이 업로드되면 자동으로 표시됩니다.",
    );
    return;
  }

  assetsNode.innerHTML = assets
    .map((asset) => {
      const size = formatSize(asset.size);
      const safeName = escapeHtml(asset.name);
      const safePlatform = escapeHtml(getPlatformLabel(asset.name));

      return `
        <a class="asset-card" href="${asset.browser_download_url}">
          <span>
            <strong>${safePlatform}</strong>
            <small>${safeName}${size ? ` · ${size}` : ""}</small>
          </span>
          <span class="download-mark" aria-hidden="true">↓</span>
        </a>
      `;
    })
    .join("");
}

async function loadLatestRelease() {
  try {
    const response = await fetch(releaseEndpoint, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub release request failed: ${response.status}`);
    }

    const release = await response.json();
    renderRelease(release);
  } catch (error) {
    versionNode.textContent = "확인 실패";
    releaseLinkNode.href = `https://github.com/${releaseRepository}/releases`;
    primaryDownloadNode.href = `https://github.com/${releaseRepository}/releases`;
    renderEmptyState(
      "최신 릴리스를 불러오지 못했습니다.",
      "네트워크 상태를 확인하거나 GitHub Releases 페이지에서 직접 내려받아 주세요.",
    );
  }
}

function initScenarioScroller() {
  if (!scenarioStageNode || storyStepNodes.length === 0) {
    return;
  }

  const activateStep = (activeStep) => {
    const scene = activeStep.dataset.scene;

    scenarioStageNode.dataset.scene = scene;
    storyStepNodes.forEach((step) => {
      step.classList.toggle("is-active", step === activeStep);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visibleEntries[0]) {
        activateStep(visibleEntries[0].target);
      }
    },
    {
      rootMargin: "-32% 0px -42% 0px",
      threshold: [0.2, 0.45, 0.7],
    },
  );

  storyStepNodes.forEach((step) => observer.observe(step));
}

initScenarioScroller();
void loadLatestRelease();
