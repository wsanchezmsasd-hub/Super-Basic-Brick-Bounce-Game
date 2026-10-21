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
    setShopOpen(true);
  } else if (!event.repeat && key === "escape") {
    setShopOpen(false);
  }
  if (!event.repeat && gameMode === "playing" && (key === " " || key === "enter")) {
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
document.getElementById("upgrade-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-upgrade]");
  if (button) buyUpgrade(button.dataset.upgrade);
});
document.getElementById("brainrot-image").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    customBrainrotImage = reader.result;
    try {
      localStorage.setItem("brickscape-brainrot-image", customBrainrotImage);
    } catch {
      // Keep the selected image active even when browser storage is full.
    }
    for (const brainrot of brainrots) brainrot.image = customBrainrotImage;
    renderFactory();
  });
  reader.readAsDataURL(file);
});

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
