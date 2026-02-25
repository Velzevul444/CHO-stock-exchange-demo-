// chart.js

const LW = window.LightweightCharts;

let container = document.getElementById("chart");

window.chart = LW.createChart(container, {
	width: container.clientWidth,
	height: 600,
	layout: {
		background: { color: "#0f172a" },
		textColor: "#fff",
	},
});

window.candleSeries = chart.addCandlestickSeries();
window.lastCandle = null;
window.socket = null;
window.currentSymbol = "BTCUSDT";

async function loadHistory(symbol) {
	const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=200`;
	const res = await fetch(url);
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

function openSocket(symbol) {
	if (socket) socket.close();

	socket = new WebSocket(
		`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_1m`
	);

	socket.onmessage = e => {
		const msg = JSON.parse(e.data);
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

		if (window.onPriceUpdated) {
			window.onPriceUpdated(candle, k.x);
		}
	};

	socket.onclose = () => {
		setTimeout(() => openSocket(symbol), 1000);
	};
}

window.changeSymbol = async function (symbol) {
	currentSymbol = symbol;
	await loadHistory(symbol);
	openSocket(symbol);
};

loadHistory(currentSymbol).then(() => openSocket(currentSymbol));