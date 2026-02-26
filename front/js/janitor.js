// =============================
//  Pixel Janitor — improved 3-state broom system
// =============================

class PixelJanitor {
	constructor() {
		this.canvas = document.getElementById("janitorCanvas");
		this.ctx = this.canvas.getContext("2d");

		this.state = "idle";  // idle / up / down
		this.isAnimating = false;
		this.loopTimer = null;

		this.draw("idle");
	}

	// =======================================================
	// Основной рисунок уборщика + три варианта расположения метлы
	// =======================================================
	draw(state) {
		const ctx = this.ctx;
		ctx.clearRect(0, 0, 200, 200);

		// масштаб (оригинал 400х400)
		ctx.save();
		ctx.scale(0.5, 0.5);

		// ---------- пол ----------
		ctx.fillStyle = "#78909c";
		ctx.fillRect(0, 280, 400, 120);

		ctx.fillStyle = "#62727b";
		for (let i = 0; i < 10; i++) ctx.fillRect(i * 40 + 2, 280, 10, 120);

		const C = {
			SKIN: "#f1c27d",
			OVERALL: "#3a6ea5",
			OVERALL_DARK: "#2d5580",
			HAIR: "#2c1e0f",
			EYE: "#ffffff",
			PUPIL: "#000000",
			CHEEK: "#e6a1a1",
			BROOM_HANDLE: "#8b5a2b",
			BROOM_BRISTLES: "#c08b4a",
			BROOM_DARK: "#a5713c"
		};

		// ---------- тело ----------
		ctx.fillStyle = C.OVERALL_DARK;
		ctx.fillRect(160, 230, 25, 50);
		ctx.fillRect(215, 230, 25, 50);

		ctx.fillStyle = C.OVERALL;
		ctx.fillRect(150, 180, 100, 55);

		ctx.fillStyle = C.OVERALL_DARK;
		ctx.fillRect(150, 200, 100, 10);

		// ---------- голова ----------
		ctx.fillStyle = C.SKIN;
		ctx.fillRect(175, 130, 50, 50);

		ctx.fillStyle = C.HAIR;
		ctx.fillRect(175, 125, 50, 10);
		ctx.fillRect(170, 130, 15, 15);
		ctx.fillRect(255, 130, 15, 15);

		ctx.fillStyle = C.EYE;
		ctx.fillRect(185, 150, 8, 8);
		ctx.fillRect(225, 150, 8, 8);

		ctx.fillStyle = C.PUPIL;
		ctx.fillRect(188, 153, 4, 4);
		ctx.fillRect(228, 153, 4, 4);

		ctx.fillStyle = "#b04f4f";
		ctx.fillRect(205, 168, 15, 4);

		ctx.fillStyle = C.CHEEK;
		ctx.fillRect(170, 158, 10, 5);
		ctx.fillRect(250, 158, 10, 5);

		// ---------- руки ----------
		ctx.fillStyle = C.SKIN;

		if (state === "up") {
			ctx.fillRect(120, 190, 25, 15);
			ctx.fillRect(255, 160, 25, 15);
		} else if (state === "down") {
			ctx.fillRect(120, 210, 25, 15);
			ctx.fillRect(255, 200, 25, 15);
		} else {
			// idle
			ctx.fillRect(120, 200, 25, 15);
			ctx.fillRect(255, 180, 25, 15);
		}

		// =======================================================
		//                    МЕТЛА
		// =======================================================

		// ----- UP -----
		if (state === "up") {
			ctx.fillStyle = C.BROOM_HANDLE;
			ctx.fillRect(280, 110, 100, 12);
			ctx.fillRect(265, 120, 20, 8);
			ctx.fillRect(245, 130, 20, 8);

			ctx.fillStyle = C.BROOM_BRISTLES;
			ctx.fillRect(365, 90, 20, 40);

			ctx.fillStyle = C.BROOM_DARK;
			ctx.fillRect(360, 110, 30, 10);
		}

		// ----- DOWN (ниже обычного) -----
		else if (state === "down") {
			ctx.fillStyle = C.BROOM_HANDLE;
			ctx.fillRect(270, 225, 110, 12); // ниже пола

			ctx.fillStyle = C.BROOM_BRISTLES;
			ctx.fillRect(365, 230, 40, 50);

			ctx.fillStyle = C.BROOM_DARK;
			ctx.fillRect(360, 255, 40, 10);
		}

		// ----- IDLE (оригинальная позиция) -----
		else {
			ctx.fillStyle = C.BROOM_HANDLE;
			ctx.fillRect(270, 190, 100, 10);

			ctx.fillStyle = C.BROOM_BRISTLES;
			ctx.fillRect(360, 165, 25, 45);

			ctx.fillStyle = C.BROOM_DARK;
			ctx.fillRect(360, 200, 25, 10);
		}

		ctx.restore();
	}

	// =======================================================
	//   Анимации (вверх / вниз → idle)
	// =======================================================
	animate(direction) {
		if (this.isAnimating) return;
		this.isAnimating = true;

		this.state = direction;
		this.draw(direction);

		setTimeout(() => {
			this.state = "idle";
			this.draw("idle");
			this.isAnimating = false;
		}, 260);
	}

	// =======================================================
	//        Повторные взмахи пока ставка активна
	// =======================================================
	startLoop(direction) {
		this.stopLoop();
		this.loopTimer = setInterval(() => this.animate(direction), 450);
	}

	stopLoop() {
		if (this.loopTimer) {
			clearInterval(this.loopTimer);
			this.loopTimer = null;
		}
	}
}

// глобальный объект
window.Janitor = new PixelJanitor();

// удобные alias-функции
window.janitorSwingUp   = () => window.Janitor.animate("up");
window.janitorSwingDown = () => window.Janitor.animate("down");