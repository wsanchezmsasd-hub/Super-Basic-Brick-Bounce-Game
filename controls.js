const keys = {};

function movePaddleToPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = WIDTH / bounds.width;
  paddle.targetX = (event.clientX - bounds.left) * scaleX - paddle.width / 2;
  paddle.targetX = Math.max(0, Math.min(WIDTH - paddle.width, paddle.targetX));
}

document.addEventListener("keydown", function (event) {
  const key = event.key.toLowerCase();
  keys[key] = true;
  if (!event.repeat && key === "u") {
    if (viewMode === "game") setShopOpen(true);
  } else if (!event.repeat && key === "escape") {
    if (!document.getElementById("shop-backdrop").hidden) {
      setShopOpen(false);
    } else if (viewMode === "game") {
      showTitleScreen();
    } else if (viewMode === "settings") {
      viewMode = "title";
      renderMenu();
    } else if (viewMode === "ascension") {
      // First ESC skips the cutscene, ESC on the choice card means stay.
      if (ascensionPhase === "cutscene") skipAscensionCutscene();
      else stayInBrickrot();
    }
  }
  if (!event.repeat && viewMode === "ascension" && ascensionPhase === "cutscene" && (key === " " || key === "enter")) {
    skipAscensionCutscene();
  }
  if (!event.repeat && viewMode === "game" && gameMode === "playing" && (key === " " || key === "enter")) {
    launchBalls();
  }
  if (event.key.startsWith("Arrow") || key === " ") {
    event.preventDefault();
  }
});

function setShopOpen(open) {
  document.getElementById("shop-backdrop").hidden = !open;
  if (open) renderShop();
}

document.getElementById("shop-toggle").addEventListener("click", () => setShopOpen(true));
document.getElementById("title-menu-toggle").addEventListener("click", showTitleScreen);
document.getElementById("start-game").addEventListener("click", beginGame);
document.getElementById("open-settings").addEventListener("click", showSettings);
document.getElementById("settings-back").addEventListener("click", () => {
  viewMode = "title";
  renderMenu();
});
document.getElementById("particle-toggle").addEventListener("change", (event) => {
  particleEffectsEnabled = event.target.checked;
  if (!particleEffectsEnabled) particles.length = 0;
});
document.getElementById("game-speed").addEventListener("change", (event) => {
  gameSpeed = Number(event.target.value);
});
document.getElementById("shop-close").addEventListener("click", () => setShopOpen(false));
document.getElementById("shop-backdrop").addEventListener("click", (event) => {
  if (event.target.id === "shop-backdrop") setShopOpen(false);
});
document.getElementById("sell-all").addEventListener("click", sellAllBrainrots);
document.getElementById("factory-grid").addEventListener("click", (event) => {
  const claimButton = event.target.closest("[data-claim]");
  const sellButton = event.target.closest("[data-sell]");
  if (claimButton) claimBrainrot(claimButton.dataset.claim);
  if (sellButton) sellBrainrot(sellButton.dataset.sell);
});
document.getElementById("factory-grid").addEventListener("input", (event) => {
  const nameInput = event.target.closest("[data-name]");
  if (!nameInput) return;
  const brainrot = brainrots.find((item) => item.id === nameInput.dataset.name);
  if (brainrot) {
    brainrot.name = nameInput.value;
    nameInput.closest(".brainrot").querySelector("img").alt = brainrot.name;
  }
});
document.getElementById("factory-grid").addEventListener("change", (event) => {
  const nameInput = event.target.closest("[data-name]");
  if (nameInput) {
    const brainrot = brainrots.find((item) => item.id === nameInput.dataset.name);
    if (brainrot) {
      brainrot.name = nameInput.value.trim() || brainrot.defaultName;
      nameInput.value = brainrot.name;
      nameInput.closest(".brainrot").querySelector("img").alt = brainrot.name;
    }
    return;
  }
  const input = event.target.closest("[data-image]");
  const file = input?.files[0];
  if (!input || !file) return;
  const brainrot = brainrots.find((item) => item.id === input.dataset.image);
  if (!brainrot) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    if (typeof reader.result !== "string") {
      window.alert("The selected image could not be loaded.");
      return;
    }
    brainrot.image = reader.result;
    renderFactory();
  });
  reader.addEventListener("error", () => window.alert("The selected image could not be loaded."));
  reader.readAsDataURL(file);
});
document.getElementById("upgrade-list").addEventListener("click", (event) => {
  if (event.target.closest("[data-ascend]")) {
    showAscension();
    return;
  }
  const button = event.target.closest("[data-upgrade]");
  if (button) buyUpgrade(button.dataset.upgrade);
});
document.getElementById("ascension-cutscene").addEventListener("click", skipAscensionCutscene);
document.getElementById("ascend-rebirth").addEventListener("click", goBackToRealWorld);
document.getElementById("ascend-stay").addEventListener("click", stayInBrickrot);
document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});

window.addEventListener("blur", function () {
  for (const key of Object.keys(keys)) {
    keys[key] = false;
  }
});

canvas.addEventListener("pointerdown", function (event) {
  canvas.setPointerCapture(event.pointerId);
  updateAim(event);
  movePaddleToPointer(event);
  launchBalls();
});

canvas.addEventListener("pointermove", function (event) {
  updateAim(event);
  if (event.buttons > 0 || event.pointerType === "touch") {
    movePaddleToPointer(event);
  }
});
