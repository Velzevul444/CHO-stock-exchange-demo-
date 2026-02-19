const container = document.getElementById("chart");

const chart = LightweightCharts.createChart(container, {
	width: container.clientWidth,
	height: 600,
	layout: {
		background: { color: "#0f172a" },
		textColor: "#ffffff",
	},
});

const candleSeries = chart.addSeries(
	LightweightCharts.CandlestickSeries
);

let lastCandle = null;

async function loadHistory() {
	const res = await fetch(
		"https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=200"
	);

	const data = await res.json();

	const candles = data.map(c => ({
		time: c[0] / 1000,
		open: +c[1],
		high: +c[2],
		low: +c[3],
		close: +c[4],
	}));

	candleSeries.setData(candles);
	lastCandle = candles[candles.length - 1];
}

loadHistory();

const socket = new WebSocket(
	"wss://stream.binance.com:9443/ws/btcusdt@kline_1m"
);

socket.onmessage = event => {

	const msg = JSON.parse(event.data);
	const k = msg.k;

	const candle = {
		time: k.t / 1000,
		open: +k.o,
		high: +k.h,
		low: +k.l,
		close: +k.c,
	};

	candleSeries.update(candle);
	lastCandle = candle;

	priceLabel.textContent = "Цена: " + candle.close;

	if (k.x && activeBet) {

		const closePrice = candle.close;
		const entry = activeBet.entryPrice;

		let win = false;

		if (activeBet.direction === "up" && closePrice > entry)
			win = true;

		if (activeBet.direction === "down" && closePrice < entry)
			win = true;

		if (win) {

			score += 1;
			wins += 1;

			resultLabel.textContent = " WIN (+1)";
			resultLabel.style.color = "#22c55e";

		} else {

			score -= 1;
			losses += 1;

			resultLabel.textContent = " LOSE (-1)";
			resultLabel.style.color = "#ef4444";
		}

		updateScore();

		activeBet = null;
	}
};

window.addEventListener("resize", () => {
	chart.applyOptions({
		width: container.clientWidth,
	});
});

let activeBet = null;

let score = 0;
let wins = 0;
let losses = 0;

const scoreLabel = document.getElementById("score");
const winsLabel = document.getElementById("wins");
const lossesLabel = document.getElementById("losses");

function updateScore(){
	scoreLabel.textContent = score;
	winsLabel.textContent = wins;
	lossesLabel.textContent = losses;
}

updateScore();

const priceLabel = document.getElementById("price");
const resultLabel = document.getElementById("result");

document.getElementById("up").onclick = () => placeBet("up");
document.getElementById("down").onclick = () => placeBet("down");

function placeBet(direction) {

	if (!lastCandle) return;

	activeBet = {
		direction: direction,
		entryPrice: lastCandle.close,
		time: lastCandle.time
	};

	resultLabel.textContent = "Ставка принята. Ждём закрытия свечи...";
}