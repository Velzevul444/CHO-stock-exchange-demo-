const API = "http://localhost:5219/api";

let activeBet = null;
let coins = 0;
let currentUser = JSON.parse(localStorage.getItem("user"));

let guestBetCount = 0;
const MAX_GUEST_BETS = 5;

let usersCache = {};
const MIN_STAKE = 0.5;
const STAKE_STEP = 0.5;

const priceLabel = document.getElementById("price");
const resultLabel = document.getElementById("result");
const coinsLabel = document.getElementById("coins");
const betAmountInput = document.getElementById("betAmount");
const betHalfBtn = document.getElementById("betHalf");
const betAllBtn = document.getElementById("betAll");
const betWhistleAudio = new Audio("/front/Sounds/mellstroy-svist.mp3");
const betWinAudio = new Audio("/front/Sounds/mellstroy-bravo_d07CfHuv.mp3");
const betLoseAudio = new Audio("/front/Sounds/mellstroy-handi.mp3");

betWhistleAudio.loop = true;
betWhistleAudio.preload = "auto";
betWinAudio.preload = "auto";
betLoseAudio.preload = "auto";

function playAudio(audio, { reset = true } = {}) {
	try {
		if (reset) {
			audio.currentTime = 0;
		}
		const playPromise = audio.play();
		if (playPromise && typeof playPromise.catch === "function") {
			playPromise.catch(() => {});
		}
	} catch {
		// Ignore autoplay/runtime audio errors.
	}
}

function stopAudio(audio) {
	try {
		audio.pause();
		audio.currentTime = 0;
	} catch {
		// Ignore runtime audio errors.
	}
}

const modal = document.getElementById("authModal");
const title = document.getElementById("authTitle");
const usernameInput = document.getElementById("authUsername");
const passwordInput = document.getElementById("authPassword");
const errorDiv = document.getElementById("authError");
const isAdminCheckbox = document.getElementById("authIsAdmin");
const isAdminLabel = isAdminCheckbox.closest("label");

const adminBtn = document.getElementById("adminPanelBtn");
const adminModal = document.getElementById("adminModal");
const adminUsersList = document.getElementById("adminUsersList");

const chatBtn = document.getElementById("chatOpen");
const chatModal = document.getElementById("chatModal");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

const registrationBtn = document.getElementById("registration");
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const themeToggleBtn = document.getElementById("themeToggle");
const menuToggleBtn = document.getElementById("menuToggle");
const quickMenu = document.getElementById("quickMenu");

let mode = "login";

function resolveInitialTheme() {
	const saved = localStorage.getItem("theme");

	if (saved === "light" || saved === "dark") {
		return saved;
	}

	if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
		return "dark";
	}

	return "light";
}

function applyTheme(theme) {
	const nextTheme = theme === "dark" ? "dark" : "light";
	document.body.dataset.theme = nextTheme;
	localStorage.setItem("theme", nextTheme);

	const isDark = nextTheme === "dark";
	themeToggleBtn.classList.toggle("is-dark", isDark);
	themeToggleBtn.setAttribute(
		"aria-label",
		isDark ? "Включить дневной режим" : "Включить ночной режим"
	);

	if (window.setChartTheme) {
		window.setChartTheme(nextTheme);
	}
}

function closeQuickMenu() {
	quickMenu.classList.add("hidden");
	menuToggleBtn.classList.remove("is-active");
	menuToggleBtn.setAttribute("aria-label", "Открыть меню");
}

function openQuickMenu() {
	quickMenu.classList.remove("hidden");
	menuToggleBtn.classList.add("is-active");
	menuToggleBtn.setAttribute("aria-label", "Закрыть меню");
}

function updateCoins() {
	coinsLabel.textContent = formatCoins(coins);
	syncBetControls();
}

function roundCoins(value) {
	return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatCoins(value) {
	if (!Number.isFinite(value)) {
		return "0";
	}

	return Number.isInteger(value)
		? String(value)
		: value.toFixed(2).replace(/\.?0+$/, "");
}

function getMaxStake() {
	if (!currentUser) {
		return 0;
	}

	return roundCoins(Math.max(0, Number(coins) || 0));
}

function normalizeStake(value) {
	const rounded = Math.round((Number(value) + Number.EPSILON) / STAKE_STEP) * STAKE_STEP;
	return roundCoins(rounded);
}

function setStakeInputValue(value) {
	if (!betAmountInput) {
		return;
	}

	betAmountInput.value = formatCoins(Math.max(MIN_STAKE, normalizeStake(value)));
}

function readStakeInputValue() {
	if (!betAmountInput) {
		return Number.NaN;
	}

	return Number(String(betAmountInput.value).replace(",", ".").trim());
}

function syncBetControls() {
	if (!betAmountInput || !betHalfBtn || !betAllBtn) {
		return;
	}

	const maxStake = getMaxStake();
	const controlsDisabled = maxStake < MIN_STAKE;
	betAmountInput.disabled = controlsDisabled;
	betHalfBtn.disabled = controlsDisabled;
	betAllBtn.disabled = controlsDisabled;

	if (controlsDisabled) {
		betAmountInput.value = "";
		betAmountInput.placeholder = currentUser ? "Нет койнов" : "Только для аккаунта";
		return;
	}

	betAmountInput.placeholder = `${formatCoins(MIN_STAKE)} - ${formatCoins(maxStake)}`;
	const currentValue = readStakeInputValue();
	if (!Number.isFinite(currentValue) || currentValue < MIN_STAKE) {
		setStakeInputValue(Math.min(1, maxStake));
		return;
	}

	if (currentValue > maxStake) {
		setStakeInputValue(maxStake);
		return;
	}

	setStakeInputValue(currentValue);
}

function initUserState() {
	if (currentUser) {
		coins = roundCoins(Number(currentUser.coins) || 0);
		updateCoins();
		if (currentUser.isAdmin) adminBtn.classList.remove("hidden");
		logoutBtn.classList.remove("hidden");
	} else {
		coins = 0;
		updateCoins();
		logoutBtn.classList.add("hidden");
	}
}

initUserState();
applyTheme(resolveInitialTheme());

themeToggleBtn.onclick = () => {
	const currentTheme = document.body.dataset.theme === "dark" ? "dark" : "light";
	applyTheme(currentTheme === "dark" ? "light" : "dark");
};

menuToggleBtn.onclick = () => {
	if (quickMenu.classList.contains("hidden")) {
		openQuickMenu();
		return;
	}

	closeQuickMenu();
};

quickMenu.onclick = e => {
	if (e.target === quickMenu) {
		closeQuickMenu();
	}
};

document.addEventListener("keydown", e => {
	if (e.key === "Escape") {
		closeQuickMenu();
	}
});

loginBtn.onclick = () => {
	closeQuickMenu();
	mode = "login";
	title.textContent = "Вход";
	errorDiv.textContent = "";
	isAdminCheckbox.checked = false;
	isAdminLabel.style.display = "none";
	modal.classList.remove("hidden");
};

registrationBtn.onclick = () => {
	closeQuickMenu();
	mode = "register";
	title.textContent = "Регистрация";
	errorDiv.textContent = "";
	isAdminLabel.style.display = "flex";
	modal.classList.remove("hidden");
};

document.getElementById("authClose").onclick = () => {
	modal.classList.add("hidden");
};

document.getElementById("authSubmit").onclick = async () => {
	const username = usernameInput.value.trim();
	const password = passwordInput.value.trim();

	if (!username || !password) {
		errorDiv.textContent = "Заполни все поля";
		return;
	}

	try {
		if (mode === "register") {

			if (isAdminCheckbox.checked) {
				let code = prompt("Введите секретный код админа:");
				if (code !== "1488") {
					errorDiv.textContent = "Неверный код админа";
					return;
				}
			}

			const newUser = {
				id: 0,
				username,
				passwordHash: password,
				coins: 10,
				isAdmin: isAdminCheckbox.checked
			};

			const res = await fetch(`${API}/users`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newUser)
			});

			if (!res.ok) {
				errorDiv.textContent = "Ошибка регистрации";
				return;
			}

			alert("Регистрация успешна!");
			modal.classList.add("hidden");
			return;
		}

		if (mode === "login") {
			const res = await fetch(`${API}/users`);
			const users = await res.json();

			const user = users.find(u =>
				u.username === username &&
				u.passwordHash === password
			);

			if (!user) {
				errorDiv.textContent = "Неверный логин или пароль";
				return;
			}

			localStorage.setItem("user", JSON.stringify(user));
			currentUser = user;
			initUserState();

			modal.classList.add("hidden");

			if (currentUser.isAdmin) {
				setInterval(loadChat, 3000);
			}
		}

	} catch (err) {
		errorDiv.textContent = "Ошибка сервера";
	}
};


document.getElementById("up").onclick = () => placeBet("up");
document.getElementById("down").onclick = () => placeBet("down");

if (betHalfBtn) {
	betHalfBtn.onclick = () => {
		const maxStake = getMaxStake();
		if (maxStake < MIN_STAKE) {
			return;
		}

		setStakeInputValue(Math.max(MIN_STAKE, maxStake / 2));
	};
}

if (betAllBtn) {
	betAllBtn.onclick = () => {
		const maxStake = getMaxStake();
		if (maxStake < MIN_STAKE) {
			return;
		}

		setStakeInputValue(maxStake);
	};
}

if (betAmountInput) {
	betAmountInput.addEventListener("blur", () => {
		syncBetControls();
	});
}

function placeBet(direction) {
	if (!window.lastCandle) return;
	if (activeBet) {
		alert("Дождись закрытия свечи по текущей ставке");
		return;
	}

	let stake = 1;

	if (!currentUser) {
		if (guestBetCount >= MAX_GUEST_BETS) {
			alert("Гость может сыграть только 5 раз");
			return;
		}
		guestBetCount++;
	} else {
		const maxStake = getMaxStake();
		if (maxStake < MIN_STAKE) {
			alert("У тебя нет койнов");
			return;
		}

		const requestedStake = readStakeInputValue();
		if (!Number.isFinite(requestedStake) || requestedStake < MIN_STAKE) {
			alert("Введи сумму ставки");
			return;
		}

		const normalizedStake = normalizeStake(requestedStake);
		if (normalizedStake > maxStake + 0.0001) {
			setStakeInputValue(maxStake);
			alert("Ставка не может быть больше твоего баланса");
			return;
		}

		stake = Math.max(MIN_STAKE, normalizedStake);
		setStakeInputValue(stake);
	}

	activeBet = {
		direction,
		entryPrice: window.lastCandle.close,
		stake,
	};

	resultLabel.textContent = `Ставка ${formatCoins(stake)} принята...`;
	resultLabel.style.color = "white";
	playAudio(betWhistleAudio);

	if (direction === "up") window.janitorSwingUp?.();
	else window.janitorSwingDown?.();

	window.Janitor?.startLoop?.(direction);
}

window.onPriceUpdated = async (candle, closed) => {
	priceLabel.textContent = "Цена: " + candle.close;
	window.priceLabel = priceLabel;
	if (closed && activeBet) {

		window.Janitor?.stopLoop?.();
		stopAudio(betWhistleAudio);

		const entry = activeBet.entryPrice;
		const close = candle.close;

		let win =
			(activeBet.direction === "up" && close > entry) ||
			(activeBet.direction === "down" && close < entry);
		const stake = activeBet.stake || 1;

		if (win) {
			coins = roundCoins(coins + stake);
			resultLabel.textContent = `WIN x2 (+${formatCoins(stake)})`;
			resultLabel.style.color = "#22c55e";
			window.Janitor?.playWin?.();
			playAudio(betWinAudio);
		} else {
			coins = roundCoins(Math.max(0, coins - stake));
			resultLabel.textContent = `LOSE (-${formatCoins(stake)})`;
			resultLabel.style.color = "#ef4444";
			window.Janitor?.playLose?.();
			playAudio(betLoseAudio);
		}

		updateCoins();

		if (currentUser) {
			currentUser.coins = coins;
			if (Number.isInteger(currentUser.coins)) {
				await fetch(`${API}/users/${currentUser.id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(currentUser)
				});
			}

			localStorage.setItem("user", JSON.stringify(currentUser));
		}

		activeBet = null;
	}
};


adminBtn.onclick = async () => {
	closeQuickMenu();
	const res = await fetch(`${API}/users`);
	const users = await res.json();

	adminUsersList.innerHTML = "";

	users.forEach(user => {
		const div = document.createElement("div");
		div.innerHTML = `
			<b>${user.username}</b> | Coins:
			<input type="number" value="${user.coins}" id="coins-${user.id}">
			<button onclick="updateUserCoins(${user.id})">OK</button>
		`;
		adminUsersList.appendChild(div);
	});

	adminModal.classList.remove("hidden");
};

document.getElementById("adminClose").onclick =
	() => adminModal.classList.add("hidden");

window.updateUserCoins = async function(userId) {
	const input = document.getElementById(`coins-${userId}`);
	const newCoins = parseInt(input.value);

	const res = await fetch(`${API}/users/${userId}`);
	const user = await res.json();

	user.coins = newCoins;

	await fetch(`${API}/users/${userId}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(user)
	});

	alert("Монеты обновлены");
};


chatBtn.onclick = async () => {
	closeQuickMenu();
	chatModal.classList.remove("hidden");
	await loadChat();
};

document.getElementById("chatClose").onclick =
	() => chatModal.classList.add("hidden");

chatSend.onclick = async () => {
	if (!currentUser) return;

	const text = chatInput.value.trim();
	if (!text) return;

	await fetch(`${API}/messages`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			userId: currentUser.id,
			messageText: text
		})
	});

	chatInput.value = "";
	await loadChat();
};

async function loadChat() {
	if (!currentUser) return;

	if (Object.keys(usersCache).length === 0) {
		const res = await fetch(`${API}/users`);
		const users = await res.json();
		users.forEach(u => usersCache[u.id] = u);
	}

	const res = await fetch(`${API}/messages`);
	const messages = await res.json();

	chatMessages.innerHTML = "";

	messages.sort((a, b) =>
		new Date(a.createdAt) - new Date(b.createdAt)
	);

	messages.forEach(msg => {

		const sender = usersCache[msg.userId];
		const div = document.createElement("div");

		if (sender && sender.isAdmin) {
			div.className = "chat-message chat-admin";
		} else {
			div.className = "chat-message chat-user";
		}

		div.textContent =
			(sender ? sender.username : "Unknown") +
			": " +
			msg.messageText;

		chatMessages.appendChild(div);
	});

	chatMessages.scrollTop = chatMessages.scrollHeight;
}


logoutBtn.onclick = () => {
	closeQuickMenu();
	stopAudio(betWhistleAudio);
	localStorage.removeItem("user");
	location.reload();
};
