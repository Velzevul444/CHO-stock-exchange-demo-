// main.js

let activeBet = null;
let coins = 0;

const priceLabel = document.getElementById("price");
const resultLabel = document.getElementById("result");
const coinsLabel = document.getElementById("coins");

function updateCoins() {
	coinsLabel.textContent = coins;
}

document.getElementById("up").onclick = () => placeBet("up");
document.getElementById("down").onclick = () => placeBet("down");

function placeBet(direction) {
	if (!lastCandle) return;
	activeBet = {
		direction,
		entryPrice: lastCandle.close,
	};
	resultLabel.textContent = "Ставка принята, ждём закрытия свечи...";
}

window.onPriceUpdated = (candle, closed) => {
	priceLabel.textContent = "Цена: " + candle.close;

	if (closed && activeBet) {
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
		activeBet = null;
	}
};

document.getElementById("symbol-select").onchange = e => {
	changeSymbol(e.target.value);
};