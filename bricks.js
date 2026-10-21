// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 12;
const BRICK_ROWS = 14;
const BRICK_WIDTH = WIDTH / BRICK_COLUMNS;
const BRICK_HEIGHT = BRICK_WIDTH;
const BOARD_TOP = 48;
const BOARD_BOTTOM = BOARD_TOP + BRICK_ROWS * BRICK_HEIGHT;

const TETROMINO_SHAPES = [
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[2, 0], [0, 1], [1, 1], [2, 1]]
];

function createBrick(x, y, hitsRequired = 1, effect = null) {
  return {
    x,
    y,
    width: BRICK_WIDTH,
    height: BRICK_HEIGHT,
    hitsRequired,
    hitsRemaining: hitsRequired,
    effect
  };
}

function drawBricks() {
  for (const brick of bricks) {
    const hue = (brick.x * 0.34 + brick.y * 0.18 + performance.now() / 32) % 360;
    const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.width, brick.y + brick.height);
    gradient.addColorStop(0, `hsl(${hue}, 100%, 62%)`);
    gradient.addColorStop(1, `hsl(${(hue + 62) % 360}, 100%, 48%)`);
    ctx.shadowColor = `hsl(${hue}, 100%, 58%)`;
    ctx.shadowBlur = 13;
    ctx.fillStyle = gradient;
    ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, brick.height - 4);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(brick.x + 2, brick.y + 2, brick.width - 4, brick.height - 4);
    ctx.fillStyle = "#10121a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 12px Impact, sans-serif";
    const label = brick.effect || (brick.hitsRequired > 1 ? `x${brick.hitsRemaining}` : "BLOCK");
    ctx.fillText(label, brick.x + brick.width / 2, brick.y + brick.height / 2, brick.width - 4);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}
