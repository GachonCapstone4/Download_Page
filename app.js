const config = window.MAILY_DOWNLOAD_CONFIG ?? {};
const releaseRepository = config.releaseRepository ?? "GachonCapstone4/App_Front";
const releaseEndpoint = `https://api.github.com/repos/${releaseRepository}/releases/latest`;

const versionNode = document.querySelector("#release-version");
const dateNode = document.querySelector("#release-date");
const releaseLinkNode = document.querySelector("#release-link");
const primaryDownloadNode = document.querySelector("#primary-download");
const assetsNode = document.querySelector("#download-assets");
const scenarioStageNode = document.querySelector(".scenario-stage");
const storyStepNodes = Array.from(document.querySelectorAll(".story-step"));

const installerExtensions = [".dmg", ".exe", ".msi"];
const checksumFileName = "SHA256SUMS.txt";
const scenarioCycleDelayMs = 3000;

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

  return "설치 파일";
}

function isInstaller(asset) {
  const name = asset.name.toLowerCase();
  return installerExtensions.some((extension) => name.endsWith(extension));
}

function findChecksumAsset(assets) {
  return assets.find((asset) => asset.name === checksumFileName);
}

function parseChecksumText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((checksums, line) => {
      const match = line.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);

      if (match) {
        checksums.set(match[2], match[1].toLowerCase());
      }

      return checksums;
    }, new Map());
}

async function loadChecksums(releaseAssets) {
  const checksumAsset = findChecksumAsset(releaseAssets);

  if (!checksumAsset) {
    return new Map();
  }

  const response = await fetch(checksumAsset.browser_download_url);

  if (!response.ok) {
    throw new Error(`Checksum request failed: ${response.status}`);
  }

  return parseChecksumText(await response.text());
}

function pickPrimaryAsset(assets) {
  const platform = navigator.platform.toLowerCase();

  if (platform.includes("win")) {
    return assets.find((asset) => asset.name.toLowerCase().endsWith(".exe"));
  }

  if (platform.includes("mac")) {
    return assets.find((asset) => asset.name.toLowerCase().endsWith(".dmg"));
  }

  return undefined;
}

function renderEmptyState(message, detail) {
  assetsNode.innerHTML = `
    <div class="empty-state">
      <strong>${message}</strong>
      <span>${detail}</span>
    </div>
  `;
}

async function renderRelease(release) {
  const assets = release.assets.filter(isInstaller);
  const primaryAsset = pickPrimaryAsset(assets);
  const checksums = await loadChecksums(release.assets).catch(() => new Map());

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
      "릴리스에 dmg, exe, msi 파일이 업로드되면 자동으로 표시됩니다.",
    );
    return;
  }

  assetsNode.innerHTML = assets
    .map((asset) => {
      const size = formatSize(asset.size);
      const safeName = escapeHtml(asset.name);
      const safePlatform = escapeHtml(getPlatformLabel(asset.name));
      const checksum = checksums.get(asset.name);
      const checksumLine = checksum
        ? `<code class="checksum" title="${checksum}">SHA256 ${checksum}</code>`
        : `<small class="checksum-note">SHA256은 다음 릴리스부터 자동 표시됩니다.</small>`;

      return `
        <a class="asset-card" href="${asset.browser_download_url}">
          <span>
            <strong>${safePlatform}</strong>
            <small>${safeName}${size ? ` · ${size}` : ""}</small>
            ${checksumLine}
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
    await renderRelease(release);
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

function initScenarioSteps() {
  if (!scenarioStageNode || storyStepNodes.length === 0) {
    return;
  }

  let activeIndex = Math.max(
    0,
    storyStepNodes.findIndex((step) => step.classList.contains("is-active")),
  );
  let cycleTimerId;

  const activateStep = (activeStep) => {
    const scene = activeStep.dataset.scene;

    if (!scene) {
      return;
    }

    activeIndex = storyStepNodes.indexOf(activeStep);
    scenarioStageNode.dataset.scene = scene;
    storyStepNodes.forEach((step) => {
      const isActive = step === activeStep;

      step.classList.toggle("is-active", isActive);
      step.setAttribute("aria-current", isActive ? "step" : "false");
    });
  };

  const activateStepByIndex = (nextIndex) => {
    const normalizedIndex =
      (nextIndex + storyStepNodes.length) % storyStepNodes.length;

    activateStep(storyStepNodes[normalizedIndex]);
  };

  const stopCycle = () => {
    window.clearInterval(cycleTimerId);
    cycleTimerId = undefined;
  };

  const startCycle = () => {
    stopCycle();
    cycleTimerId = window.setInterval(() => {
      activateStepByIndex(activeIndex + 1);
    }, scenarioCycleDelayMs);
  };

  storyStepNodes.forEach((step, index) => {
    step.tabIndex = 0;
    step.setAttribute("role", "button");

    step.addEventListener("pointerenter", () => {
      stopCycle();
      activateStepByIndex(index);
    });

    step.addEventListener("pointerleave", startCycle);
    step.addEventListener("focus", () => {
      stopCycle();
      activateStepByIndex(index);
    });
    step.addEventListener("blur", startCycle);
    step.addEventListener("click", () => {
      activateStepByIndex(index);
      startCycle();
    });
    step.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      activateStepByIndex(index);
      startCycle();
    });
  });

  activateStepByIndex(activeIndex);
  startCycle();
}

initScenarioSteps();
void loadLatestRelease();
