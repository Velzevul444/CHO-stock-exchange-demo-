const API = "http://localhost:5219/api";

let activeBet = null;
let coins = 0;
let currentUser = JSON.parse(localStorage.getItem("user"));

let guestBetCount = 0;
const MAX_GUEST_BETS = 5;

const priceLabel = document.getElementById("price");
const resultLabel = document.getElementById("result");
const coinsLabel = document.getElementById("coins");

const modal = document.getElementById("authModal");
const title = document.getElementById("authTitle");
const usernameInput = document.getElementById("authUsername");
const passwordInput = document.getElementById("authPassword");
const errorDiv = document.getElementById("authError");
const isAdminCheckbox = document.getElementById("authIsAdmin");

const adminBtn = document.getElementById("adminPanelBtn");
const adminModal = document.getElementById("adminModal");
const adminUsersList = document.getElementById("adminUsersList");

const chatBtn = document.getElementById("chatOpen");
const chatModal = document.getElementById("chatModal");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

const logoutBtn = document.getElementById("logout");

let mode = "login";

function updateCoins() {
	coinsLabel.textContent = coins;
}

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

document.getElementById("login").onclick = () => {
	mode = "login";
	title.textContent = "Вход";
	errorDiv.textContent = "";
	isAdminCheckbox.style.display = "none";
	modal.classList.remove("hidden");
};

document.getElementById("registration").onclick = () => {
	mode = "register";
	title.textContent = "Регистрация";
	errorDiv.textContent = "";
	isAdminCheckbox.style.display = "inline";
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
			coins = user.coins;
			updateCoins();

			if (user.isAdmin) adminBtn.classList.remove("hidden");

			logoutBtn.classList.remove("hidden");

			modal.classList.add("hidden");
		}

	} catch (err) {
		errorDiv.textContent = "Ошибка сервера";
		console.error(err);
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

	if (currentUser && !currentUser.isAdmin) {
		if (coins <= 0) {
			alert("У тебя нет монет");
			return;
		}
	}

	activeBet = {
		direction,
		entryPrice: window.lastCandle.close,
	};

	resultLabel.textContent = "Ставка принята, ждём закрытия свечи...";
	resultLabel.style.color = "white";

	if (direction === "up") window.janitorSwingUp();
	else window.janitorSwingDown();

	window.Janitor.startLoop(direction);
}

window.onPriceUpdated = async (candle, closed) => {
	priceLabel.textContent = "Цена: " + candle.close;

	if (closed && activeBet) {
		window.Janitor.stopLoop();

		const entry = activeBet.entryPrice;
		const close = candle.close;

		let win = false;
		if (activeBet.direction === "up" && close > entry) win = true;
		if (activeBet.direction === "down" && close < entry) win = true;

		if (win) {
			coins++;
			resultLabel.textContent = "WIN (+1 coin)";
			resultLabel.style.color = "#22c55e";
		} else {
			if (currentUser && !currentUser.isAdmin && coins <= 0) {
				resultLabel.textContent = "LOSE (ниже 0 нельзя)";
				resultLabel.style.color = "#ef4444";
				activeBet = null;
				return;
			}
			coins--;
			resultLabel.textContent = "LOSE (-1 coin)";
			resultLabel.style.color = "#ef4444";
		}

		updateCoins();

		if (currentUser) {
			try {
				const updatedUser = { ...currentUser, coins };
				await fetch(`${API}/users/${currentUser.id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(updatedUser)
				});
				currentUser.coins = coins;
				localStorage.setItem("user", JSON.stringify(currentUser));
			} catch (err) {
				console.error("Ошибка обновления coins", err);
			}
		}

		activeBet = null;
	}
};

document.getElementById("symbol-select").onchange = e => {
	window.changeSymbol(e.target.value);
};

adminBtn.onclick = async () => {
	const res = await fetch(`${API}/users`);
	const users = await res.json();

	adminUsersList.innerHTML = "";

	users.forEach(user => {
		const div = document.createElement("div");
		div.innerHTML = `
			<b>${user.username}</b> | Coins: 
			<input type="number" value="${user.coins}" id="coins-${user.id}" style="width:70px">
			<button onclick="updateUserCoins(${user.id})">Сохранить</button>
		`;
		adminUsersList.appendChild(div);
	});

	adminModal.classList.remove("hidden");
};

document.getElementById("adminClose").onclick = () => {
	adminModal.classList.add("hidden");
};

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
	chatModal.classList.remove("hidden");
	await loadChat();
};

document.getElementById("chatClose").onclick = () => chatModal.classList.add("hidden");

logoutBtn.onclick = () => {
	localStorage.removeItem("user");
	location.reload();
};

chatSend.onclick = async () => {
	const text = chatInput.value.trim();
	if (!text || !currentUser) return;

	const message = {
		userId: currentUser.id,
		messageText: text
	};

	try {
		await fetch(`${API}/messages`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(message)
		});
		chatInput.value = "";
		await loadChat();
	} catch (err) {
		console.error("Ошибка отправки сообщения", err);
	}
};

async function loadChat() {
	if (!currentUser) return;

	try {
		let messages = [];
		if (currentUser.isAdmin) {
			const res = await fetch(`${API}/messages`);
			messages = await res.json();
		} else {
			const res = await fetch(`${API}/messages/user/${currentUser.id}`);
			messages = await res.json();
		}

		chatMessages.innerHTML = "";
		messages.sort((a,b)=> new Date(a.createdAt)-new Date(b.createdAt));

		messages.forEach(msg => {
			const div = document.createElement("div");
			div.className = "chat-message " + (msg.userId === currentUser.id ? "chat-user" : "chat-admin");
			div.textContent = msg.messageText;
			chatMessages.appendChild(div);
		});

		chatMessages.scrollTop = chatMessages.scrollHeight;
	} catch (err) {
		console.error("Ошибка загрузки чата", err);
	}
}

if (currentUser && currentUser.isAdmin) {
	setInterval(loadChat, 3000);
}