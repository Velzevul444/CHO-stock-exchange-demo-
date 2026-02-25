// =============================
//  Pixel Janitor — broom animation (enhanced down movement)
// =============================

class PixelJanitor {
	constructor() {
		this.canvas = document.getElementById("janitorCanvas");
		this.ctx = this.canvas.getContext("2d");

		this.broomAngle = 0;
		this.isAnimating = false;

		this.draw(0);
	}

	draw(angle) {
		const ctx = this.ctx;

		ctx.clearRect(0, 0, 200, 200);

		ctx.save();
		ctx.scale(0.5, 0.5);

		const C = {
			SKIN: "#f1c27d",
			OVERALL: "#3a6ea5",
			OVERALL_DARK: "#2d5580",
			SHIRT: "#d4a76a",
			HAIR: "#2c1e0f",
			EYE: "#ffffff",
			PUPIL: "#000000",
			CHEEK: "#e6a1a1",
			BROOM_HANDLE: "#8b5a2b",
			BROOM_BRISTLES: "#c08b4a",
			BROOM_DARK: "#a5713c"
		};

		// Пол
		ctx.fillStyle = "#78909c";
		ctx.fillRect(0, 280, 400, 120);
		ctx.fillStyle = "#62727b";
		for (let i = 0; i < 10; i++) ctx.fillRect(i * 40 + 2, 280, 10, 120);

		// Ноги
		ctx.fillStyle = C.OVERALL_DARK;
		ctx.fillRect(160, 230, 25, 50);
		ctx.fillRect(215, 230, 25, 50);

		// Туловище
		ctx.fillStyle = C.OVERALL;
		ctx.fillRect(150, 180, 100, 55);
		ctx.fillStyle = C.OVERALL_DARK;
		ctx.fillRect(150, 200, 100, 10);

		// Голова
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

		// Руки
		ctx.fillStyle = C.SKIN;
		if (angle > 0.5) ctx.fillRect(120, 190, 25, 15);
		else if (angle < 0) ctx.fillRect(120, 215, 25, 15); // ниже, если вниз
		else ctx.fillRect(120, 200, 25, 15);

		if (angle > 0.5) ctx.fillRect(255, 160, 25, 15);
		else if (angle < 0) ctx.fillRect(255, 200, 25, 15); // ниже
		else ctx.fillRect(255, 180, 25, 15);

		// Метла
		if (angle > 0.5) {
			// Вверх
			ctx.fillStyle = C.BROOM_HANDLE;
			ctx.fillRect(280, 110, 100, 12);
			ctx.fillRect(265, 120, 20, 8);
			ctx.fillRect(245, 130, 20, 8);

			ctx.fillStyle = C.BROOM_BRISTLES;
			ctx.fillRect(365, 90, 20, 40);

			ctx.fillStyle = C.BROOM_DARK;
			ctx.fillRect(360, 110, 30, 10);

		} else if (angle < 0) {
			// Глубже вниз (ниже обычной позиции)
			ctx.fillStyle = C.BROOM_HANDLE;
			ctx.fillRect(270, 220, 100, 12);

			ctx.fillStyle = C.BROOM_BRISTLES;
			ctx.fillRect(360, 210, 25, 50);

			ctx.fillStyle = C.BROOM_DARK;
			ctx.fillRect(360, 245, 25, 10);

		} else {
			// Обычная вниз
			ctx.fillStyle = C.BROOM_HANDLE;
			ctx.fillRect(270, 190, 100, 10);

			ctx.fillStyle = C.BROOM_BRISTLES;
			ctx.fillRect(360, 165, 25, 45);

			ctx.fillStyle = C.BROOM_DARK;
			ctx.fillRect(360, 200, 25, 10);
		}

		ctx.restore();
	}

	// Анимация
	animate(direction) {
		if (this.isAnimating) return;

		this.isAnimating = true;

		if (direction === "up") {
			this.broomAngle = 1;
		} else {
			this.broomAngle = -0.6; // ниже обычного ↓
		}

		this.draw(this.broomAngle);

		setTimeout(() => {
			this.broomAngle = 0;
			this.draw(0);
			this.isAnimating = false;
		}, 320);
	}
}

window.Janitor = new PixelJanitor();
window.janitorSwingUp = () => window.Janitor.animate("up");
window.janitorSwingDown = () => window.Janitor.animate("down");