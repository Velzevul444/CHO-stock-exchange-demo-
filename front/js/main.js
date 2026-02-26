// ===============================
// CONFIG
// ===============================
const API = "http://localhost:5219/api";

let activeBet = null;
let coins = 0;
let currentUser = JSON.parse(localStorage.getItem("user"));

// ===============================
// DOM
// ===============================
const priceLabel = document.getElementById("price");
const resultLabel = document.getElementById("result");
const coinsLabel = document.getElementById("coins");

const modal = document.getElementById("authModal");
const title = document.getElementById("authTitle");
const usernameInput = document.getElementById("authUsername");
const passwordInput = document.getElementById("authPassword");
const errorDiv = document.getElementById("authError");

let mode = "login";

// ===============================
// INIT
// ===============================
function updateCoins() {
	coinsLabel.textContent = coins;
}

if (currentUser) {
	coins = currentUser.coins;
	updateCoins();
}

// ===============================
// AUTH UI
// ===============================
document.getElementById("login").onclick = () => {
	mode = "login";
	title.textContent = "Вход";
	errorDiv.textContent = "";
	modal.classList.remove("hidden");
};

document.getElementById("registration").onclick = () => {
	mode = "register";
	title.textContent = "Регистрация";
	errorDiv.textContent = "";
	modal.classList.remove("hidden");
};

document.getElementById("authClose").onclick = () => {
	modal.classList.add("hidden");
};

// ===============================
// REGISTER / LOGIN
// ===============================
document.getElementById("authSubmit").onclick = async () => {

	const username = usernameInput.value.trim();
	const password = passwordInput.value.trim();

	if (!username || !password) {
		errorDiv.textContent = "Заполни все поля";
		return;
	}

	try {

		// ================= REGISTER =================
		if (mode === "register") {

			const newUser = {
				id: 0,
				username: username,
				passwordHash: password,
				coins: 10,
				isAdmin: false
			};

			const res = await fetch(`${API}/users`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newUser)
			});

			if (!res.ok) {
				errorDiv.textContent = "Пользователь уже существует или ошибка данных";
				return;
			}

			alert("Регистрация успешна! Теперь войди.");
			modal.classList.add("hidden");
			return;
		}

		// ================= LOGIN =================
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

			modal.classList.add("hidden");
		}

	} catch (err) {
		errorDiv.textContent = "Ошибка сервера";
		console.error(err);
	}
};

// ===============================
// BET BUTTONS
// ===============================
document.getElementById("up").onclick = () => placeBet("up");
document.getElementById("down").onclick = () => placeBet("down");

function placeBet(direction) {

	if (!currentUser) {
		alert("Сначала войди в аккаунт");
		return;
	}

	if (!lastCandle) return;

	activeBet = {
		direction,
		entryPrice: lastCandle.close,
	};

	resultLabel.textContent = "Ставка принята, ждём закрытия свечи...";
	resultLabel.style.color = "white";

	if (direction === "up") janitorSwingUp();
	else janitorSwingDown();

	Janitor.startLoop(direction);
}

// ===============================
// PRICE UPDATE
// ===============================
window.onPriceUpdated = async (candle, closed) => {

	priceLabel.textContent = "Цена: " + candle.close;

	if (closed && activeBet) {

		Janitor.stopLoop();

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
			coins--;
			resultLabel.textContent = "LOSE (-1 coin)";
			resultLabel.style.color = "#ef4444";
		}

		updateCoins();

		// ================= UPDATE DB =================
		try {
			const updatedUser = {
				id: currentUser.id,
				username: currentUser.username,
				passwordHash: currentUser.passwordHash,
				coins: coins,
				isAdmin: currentUser.isAdmin
			};

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

		activeBet = null;
	}
};

// ===============================
// SYMBOL CHANGE
// ===============================
document.getElementById("symbol-select").onchange = e => {
	changeSymbol(e.target.value);
};