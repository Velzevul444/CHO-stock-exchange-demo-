const LW = window.LightweightCharts;

const container = document.getElementById("chart");
const symbolSelect = document.getElementById("symbol-select");
const timeframeSelect = document.getElementById("timeframe-select");
const candleLimitSelect = document.getElementById("candle-limit-select");
const applyChartSettingsBtn = document.getElementById("applyChartSettings");

const CHART_SETTINGS_KEY = "chartSettings";
const ALLOWED_INTERVALS = new Set(["1m", "5m", "15m", "1h", "4h"]);
const ALLOWED_LIMITS = new Set([100, 200, 300, 500]);
const AVAILABLE_SYMBOLS = new Set(
	[...symbolSelect.options].map(option => option.value)
);

const chartThemes = {
	light: {
		layout: {
			background: { color: "#ffffff" },
			textColor: "#0f172a",
		},
		grid: {
			vertLines: { color: "#dbe4f3" },
			horzLines: { color: "#dbe4f3" },
		},
		rightPriceScale: {
			borderColor: "#cbd5e1",
		},
		timeScale: {
			borderColor: "#cbd5e1",
		},
	},
	dark: {
		layout: {
			background: { color: "#0f172a" },
			textColor: "#e2e8f0",
		},
		grid: {
			vertLines: { color: "#243447" },
			horzLines: { color: "#243447" },
		},
		rightPriceScale: {
			borderColor: "#334155",
		},
		timeScale: {
			borderColor: "#334155",
		},
	},
};

function getSavedTheme() {
	const saved = localStorage.getItem("theme");
	if (saved === "light" || saved === "dark") {
		return saved;
	}

	if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
		return "dark";
	}

	return "light";
}

function normalizeSymbol(symbol) {
	if (AVAILABLE_SYMBOLS.has(symbol)) {
		return symbol;
	}

	return "BTCUSDT";
}

function normalizeInterval(interval) {
	if (ALLOWED_INTERVALS.has(interval)) {
		return interval;
	}

	return "1m";
}

function normalizeLimit(limit) {
	const parsedLimit = Number(limit);
	if (ALLOWED_LIMITS.has(parsedLimit)) {
		return parsedLimit;
	}

	return 200;
}

function getSavedChartSettings() {
	try {
		const saved = JSON.parse(localStorage.getItem(CHART_SETTINGS_KEY) || "{}");
		return {
			symbol: normalizeSymbol(saved.symbol),
			interval: normalizeInterval(saved.interval),
			limit: normalizeLimit(saved.limit),
		};
	} catch {
		return {
			symbol: "BTCUSDT",
			interval: "1m",
			limit: 200,
		};
	}
}

function saveChartSettings(symbol, interval, limit) {
	localStorage.setItem(
		CHART_SETTINGS_KEY,
		JSON.stringify({
			symbol,
			interval,
			limit,
		})
	);
}

function chartOptions(theme, width) {
	return {
		width,
		height: container.clientHeight || 560,
		...chartThemes[theme],
	};
}

const initialTheme = getSavedTheme();
document.body.dataset.theme = initialTheme;

const chart = LW.createChart(container, chartOptions(initialTheme, container.clientWidth));
window.chart = chart;

const candleSeries = chart.addCandlestickSeries({
	upColor: "#22c55e",
	downColor: "#ef4444",
	borderUpColor: "#22c55e",
	borderDownColor: "#ef4444",
	wickUpColor: "#22c55e",
	wickDownColor: "#ef4444",
});
window.candleSeries = candleSeries;

window.setChartTheme = function setChartTheme(theme) {
	if (!chartThemes[theme]) {
		return;
	}

	chart.applyOptions(chartOptions(theme, container.clientWidth));
};

const initialChartSettings = getSavedChartSettings();

let socket = null;
let lastCandle = null;
let currentSymbol = initialChartSettings.symbol;
let currentInterval = initialChartSettings.interval;
let currentCandleLimit = initialChartSettings.limit;

window.socket = socket;
window.lastCandle = lastCandle;
window.currentSymbol = currentSymbol;
window.currentInterval = currentInterval;
window.currentCandleLimit = currentCandleLimit;

symbolSelect.value = currentSymbol;
timeframeSelect.value = currentInterval;
candleLimitSelect.value = String(currentCandleLimit);

async function loadHistory(symbol, interval, limit) {
	const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
	const res = await fetch(url);
	const data = await res.json();
	if (!Array.isArray(data)) {
		throw new Error("Invalid chart payload");
	}

	const candles = data.map(c => ({
		time: c[0] / 1000,
		open: +c[1],
		high: +c[2],
		low: +c[3],
		close: +c[4],
	}));

	candleSeries.setData(candles);
	lastCandle = candles[candles.length - 1];
	window.lastCandle = lastCandle;
}

function openSocket(symbol, interval) {
	if (socket) {
		socket.onclose = null;
		socket.close();
	}

	socket = new WebSocket(
		`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
	);
	window.socket = socket;

	socket.onopen = () => {
		console.log("WS OPEN:", symbol, interval);
	};

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
		window.lastCandle = lastCandle;

		if (window.priceLabel) {
			window.priceLabel.textContent = "Цена: " + candle.close;
		}

		if (window.onPriceUpdated) {
			window.onPriceUpdated(candle, k.x);
		}
	};

	socket.onerror = err => {
		console.log("WS ERROR:", err);
	};

	socket.onclose = () => {
		console.log("WS CLOSED. Reconnecting...");
		setTimeout(() => openSocket(currentSymbol, currentInterval), 1000);
	};
}

function setApplyButtonLoading(isLoading) {
	applyChartSettingsBtn.disabled = isLoading;
	applyChartSettingsBtn.textContent = isLoading ? "Загрузка..." : "Применить";
}

let chartUpdateInProgress = false;

window.applyChartSettings = async function applyChartSettings({
	symbol = symbolSelect.value,
	interval = timeframeSelect.value,
	limit = candleLimitSelect.value,
} = {}) {
	if (chartUpdateInProgress) {
		return;
	}

	chartUpdateInProgress = true;
	setApplyButtonLoading(true);

	const nextSymbol = normalizeSymbol(symbol);
	const nextInterval = normalizeInterval(interval);
	const nextLimit = normalizeLimit(limit);

	symbolSelect.value = nextSymbol;
	timeframeSelect.value = nextInterval;
	candleLimitSelect.value = String(nextLimit);

	try {
		currentSymbol = nextSymbol;
		currentInterval = nextInterval;
		currentCandleLimit = nextLimit;

		window.currentSymbol = currentSymbol;
		window.currentInterval = currentInterval;
		window.currentCandleLimit = currentCandleLimit;

		saveChartSettings(nextSymbol, nextInterval, nextLimit);

		await loadHistory(nextSymbol, nextInterval, nextLimit);
		openSocket(nextSymbol, nextInterval);
	} catch (err) {
		console.log("CHART UPDATE ERROR:", err);
	} finally {
		chartUpdateInProgress = false;
		setApplyButtonLoading(false);
	}
};

window.changeSymbol = async function changeSymbol(symbol) {
	await window.applyChartSettings({
		symbol,
	});
};

symbolSelect.addEventListener("change", e => {
	window.changeSymbol(e.target.value);
});

applyChartSettingsBtn.addEventListener("click", () => {
	window.applyChartSettings();
});

window.applyChartSettings();

window.addEventListener("resize", () => {
	chart.applyOptions({
		width: container.clientWidth,
		height: container.clientHeight || 560,
	});
});
