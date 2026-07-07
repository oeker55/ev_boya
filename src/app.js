import { COLORS, FAMILIES, PALETTE_SOURCE } from "./bianca-colors.js";
import { defaultMasks } from "./defaultMasks.js";

const MAX_CANVAS_SIDE = 2200;
const DEFAULT_IMAGE_ID = "ev";
const DEFAULT_IMAGE_SETTINGS = {
  id: DEFAULT_IMAGE_ID,
  name: "ev.jpg",
  src: "/ev.jpg",
  opacity: 0.4,
  masks: defaultMasks,
  overlays: [],
};
const FLAG_SRC = "/bayrak.svg";
const DEFAULT_PRIMARY_COLOR_INDEX = Math.max(
  0,
  COLORS.findIndex((color) => color.name === "Kum Beji")
);
const DEFAULT_SECONDARY_COLOR_INDEX = Math.max(
  0,
  COLORS.findIndex((color) => color.name === "Antik Beyaz")
);

const state = {
  image: null,
  photoName: "Varsayılan önizleme",
  imageScale: 1,
  canvasWidth: 1200,
  canvasHeight: 1600,
  selectedColorIndex: DEFAULT_PRIMARY_COLOR_INDEX,
  secondaryColorIndex: DEFAULT_SECONDARY_COLOR_INDEX,
  activeColorSlot: "primary",
  masks: cloneMasks(defaultMasks),
  overlays: [],
  selectedOverlayId: "",
  flagImage: null,
  images: [],
  currentImage: null,
  isAdminRoute:
    window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/"),
  isAuthenticated: false,
  isSaving: false,
  saveTimer: null,
  saveAgain: false,
  filterText: "",
  family: "Tümü",
  showOriginal: false,
  showMask: false,
  editMode: false,
  editAreaId: "main|outer",
  opacity: 0.4,
  speed: 900,
  isPlaying: false,
  moveMode: false,
  activePoint: null,
  hoverPoint: null,
  pointerPosition: null,
  draft: null,
  drag: null,
};

const dom = {
  canvas: document.querySelector("#paintCanvas"),
  photoName: document.querySelector("#photoName"),
  canvasSize: document.querySelector("#canvasSize"),
  adminLink: document.querySelector("#adminLink"),
  publicLinkButton: document.querySelector("#publicLinkButton"),
  downloadButton: document.querySelector("#downloadButton"),
  downloadButtonMobile: document.querySelector("#downloadButtonMobile"),
  originalToggle: document.querySelector("#originalToggle"),
  maskToggle: document.querySelector("#maskToggle"),
  currentSwatch: document.querySelector("#currentSwatch"),
  currentName: document.querySelector("#currentName"),
  currentCode: document.querySelector("#currentCode"),
  currentHex: document.querySelector("#currentHex"),
  colorSlotTabs: document.querySelector("#colorSlotTabs"),
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
  addFlagButton: document.querySelector("#addFlagButton"),
  flagSmallerButton: document.querySelector("#flagSmallerButton"),
  flagLargerButton: document.querySelector("#flagLargerButton"),
  deleteFlagButton: document.querySelector("#deleteFlagButton"),
  searchInput: document.querySelector("#searchInput"),
  familySelect: document.querySelector("#familySelect"),
  swatchGrid: document.querySelector("#swatchGrid"),
  resultCount: document.querySelector("#resultCount"),
  sourceLink: document.querySelector("#sourceLink"),
  adminOverlay: document.querySelector("#adminOverlay"),
  loginForm: document.querySelector("#loginForm"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"),
  loginStatus: document.querySelector("#loginStatus"),
  adminPanel: document.querySelector("#adminPanel"),
  uploadForm: document.querySelector("#uploadForm"),
  uploadInput: document.querySelector("#uploadInput"),
  aiMaskButton: document.querySelector("#aiMaskButton"),
  imageList: document.querySelector("#imageList"),
  saveStatus: document.querySelector("#saveStatus"),
  copyPublicLinkButton: document.querySelector("#copyPublicLinkButton"),
  logoutButton: document.querySelector("#logoutButton"),
};

const ctx = dom.canvas.getContext("2d", { willReadFrequently: false });
let playTimer = null;

async function init() {
  dom.sourceLink.href = PALETTE_SOURCE;
  wireControls();
  renderFamilyOptions();
  loadFlagAsset();
  await loadInitialProject();
  renderAreaControls();
  renderAll();
  syncAdminUi();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function cloneMasks(masks) {
  return (Array.isArray(masks) ? masks : []).map((mask) => ({
    ...mask,
    colorSlot: normalizeColorSlot(mask.colorSlot),
    points: Array.isArray(mask.points) ? mask.points.map((point) => [...point]) : [],
    holes: Array.isArray(mask.holes)
      ? mask.holes.map((hole) => hole.map((point) => [...point]))
      : [],
  }));
}

function saveMasks() {
  queueImageSave();
}

function serializeMasks(masks = state.masks) {
  return masks.map((mask) => ({
    id: mask.id,
    label: mask.label,
    enabled: mask.enabled,
    colorSlot: normalizeColorSlot(mask.colorSlot),
    points: mask.points.map((point) => [...point]),
    holes: mask.holes.map((hole) => hole.map((point) => [...point])),
  }));
}

function cloneOverlays(overlays) {
  return (Array.isArray(overlays) ? overlays : [])
    .map((overlay, index) => normalizeOverlay(overlay, index))
    .filter(Boolean);
}

function serializeOverlays(overlays = state.overlays) {
  return cloneOverlays(overlays);
}

function normalizeOverlay(overlay, index = 0) {
  if (!overlay || overlay.type !== "flag") return null;
  const width = clamp(Number(overlay.width ?? 0.1), 0.03, 0.45);
  const height = clamp(Number(overlay.height ?? width), 0.03, 0.45);
  return {
    id: String(overlay.id || `flag-${index + 1}`),
    type: "flag",
    src: FLAG_SRC,
    enabled: overlay.enabled ?? true,
    x: clamp(Number(overlay.x ?? 0.72), 0, 1 - width),
    y: clamp(Number(overlay.y ?? 0.12), 0, 1 - height),
    width,
    height,
  };
}

function normalizeColorSlot(slot) {
  return slot === "secondary" ? "secondary" : "primary";
}

function getActiveColorIndex() {
  return state.activeColorSlot === "secondary"
    ? state.secondaryColorIndex
    : state.selectedColorIndex;
}

function setActiveColorIndex(index) {
  if (state.activeColorSlot === "secondary") {
    state.secondaryColorIndex = index;
  } else {
    state.selectedColorIndex = index;
  }
}

function getMaskColorIndex(mask) {
  return normalizeColorSlot(mask.colorSlot) === "secondary"
    ? state.secondaryColorIndex
    : state.selectedColorIndex;
}

function getColorSlotLabel(slot) {
  return normalizeColorSlot(slot) === "secondary" ? "Ikinci renk" : "Ana renk";
}

function canEditProject() {
  return state.isAdminRoute && state.isAuthenticated;
}

function queueImageSave() {
  if (!canEditProject() || !state.currentImage) return;

  state.currentImage.opacity = state.opacity;
  state.currentImage.masks = serializeMasks();
  state.currentImage.overlays = serializeOverlays();
  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => {
    persistCurrentImage();
  }, 450);
  setSaveStatus("Kaydedilecek");
}

async function persistCurrentImage() {
  if (!canEditProject() || !state.currentImage) return;
  if (state.isSaving) {
    state.saveAgain = true;
    return;
  }

  state.isSaving = true;
  setSaveStatus("Kaydediliyor");

  try {
    const { image } = await apiRequest(`/api/images/${encodeURIComponent(state.currentImage.id)}`, {
      method: "PUT",
      body: JSON.stringify({
        opacity: state.opacity,
        masks: serializeMasks(),
        overlays: serializeOverlays(),
      }),
    });
    state.currentImage = normalizeImageSettings(image);
    replaceImageInList(state.currentImage);
    renderAdminImageList();
    setSaveStatus("Kaydedildi");
  } catch (error) {
    setSaveStatus(error.message || "Kaydedilemedi", true);
  } finally {
    state.isSaving = false;
    if (state.saveAgain) {
      state.saveAgain = false;
      queueImageSave();
    }
  }
}

function setSaveStatus(message, isError = false) {
  if (!dom.saveStatus) return;
  dom.saveStatus.textContent = message || "";
  dom.saveStatus.classList.toggle("is-error", isError);
}

function wireControls() {
  dom.downloadButton.addEventListener("click", downloadCanvas);
  if (dom.downloadButtonMobile) {
    dom.downloadButtonMobile.addEventListener("click", downloadCanvas);
  }
  if (dom.publicLinkButton) {
    dom.publicLinkButton.addEventListener("click", () => {
      if (!state.currentImage) return;
      window.location.href = getPublicPath(state.currentImage.id);
    });
  }
  if (dom.loginForm) {
    dom.loginForm.addEventListener("submit", handleLogin);
  }
  if (dom.uploadForm) {
    dom.uploadForm.addEventListener("submit", handleUpload);
  }
  if (dom.aiMaskButton) {
    dom.aiMaskButton.addEventListener("click", generateAiMask);
  }
  if (dom.imageList) {
    dom.imageList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-image-id]");
      if (!button) return;
      selectAdminImage(button.dataset.imageId);
    });
  }
  if (dom.copyPublicLinkButton) {
    dom.copyPublicLinkButton.addEventListener("click", copyPublicLink);
  }
  if (dom.logoutButton) {
    dom.logoutButton.addEventListener("click", handleLogout);
  }

  dom.originalToggle.addEventListener("change", () => {
    state.showOriginal = dom.originalToggle.checked;
    renderCanvas();
  });

  dom.maskToggle.addEventListener("change", () => {
    state.showMask = dom.maskToggle.checked;
    if (!state.showMask) {
      state.editMode = false;
      dom.editMaskToggle.checked = false;
      resetEditInteraction();
    }
    renderCanvas();
  });

  dom.prevButton.addEventListener("click", () => stepColor(-1));
  dom.nextButton.addEventListener("click", () => stepColor(1));
  dom.playButton.addEventListener("click", togglePlayback);
  if (dom.colorSlotTabs) {
    dom.colorSlotTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-color-slot]");
      if (!button) return;
      setActiveColorSlot(button.dataset.colorSlot);
    });
  }

  dom.speedRange.addEventListener("input", () => {
    state.speed = Number(dom.speedRange.value);
    if (state.isPlaying) {
      stopPlayback();
      startPlayback();
    }
  });

  dom.opacityRange.addEventListener("input", () => {
    state.opacity = Number(dom.opacityRange.value) / 100;
    saveMasks();
    renderCanvas();
  });

  dom.editMaskToggle.addEventListener("change", () => {
    if (!canEditProject()) {
      state.editMode = false;
      dom.editMaskToggle.checked = false;
      return;
    }
    state.editMode = dom.editMaskToggle.checked;
    state.showMask = state.editMode;
    resetEditInteraction();
    dom.maskToggle.checked = state.showMask;
    renderCanvas();
  });

  dom.editAreaSelect.addEventListener("change", () => {
    state.editAreaId = dom.editAreaSelect.value;
    state.activePoint = null;
    state.hoverPoint = null;
    state.pointerPosition = null;
    state.moveMode = false;
    state.draft = null;
    updateCanvasCursor();
    renderCanvas();
  });

  dom.moveTargetButton.addEventListener("click", () => {
    if (!state.editMode) return;
    state.moveMode = !state.moveMode;
    state.activePoint = null;
    state.hoverPoint = null;
    updateCanvasCursor();
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
    if (!canEditProject()) return;
    state.masks = [];
    state.editAreaId = "";
    state.activePoint = null;
    state.hoverPoint = null;
    state.pointerPosition = null;
    state.moveMode = false;
    state.draft = null;
    saveMasks();
    renderAreaControls();
    renderCanvas();
  });

  dom.exportMaskButton.addEventListener("click", () => {
    if (!canEditProject()) return;
    copyMaskExport();
  });

  if (dom.addFlagButton) {
    dom.addFlagButton.addEventListener("click", addFlagOverlay);
  }
  if (dom.flagSmallerButton) {
    dom.flagSmallerButton.addEventListener("click", () => resizeSelectedFlag(0.86));
  }
  if (dom.flagLargerButton) {
    dom.flagLargerButton.addEventListener("click", () => resizeSelectedFlag(1.14));
  }
  if (dom.deleteFlagButton) {
    dom.deleteFlagButton.addEventListener("click", deleteSelectedFlag);
  }

  dom.resetMaskButton.addEventListener("click", () => {
    if (!canEditProject()) return;
    state.masks = state.currentImage?.id === DEFAULT_IMAGE_ID ? cloneMasks(defaultMasks) : [];
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

  // Open mobile color picker popup when tapping current swatch
  if (dom.currentSwatch) {
    dom.currentSwatch.addEventListener("click", (e) => {
      // Only show modal on small screens (mobile)
      if (!window.matchMedia || window.matchMedia("(max-width: 1040px)").matches) {
        openColorPickerPopup();
      }
    });
  }

  dom.canvas.addEventListener("pointerdown", startMaskDrag);
  dom.canvas.addEventListener("pointermove", moveMaskPoint);
  dom.canvas.addEventListener("pointerup", endMaskDrag);
  dom.canvas.addEventListener("pointercancel", endMaskDrag);
  dom.canvas.addEventListener("pointerleave", leaveCanvas);

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
  renderColorSlotControls();
  renderCurrentColor();
  renderPalette();
  // Ensure UI range shows current opacity (percent)
  if (dom.opacityRange) dom.opacityRange.value = String(Math.round(state.opacity * 100));
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
    })
  );
}

function renderAreaControls() {
  if (!state.masks.length) {
    const empty = document.createElement("div");
    empty.className = "empty-result";
    empty.textContent = "Boya alanı yok";
    dom.areaToggles.replaceChildren(empty);
  } else {
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
        if (canEditProject()) {
          const slotSelect = document.createElement("select");
          slotSelect.className = "mask-color-select admin-only";
          slotSelect.setAttribute("aria-label", `${mask.label} renk hedefi`);
          slotSelect.innerHTML = `
            <option value="primary">Ana renk</option>
            <option value="secondary">Ikinci renk</option>
          `;
          slotSelect.value = normalizeColorSlot(mask.colorSlot);
          slotSelect.addEventListener("click", (event) => {
            event.stopPropagation();
          });
          slotSelect.addEventListener("change", () => {
            mask.colorSlot = normalizeColorSlot(slotSelect.value);
            if (mask.colorSlot === state.activeColorSlot) {
              state.editAreaId = getEditValue(mask.id, "outer");
            }
            saveMasks();
            renderAreaControls();
            renderCanvas();
          });
          label.append(slotSelect);
        }
        return label;
      })
    );
  }

  dom.editAreaSelect.replaceChildren(
    ...state.masks.flatMap((mask) => {
      const slotLabel = getColorSlotLabel(mask.colorSlot);
      const outer = document.createElement("option");
      outer.value = getEditValue(mask.id, "outer");
      outer.textContent = `${mask.label} - ${slotLabel} - Dis cizgi`;

      const holes = mask.holes.map((_, holeIndex) => {
        const option = document.createElement("option");
        option.value = getEditValue(mask.id, "hole", holeIndex);
        option.textContent = `${mask.label} - ${slotLabel} - Boyanmayacak ${holeIndex + 1}`;
        return option;
      });

      return [outer, ...holes];
    })
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

function renderColorSlotControls() {
  if (!dom.colorSlotTabs) return;
  dom.colorSlotTabs.querySelectorAll("[data-color-slot]").forEach((button) => {
    const isActive = normalizeColorSlot(button.dataset.colorSlot) === state.activeColorSlot;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setActiveColorSlot(slot) {
  state.activeColorSlot = normalizeColorSlot(slot);
  selectFirstMaskForActiveSlot();
  renderColorSlotControls();
  renderCurrentColor();
  renderPaletteSelection();
}

function selectFirstMaskForActiveSlot() {
  if (!canEditProject() || !state.masks.length) return;
  const mask = state.masks.find(
    (item) => normalizeColorSlot(item.colorSlot) === state.activeColorSlot
  );
  if (!mask) return;
  state.editAreaId = getEditValue(mask.id, "outer");
  if (dom.editAreaSelect) {
    dom.editAreaSelect.value = state.editAreaId;
  }
  state.activePoint = null;
  state.hoverPoint = null;
  state.pointerPosition = null;
  state.moveMode = false;
  state.draft = null;
  updateCanvasCursor();
  renderCanvas();
}

function renderCurrentColor() {
  const color = COLORS[getActiveColorIndex()];
  dom.currentSwatch.style.backgroundColor = color.hex;
  dom.currentName.textContent = color.name;
  dom.currentCode.textContent = `${getColorSlotLabel(state.activeColorSlot)} - Kod ${color.code}`;
  dom.currentHex.textContent = color.hex.toUpperCase();
}

function getFilteredColors(filterText) {
  const query = (filterText ?? state.filterText ?? "")
    .toString()
    .toLocaleLowerCase("tr")
    .replace("#", "");

  return COLORS.map((color, index) => ({ color, index })).filter(({ color }) => {
    const familyMatches = state.family === "Tümü" || color.family === state.family;
    if (!familyMatches) return false;
    if (!query) return true;

    const haystack = `${color.name} ${color.code} ${color.hex}`
      .toLocaleLowerCase("tr")
      .replace("#", "");
    return haystack.includes(query);
  });
}

function renderPalette(
  targetGrid = dom.swatchGrid,
  filterText = undefined,
  countNode = targetGrid === dom.swatchGrid ? dom.resultCount : null
) {
  const filtered = getFilteredColors(filterText);
  if (countNode) countNode.textContent = `${filtered.length} renk`;

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-result";
    empty.textContent = "Sonuç yok";
    targetGrid.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const { color, index } of filtered) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.dataset.colorIndex = String(index);
    button.setAttribute("aria-label", `${color.name}, ${color.code}, ${color.hex}`);
    if (index === getActiveColorIndex()) {
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

  targetGrid.replaceChildren(fragment);
}

function setColor(index) {
  if (!Number.isInteger(index) || !COLORS[index]) return;
  setActiveColorIndex(index);
  renderCurrentColor();
  renderPaletteSelection();
  renderCanvas();
}

function renderPaletteSelection() {
  dom.swatchGrid.querySelectorAll(".swatch.is-selected").forEach((button) => {
    button.classList.remove("is-selected");
  });

  const selected = dom.swatchGrid.querySelector(`[data-color-index="${getActiveColorIndex()}"]`);
  if (selected) {
    selected.classList.add("is-selected");
  }
}

// Mobile color picker popup (lazy-created)
let _colorPopup = null;
let _colorPopupScrollY = 0;

function syncColorPopupViewportHeight() {
  const viewportHeight =
    window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight;
  document.documentElement.style.setProperty("--color-popup-vh", `${viewportHeight}px`);
}

function lockPageForColorPopup() {
  _colorPopupScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  syncColorPopupViewportHeight();
  document.body.style.top = `-${_colorPopupScrollY}px`;
  document.body.classList.add("has-modal");
  window.addEventListener("resize", syncColorPopupViewportHeight);
  window.visualViewport?.addEventListener("resize", syncColorPopupViewportHeight);
}

function unlockPageForColorPopup() {
  window.removeEventListener("resize", syncColorPopupViewportHeight);
  window.visualViewport?.removeEventListener("resize", syncColorPopupViewportHeight);
  document.body.classList.remove("has-modal");
  document.body.style.top = "";
  document.documentElement.style.removeProperty("--color-popup-vh");
  window.scrollTo(0, _colorPopupScrollY);
}

function openColorPickerPopup() {
  if (_colorPopup) return _colorPopup.show();

  const overlay = document.createElement("div");
  overlay.className = "color-popup-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const panel = document.createElement("div");
  panel.className = "color-popup";

  const header = document.createElement("div");
  header.className = "color-popup-header";
  const title = document.createElement("div");
  title.className = "color-popup-title";
  title.textContent = "Renk seçin";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "icon-button";
  closeBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>';
  closeBtn.addEventListener("click", closeColorPickerPopup);
  header.append(title, closeBtn);

  const search = document.createElement("input");
  search.className = "color-popup-search";
  search.placeholder = "Ara (isim, kod veya hex)";

  const count = document.createElement("div");
  count.className = "color-popup-count";

  const grid = document.createElement("div");
  grid.className = "swatch-grid color-popup-grid";

  panel.append(header, search, count, grid);
  overlay.append(panel);
  document.body.append(overlay);

  function onSearch() {
    renderPalette(grid, search.value || undefined, count);
  }

  search.addEventListener("input", onSearch);

  grid.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".swatch");
    if (!btn) return;
    setColor(Number(btn.dataset.colorIndex));
    closeColorPickerPopup();
  });

  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeColorPickerPopup();
  });

  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") closeColorPickerPopup();
  });

  _colorPopup = {
    overlay,
    show() {
      lockPageForColorPopup();
      overlay.classList.add("is-open");
      search.value = "";
      onSearch();
      if (window.matchMedia?.("(pointer: fine)").matches) {
        search.focus({ preventScroll: true });
      }
    },
    close() {
      closeColorPickerPopup();
    },
  };

  _colorPopup.show();
  return _colorPopup;
}

function closeColorPickerPopup() {
  if (!_colorPopup) return;
  _colorPopup.overlay.remove();
  _colorPopup = null;
  unlockPageForColorPopup();
}

function stepColor(direction) {
  const filtered = getFilteredColors();
  if (!filtered.length) return;

  const currentPosition = filtered.findIndex(({ index }) => index === getActiveColorIndex());
  const nextPosition =
    currentPosition === -1 ? 0 : (currentPosition + direction + filtered.length) % filtered.length;

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
  const icon = dom.playButton.querySelector("[data-lucide]");
  if (icon) {
    icon.setAttribute("data-lucide", "pause");
  }
  refreshIcons();

  playTimer = window.setInterval(() => stepColor(1), state.speed);
}

function stopPlayback() {
  state.isPlaying = false;
  window.clearInterval(playTimer);
  playTimer = null;
  dom.playButton.classList.remove("is-playing");
  dom.playButton.querySelector("span").textContent = "Tek tek uygula";
  const icon = dom.playButton.querySelector("[data-lucide]");
  if (icon) {
    icon.setAttribute("data-lucide", "play");
  }
  refreshIcons();
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function loadFlagAsset() {
  const image = new Image();
  image.onload = () => {
    state.flagImage = image;
    renderCanvas();
  };
  image.src = FLAG_SRC;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadInitialProject() {
  if (state.isAdminRoute) {
    await refreshSession();
    if (state.isAuthenticated) {
      await loadAdminImages();
      const selectedId = new URLSearchParams(window.location.search).get("image");
      await selectAdminImage(selectedId || DEFAULT_IMAGE_ID, false);
      return;
    }
  }

  await loadPublicImage(getRequestedImageId());
}

async function refreshSession() {
  try {
    const session = await apiRequest("/api/session");
    state.isAuthenticated = Boolean(session.authenticated);
  } catch {
    state.isAuthenticated = false;
  }
  syncAdminUi();
}

async function loadAdminImages() {
  const { images } = await apiRequest("/api/images");
  state.images = Array.isArray(images) ? images.map(normalizeImageSettings) : [];
  renderAdminImageList();
}

async function selectAdminImage(id, updateUrl = true) {
  const imageId = id || DEFAULT_IMAGE_ID;
  let settings = state.images.find((image) => image.id === imageId);
  if (!settings) {
    const response = await apiRequest(`/api/images/${encodeURIComponent(imageId)}`);
    settings = normalizeImageSettings(response.image);
    replaceImageInList(settings);
  }

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.pathname = "/admin";
    url.searchParams.set("image", settings.id);
    window.history.replaceState({}, "", url);
  }

  await applyImageSettings(settings);
  renderAdminImageList();
}

async function loadPublicImage(id) {
  try {
    const { image } = await apiRequest(`/api/images/${encodeURIComponent(id || DEFAULT_IMAGE_ID)}`);
    await applyImageSettings(normalizeImageSettings(image));
  } catch {
    await applyImageSettings(normalizeImageSettings(DEFAULT_IMAGE_SETTINGS));
  }
}

async function applyImageSettings(settings) {
  const normalized = normalizeImageSettings(settings);
  state.currentImage = normalized;
  state.photoName = normalized.name;
  state.opacity = normalized.opacity;
  state.masks = cloneMasks(normalized.masks);
  state.overlays = cloneOverlays(normalized.overlays);
  state.selectedOverlayId = state.overlays[0]?.id || "";
  state.editAreaId = state.masks[0] ? getEditValue(state.masks[0].id, "outer") : "";
  state.activePoint = null;
  state.hoverPoint = null;
  state.pointerPosition = null;
  state.moveMode = false;
  state.draft = null;
  state.drag = null;
  state.editMode = false;
  state.showMask = false;
  if (dom.editMaskToggle) dom.editMaskToggle.checked = false;
  if (dom.maskToggle) dom.maskToggle.checked = false;

  try {
    const cacheKey = normalized.updatedAt ? encodeURIComponent(normalized.updatedAt) : Date.now();
    state.image = await loadImage(`${normalized.src}?v=${cacheKey}`);
  } catch {
    state.photoName = `${normalized.name} bulunamadı`;
    state.image = await createGuideImage();
  }

  renderAreaControls();
  renderAll();
  syncAdminUi();
}

function normalizeImageSettings(image) {
  const fallback = DEFAULT_IMAGE_SETTINGS;
  const masks = Array.isArray(image?.masks) ? image.masks : fallback.masks;
  return {
    id: String(image?.id || fallback.id),
    name: String(image?.name || fallback.name),
    src: String(image?.src || fallback.src),
    opacity: clamp(Number(image?.opacity ?? fallback.opacity), 0.2, 1),
    masks: cloneMasks(masks).filter((mask) => mask.points.length >= 3),
    overlays: cloneOverlays(image?.overlays || fallback.overlays),
    createdAt: image?.createdAt || "",
    updatedAt: image?.updatedAt || "",
  };
}

function getRequestedImageId() {
  const segment = window.location.pathname.split("/").filter(Boolean)[0];
  if (!segment || segment === "admin") return DEFAULT_IMAGE_ID;
  return decodeURIComponent(segment);
}

function replaceImageInList(image) {
  const index = state.images.findIndex((item) => item.id === image.id);
  if (index === -1) {
    state.images.unshift(image);
  } else {
    state.images[index] = image;
  }
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const body = options.body;
  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "İstek tamamlanamadı");
  }
  return payload;
}

async function handleLogin(event) {
  event.preventDefault();
  if (!dom.loginForm) return;

  setLoginStatus("Giriş yapılıyor");
  try {
    const session = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: dom.loginUsername.value,
        password: dom.loginPassword.value,
      }),
    });
    state.isAuthenticated = Boolean(session.authenticated);
    dom.loginPassword.value = "";
    syncAdminUi();
    setLoginStatus("Resimler yükleniyor");
    await loadAdminImages();
    await selectAdminImage(DEFAULT_IMAGE_ID);
    syncAdminUi();
    setLoginStatus("");
  } catch (error) {
    setLoginStatus(error.message || "Giriş yapılamadı", true);
  }
}

async function handleLogout() {
  await apiRequest("/api/logout", { method: "POST" }).catch(() => {});
  state.isAuthenticated = false;
  state.editMode = false;
  syncAdminUi();
}

async function handleUpload(event) {
  event.preventDefault();
  if (!canEditProject() || !dom.uploadInput.files.length) return;

  const formData = new FormData();
  formData.append("image", dom.uploadInput.files[0]);
  setSaveStatus("Yükleniyor");

  try {
    const { image } = await apiRequest("/api/images/upload", {
      method: "POST",
      body: formData,
    });
    const normalized = normalizeImageSettings(image);
    replaceImageInList(normalized);
    dom.uploadInput.value = "";
    await selectAdminImage(normalized.id);
    setSaveStatus("Yüklendi");
  } catch (error) {
    setSaveStatus(error.message || "Yüklenemedi", true);
  }
}

async function generateAiMask() {
  if (!canEditProject() || !state.currentImage) return;

  dom.aiMaskButton.disabled = true;
  setSaveStatus("AI maske oluşturuyor");

  try {
    const { image, notes } = await apiRequest(
      `/api/images/${encodeURIComponent(state.currentImage.id)}/generate-mask`,
      {
        method: "POST",
      }
    );

    const normalized = normalizeImageSettings(image);
    replaceImageInList(normalized);
    state.currentImage = normalized;
    state.opacity = normalized.opacity;
    state.masks = cloneMasks(normalized.masks);
    state.editAreaId = state.masks[0] ? getEditValue(state.masks[0].id, "outer") : "";
    state.activePoint = null;
    state.hoverPoint = null;
    state.pointerPosition = null;
    state.moveMode = false;
    state.draft = null;
    renderAreaControls();
    renderAll();
    renderAdminImageList();
    setSaveStatus(notes ? `AI maske kaydedildi: ${notes}` : "AI maske kaydedildi");
  } catch (error) {
    setSaveStatus(error.message || "AI maske oluşturulamadı", true);
  } finally {
    dom.aiMaskButton.disabled = false;
  }
}

function renderAdminImageList() {
  if (!dom.imageList) return;

  if (!state.images.length) {
    const empty = document.createElement("div");
    empty.className = "empty-result";
    empty.textContent = "Resim yok";
    dom.imageList.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const image of state.images) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "image-list-item";
    button.dataset.imageId = image.id;
    button.classList.toggle("is-selected", image.id === state.currentImage?.id);

    const thumb = document.createElement("span");
    thumb.className = "image-list-thumb";
    thumb.style.backgroundImage = `url("${image.src}")`;

    const text = document.createElement("span");
    text.className = "image-list-text";

    const name = document.createElement("strong");
    name.textContent = image.name;

    const meta = document.createElement("span");
    meta.textContent = `/${image.id}`;

    text.append(name, meta);
    button.append(thumb, text);
    fragment.append(button);
  }

  dom.imageList.replaceChildren(fragment);
}

function syncAdminUi() {
  document.body.classList.toggle("is-admin-route", state.isAdminRoute);
  document.body.classList.toggle("is-admin", canEditProject());

  if (dom.adminOverlay) {
    dom.adminOverlay.hidden = !state.isAdminRoute || state.isAuthenticated;
  }
  if (dom.adminPanel) {
    dom.adminPanel.hidden = !canEditProject();
  }
  if (dom.publicLinkButton) {
    dom.publicLinkButton.hidden = !canEditProject();
  }
  if (dom.logoutButton) {
    dom.logoutButton.hidden = !canEditProject();
  }
  if (dom.adminLink) {
    dom.adminLink.hidden = canEditProject();
  }

  if (!canEditProject()) {
    state.editMode = false;
    state.moveMode = false;
    state.draft = null;
    if (dom.editMaskToggle) dom.editMaskToggle.checked = false;
    resetEditInteraction();
  }

  if (dom.opacityRange) {
    dom.opacityRange.disabled = !canEditProject();
  }
  renderAdminImageList();
}

function setLoginStatus(message, isError = false) {
  if (!dom.loginStatus) return;
  dom.loginStatus.textContent = message || "";
  dom.loginStatus.classList.toggle("is-error", isError);
}

async function copyPublicLink() {
  if (!state.currentImage) return;
  const link = `${window.location.origin}${getPublicPath(state.currentImage.id)}`;
  try {
    await navigator.clipboard.writeText(link);
    setSaveStatus("Link kopyalandı");
  } catch {
    window.prompt("Public link", link);
  }
}

function getPublicPath(id) {
  return `/${encodeURIComponent(id || DEFAULT_IMAGE_ID)}`;
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

  drawOverlays();

  if (state.showMask) {
    drawMaskGuides();
  }

  dom.photoName.textContent = state.photoName;
  dom.canvasSize.textContent = `${state.canvasWidth} x ${state.canvasHeight}`;
  syncEditTools();
}

function paintMasks() {
  for (const mask of state.masks) {
    if (!mask.enabled) continue;
    const color = COLORS[getMaskColorIndex(mask)] || COLORS[state.selectedColorIndex];
    const path = buildMaskPath(mask);

    ctx.save();
    ctx.clip(path, "evenodd");
    ctx.globalAlpha = state.opacity;
    ctx.globalCompositeOperation = "source-atop";
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

function drawOverlays() {
  if (!state.flagImage || !state.overlays.length) return;

  for (const overlay of state.overlays) {
    if (!overlay.enabled || overlay.type !== "flag") continue;
    const box = getOverlayBox(overlay);
    ctx.save();
    ctx.drawImage(state.flagImage, box.x, box.y, box.width, box.height);

    if (canEditProject() && overlay.id === state.selectedOverlayId) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.strokeStyle = "#1c7972";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    }

    ctx.restore();
  }
}

function getOverlayBox(overlay) {
  return {
    x: overlay.x * state.canvasWidth,
    y: overlay.y * state.canvasHeight,
    width: overlay.width * state.canvasWidth,
    height: overlay.height * state.canvasHeight,
  };
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

    if (active && !state.editMode) {
      ctx.fillStyle = "rgba(28, 121, 114, 0.08)";
      ctx.fill(path);
    }

    ctx.restore();

    if (!active || !state.editMode) continue;

    drawNoPaintAreaGuides(mask, editTarget);

    if (state.moveMode) {
      drawTargetBounds(editTarget);
    }

    editTarget.points.forEach(([x, y], pointIndex) => {
      const selected =
        state.activePoint?.targetKey === editTarget.key &&
        state.activePoint.pointIndex === pointIndex;
      const hovered =
        state.hoverPoint?.targetKey === editTarget.key &&
        state.hoverPoint.pointIndex === pointIndex;
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        x * state.canvasWidth,
        y * state.canvasHeight,
        selected || hovered ? 11 : 8,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = selected ? "#1c7972" : "#ffffff";
      ctx.fill();
      ctx.lineWidth = hovered && !selected ? 4 : 3;
      ctx.strokeStyle = "#b44134";
      ctx.stroke();
      ctx.restore();
    });
  }

  drawDraftGuides();
  drawPointerCrosshair();
}

function drawDraftGuides() {
  if (!state.draft?.points.length) return;

  ctx.save();
  ctx.strokeStyle = state.draft.kind === "paint" ? "#1c7972" : "#b44134";
  ctx.fillStyle =
    state.draft.kind === "paint" ? "rgba(28, 121, 114, 0.16)" : "rgba(180, 65, 52, 0.16)";
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

function drawPointerCrosshair() {
  if (!state.draft || !state.pointerPosition) return;

  const { x, y } = state.pointerPosition;
  ctx.save();
  ctx.setLineDash([5, 6]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle =
    state.draft.kind === "paint" ? "rgba(28, 121, 114, 0.92)" : "rgba(180, 65, 52, 0.92)";
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(state.canvasWidth, y);
  ctx.moveTo(x, 0);
  ctx.lineTo(x, state.canvasHeight);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawNoPaintAreaGuides(mask, editTarget) {
  mask.holes.forEach((hole, holeIndex) => {
    const selected =
      editTarget.kind === "hole" &&
      editTarget.mask.id === mask.id &&
      editTarget.holeIndex === holeIndex;
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
    ctx.arc(
      center.x * state.canvasWidth,
      center.y * state.canvasHeight,
      selected ? 13 : 11,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = selected ? "#b44134" : "rgba(255, 255, 255, 0.92)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#b44134";
    ctx.stroke();
    ctx.fillStyle = selected ? "#ffffff" : "#b44134";
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      String(holeIndex + 1),
      center.x * state.canvasWidth,
      center.y * state.canvasHeight
    );
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
  const position = getCanvasPosition(event);
  if (canEditProject()) {
    const overlay = findOverlayAt(position);
    if (overlay) {
      state.selectedOverlayId = overlay.id;
      state.drag = {
        mode: "overlay",
        overlayId: overlay.id,
        start: position,
        original: { x: overlay.x, y: overlay.y },
      };
      dom.canvas.setPointerCapture(event.pointerId);
      dom.canvas.classList.add("is-dragging");
      syncEditTools();
      renderCanvas();
      return;
    }
  }

  if (!state.editMode || !canEditProject()) return;

  state.pointerPosition = position;
  if (state.draft) {
    addDraftPoint(position);
    return;
  }

  let target = getEditTarget();
  if (!target.mask) return;

  if (!state.moveMode) {
    const pointTarget = findNearestEditablePointAt(position);
    if (pointTarget) {
      state.editAreaId = pointTarget.target.key;
      dom.editAreaSelect.value = state.editAreaId;
      beginPointDrag(pointTarget.target, pointTarget.pointIndex, event);
      return;
    }
  }

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
    if (!isPointInPolygon(position, target.points) && !findNearestEdge(target.points, position))
      return;
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

  beginPointDrag(target, nearest.pointIndex, event);
}

function beginPointDrag(target, pointIndex, event) {
  state.activePoint = { targetKey: target.key, pointIndex };
  state.hoverPoint = { targetKey: target.key, pointIndex };
  state.drag = { mode: "point", pointIndex };
  dom.canvas.setPointerCapture(event.pointerId);
  dom.canvas.classList.add("is-dragging");
  updateCanvasCursor();
  syncEditTools();
  renderCanvas();
}

function moveMaskPoint(event) {
  if (state.drag?.mode === "overlay") {
    const position = getCanvasPosition(event);
    const overlay = state.overlays.find((item) => item.id === state.drag.overlayId);
    if (!overlay) return;
    const dx = (position.x - state.drag.start.x) / state.canvasWidth;
    const dy = (position.y - state.drag.start.y) / state.canvasHeight;
    overlay.x = clamp(state.drag.original.x + dx, 0, 1 - overlay.width);
    overlay.y = clamp(state.drag.original.y + dy, 0, 1 - overlay.height);
    renderCanvas();
    return;
  }

  if (state.editMode) {
    state.pointerPosition = getCanvasPosition(event);
  }

  if (!state.drag) {
    if (canEditProject() && findOverlayAt(getCanvasPosition(event))) {
      updateCanvasCursor("move");
      return;
    }
    if (!state.editMode) {
      updateCanvasCursor("default");
      return;
    }
    updateHoverState(event);
    return;
  }

  const target = getEditTarget();
  const position = state.pointerPosition;

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
  const wasOverlayDrag = state.drag.mode === "overlay";
  if (dom.canvas.hasPointerCapture(event.pointerId)) {
    dom.canvas.releasePointerCapture(event.pointerId);
  }
  state.drag = null;
  dom.canvas.classList.remove("is-dragging");
  if (wasOverlayDrag) {
    updateCanvasCursor(findOverlayAt(getCanvasPosition(event)) ? "move" : "default");
  } else {
    updateHoverState(event);
  }
  saveMasks();
}

function leaveCanvas() {
  if (state.drag) return;
  state.hoverPoint = null;
  state.pointerPosition = null;
  updateCanvasCursor();
  renderCanvas();
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
  if (!state.editMode || !canEditProject()) return;
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
  if (!state.editMode || !canEditProject()) return;
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
  if (!canEditProject()) return;
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
  state.hoverPoint = null;
  state.pointerPosition = null;
  state.moveMode = false;
  dom.canvas.classList.add("is-drawing");
  updateCanvasCursor();
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
  if (!canEditProject()) return;
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
      colorSlot: state.activeColorSlot,
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
  state.hoverPoint = null;
  state.pointerPosition = null;
  state.moveMode = false;
  dom.canvas.classList.remove("is-drawing");
  updateCanvasCursor();
  saveMasks();
  renderAreaControls();
  renderCanvas();
}

function cancelDraft() {
  if (!canEditProject()) return;
  state.draft = null;
  state.pointerPosition = null;
  dom.canvas.classList.remove("is-drawing");
  updateCanvasCursor();
  renderCanvas();
}

function deleteActivePoint() {
  if (!state.editMode || !canEditProject()) return;
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
  if (!state.editMode || !canEditProject()) return;
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
  if (!canEditProject()) return;
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
  if (!state.editMode || !canEditProject()) return;
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

function resetEditInteraction() {
  state.activePoint = null;
  state.hoverPoint = null;
  state.pointerPosition = null;
  state.moveMode = false;
  state.draft = null;
  state.drag = null;
  dom.canvas.classList.toggle("is-editing", state.editMode);
  dom.canvas.classList.remove("is-drawing", "is-dragging");
  updateCanvasCursor();
}

function addFlagOverlay() {
  if (!canEditProject()) return;
  const width = 0.1;
  const overlay = normalizeOverlay({
    id: `flag-${Date.now()}`,
    type: "flag",
    x: 0.72,
    y: 0.12,
    width,
    height: width,
    enabled: true,
  });
  state.overlays.push(overlay);
  state.selectedOverlayId = overlay.id;
  saveMasks();
  syncEditTools();
  renderCanvas();
}

function resizeSelectedFlag(factor) {
  if (!canEditProject()) return;
  const overlay = getSelectedFlagOverlay();
  if (!overlay) return;
  const centerX = overlay.x + overlay.width / 2;
  const centerY = overlay.y + overlay.height / 2;
  overlay.width = clamp(overlay.width * factor, 0.03, 0.45);
  overlay.height = clamp(overlay.height * factor, 0.03, 0.45);
  overlay.x = clamp(centerX - overlay.width / 2, 0, 1 - overlay.width);
  overlay.y = clamp(centerY - overlay.height / 2, 0, 1 - overlay.height);
  saveMasks();
  syncEditTools();
  renderCanvas();
}

function deleteSelectedFlag() {
  if (!canEditProject()) return;
  const overlay = getSelectedFlagOverlay();
  if (!overlay) return;
  state.overlays = state.overlays.filter((item) => item.id !== overlay.id);
  state.selectedOverlayId = state.overlays[0]?.id || "";
  saveMasks();
  syncEditTools();
  renderCanvas();
}

function getSelectedFlagOverlay() {
  return (
    state.overlays.find((overlay) => overlay.id === state.selectedOverlayId) ||
    state.overlays.find((overlay) => overlay.type === "flag") ||
    null
  );
}

function findOverlayAt(position) {
  for (let index = state.overlays.length - 1; index >= 0; index -= 1) {
    const overlay = state.overlays[index];
    if (!overlay.enabled || overlay.type !== "flag") continue;
    const box = getOverlayBox(overlay);
    if (
      position.x >= box.x &&
      position.x <= box.x + box.width &&
      position.y >= box.y &&
      position.y <= box.y + box.height
    ) {
      return overlay;
    }
  }
  return null;
}

function syncEditTools() {
  const disabled = !state.editMode || !canEditProject();
  const target = state.editMode ? getEditTarget() : null;
  const targetText = getTargetPositionText();
  dom.targetPosition.textContent = targetText;
  dom.moveTargetButton.disabled = disabled;
  dom.moveTargetButton.classList.toggle(
    "is-active",
    state.editMode && state.moveMode && !state.draft
  );
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
  if (dom.addFlagButton) dom.addFlagButton.disabled = !canEditProject();
  if (dom.flagSmallerButton)
    dom.flagSmallerButton.disabled = !canEditProject() || !getSelectedFlagOverlay();
  if (dom.flagLargerButton)
    dom.flagLargerButton.disabled = !canEditProject() || !getSelectedFlagOverlay();
  if (dom.deleteFlagButton)
    dom.deleteFlagButton.disabled = !canEditProject() || !getSelectedFlagOverlay();
}

async function copyMaskExport() {
  const text = JSON.stringify(
    state.masks.map((mask) => ({
      id: mask.id,
      label: mask.label,
      enabled: mask.enabled,
      colorSlot: normalizeColorSlot(mask.colorSlot),
      points: mask.points,
      holes: mask.holes,
    })),
    null,
    2
  );

  try {
    await navigator.clipboard.writeText(text);
    dom.targetPosition.textContent = "Maske JSON kopyalandı";
  } catch {
    window.prompt("Maske JSON", text);
  }
}

function updateHoverState(event) {
  if (!state.editMode || state.drag) return;

  if (!event) {
    updateCanvasCursor();
    return;
  }

  const position = getCanvasPosition(event);
  state.pointerPosition = position;

  if (state.draft) {
    state.hoverPoint = null;
    updateCanvasCursor("crosshair");
    renderCanvas();
    return;
  }

  const target = getEditTarget();
  if (!target.mask) {
    state.hoverPoint = null;
    updateCanvasCursor("default");
    renderCanvas();
    return;
  }

  const nearest = findNearestEditablePointAt(position);
  if (nearest && nearest.target.key !== target.key) {
    state.editAreaId = nearest.target.key;
    dom.editAreaSelect.value = state.editAreaId;
  }
  state.hoverPoint = nearest
    ? { targetKey: nearest.target.key, pointIndex: nearest.pointIndex }
    : null;

  if (nearest) {
    updateCanvasCursor("grab");
  } else if (
    state.moveMode &&
    (isPointInPolygon(position, target.points) || findNearestEdge(target.points, position))
  ) {
    updateCanvasCursor("move");
  } else if (!state.moveMode && findNearestEdge(target.points, position)) {
    updateCanvasCursor("copy");
  } else {
    updateCanvasCursor("default");
  }

  renderCanvas();
}

function updateCanvasCursor(cursor) {
  if (state.drag) {
    dom.canvas.style.cursor = "grabbing";
    return;
  }
  if (cursor) {
    dom.canvas.style.cursor = cursor;
    return;
  }
  dom.canvas.style.cursor = state.draft ? "crosshair" : "default";
}

function getTargetPositionText() {
  if (state.draft) {
    const name =
      state.draft.kind === "paint" ? "Boya alanı çiziliyor" : "Boyanmayacak alan çiziliyor";
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
  return getEditableTargets()
    .filter((target) => isPointInPolygon(position, target.points))
    .sort((a, b) => polygonArea(a.points) - polygonArea(b.points))[0];
}

function findNearestEditablePointAt(position) {
  const targets = getEditableTargets();
  const current = getEditTarget();
  const orderedTargets = [
    current,
    ...targets.filter((target) => target.key !== current.key),
  ].filter((target) => target.mask);

  let nearestMatch = null;
  for (const target of orderedTargets) {
    const nearest = findNearestPoint(target.points, position);
    if (!nearest) continue;
    if (!nearestMatch || nearest.distance < nearestMatch.distance) {
      nearestMatch = { target, pointIndex: nearest.pointIndex, distance: nearest.distance };
    }
  }

  return nearestMatch;
}

function getEditableTargets() {
  return state.masks.flatMap((mask) => {
    const outer = {
      key: getEditValue(mask.id, "outer"),
      mask,
      kind: "outer",
      holeIndex: 0,
      points: mask.points,
    };
    const holes = mask.holes.map((hole, holeIndex) => ({
      key: getEditValue(mask.id, "hole", holeIndex),
      mask,
      kind: "hole",
      holeIndex,
      points: hole,
    }));
    return [outer, ...holes];
  });
}

function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return Number.POSITIVE_INFINITY;
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return Math.abs(area / 2);
}

function findNearestPoint(points, position) {
  const hitRadius = Math.max(26, Math.min(state.canvasWidth, state.canvasHeight) * 0.024);
  let nearest = null;
  let nearestDistance = hitRadius;

  points.forEach(([x, y], pointIndex) => {
    const dx = x * state.canvasWidth - position.x;
    const dy = y * state.canvasHeight - position.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= nearestDistance) {
      nearest = { pointIndex, distance };
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
      { x: end[0] * state.canvasWidth, y: end[1] * state.canvasHeight }
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
      (end[1] - start[1]) * state.canvasHeight
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
  const color = COLORS[getActiveColorIndex()];
  const imageName = state.currentImage?.name ? slugify(state.currentImage.name) : "ev";
  const anchor = document.createElement("a");
  anchor.download = `${imageName}-renk-${slugify(color.name)}-${color.code}.png`;
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
