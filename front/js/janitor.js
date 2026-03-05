class StyledJanitor {
	constructor() {
		this.canvas = document.getElementById("janitorCanvas");
		this.ctx = this.canvas.getContext("2d");

		this.loopTimer = null;
		this.phase = 0;
		this.lastFrame = performance.now();

		this.swingDirection = 1;
		this.swingStart = 0;
		this.swingDuration = 420;
		this.isSwinging = false;
		this.midSplashDone = false;

		this.mood = "idle";
		this.moodStart = 0;
		this.moodDuration = 0;

		this.nextBlinkAt = performance.now() + 1400;
		this.blinkUntil = 0;

		this.particles = [];
		this.puddleLevel = 0.92;
		this.puddlePulse = 0;
		this.puddleCenter = { x: 0, y: 0 };
		this.puddleRadius = { x: 0, y: 0 };

		this.currentBroomTip = {
			x: (this.canvas.clientWidth || 220) * 0.72,
			y: (this.canvas.clientHeight || 220) * 0.76,
		};
		this.currentHead = {
			x: (this.canvas.clientWidth || 220) * 0.5,
			y: (this.canvas.clientHeight || 220) * 0.34,
		};
		this.currentCigaretteTip = {
			x: this.currentHead.x + 10,
			y: this.currentHead.y + 8,
		};

		this.render = this.render.bind(this);
		this.resizeCanvas();
		window.addEventListener("resize", () => this.resizeCanvas());
		requestAnimationFrame(this.render);
	}

	resizeCanvas() {
		const rect = this.canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const width = Math.max(1, Math.round(rect.width * dpr));
		const height = Math.max(1, Math.round(rect.height * dpr));

		if (this.canvas.width !== width || this.canvas.height !== height) {
			this.canvas.width = width;
			this.canvas.height = height;
		}
	}

	drawRoundedRect(x, y, w, h, r) {
		const ctx = this.ctx;
		const radius = Math.min(r, w / 2, h / 2);

		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + w - radius, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
		ctx.lineTo(x + w, y + h - radius);
		ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
		ctx.lineTo(x + radius, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
	}

	spawnParticle(particle) {
		this.particles.push(particle);
	}

	spawnWater(direction, count, speedScale = 1) {
		const tip = this.currentBroomTip;
		const dir = direction === -1 ? -1 : 1;
		const spread = Math.PI / 2.9;
		const baseAngle = dir < 0 ? -1.5 : -0.3;

		for (let i = 0; i < count; i++) {
			const angle = baseAngle + (Math.random() - 0.5) * spread;
			const speed = (90 + Math.random() * 160) * speedScale;
			const life = 0.34 + Math.random() * 0.42;

			this.spawnParticle({
				kind: "water",
				x: tip.x + (Math.random() - 0.5) * 10,
				y: tip.y + (Math.random() - 0.5) * 8,
				vx: Math.cos(angle) * speed + dir * 14,
				vy: Math.sin(angle) * speed - 12,
				gravity: 360 + Math.random() * 220,
				size: 1 + Math.random() * 2.6,
				life,
				maxLife: life,
				hue: 188 + Math.random() * 18,
				lightness: 58 + Math.random() * 22,
			});
		}
	}

	spawnSparkles(count) {
		for (let i = 0; i < count; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 22 + Math.random() * 70;
			const life = 0.6 + Math.random() * 0.55;

			this.spawnParticle({
				kind: "spark",
				x: this.currentHead.x + (Math.random() - 0.5) * 18,
				y: this.currentHead.y - 12 + (Math.random() - 0.5) * 12,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 18,
				gravity: 90,
				size: 1.2 + Math.random() * 2,
				life,
				maxLife: life,
			});
		}
	}

	spawnSadDrops(count) {
		for (let i = 0; i < count; i++) {
			const life = 0.7 + Math.random() * 0.35;
			this.spawnParticle({
				kind: "sad",
				x: this.currentHead.x + (Math.random() - 0.5) * 16,
				y: this.currentHead.y + 8,
				vx: (Math.random() - 0.5) * 20,
				vy: 20 + Math.random() * 20,
				gravity: 430,
				size: 1.6 + Math.random() * 2,
				life,
				maxLife: life,
			});
		}
	}

	spawnCigaretteSmoke(count = 1) {
		const tip = this.currentCigaretteTip;

		for (let i = 0; i < count; i++) {
			const life = 0.85 + Math.random() * 0.95;
			this.spawnParticle({
				kind: "smoke",
				x: tip.x + (Math.random() - 0.5) * 3.2,
				y: tip.y + (Math.random() - 0.5) * 2.4,
				vx: (Math.random() - 0.5) * 12,
				vy: -28 - Math.random() * 26,
				gravity: -14 + Math.random() * 16,
				size: 1.8 + Math.random() * 1.8,
				life,
				maxLife: life,
				swirl: Math.random() * Math.PI * 2,
			});
		}
	}

	triggerMood(type, durationMs) {
		this.mood = type;
		this.moodStart = performance.now();
		this.moodDuration = durationMs;
	}

	playWin() {
		this.triggerMood("win", 1900);
		this.spawnSparkles(26);
	}

	playLose() {
		this.triggerMood("lose", 1700);
		this.spawnSadDrops(20);
	}

	getMoodIntensity(now, type) {
		if (this.mood !== type) {
			return 0;
		}

		const elapsed = now - this.moodStart;
		const t = this.moodDuration > 0 ? elapsed / this.moodDuration : 1;
		if (t >= 1) {
			this.mood = "idle";
			return 0;
		}

		return Math.sin(Math.PI * t);
	}

	updateBlink(now) {
		if (now >= this.nextBlinkAt) {
			this.blinkUntil = now + 120;
			this.nextBlinkAt = now + 1700 + Math.random() * 1600;
		}

		return now < this.blinkUntil ? 0.1 : 1;
	}

	updateSwing(now) {
		if (!this.isSwinging) {
			return 0;
		}

		const elapsed = now - this.swingStart;
		const t = Math.min(1, elapsed / this.swingDuration);

		if (!this.midSplashDone && t >= 0.5) {
			this.spawnWater(this.swingDirection, 14, 1.05);
			this.midSplashDone = true;
		}

		if (t >= 1) {
			this.isSwinging = false;
			return 0;
		}

		return this.swingDirection * Math.sin(Math.PI * t);
	}

	updateParticles(dt, floorY, width) {
		const next = [];
		const delta = dt / 1000;

		for (const p of this.particles) {
			p.life -= delta;
			if (p.life <= 0) {
				continue;
			}

			p.vy += p.gravity * delta;
			p.x += p.vx * delta;
			p.y += p.vy * delta;

			if (p.kind === "smoke") {
				p.swirl += delta * 3.1;
				p.vx += Math.sin(p.swirl) * 1.2;
				p.vx *= 0.96;
				p.vy *= 0.985;
				p.size += delta * 2.8;
			} else if (p.kind === "water") {
				p.vx *= 0.988;
				if (p.y > floorY - 1) {
					p.y = floorY - 1;
					p.vy *= -0.26;
					p.vx *= 0.73;
				}
			} else if (p.kind === "spark") {
				p.vx *= 0.97;
			} else {
				p.vx *= 0.95;
				if (p.y > floorY - 1) {
					p.y = floorY - 1;
					p.vy *= -0.12;
					p.vx *= 0.7;
				}
			}

			if (p.x < -30 || p.x > width + 30) {
				continue;
			}

			next.push(p);
		}

		this.particles = next;
	}

	drawParticles() {
		const ctx = this.ctx;

		for (const p of this.particles) {
			const alpha = Math.max(0, p.life / p.maxLife);

			if (p.kind === "spark") {
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate((1 - alpha) * 2.2);
				ctx.strokeStyle = `hsla(45, 100%, 65%, ${alpha})`;
				ctx.lineWidth = 1.4;
				ctx.beginPath();
				ctx.moveTo(-p.size * 2.2, 0);
				ctx.lineTo(p.size * 2.2, 0);
				ctx.moveTo(0, -p.size * 2.2);
				ctx.lineTo(0, p.size * 2.2);
				ctx.stroke();
				ctx.restore();
				continue;
			}

			if (p.kind === "smoke") {
				ctx.fillStyle = `rgba(226, 232, 240, ${alpha * 0.34})`;
				ctx.beginPath();
				ctx.ellipse(p.x, p.y, p.size * 1.4, p.size, 0, 0, Math.PI * 2);
				ctx.fill();
				continue;
			}

			if (p.kind === "sad") {
				ctx.fillStyle = `hsla(214, 88%, 62%, ${alpha * 0.85})`;
			} else {
				ctx.fillStyle = `hsla(${p.hue}, 92%, ${p.lightness}%, ${alpha * 0.9})`;
			}

			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size * (0.7 + alpha * 0.4), 0, Math.PI * 2);
			ctx.fill();
		}
	}

	drawBackground(width, height, floorY, scale) {
		const ctx = this.ctx;

		const skyBottom = floorY - 24 * scale;
		const skyGradient = ctx.createLinearGradient(0, 0, 0, skyBottom);
		skyGradient.addColorStop(0, "rgba(191, 219, 254, 0.24)");
		skyGradient.addColorStop(1, "rgba(186, 230, 253, 0.08)");
		ctx.fillStyle = skyGradient;
		ctx.fillRect(0, 0, width, Math.max(0, skyBottom));

		const buildingX = width * 0.06;
		const buildingY = Math.max(8 * scale, floorY - 168 * scale);
		const buildingW = width * 0.88;
		const buildingH = Math.max(68 * scale, floorY - buildingY - 7 * scale);
		const facadeGradient = ctx.createLinearGradient(buildingX, buildingY, buildingX + buildingW, buildingY + buildingH);
		facadeGradient.addColorStop(0, "rgba(51, 65, 85, 0.58)");
		facadeGradient.addColorStop(1, "rgba(15, 23, 42, 0.7)");
		ctx.fillStyle = facadeGradient;
		this.drawRoundedRect(buildingX, buildingY, buildingW, buildingH, 8 * scale);
		ctx.fill();

		ctx.fillStyle = "rgba(148, 163, 184, 0.22)";
		ctx.fillRect(buildingX, buildingY + 10 * scale, buildingW, 4 * scale);

		const columns = 8;
		const rows = 3;
		const windowGapX = buildingW / (columns + 1);
		const windowGapY = (buildingH - 24 * scale) / (rows + 1);
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < columns; col++) {
				const wx = buildingX + windowGapX * (col + 1) - 4.2 * scale;
				const wy = buildingY + 20 * scale + windowGapY * row;
				const ww = 8.4 * scale;
				const wh = 5.2 * scale;
				const glow = 0.16 + ((row + col) % 3) * 0.07;
				ctx.fillStyle = `rgba(224, 242, 254, ${glow})`;
				this.drawRoundedRect(wx, wy, ww, wh, 1.6 * scale);
				ctx.fill();
			}
		}

		const signW = Math.min(buildingW * 0.46, 132 * scale);
		const signH = 22 * scale;
		const signX = buildingX + buildingW / 2 - signW / 2;
		const signY = buildingY + 10 * scale;
		const signGradient = ctx.createLinearGradient(signX, signY, signX + signW, signY + signH);
		signGradient.addColorStop(0, "rgba(30, 64, 175, 0.94)");
		signGradient.addColorStop(1, "rgba(37, 99, 235, 0.9)");
		ctx.fillStyle = signGradient;
		this.drawRoundedRect(signX, signY, signW, signH, 4 * scale);
		ctx.fill();
		ctx.strokeStyle = "rgba(191, 219, 254, 0.88)";
		ctx.lineWidth = 1.1 * scale;
		this.drawRoundedRect(signX, signY, signW, signH, 4 * scale);
		ctx.stroke();

		ctx.fillStyle = "rgba(239, 246, 255, 0.96)";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `${Math.max(8, Math.round(9.4 * scale))}px "JetBrains Mono", monospace`;
		ctx.fillText("РАНХИГС", signX + signW / 2, signY + signH / 2 + 0.5 * scale);

		const floorGradient = ctx.createLinearGradient(0, floorY - 36 * scale, 0, height);
		floorGradient.addColorStop(0, "rgba(227, 236, 244, 0.25)");
		floorGradient.addColorStop(1, "rgba(148, 163, 184, 0.5)");
		ctx.fillStyle = floorGradient;
		ctx.fillRect(0, floorY - 26 * scale, width, height - floorY + 26 * scale);

		ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
		ctx.lineWidth = 1;
		for (let i = 0; i < 4; i++) {
			const y = floorY + i * 8 * scale;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}

		this.puddleCenter = {
			x: width * 0.76,
			y: floorY - 3 * scale,
		};
		this.puddleRadius = {
			x: (24 + 18 * this.puddleLevel + Math.sin(this.puddlePulse) * 2.5) * scale,
			y: (10 + 8 * this.puddleLevel + Math.cos(this.puddlePulse * 0.8) * 1.8) * scale,
		};

		ctx.save();
		ctx.translate(this.puddleCenter.x, this.puddleCenter.y);
		const puddleGradient = ctx.createRadialGradient(
			-5 * scale,
			-3 * scale,
			2 * scale,
			0,
			0,
			this.puddleRadius.x
		);
		puddleGradient.addColorStop(0, "rgba(147, 224, 255, 0.75)");
		puddleGradient.addColorStop(0.55, "rgba(56, 189, 248, 0.52)");
		puddleGradient.addColorStop(1, "rgba(14, 116, 144, 0.18)");
		ctx.fillStyle = puddleGradient;
		ctx.beginPath();
		ctx.ellipse(0, 0, this.puddleRadius.x, this.puddleRadius.y, -0.16, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "rgba(224, 242, 254, 0.45)";
		ctx.beginPath();
		ctx.ellipse(-8 * scale, -2 * scale, this.puddleRadius.x * 0.28, this.puddleRadius.y * 0.22, -0.1, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		const bucketX = width * 0.14;
		const bucketY = floorY - 34 * scale;
		const bucketW = 34 * scale;
		const bucketH = 31 * scale;
		const bucketGradient = ctx.createLinearGradient(bucketX, bucketY, bucketX + bucketW, bucketY + bucketH);
		bucketGradient.addColorStop(0, "#60a5fa");
		bucketGradient.addColorStop(1, "#1d4ed8");
		ctx.fillStyle = bucketGradient;
		this.drawRoundedRect(bucketX, bucketY, bucketW, bucketH, 7 * scale);
		ctx.fill();

		ctx.strokeStyle = "rgba(191, 219, 254, 0.9)";
		ctx.lineWidth = 2 * scale;
		ctx.beginPath();
		ctx.arc(bucketX + bucketW / 2, bucketY + 4 * scale, 12 * scale, Math.PI, 0);
		ctx.stroke();
	}

	drawFace(headX, headY, scale, blink, winIntensity, loseIntensity) {
		const ctx = this.ctx;

		const eyeY = headY - 1.9 * scale + loseIntensity * 1.6 * scale;
		const browShift = winIntensity * 1.2 * scale - loseIntensity * 1.6 * scale;
		const eyeOpen = Math.max(0.2, blink * (0.95 - loseIntensity * 0.22));

		ctx.strokeStyle = "rgba(17, 24, 39, 0.88)";
		ctx.lineWidth = 1.55 * scale;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(headX - 10.8 * scale, eyeY - 5.3 * scale + browShift);
		ctx.quadraticCurveTo(
			headX - 6.4 * scale,
			eyeY - 8.5 * scale + browShift - loseIntensity * 0.9 * scale,
			headX - 1.7 * scale,
			eyeY - 5.2 * scale + browShift
		);
		ctx.moveTo(headX + 1.5 * scale, eyeY - 5.1 * scale + browShift);
		ctx.quadraticCurveTo(
			headX + 6.2 * scale,
			eyeY - 8.8 * scale + browShift - loseIntensity * 0.8 * scale,
			headX + 10.2 * scale,
			eyeY - 5 * scale + browShift
		);
		ctx.stroke();

		ctx.strokeStyle = "rgba(15, 23, 42, 0.95)";
		ctx.lineWidth = 2.2 * scale;
		ctx.beginPath();
		ctx.moveTo(headX - 7.8 * scale, eyeY - 4.9 * scale + browShift);
		ctx.quadraticCurveTo(
			headX + 0.4 * scale,
			eyeY - 7.3 * scale + browShift - loseIntensity * 0.5 * scale,
			headX + 8 * scale,
			eyeY - 4.9 * scale + browShift
		);
		ctx.stroke();

		ctx.strokeStyle = "rgba(71, 85, 105, 0.4)";
		ctx.lineWidth = 0.95 * scale;
		ctx.beginPath();
		ctx.arc(headX - 5.3 * scale, eyeY + 2.2 * scale, 2.9 * scale, 0.2, Math.PI - 0.25);
		ctx.arc(headX + 5.9 * scale, eyeY + 2.2 * scale, 2.9 * scale, 0.2, Math.PI - 0.25);
		ctx.stroke();

		if (winIntensity > 0.2) {
			ctx.strokeStyle = "#0f172a";
			ctx.lineWidth = 1.85 * scale;
			ctx.beginPath();
			ctx.arc(headX - 5.2 * scale, eyeY + 0.1 * scale, 2.5 * scale, 0.15, Math.PI - 0.15);
			ctx.arc(headX + 5.8 * scale, eyeY + 0.1 * scale, 2.5 * scale, 0.15, Math.PI - 0.15);
			ctx.stroke();
		} else {
			const eyeHeight = 1.2 * scale * eyeOpen + 0.45 * scale;
			ctx.fillStyle = "rgba(248, 250, 252, 0.9)";
			ctx.beginPath();
			ctx.ellipse(headX - 5.2 * scale, eyeY, 2.4 * scale, eyeHeight, 0, 0, Math.PI * 2);
			ctx.ellipse(headX + 5.8 * scale, eyeY, 2.4 * scale, eyeHeight, 0, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = "#0b1220";
			ctx.beginPath();
			ctx.ellipse(headX - 5.2 * scale, eyeY + loseIntensity * 0.35 * scale, 1 * scale, 1.2 * scale, 0, 0, Math.PI * 2);
			ctx.ellipse(headX + 5.8 * scale, eyeY + loseIntensity * 0.35 * scale, 1 * scale, 1.2 * scale, 0, 0, Math.PI * 2);
			ctx.fill();

			if (loseIntensity > 0.35) {
				ctx.strokeStyle = "rgba(239, 68, 68, 0.35)";
				ctx.lineWidth = 0.7 * scale;
				ctx.beginPath();
				ctx.moveTo(headX - 7.2 * scale, eyeY + 1.8 * scale);
				ctx.lineTo(headX - 3.4 * scale, eyeY + 2.1 * scale);
				ctx.moveTo(headX + 4 * scale, eyeY + 2.1 * scale);
				ctx.lineTo(headX + 7.8 * scale, eyeY + 1.8 * scale);
				ctx.stroke();
			}
		}

		ctx.fillStyle = "rgba(191, 120, 90, 0.75)";
		ctx.beginPath();
		ctx.moveTo(headX + 0.8 * scale, headY + 0.2 * scale);
		ctx.lineTo(headX - 1.6 * scale, headY + 5.5 * scale);
		ctx.quadraticCurveTo(headX + 1.2 * scale, headY + 6.6 * scale, headX + 2.9 * scale, headY + 5.1 * scale);
		ctx.lineTo(headX + 1.8 * scale, headY + 0.4 * scale);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "rgba(124, 45, 18, 0.4)";
		ctx.lineWidth = 0.8 * scale;
		ctx.beginPath();
		ctx.moveTo(headX + 0.6 * scale, headY + 0.6 * scale);
		ctx.lineTo(headX + 1.6 * scale, headY + 4.9 * scale);
		ctx.stroke();

		const mouthCenterX = headX + 1.1 * scale;
		const mouthBaseY = headY + 9.2 * scale + loseIntensity * 0.9 * scale;

		ctx.strokeStyle = "#7c2d12";
		ctx.lineWidth = 1.7 * scale;
		ctx.lineCap = "round";

		if (winIntensity > 0.2) {
			const smileLift = 2.2 * scale + winIntensity * 1.6 * scale;
			const smileW = 5.2 * scale;

			ctx.beginPath();
			ctx.moveTo(mouthCenterX - smileW, mouthBaseY);
			ctx.bezierCurveTo(
				mouthCenterX - 2.4 * scale,
				mouthBaseY - smileLift,
				mouthCenterX + 2.2 * scale,
				mouthBaseY - smileLift,
				mouthCenterX + smileW,
				mouthBaseY
			);
			ctx.stroke();

			ctx.fillStyle = "rgba(30, 41, 59, 0.65)";
			ctx.beginPath();
			ctx.moveTo(mouthCenterX - 3.4 * scale, mouthBaseY - 0.2 * scale);
			ctx.quadraticCurveTo(mouthCenterX, mouthBaseY + 2.4 * scale, mouthCenterX + 3.5 * scale, mouthBaseY - 0.1 * scale);
			ctx.quadraticCurveTo(mouthCenterX, mouthBaseY + 0.9 * scale, mouthCenterX - 3.4 * scale, mouthBaseY - 0.2 * scale);
			ctx.fill();

			ctx.strokeStyle = "rgba(248, 250, 252, 0.85)";
			ctx.lineWidth = 0.9 * scale;
			ctx.beginPath();
			ctx.moveTo(mouthCenterX - 2.8 * scale, mouthBaseY + 0.3 * scale);
			ctx.lineTo(mouthCenterX + 2.8 * scale, mouthBaseY + 0.3 * scale);
			ctx.stroke();
		} else {
			const sadBlend = Math.min(1, loseIntensity * 1.3);
			const mouthW = 4.9 * scale;
			const neutralY = mouthBaseY + Math.sin(this.phase * 0.5) * 0.07 * scale;

			if (sadBlend < 0.12) {
				ctx.beginPath();
				ctx.moveTo(mouthCenterX - mouthW, neutralY);
				ctx.lineTo(mouthCenterX + mouthW, neutralY);
				ctx.stroke();
			} else {
				const frownDepth = (1 + sadBlend * 3.8) * scale;
				const skew = Math.sin(this.phase * 0.6) * 0.35 * scale * sadBlend;

				ctx.beginPath();
				ctx.moveTo(mouthCenterX - mouthW, neutralY);
				ctx.bezierCurveTo(
					mouthCenterX - 2.2 * scale,
					neutralY + frownDepth + skew,
					mouthCenterX + 2.4 * scale,
					neutralY + frownDepth - skew,
					mouthCenterX + mouthW,
					neutralY
				);
				ctx.stroke();

				if (sadBlend > 0.45) {
					ctx.strokeStyle = "rgba(124, 45, 18, 0.48)";
					ctx.lineWidth = 0.8 * scale;
					ctx.beginPath();
					ctx.moveTo(mouthCenterX - 3.3 * scale, neutralY + 1.2 * scale + sadBlend * 0.6 * scale);
					ctx.lineTo(mouthCenterX + 3.4 * scale, neutralY + 1.2 * scale + sadBlend * 0.6 * scale);
					ctx.stroke();
				}
			}
		}

		ctx.fillStyle = "rgba(51, 65, 85, 0.14)";
		ctx.beginPath();
		ctx.ellipse(headX + 1 * scale, headY + 13.3 * scale, 6.9 * scale, 2.9 * scale, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = "rgba(30, 41, 59, 0.58)";
		ctx.lineWidth = 0.85 * scale;
		for (let i = -4; i <= 4; i++) {
			const x = headX + i * 1.9 * scale;
			const yTop = headY + 11.9 * scale + (Math.abs(i) % 2) * 0.55 * scale;
			ctx.beginPath();
			ctx.moveTo(x, yTop);
			ctx.lineTo(x + (i % 2 ? 0.35 : -0.35) * scale, yTop + 2.1 * scale);
			ctx.stroke();
		}
	}

	drawCigarette(headX, headY, scale, loseIntensity) {
		const ctx = this.ctx;
		const angle = -0.15 - loseIntensity * 0.12;
		const cx = headX + 9.2 * scale;
		const cy = headY + 8.5 * scale;

		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(angle);

		this.drawRoundedRect(0, -1.1 * scale, 13 * scale, 2.2 * scale, 1 * scale);
		ctx.fillStyle = "#f8fafc";
		ctx.fill();

		this.drawRoundedRect(10.5 * scale, -1.1 * scale, 2.5 * scale, 2.2 * scale, 1 * scale);
		ctx.fillStyle = "#f59e0b";
		ctx.fill();

		this.drawRoundedRect(12.2 * scale, -0.6 * scale, 1.2 * scale, 1.2 * scale, 0.5 * scale);
		ctx.fillStyle = "#ef4444";
		ctx.fill();

		const smokeDrift = Math.sin(this.phase * 2.1) * 0.9 * scale;
		ctx.strokeStyle = "rgba(203, 213, 225, 0.65)";
		ctx.lineWidth = 1 * scale;
		ctx.beginPath();
		ctx.moveTo(13.2 * scale, -0.2 * scale);
		ctx.bezierCurveTo(15 * scale, -3 * scale, 14 * scale + smokeDrift, -7 * scale, 17 * scale, -10 * scale);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(12.8 * scale, 0.8 * scale);
		ctx.bezierCurveTo(15 * scale, -1.5 * scale, 15 * scale + smokeDrift, -6 * scale, 18.5 * scale, -8.5 * scale);
		ctx.stroke();

		const tipLocalX = 13.2 * scale;
		const tipLocalY = -0.2 * scale;
		this.currentCigaretteTip = {
			x: cx + Math.cos(angle) * tipLocalX - Math.sin(angle) * tipLocalY,
			y: cy + Math.sin(angle) * tipLocalX + Math.cos(angle) * tipLocalY,
		};

		ctx.restore();
	}

	drawCharacter(scale, floorY, broomAngle, bobOffset, blink, winIntensity, loseIntensity, width) {
		const ctx = this.ctx;
		const centerX = width * 0.5;
		const bodyBaseY = floorY - 6 * scale + loseIntensity * 4.8 * scale;
		const torsoY = bodyBaseY - 96 * scale - bobOffset;

		ctx.fillStyle = "rgba(10, 18, 32, 0.25)";
		ctx.beginPath();
		ctx.ellipse(centerX + 4 * scale, floorY + 4 * scale, 47 * scale, 10 * scale, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "#334155";
		this.drawRoundedRect(centerX - 21 * scale, bodyBaseY - 44 * scale, 16 * scale, 44 * scale, 5 * scale);
		ctx.fill();
		this.drawRoundedRect(centerX + 4 * scale, bodyBaseY - 44 * scale, 16 * scale, 44 * scale, 5 * scale);
		ctx.fill();

		ctx.fillStyle = "#111827";
		this.drawRoundedRect(centerX - 26 * scale, bodyBaseY - 3 * scale, 24 * scale, 9 * scale, 4 * scale);
		ctx.fill();
		this.drawRoundedRect(centerX + 3 * scale, bodyBaseY - 3 * scale, 24 * scale, 9 * scale, 4 * scale);
		ctx.fill();

		ctx.fillStyle = "#2563eb";
		this.drawRoundedRect(centerX - 31 * scale, torsoY, 63 * scale, 55 * scale, 12 * scale);
		ctx.fill();

		ctx.fillStyle = "#dbeafe";
		ctx.beginPath();
		ctx.moveTo(centerX - 8 * scale, torsoY + 8 * scale);
		ctx.lineTo(centerX + 24 * scale, torsoY + 8 * scale);
		ctx.lineTo(centerX + 28 * scale, torsoY + 43 * scale);
		ctx.lineTo(centerX - 12 * scale, torsoY + 43 * scale);
		ctx.closePath();
		ctx.fill();

		const headX = centerX + 1 * scale;
		const headY = torsoY - 16 * scale - loseIntensity * 1.2 * scale;
		this.currentHead = { x: headX, y: headY };
		const headR = 16 * scale;

		ctx.fillStyle = "#f3c9a5";
		ctx.beginPath();
		ctx.arc(headX, headY, headR, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "#1f2937";
		ctx.beginPath();
		ctx.arc(headX - 1 * scale, headY - 11 * scale, 11 * scale, Math.PI, Math.PI * 2);
		ctx.fill();

		this.drawFace(headX, headY, scale, blink, winIntensity, loseIntensity);
		this.drawCigarette(headX, headY, scale, loseIntensity);

		const sipProgress = winIntensity > 0.08
			? (Math.sin(this.phase * 8.6) * 0.5 + 0.5) * winIntensity
			: 0;
		const leftShoulder = {
			x: centerX - 26 * scale,
			y: torsoY + 13 * scale,
		};
		const leftArmLift = winIntensity * 18 * scale - loseIntensity * 2.4 * scale;
		const baseLeftHand = {
			x: centerX - 42 * scale - winIntensity * 1.4 * scale,
			y: torsoY + 28 * scale - leftArmLift,
		};
		const sipTarget = {
			x: headX + 8.2 * scale,
			y: headY + 6.9 * scale,
		};
		const leftHand = {
			x: baseLeftHand.x + (sipTarget.x - baseLeftHand.x) * sipProgress,
			y: baseLeftHand.y + (sipTarget.y - baseLeftHand.y) * sipProgress,
		};

		ctx.strokeStyle = "#f3c9a5";
		ctx.lineWidth = 8 * scale;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(leftShoulder.x, leftShoulder.y);
		ctx.lineTo(leftHand.x, leftHand.y);
		ctx.stroke();

		const restBeerAngle = -0.24 + winIntensity * 0.18;
		const sipBeerAngle = -1.22;
		const beerAngle = restBeerAngle + (sipBeerAngle - restBeerAngle) * sipProgress;
		const beerW = 10 * scale;
		const beerH = 24 * scale;
		ctx.save();
		ctx.translate(leftHand.x - 2 * scale, leftHand.y - 4 * scale);
		ctx.rotate(beerAngle);
		const beerGradient = ctx.createLinearGradient(0, -beerH / 2, 0, beerH / 2);
		beerGradient.addColorStop(0, "#fbbf24");
		beerGradient.addColorStop(1, "#b45309");
		ctx.fillStyle = beerGradient;
		this.drawRoundedRect(-beerW / 2, -beerH / 2, beerW, beerH, 3 * scale);
		ctx.fill();
		ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
		this.drawRoundedRect(-beerW / 2, -beerH / 2 - 2.6 * scale, beerW, 4.4 * scale, 2.4 * scale);
		ctx.fill();
		ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
		this.drawRoundedRect(-beerW / 2 + 1.5 * scale, -2 * scale, beerW - 3 * scale, 6 * scale, 1.2 * scale);
		ctx.fill();
		ctx.restore();

		if (sipProgress > 0.2) {
			ctx.fillStyle = `rgba(255, 255, 255, ${0.45 + sipProgress * 0.45})`;
			ctx.beginPath();
			ctx.arc(headX + 8.8 * scale, headY + 7.9 * scale, (0.7 + sipProgress * 0.9) * scale, 0, Math.PI * 2);
			ctx.fill();

			ctx.strokeStyle = `rgba(250, 204, 21, ${0.18 + sipProgress * 0.24})`;
			ctx.lineWidth = 1.2 * scale;
			ctx.beginPath();
			ctx.moveTo(headX + 7.7 * scale, headY + 9 * scale);
			ctx.lineTo(headX + 5.8 * scale, headY + 14.5 * scale);
			ctx.stroke();
		}

		const rightShoulder = {
			x: centerX + 25 * scale,
			y: torsoY + 11 * scale,
		};
		const handLength = 24 * scale;
		const rightHand = {
			x: rightShoulder.x + Math.cos(broomAngle) * handLength,
			y: rightShoulder.y + Math.sin(broomAngle) * handLength,
		};

		ctx.beginPath();
		ctx.moveTo(rightShoulder.x, rightShoulder.y);
		ctx.lineTo(rightHand.x, rightHand.y);
		ctx.stroke();

		const broomLength = 74 * scale;
		const tipX = rightHand.x + Math.cos(broomAngle) * broomLength;
		const tipY = rightHand.y + Math.sin(broomAngle) * broomLength;
		this.currentBroomTip = { x: tipX, y: tipY };

		ctx.strokeStyle = "#8b5a2b";
		ctx.lineWidth = 5 * scale;
		ctx.beginPath();
		ctx.moveTo(rightHand.x, rightHand.y);
		ctx.lineTo(tipX, tipY);
		ctx.stroke();

		ctx.save();
		ctx.translate(tipX, tipY);
		ctx.rotate(broomAngle + Math.PI / 2);

		const brushW = 20 * scale;
		const brushH = 24 * scale;
		const brushGradient = ctx.createLinearGradient(-brushW / 2, -brushH / 2, brushW / 2, brushH / 2);
		brushGradient.addColorStop(0, "#d1a970");
		brushGradient.addColorStop(1, "#a66f3f");
		ctx.fillStyle = brushGradient;
		this.drawRoundedRect(-brushW / 2, -brushH / 2, brushW, brushH, 4 * scale);
		ctx.fill();

		ctx.strokeStyle = "rgba(70, 45, 20, 0.55)";
		ctx.lineWidth = 1.2 * scale;
		for (let i = -3; i <= 3; i++) {
			ctx.beginPath();
			ctx.moveTo(i * 2.2 * scale, -brushH / 2 + 2 * scale);
			ctx.lineTo(i * 2.2 * scale, brushH / 2 - 2 * scale);
			ctx.stroke();
		}

		ctx.restore();
	}

	updatePuddleWithBroom(dt, sweepPower) {
		const dx = this.currentBroomTip.x - this.puddleCenter.x;
		const dy = this.currentBroomTip.y - this.puddleCenter.y;
		const rx = this.puddleRadius.x || 1;
		const ry = this.puddleRadius.y || 1;
		const normalizedDist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
		const touchingPuddle = normalizedDist < 1.6;

		if (touchingPuddle) {
			const cleaningPower = 0.00035 + Math.abs(sweepPower) * 0.0018 + (this.loopTimer ? 0.001 : 0);
			this.puddleLevel = Math.max(0.52, this.puddleLevel - dt * cleaningPower);

			if (Math.random() < 0.22) {
				this.spawnWater(this.swingDirection, 2, 0.62);
			}
		} else {
			this.puddleLevel = Math.min(0.95, this.puddleLevel + dt * 0.00022);
		}
	}

	render(now) {
		this.resizeCanvas();

		const width = this.canvas.clientWidth || 260;
		const height = this.canvas.clientHeight || 320;
		const floorY = height * 0.84;
		const scale = Math.min(width / 205, height / 270);

		const dpr = window.devicePixelRatio || 1;
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.ctx.clearRect(0, 0, width, height);

		const dt = Math.min(33, now - this.lastFrame);
		this.lastFrame = now;
		this.phase += dt * 0.0022;
		this.puddlePulse += dt * 0.003;

		const winIntensity = this.getMoodIntensity(now, "win");
		const loseIntensity = this.getMoodIntensity(now, "lose");
		const blink = this.updateBlink(now);
		const swingPower = this.updateSwing(now);

		const idleSweep = Math.sin(this.phase * 0.92) * 0.2;
		const workSweep = this.loopTimer ? Math.sin(this.phase * 4.2) * 0.08 : 0;
		const broomAngle =
			0.34 +
			idleSweep +
			workSweep +
			swingPower * 0.9 +
			loseIntensity * 0.08 -
			winIntensity * 0.05;

		const bobOffset =
			(Math.sin(this.phase * 0.86) * 2.2 + Math.cos(this.phase * 0.45) * 0.9 + Math.abs(swingPower) * 1.5) *
			scale;

		if (winIntensity > 0.2 && Math.random() < 0.12) {
			this.spawnSparkles(1);
		}
		if (loseIntensity > 0.2 && Math.random() < 0.16) {
			this.spawnSadDrops(1);
		}

		this.updateParticles(dt, floorY, width);
		this.drawBackground(width, height, floorY, scale);
		this.drawCharacter(scale, floorY, broomAngle, bobOffset, blink, winIntensity, loseIntensity, width);
		if (Math.random() < 0.46) {
			this.spawnCigaretteSmoke(1);
			if (loseIntensity > 0.3 && Math.random() < 0.25) {
				this.spawnCigaretteSmoke(1);
			}
		}
		this.updatePuddleWithBroom(dt, swingPower + workSweep + idleSweep * 0.4);
		this.drawParticles();

		requestAnimationFrame(this.render);
	}

	animate(direction) {
		this.swingDirection = direction === "up" ? -1 : 1;
		this.swingStart = performance.now();
		this.isSwinging = true;
		this.midSplashDone = false;
		this.spawnWater(this.swingDirection, 9, 0.92);
	}

	startLoop(direction) {
		this.stopLoop();
		this.animate(direction);
		this.loopTimer = setInterval(() => this.animate(direction), 460);
	}

	stopLoop() {
		if (this.loopTimer) {
			clearInterval(this.loopTimer);
			this.loopTimer = null;
		}
	}
}

window.Janitor = new StyledJanitor();

window.janitorSwingUp = () => window.Janitor.animate("up");
window.janitorSwingDown = () => window.Janitor.animate("down");
window.janitorWin = () => window.Janitor.playWin();
window.janitorLose = () => window.Janitor.playLose();
