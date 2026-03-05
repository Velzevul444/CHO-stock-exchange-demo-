const API = "http://localhost:5219/api";

let activeBet = null;
let coins = 0;
let currentUser = JSON.parse(localStorage.getItem("user"));

let guestBetCount = 0;
const MAX_GUEST_BETS = 5;

let usersCache = {};

const priceLabel = document.getElementById("price");
const resultLabel = document.getElementById("result");
const coinsLabel = document.getElementById("coins");

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
	coinsLabel.textContent = coins;
}

function initUserState() {
	if (currentUser) {
		coins = currentUser.coins;
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

function placeBet(direction) {
	if (!window.lastCandle) return;

	if (!currentUser) {
		if (guestBetCount >= MAX_GUEST_BETS) {
			alert("Гость может сыграть только 5 раз");
			return;
		}
		guestBetCount++;
	}

	if (currentUser && !currentUser.isAdmin && coins <= 0) {
		alert("У тебя нет монет");
		return;
	}

	activeBet = {
		direction,
		entryPrice: window.lastCandle.close,
	};

	resultLabel.textContent = "Ставка принята...";
	resultLabel.style.color = "white";

	if (direction === "up") window.janitorSwingUp?.();
	else window.janitorSwingDown?.();

	window.Janitor?.startLoop?.(direction);
}

window.onPriceUpdated = async (candle, closed) => {
	priceLabel.textContent = "Цена: " + candle.close;
	window.priceLabel = priceLabel;
	if (closed && activeBet) {

		window.Janitor?.stopLoop?.();

		const entry = activeBet.entryPrice;
		const close = candle.close;

		let win =
			(activeBet.direction === "up" && close > entry) ||
			(activeBet.direction === "down" && close < entry);

		if (win) {
			coins++;
			resultLabel.textContent = "WIN (+1)";
			resultLabel.style.color = "#22c55e";
			window.Janitor?.playWin?.();
		} else {
			coins--;
			resultLabel.textContent = "LOSE (-1)";
			resultLabel.style.color = "#ef4444";
			window.Janitor?.playLose?.();
		}

		updateCoins();

		if (currentUser) {
			currentUser.coins = coins;

			await fetch(`${API}/users/${currentUser.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(currentUser)
			});

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
	localStorage.removeItem("user");
	location.reload();
};
