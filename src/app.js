import { COLORS, FAMILIES, PALETTE_SOURCE } from "./bianca-colors.js";

const STORAGE_KEY = "bianca-house-simulator-masks-v4";
const MAX_CANVAS_SIDE = 2200;
const HOUSE_IMAGE_SRC = "/ev.jpg";

const defaultMasks = [
  {
    id: "main",
    label: "Ana cephe",
    enabled: true,
    points: [
      [0.0, 0.153],
      [0.772, 0.12],
      [0.765, 0.158],
      [0.729, 0.398],
      [0.693, 0.407],
      [0.693, 0.445],
      [0.544, 0.445],
      [0.542, 0.421],
      [0.0, 0.417],
    ],
    holes: [
      [
        [0.104, 0.229],
        [0.272, 0.225],
        [0.272, 0.337],
        [0.101, 0.337],
      ],
      [
        [0.351, 0.223],
        [0.455, 0.222],
        [0.452, 0.331],
        [0.35, 0.329],
      ],
      [
        [0.53, 0.201],
        [0.703, 0.199],
        [0.7, 0.39],
        [0.527, 0.39],
      ],
      [
        [0.209, 0.357],
        [0.277, 0.358],
        [0.276, 0.417],
        [0.209, 0.416],
      ],
      [
        [0.388, 0.354],
        [0.448, 0.355],
        [0.447, 0.416],
        [0.388, 0.415],
      ],
      [
        [0.544, 0.359],
        [0.62, 0.359],
        [0.62, 0.475],
        [0.544, 0.475],
      ],
    ],
  },
  {
    id: "base",
    label: "Alt kaide",
    enabled: true,
    points: [
      [0.0, 0.417],
      [0.544, 0.421],
      [0.544, 0.475],
      [0.0, 0.477],
    ],
    holes: [
      [
        [0.209, 0.357],
        [0.277, 0.358],
        [0.276, 0.417],
        [0.209, 0.416],
      ],
      [
        [0.388, 0.354],
        [0.448, 0.355],
        [0.447, 0.416],
        [0.388, 0.415],
      ],
      [
        [0.487, 0.446],
        [0.753, 0.445],
        [0.753, 0.595],
        [0.488, 0.595],
      ],
    ],
  },
  {
    id: "side",
    label: "Sağ yan",
    enabled: true,
    points: [
      [0.765, 0.158],
      [0.855, 0.189],
      [0.852, 0.3],
      [0.733, 0.398],
      [0.729, 0.315],
    ],
    holes: [
      [
        [0.768, 0.184],
        [0.829, 0.211],
        [0.83, 0.314],
        [0.764, 0.305],
      ],
    ],
  },
];

const state = {
  image: null,
  photoName: "Varsayılan önizleme",
  imageScale: 1,
  canvasWidth: 1200,
  canvasHeight: 1600,
  selectedColorIndex: Math.max(
    0,
    COLORS.findIndex((color) => color.name === "Kum Beji"),
  ),
  masks: loadMasks(),
  filterText: "",
  family: "Tümü",
  showOriginal: false,
  showMask: false,
  editMode: false,
  editAreaId: "main|outer",
  opacity: 0.72,
  speed: 900,
  isPlaying: false,
  moveMode: false,
  activePoint: null,
  draft: null,
  drag: null,
};

const dom = {
  canvas: document.querySelector("#paintCanvas"),
  photoName: document.querySelector("#photoName"),
  canvasSize: document.querySelector("#canvasSize"),
  downloadButton: document.querySelector("#downloadButton"),
  originalToggle: document.querySelector("#originalToggle"),
  maskToggle: document.querySelector("#maskToggle"),
  currentSwatch: document.querySelector("#currentSwatch"),
  currentName: document.querySelector("#currentName"),
  currentCode: document.querySelector("#currentCode"),
  currentHex: document.querySelector("#currentHex"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  playButton: document.querySelector("#playButton"),
  speedRange: document.querySelector("#speedRange"),
  opacityRange: document.querySelector("#opacityRange"),
  areaToggles: document.querySelector("#areaToggles"),
  editMaskToggle: document.querySelector("#editMaskToggle"),
  editAreaSelect: document.querySelector("#editAreaSelect"),
  moveTargetButton: document.querySelector("#moveTargetButton"),
  addHoleButton: document.querySelector("#addHoleButton"),
  addPointButton: document.querySelector("#addPointButton"),
  deletePointButton: document.querySelector("#deletePointButton"),
  deleteHoleButton: document.querySelector("#deleteHoleButton"),
  copyPositionButton: document.querySelector("#copyPositionButton"),
  drawPaintButton: document.querySelector("#drawPaintButton"),
  drawHoleButton: document.querySelector("#drawHoleButton"),
  finishDrawButton: document.querySelector("#finishDrawButton"),
  cancelDrawButton: document.querySelector("#cancelDrawButton"),
  clearMaskButton: document.querySelector("#clearMaskButton"),
  exportMaskButton: document.querySelector("#exportMaskButton"),
  targetPosition: document.querySelector("#targetPosition"),
  resetMaskButton: document.querySelector("#resetMaskButton"),
  searchInput: document.querySelector("#searchInput"),
  familySelect: document.querySelector("#familySelect"),
  swatchGrid: document.querySelector("#swatchGrid"),
  resultCount: document.querySelector("#resultCount"),
  sourceLink: document.querySelector("#sourceLink"),
};

const ctx = dom.canvas.getContext("2d", { willReadFrequently: false });
let playTimer = null;

async function init() {
  dom.sourceLink.href = PALETTE_SOURCE;
  state.image = await loadHouseImage();
  wireControls();
  renderFamilyOptions();
  renderAreaControls();
  renderAll();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function cloneMasks(masks) {
  return masks.map((mask) => ({
    ...mask,
    points: mask.points.map((point) => [...point]),
    holes: mask.holes.map((hole) => hole.map((point) => [...point])),
  }));
}

function loadMasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!Array.isArray(stored)) {
      return cloneMasks(defaultMasks);
    }

    return stored
      .map((saved, index) => ({
        id: saved.id || `paint-${index + 1}`,
        label: saved.label || `Boya alanı ${index + 1}`,
        enabled: saved.enabled ?? true,
        points: Array.isArray(saved.points) ? saved.points.map((point) => [...point]) : [],
        holes: Array.isArray(saved.holes)
          ? saved.holes.map((hole) => hole.map((point) => [...point]))
          : [],
      }))
      .filter((mask) => mask.points.length >= 3);
  } catch {
    return cloneMasks(defaultMasks);
  }
}

function saveMasks() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      state.masks.map((mask) => ({
        id: mask.id,
        label: mask.label,
        enabled: mask.enabled,
        points: mask.points,
        holes: mask.holes,
      })),
    ),
  );
}

function wireControls() {
  dom.downloadButton.addEventListener("click", downloadCanvas);

  dom.originalToggle.addEventListener("change", () => {
    state.showOriginal = dom.originalToggle.checked;
    renderCanvas();
  });

  dom.maskToggle.addEventListener("change", () => {
    state.showMask = dom.maskToggle.checked;
    renderCanvas();
  });

  dom.prevButton.addEventListener("click", () => stepColor(-1));
  dom.nextButton.addEventListener("click", () => stepColor(1));
  dom.playButton.addEventListener("click", togglePlayback);

  dom.speedRange.addEventListener("input", () => {
    state.speed = Number(dom.speedRange.value);
    if (state.isPlaying) {
      stopPlayback();
      startPlayback();
    }
  });

  dom.opacityRange.addEventListener("input", () => {
    state.opacity = Number(dom.opacityRange.value) / 100;
    renderCanvas();
  });

  dom.editMaskToggle.addEventListener("change", () => {
    state.editMode = dom.editMaskToggle.checked;
    state.showMask = state.showMask || state.editMode;
    state.activePoint = null;
    state.moveMode = false;
    state.draft = null;
    dom.maskToggle.checked = state.showMask;
    dom.canvas.classList.toggle("is-editing", state.editMode);
    renderCanvas();
  });

  dom.editAreaSelect.addEventListener("change", () => {
    state.editAreaId = dom.editAreaSelect.value;
    state.activePoint = null;
    state.moveMode = false;
    state.draft = null;
    renderCanvas();
  });

  dom.moveTargetButton.addEventListener("click", () => {
    if (!state.editMode) return;
    state.moveMode = !state.moveMode;
    state.activePoint = null;
    renderCanvas();
  });

  dom.addHoleButton.addEventListener("click", () => {
    addNoPaintArea();
  });

  dom.addPointButton.addEventListener("click", () => {
    addPointAtLongestEdge();
  });

  dom.deletePointButton.addEventListener("click", () => {
    deleteActivePoint();
  });

  dom.deleteHoleButton.addEventListener("click", () => {
    deleteSelectedNoPaintArea();
  });

  dom.copyPositionButton.addEventListener("click", async () => {
    const text = getTargetPositionText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Konum", text);
    }
  });

  dom.drawPaintButton.addEventListener("click", () => {
    startDraft("paint");
  });

  dom.drawHoleButton.addEventListener("click", () => {
    startDraft("hole");
  });

  dom.finishDrawButton.addEventListener("click", () => {
    finishDraft();
  });

  dom.cancelDrawButton.addEventListener("click", () => {
    cancelDraft();
  });

  dom.clearMaskButton.addEventListener("click", () => {
    state.masks = [];
    state.editAreaId = "";
    state.activePoint = null;
    state.moveMode = false;
    state.draft = null;
    saveMasks();
    renderAreaControls();
    renderCanvas();
  });

  dom.exportMaskButton.addEventListener("click", () => {
    copyMaskExport();
  });

  dom.resetMaskButton.addEventListener("click", () => {
    state.masks = cloneMasks(defaultMasks);
    state.activePoint = null;
    state.moveMode = false;
    state.draft = null;
    saveMasks();
    renderAreaControls();
    renderCanvas();
  });

  dom.searchInput.addEventListener("input", () => {
    state.filterText = dom.searchInput.value.trim().toLocaleLowerCase("tr");
    renderPalette();
  });

  dom.familySelect.addEventListener("change", () => {
    state.family = dom.familySelect.value;
    renderPalette();
  });

  dom.swatchGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".swatch");
    if (!button) return;
    setColor(Number(button.dataset.colorIndex));
  });

  dom.canvas.addEventListener("pointerdown", startMaskDrag);
  dom.canvas.addEventListener("pointermove", moveMaskPoint);
  dom.canvas.addEventListener("pointerup", endMaskDrag);
  dom.canvas.addEventListener("pointercancel", endMaskDrag);

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      return;
    }

    if (state.editMode && event.key.startsWith("Arrow")) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
      const dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
      if (state.moveMode) {
        nudgeEditTarget(dx, dy);
      } else if (state.activePoint) {
        nudgeActivePoint(dx, dy);
      }
      return;
    }

    if (event.key === "ArrowRight") {
      stepColor(1);
    }
    if (event.key === "ArrowLeft") {
      stepColor(-1);
    }
  });
}

function renderAll() {
  renderCurrentColor();
  renderPalette();
  renderCanvas();
}

function renderFamilyOptions() {
  const options = ["Tümü", ...FAMILIES];
  dom.familySelect.replaceChildren(
    ...options.map((family) => {
      const option = document.createElement("option");
      option.value = family;
      option.textContent = family;
      return option;
    }),
  );
}

function renderAreaControls() {
  dom.areaToggles.replaceChildren(
    ...state.masks.map((mask) => {
      const label = document.createElement("label");
      label.className = "area-toggle";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = mask.enabled;
      input.addEventListener("change", () => {
        mask.enabled = input.checked;
        saveMasks();
        renderCanvas();
      });

      const text = document.createElement("span");
      text.textContent = mask.label;

      label.append(input, text);
      return label;
    }),
  );

  dom.editAreaSelect.replaceChildren(
    ...state.masks.flatMap((mask) => {
      const outer = document.createElement("option");
      outer.value = getEditValue(mask.id, "outer");
      outer.textContent = `${mask.label} - Dış çizgi`;

      const holes = mask.holes.map((_, holeIndex) => {
        const option = document.createElement("option");
        option.value = getEditValue(mask.id, "hole", holeIndex);
        option.textContent = `${mask.label} - Boyanmayacak ${holeIndex + 1}`;
        return option;
      });

      return [outer, ...holes];
    }),
  );
  if (!state.masks.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Boya alanı yok";
    dom.editAreaSelect.replaceChildren(option);
    state.editAreaId = "";
    dom.editAreaSelect.value = "";
    return;
  }
  if (!dom.editAreaSelect.querySelector(`option[value="${state.editAreaId}"]`)) {
    state.editAreaId = dom.editAreaSelect.options[0]?.value || "main|outer";
  }
  dom.editAreaSelect.value = state.editAreaId;
}

function renderCurrentColor() {
  const color = COLORS[state.selectedColorIndex];
  dom.currentSwatch.style.backgroundColor = color.hex;
  dom.currentName.textContent = color.name;
  dom.currentCode.textContent = `Kod ${color.code}`;
  dom.currentHex.textContent = color.hex.toUpperCase();
}

function getFilteredColors() {
  return COLORS.map((color, index) => ({ color, index })).filter(({ color }) => {
    const familyMatches = state.family === "Tümü" || color.family === state.family;
    if (!familyMatches) return false;
    if (!state.filterText) return true;

    const haystack = `${color.name} ${color.code} ${color.hex}`
      .toLocaleLowerCase("tr")
      .replace("#", "");
    const needle = state.filterText.replace("#", "");
    return haystack.includes(needle);
  });
}

function renderPalette() {
  const filtered = getFilteredColors();
  dom.resultCount.textContent = `${filtered.length} renk`;

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-result";
    empty.textContent = "Sonuç yok";
    dom.swatchGrid.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const { color, index } of filtered) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.dataset.colorIndex = String(index);
    button.setAttribute("aria-label", `${color.name}, ${color.code}, ${color.hex}`);
    if (index === state.selectedColorIndex) {
      button.classList.add("is-selected");
    }

    const chip = document.createElement("span");
    chip.className = "swatch-chip";
    chip.style.backgroundColor = color.hex;

    const text = document.createElement("span");
    text.className = "swatch-text";

    const name = document.createElement("span");
    name.className = "swatch-name";
    name.textContent = color.name;

    const code = document.createElement("span");
    code.className = "swatch-code";
    code.textContent = `${color.code} · ${color.hex.toUpperCase()}`;

    text.append(name, code);
    button.append(chip, text);
    fragment.append(button);
  }

  dom.swatchGrid.replaceChildren(fragment);
}

function setColor(index) {
  if (!Number.isInteger(index) || !COLORS[index]) return;
  state.selectedColorIndex = index;
  renderCurrentColor();
  renderPaletteSelection();
  renderCanvas();
}

function renderPaletteSelection() {
  dom.swatchGrid.querySelectorAll(".swatch.is-selected").forEach((button) => {
    button.classList.remove("is-selected");
  });

  const selected = dom.swatchGrid.querySelector(`[data-color-index="${state.selectedColorIndex}"]`);
  if (selected) {
    selected.classList.add("is-selected");
    selected.scrollIntoView({ block: "nearest" });
  }
}

function stepColor(direction) {
  const filtered = getFilteredColors();
  if (!filtered.length) return;

  const currentPosition = filtered.findIndex(({ index }) => index === state.selectedColorIndex);
  const nextPosition =
    currentPosition === -1
      ? 0
      : (currentPosition + direction + filtered.length) % filtered.length;

  setColor(filtered[nextPosition].index);
}

function togglePlayback() {
  if (state.isPlaying) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  state.isPlaying = true;
  dom.playButton.classList.add("is-playing");
  dom.playButton.querySelector("span").textContent = "Durdur";
  const icon = dom.playButton.querySelector("i");
  icon.setAttribute("data-lucide", "pause");
  refreshIcons();

  playTimer = window.setInterval(() => stepColor(1), state.speed);
}

function stopPlayback() {
  state.isPlaying = false;
  window.clearInterval(playTimer);
  playTimer = null;
  dom.playButton.classList.remove("is-playing");
  dom.playButton.querySelector("span").textContent = "Tek tek uygula";
  const icon = dom.playButton.querySelector("i");
  icon.setAttribute("data-lucide", "play");
  refreshIcons();
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadHouseImage() {
  try {
    const image = await loadImage(`${HOUSE_IMAGE_SRC}?v=${Date.now()}`);
    state.photoName = "ev.jpg";
    return image;
  } catch {
    state.photoName = "assets/ev.jpg bulunamadı";
    return createGuideImage();
  }
}

function createGuideImage() {
  const guide = document.createElement("canvas");
  guide.width = 1200;
  guide.height = 1600;
  const guideCtx = guide.getContext("2d");

  guideCtx.fillStyle = "#77b5e7";
  guideCtx.fillRect(0, 0, 1200, 760);
  guideCtx.fillStyle = "#7fa866";
  guideCtx.fillRect(0, 760, 1200, 840);
  guideCtx.fillStyle = "#b9aa92";
  guideCtx.fillRect(0, 930, 1200, 670);

  guideCtx.fillStyle = "#f6f5f0";
  guideCtx.beginPath();
  guideCtx.moveTo(64, 392);
  guideCtx.lineTo(875, 392);
  guideCtx.lineTo(844, 744);
  guideCtx.lineTo(798, 748);
  guideCtx.lineTo(798, 824);
  guideCtx.lineTo(24, 824);
  guideCtx.lineTo(24, 440);
  guideCtx.closePath();
  guideCtx.fill();

  guideCtx.fillStyle = "#e9e7df";
  guideCtx.beginPath();
  guideCtx.moveTo(883, 395);
  guideCtx.lineTo(1015, 455);
  guideCtx.lineTo(1010, 666);
  guideCtx.lineTo(838, 746);
  guideCtx.lineTo(860, 578);
  guideCtx.closePath();
  guideCtx.fill();

  guideCtx.fillStyle = "#9f3e2f";
  guideCtx.beginPath();
  guideCtx.moveTo(0, 342);
  guideCtx.lineTo(880, 334);
  guideCtx.lineTo(1040, 454);
  guideCtx.lineTo(1018, 484);
  guideCtx.lineTo(858, 410);
  guideCtx.lineTo(50, 420);
  guideCtx.closePath();
  guideCtx.fill();

  guideCtx.fillStyle = "#bc503f";
  guideCtx.fillRect(22, 822, 778, 118);

  drawWindow(174, 485, 166, 132, guideCtx);
  drawWindow(426, 508, 132, 126, guideCtx);
  drawWindow(636, 446, 210, 246, guideCtx);
  drawWindow(925, 512, 68, 108, guideCtx);
  drawDoor(660, 750, 92, 190, guideCtx);
  drawWindow(288, 740, 78, 84, guideCtx);
  drawWindow(476, 728, 76, 88, guideCtx);

  return loadImage(guide.toDataURL("image/png"));
}

function drawWindow(x, y, width, height, targetCtx) {
  targetCtx.fillStyle = "#f8fbff";
  targetCtx.fillRect(x, y, width, height);
  targetCtx.strokeStyle = "#9db5c6";
  targetCtx.lineWidth = 8;
  targetCtx.strokeRect(x, y, width, height);
  targetCtx.lineWidth = 5;
  targetCtx.beginPath();
  targetCtx.moveTo(x + width / 2, y);
  targetCtx.lineTo(x + width / 2, y + height);
  targetCtx.moveTo(x, y + height * 0.44);
  targetCtx.lineTo(x + width, y + height * 0.44);
  targetCtx.stroke();
  targetCtx.fillStyle = "rgba(60, 99, 130, 0.18)";
  targetCtx.fillRect(x + 10, y + 10, width - 20, height - 20);
}

function drawDoor(x, y, width, height, targetCtx) {
  targetCtx.fillStyle = "#f5f3ec";
  targetCtx.fillRect(x, y, width, height);
  targetCtx.strokeStyle = "#b9b4aa";
  targetCtx.lineWidth = 7;
  targetCtx.strokeRect(x, y, width, height);
  targetCtx.fillStyle = "#d6d1c7";
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      targetCtx.fillRect(x + 14 + col * 34, y + 18 + row * 32, 18, 18);
    }
  }
}

function renderCanvas() {
  if (!state.image) return;

  const imageWidth = state.image.naturalWidth || state.image.width;
  const imageHeight = state.image.naturalHeight || state.image.height;
  const scale = Math.min(1, MAX_CANVAS_SIDE / Math.max(imageWidth, imageHeight));
  state.imageScale = scale;
  state.canvasWidth = Math.round(imageWidth * scale);
  state.canvasHeight = Math.round(imageHeight * scale);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  dom.canvas.width = Math.round(state.canvasWidth * dpr);
  dom.canvas.height = Math.round(state.canvasHeight * dpr);
  dom.canvas.style.aspectRatio = `${state.canvasWidth} / ${state.canvasHeight}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
  ctx.drawImage(state.image, 0, 0, state.canvasWidth, state.canvasHeight);

  if (!state.showOriginal) {
    paintMasks();
  }

  if (state.showMask || state.editMode) {
    drawMaskGuides();
  }

  dom.photoName.textContent = state.photoName;
  dom.canvasSize.textContent = `${state.canvasWidth} x ${state.canvasHeight}`;
  syncEditTools();
}

function paintMasks() {
  const color = COLORS[state.selectedColorIndex];

  for (const mask of state.masks) {
    if (!mask.enabled) continue;
    const path = buildMaskPath(mask);

    ctx.save();
    ctx.clip(path, "evenodd");
    ctx.globalAlpha = state.opacity;
    ctx.globalCompositeOperation = "color";
    ctx.fillStyle = color.hex;
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

    ctx.globalAlpha = Math.min(0.2, state.opacity * 0.28);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = color.hex;
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawMaskGuides() {
  const editTarget = getEditTarget();

  for (const mask of state.masks) {
    const active = editTarget.mask?.id === mask.id;
    const path = buildMaskPath(mask);

    ctx.save();
    ctx.strokeStyle = active ? "#ffffff" : "rgba(255, 255, 255, 0.65)";
    ctx.lineWidth = active ? 5 : 3;
    ctx.stroke(path);

    ctx.strokeStyle = active ? "#1c7972" : "rgba(31, 36, 33, 0.45)";
    ctx.lineWidth = active ? 2 : 1.5;
    ctx.stroke(path);
    ctx.restore();

    if (!active || !state.editMode) continue;

    drawNoPaintAreaGuides(mask, editTarget);

    if (state.moveMode) {
      drawTargetBounds(editTarget);
    }

    editTarget.points.forEach(([x, y], pointIndex) => {
      const selected = state.activePoint?.targetKey === editTarget.key && state.activePoint.pointIndex === pointIndex;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x * state.canvasWidth, y * state.canvasHeight, selected ? 10 : 8, 0, Math.PI * 2);
      ctx.fillStyle = selected ? "#1c7972" : "#ffffff";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#b44134";
      ctx.stroke();
      ctx.restore();
    });
  }

  drawDraftGuides();
}

function drawDraftGuides() {
  if (!state.draft?.points.length) return;

  ctx.save();
  ctx.strokeStyle = state.draft.kind === "paint" ? "#1c7972" : "#b44134";
  ctx.fillStyle = state.draft.kind === "paint" ? "rgba(28, 121, 114, 0.16)" : "rgba(180, 65, 52, 0.16)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  state.draft.points.forEach(([x, y], index) => {
    const px = x * state.canvasWidth;
    const py = y * state.canvasHeight;
    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });
  if (state.draft.points.length > 2) {
    ctx.closePath();
    ctx.fill();
  }
  ctx.stroke();

  state.draft.points.forEach(([x, y], index) => {
    ctx.beginPath();
    ctx.arc(x * state.canvasWidth, y * state.canvasHeight, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = state.draft.kind === "paint" ? "#1c7972" : "#b44134";
    ctx.stroke();
    ctx.fillStyle = state.draft.kind === "paint" ? "#1c7972" : "#b44134";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), x * state.canvasWidth, y * state.canvasHeight);
  });
  ctx.restore();
}

function drawNoPaintAreaGuides(mask, editTarget) {
  mask.holes.forEach((hole, holeIndex) => {
    const selected = editTarget.kind === "hole" && editTarget.mask.id === mask.id && editTarget.holeIndex === holeIndex;
    const path = new Path2D();
    addPolygon(path, hole);

    ctx.save();
    ctx.strokeStyle = selected ? "#b44134" : "rgba(180, 65, 52, 0.78)";
    ctx.lineWidth = selected ? 3 : 2;
    ctx.setLineDash(selected ? [] : [7, 5]);
    ctx.stroke(path);
    ctx.restore();

    const center = getPolygonCenter(hole);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center.x * state.canvasWidth, center.y * state.canvasHeight, selected ? 13 : 11, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "#b44134" : "rgba(255, 255, 255, 0.92)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#b44134";
    ctx.stroke();
    ctx.fillStyle = selected ? "#ffffff" : "#b44134";
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(holeIndex + 1), center.x * state.canvasWidth, center.y * state.canvasHeight);
    ctx.restore();
  });
}

function drawTargetBounds(target) {
  const box = getPointBounds(target.points);
  ctx.save();
  ctx.setLineDash([8, 7]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#b44134";
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();
}

function buildMaskPath(mask) {
  const path = new Path2D();
  addPolygon(path, mask.points);
  for (const hole of mask.holes) {
    addPolygon(path, hole);
  }
  return path;
}

function addPolygon(path, points) {
  points.forEach(([x, y], index) => {
    const px = x * state.canvasWidth;
    const py = y * state.canvasHeight;
    if (index === 0) {
      path.moveTo(px, py);
    } else {
      path.lineTo(px, py);
    }
  });
  path.closePath();
}

function startMaskDrag(event) {
  if (!state.editMode) return;

  const position = getCanvasPosition(event);
  if (state.draft) {
    addDraftPoint(position);
    return;
  }

  let target = getEditTarget();
  if (!target.mask) return;
  const hitTarget = findEditableTargetAt(position);

  if (hitTarget && hitTarget.key !== target.key) {
    state.editAreaId = hitTarget.key;
    dom.editAreaSelect.value = state.editAreaId;
    state.activePoint = null;
    target = getEditTarget();

    if (!state.moveMode) {
      renderCanvas();
      return;
    }
  }

  if (state.moveMode) {
    if (!isPointInPolygon(position, target.points) && !findNearestEdge(target.points, position)) return;
    const groups = getMovePointGroups(target);
    state.drag = {
      mode: "move",
      start: position,
      groups,
      originalGroups: groups.map((points) => points.map((point) => [...point])),
    };
    state.activePoint = null;
    dom.canvas.setPointerCapture(event.pointerId);
    dom.canvas.classList.add("is-dragging");
    syncEditTools();
    renderCanvas();
    return;
  }

  let nearest = findNearestPoint(target.points, position);

  if (!nearest) {
    const edge = findNearestEdge(target.points, position);
    if (!edge) return;
    target.points.splice(edge.insertIndex, 0, [
      clamp(position.x / state.canvasWidth, 0, 1),
      clamp(position.y / state.canvasHeight, 0, 1),
    ]);
    nearest = { pointIndex: edge.insertIndex };
  }

  state.activePoint = { targetKey: target.key, pointIndex: nearest.pointIndex };
  state.drag = { mode: "point", pointIndex: nearest.pointIndex };
  dom.canvas.setPointerCapture(event.pointerId);
  dom.canvas.classList.add("is-dragging");
  syncEditTools();
  renderCanvas();
}

function moveMaskPoint(event) {
  if (!state.drag) return;

  const target = getEditTarget();
  const position = getCanvasPosition(event);

  if (state.drag.mode === "move") {
    const dx = (position.x - state.drag.start.x) / state.canvasWidth;
    const dy = (position.y - state.drag.start.y) / state.canvasHeight;
    state.drag.groups.forEach((points, groupIndex) => {
      points.forEach((point, pointIndex) => {
        const original = state.drag.originalGroups[groupIndex][pointIndex];
        point[0] = clamp(original[0] + dx, 0, 1);
        point[1] = clamp(original[1] + dy, 0, 1);
      });
    });
    renderCanvas();
    return;
  }

  const point = target.points[state.drag.pointIndex];
  point[0] = clamp(position.x / state.canvasWidth, 0, 1);
  point[1] = clamp(position.y / state.canvasHeight, 0, 1);
  renderCanvas();
}

function endMaskDrag(event) {
  if (!state.drag) return;
  if (dom.canvas.hasPointerCapture(event.pointerId)) {
    dom.canvas.releasePointerCapture(event.pointerId);
  }
  state.drag = null;
  dom.canvas.classList.remove("is-dragging");
  saveMasks();
}

function getEditValue(maskId, kind = "outer", holeIndex = 0) {
  return kind === "hole" ? `${maskId}|hole|${holeIndex}` : `${maskId}|outer`;
}

function parseEditValue(value) {
  const [maskId, kind = "outer", holeIndex = "0"] = String(value).split("|");
  return { maskId, kind, holeIndex: Number(holeIndex) || 0 };
}

function getEditTarget() {
  const parsed = parseEditValue(state.editAreaId);
  const mask = state.masks.find((item) => item.id === parsed.maskId) || state.masks[0];
  if (!mask) {
    return { mask: null, kind: "none", holeIndex: 0, points: [], key: "" };
  }
  const kind = parsed.kind === "hole" ? "hole" : "outer";
  const holeIndex = clamp(parsed.holeIndex, 0, Math.max(0, mask.holes.length - 1));
  const points = kind === "hole" ? mask.holes[holeIndex] : mask.points;
  const key = getEditValue(mask.id, kind, holeIndex);

  if (state.editAreaId !== key) {
    state.editAreaId = key;
  }

  return { mask, kind, holeIndex, points, key };
}

function addPointAtLongestEdge() {
  if (!state.editMode) return;
  const target = getEditTarget();
  const edge = findLongestEdge(target.points);
  if (!edge) return;

  const start = target.points[edge.startIndex];
  const end = target.points[edge.endIndex];
  const point = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
  target.points.splice(edge.insertIndex, 0, point);
  state.activePoint = { targetKey: target.key, pointIndex: edge.insertIndex };
  saveMasks();
  syncEditTools();
  renderCanvas();
}

function addNoPaintArea() {
  if (!state.editMode) return;
  const target = getEditTarget();
  const sourceBox = getPointBounds(target.points);
  const width = Math.min(Math.max(sourceBox.wp * 0.38, 0.055), 0.13);
  const height = Math.min(Math.max(sourceBox.hp * 0.38, 0.045), 0.11);
  const cx = clamp(sourceBox.xp + sourceBox.wp / 2 + 0.018, width / 2, 1 - width / 2);
  const cy = clamp(sourceBox.yp + sourceBox.hp / 2 + 0.018, height / 2, 1 - height / 2);
  const hole = [
    [cx - width / 2, cy - height / 2],
    [cx + width / 2, cy - height / 2],
    [cx + width / 2, cy + height / 2],
    [cx - width / 2, cy + height / 2],
  ];

  target.mask.holes.push(hole);
  state.editAreaId = getEditValue(target.mask.id, "hole", target.mask.holes.length - 1);
  state.activePoint = null;
  state.moveMode = true;
  saveMasks();
  renderAreaControls();
  renderCanvas();
}

function startDraft(kind) {
  state.editMode = true;
  state.showMask = true;
  dom.editMaskToggle.checked = true;
  dom.maskToggle.checked = true;
  dom.canvas.classList.add("is-editing");

  const target = getEditTarget();
  if (kind === "hole" && !target.mask) {
    kind = "paint";
  }

  state.draft = {
    kind,
    maskId: kind === "hole" ? target.mask.id : null,
    points: [],
  };
  state.activePoint = null;
  state.moveMode = false;
  renderCanvas();
}

function addDraftPoint(position) {
  state.draft.points.push([
    clamp(position.x / state.canvasWidth, 0, 1),
    clamp(position.y / state.canvasHeight, 0, 1),
  ]);
  renderCanvas();
}

function finishDraft() {
  if (!state.draft) return;
  if (state.draft.points.length < 3) {
    cancelDraft();
    return;
  }

  if (state.draft.kind === "paint") {
    const id = `paint-${Date.now()}`;
    const label = `Boya alanı ${state.masks.length + 1}`;
    state.masks.push({
      id,
      label,
      enabled: true,
      points: state.draft.points.map((point) => [...point]),
      holes: [],
    });
    state.editAreaId = getEditValue(id, "outer");
  } else {
    const mask = state.masks.find((item) => item.id === state.draft.maskId) || getEditTarget().mask;
    if (mask) {
      mask.holes.push(state.draft.points.map((point) => [...point]));
      state.editAreaId = getEditValue(mask.id, "hole", mask.holes.length - 1);
    }
  }

  state.draft = null;
  state.activePoint = null;
  state.moveMode = false;
  saveMasks();
  renderAreaControls();
  renderCanvas();
}

function cancelDraft() {
  state.draft = null;
  renderCanvas();
}

function deleteActivePoint() {
  if (!state.editMode) return;
  const target = getEditTarget();
  if (!state.activePoint || state.activePoint.targetKey !== target.key) return;
  if (target.points.length <= 3) return;

  target.points.splice(state.activePoint.pointIndex, 1);
  state.activePoint = null;
  saveMasks();
  syncEditTools();
  renderCanvas();
}

function deleteSelectedNoPaintArea() {
  if (!state.editMode) return;
  const target = getEditTarget();
  if (target.kind !== "hole") return;

  target.mask.holes.splice(target.holeIndex, 1);
  state.editAreaId = getEditValue(target.mask.id, "outer");
  state.activePoint = null;
  state.moveMode = false;
  saveMasks();
  renderAreaControls();
  renderCanvas();
}

function nudgeActivePoint(dx, dy) {
  const target = getEditTarget();
  if (!state.activePoint || state.activePoint.targetKey !== target.key) return;

  const point = target.points[state.activePoint.pointIndex];
  if (!point) return;
  point[0] = clamp(point[0] + dx / state.canvasWidth, 0, 1);
  point[1] = clamp(point[1] + dy / state.canvasHeight, 0, 1);
  saveMasks();
  renderCanvas();
}

function nudgeEditTarget(dx, dy) {
  if (!state.editMode) return;
  const target = getEditTarget();
  const groups = getMovePointGroups(target);
  const nx = dx / state.canvasWidth;
  const ny = dy / state.canvasHeight;

  groups.forEach((points) => {
    points.forEach((point) => {
      point[0] = clamp(point[0] + nx, 0, 1);
      point[1] = clamp(point[1] + ny, 0, 1);
    });
  });

  saveMasks();
  renderCanvas();
}

function getMovePointGroups(target) {
  if (target.kind === "outer") {
    return [target.mask.points, ...target.mask.holes];
  }

  return [target.points];
}

function syncEditTools() {
  const disabled = !state.editMode;
  const target = state.editMode ? getEditTarget() : null;
  const targetText = getTargetPositionText();
  dom.targetPosition.textContent = targetText;
  dom.moveTargetButton.disabled = disabled;
  dom.moveTargetButton.classList.toggle("is-active", state.editMode && state.moveMode && !state.draft);
  dom.addHoleButton.disabled = disabled || Boolean(state.draft);
  dom.addPointButton.disabled = disabled || Boolean(state.draft) || !target?.mask;
  dom.deletePointButton.disabled = disabled || Boolean(state.draft) || !state.activePoint;
  dom.deleteHoleButton.disabled = disabled || Boolean(state.draft) || target?.kind !== "hole";
  dom.copyPositionButton.disabled = disabled;
  dom.drawPaintButton.disabled = disabled && !state.draft;
  dom.drawPaintButton.classList.toggle("is-active", state.draft?.kind === "paint");
  dom.drawHoleButton.disabled = disabled || (!target?.mask && !state.draft);
  dom.drawHoleButton.classList.toggle("is-active", state.draft?.kind === "hole");
  dom.finishDrawButton.disabled = !state.draft || state.draft.points.length < 3;
  dom.cancelDrawButton.disabled = !state.draft;
  dom.clearMaskButton.disabled = disabled || (!state.masks.length && !state.draft);
  dom.exportMaskButton.disabled = !state.masks.length;
}

function getTargetPositionText() {
  if (state.draft) {
    const name = state.draft.kind === "paint" ? "Boya alanı çiziliyor" : "Boyanmayacak alan çiziliyor";
    return `${name} · ${state.draft.points.length} nokta`;
  }

  if (!state.editMode) {
    return "Maskeyi düzenle açılınca konum burada görünür";
  }

  const target = getEditTarget();
  if (!target.mask) {
    return "Boya alanı yok";
  }
  const box = getPointBounds(target.points);
  const name =
    target.kind === "outer"
      ? `${target.mask.label} dış çizgi`
      : `${target.mask.label} boyanmayacak ${target.holeIndex + 1}`;

  return [
    name,
    `x=${Math.round(box.x)}px`,
    `y=${Math.round(box.y)}px`,
    `w=${Math.round(box.width)}px`,
    `h=${Math.round(box.height)}px`,
    `xp=${box.xp.toFixed(3)}`,
    `yp=${box.yp.toFixed(3)}`,
  ].join(" · ");
}

function getPointBounds(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX * state.canvasWidth,
    y: minY * state.canvasHeight,
    width: (maxX - minX) * state.canvasWidth,
    height: (maxY - minY) * state.canvasHeight,
    xp: minX,
    yp: minY,
    wp: maxX - minX,
    hp: maxY - minY,
  };
}

function getPolygonCenter(points) {
  const bounds = getPointBounds(points);
  return {
    x: bounds.xp + bounds.wp / 2,
    y: bounds.yp + bounds.hp / 2,
  };
}

function getCanvasPosition(event) {
  const rect = dom.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * state.canvasWidth,
    y: ((event.clientY - rect.top) / rect.height) * state.canvasHeight,
  };
}

function findEditableTargetAt(position) {
  for (const mask of state.masks) {
    for (let holeIndex = 0; holeIndex < mask.holes.length; holeIndex += 1) {
      if (isPointInPolygon(position, mask.holes[holeIndex])) {
        return {
          key: getEditValue(mask.id, "hole", holeIndex),
          mask,
          kind: "hole",
          holeIndex,
          points: mask.holes[holeIndex],
        };
      }
    }
  }

  for (const mask of state.masks) {
    if (isPointInPolygon(position, mask.points)) {
      return {
        key: getEditValue(mask.id, "outer"),
        mask,
        kind: "outer",
        holeIndex: 0,
        points: mask.points,
      };
    }
  }

  return null;
}

function findNearestPoint(points, position) {
  const hitRadius = Math.max(18, Math.min(state.canvasWidth, state.canvasHeight) * 0.018);
  let nearest = null;
  let nearestDistance = hitRadius;

  points.forEach(([x, y], pointIndex) => {
    const dx = x * state.canvasWidth - position.x;
    const dy = y * state.canvasHeight - position.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= nearestDistance) {
      nearest = { pointIndex };
      nearestDistance = distance;
    }
  });

  return nearest;
}

function findNearestEdge(points, position) {
  const hitRadius = Math.max(16, Math.min(state.canvasWidth, state.canvasHeight) * 0.016);
  let nearest = null;
  let nearestDistance = hitRadius;

  points.forEach((start, startIndex) => {
    const endIndex = (startIndex + 1) % points.length;
    const end = points[endIndex];
    const distance = distanceToSegment(
      position,
      { x: start[0] * state.canvasWidth, y: start[1] * state.canvasHeight },
      { x: end[0] * state.canvasWidth, y: end[1] * state.canvasHeight },
    );

    if (distance <= nearestDistance) {
      nearest = { startIndex, endIndex, insertIndex: endIndex };
      nearestDistance = distance;
    }
  });

  return nearest;
}

function findLongestEdge(points) {
  if (points.length < 2) return null;
  let longest = null;
  let longestDistance = -1;

  points.forEach((start, startIndex) => {
    const endIndex = (startIndex + 1) % points.length;
    const end = points[endIndex];
    const distance = Math.hypot(
      (end[0] - start[0]) * state.canvasWidth,
      (end[1] - start[1]) * state.canvasHeight,
    );

    if (distance > longestDistance) {
      longest = { startIndex, endIndex, insertIndex: endIndex };
      longestDistance = distance;
    }
  });

  return longest;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  const x = start.x + t * dx;
  const y = start.y + t * dy;
  return Math.hypot(point.x - x, point.y - y);
}

function isPointInPolygon(position, points) {
  const x = position.x / state.canvasWidth;
  const y = position.y / state.canvasHeight;
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function downloadCanvas() {
  const color = COLORS[state.selectedColorIndex];
  const anchor = document.createElement("a");
  anchor.download = `ev-renk-${slugify(color.name)}-${color.code}.png`;
  anchor.href = dom.canvas.toDataURL("image/png");
  anchor.click();
}

function slugify(value) {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

init();
