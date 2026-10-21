function drawPaddle() {
  const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
  gradient.addColorStop(0, "#ff37a6");
  gradient.addColorStop(0.5, "#ffe64a");
  gradient.addColorStop(1, "#36f4e0");
  ctx.shadowColor = "#ff38b9";
  ctx.shadowBlur = 24;
  ctx.fillStyle = gradient;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.shadowBlur = 0;
}

function draw() {
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, "#170624");
  background.addColorStop(0.5, "#071d2c");
  background.addColorStop(1, "#271007");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "rgba(255,255,255,.045)";
  for (let line = 0; line < HEIGHT; line += 8) ctx.fillRect(0, line, WIDTH, 1);

  drawPaddle();
  for (const ball of balls) {
    ctx.beginPath();
    ctx.arc(ball.x + ball.width / 2, ball.y + ball.height / 2, ball.width / 2, 0, Math.PI * 2);
    ctx.shadowColor = "#fbff43";
    ctx.shadowBlur = 25;
    ctx.fillStyle = "#fbff43";
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  if (!volleyActive && gameMode === "playing") {
    const aimX = paddle.x + paddle.width / 2 + Math.sin(aimAngle) * 80;
    const aimY = paddle.y + paddle.height / 2 - Math.cos(aimAngle) * 80;
    ctx.strokeStyle = "rgba(255, 230, 74, 0.7)";
    ctx.setLineDash([7, 8]);
    ctx.beginPath();
    ctx.moveTo(paddle.x + paddle.width / 2, paddle.y);
    ctx.lineTo(aimX, aimY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawBricks();
  drawBoardGuides();
  drawHud();
  if (gameMode === "gameover") drawGameOver();
}

function drawBoardGuides() {
  ctx.strokeStyle = "rgba(111, 240, 255, 0.15)";
  ctx.lineWidth = 1;
  for (let col = 0; col <= BRICK_COLUMNS; col++) {
    const x = col * BRICK_WIDTH;
    ctx.beginPath();
    ctx.moveTo(x, BOARD_TOP);
    ctx.lineTo(x, BOARD_BOTTOM);
    ctx.stroke();
  }
  for (let row = 0; row <= BRICK_ROWS; row++) {
    const y = BOARD_TOP + row * BRICK_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#ff3c9e";
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 7]);
  ctx.beginPath();
  ctx.moveTo(0, BOARD_BOTTOM - BRICK_HEIGHT);
  ctx.lineTo(WIDTH, BOARD_BOTTOM - BRICK_HEIGHT);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHud() {
  ctx.fillStyle = "#ffe64a";
  ctx.font = "bold 20px Impact, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`BRAINROTS ${brainrots.length}/${factoryCapacity}`, 12, 24);
  ctx.fillStyle = "#42f2df";
  ctx.fillText(`BALLS ${balls.length}`, 12, 47);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ff64bb";
  ctx.fillText(`SCORE ${GameState.Score}`, WIDTH - 12, 24);
  ctx.textAlign = "left";
  ctx.textAlign = "left";
}

function drawGameOver() {
  ctx.fillStyle = "rgba(8, 3, 18, 0.88)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawPaddle();
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff4cae";
  ctx.font = "bold 44px Impact, sans-serif";
  ctx.fillText("FACTORY JAMMED", WIDTH / 2, HEIGHT / 2 - 30);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px Impact, sans-serif";
  ctx.fillText(gameOverReason, WIDTH / 2, HEIGHT / 2 + 5);
  ctx.fillText("REFRESH TO RESTART", WIDTH / 2, HEIGHT / 2 + 48);
  ctx.textAlign = "left";
}
