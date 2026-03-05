const NEWS_API_URL = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";
const NEWS_CACHE_TTL_MS = 2 * 60 * 1000;

const newsBtn = document.getElementById("newsOpen");
const newsModal = document.getElementById("newsModal");
const newsCloseBtn = document.getElementById("newsClose");
const newsRefreshBtn = document.getElementById("newsRefresh");
const newsList = document.getElementById("newsList");

if (!newsBtn || !newsModal || !newsCloseBtn || !newsRefreshBtn || !newsList) {
	console.warn("News UI is not initialized: required elements are missing.");
} else {
	let cachedNews = [];
	let cachedAt = 0;
	let newsLoading = false;

	function closeQuickMenuIfOpen() {
		const quickMenu = document.getElementById("quickMenu");
		const menuToggleBtn = document.getElementById("menuToggle");

		if (quickMenu) {
			quickMenu.classList.add("hidden");
		}
		if (menuToggleBtn) {
			menuToggleBtn.classList.remove("is-active");
			menuToggleBtn.setAttribute("aria-label", "Открыть меню");
		}
	}

	function openNewsModal() {
		newsModal.classList.remove("hidden");
	}

	function closeNewsModal() {
		newsModal.classList.add("hidden");
	}

	function renderStatus(text, isError = false) {
		newsList.innerHTML = "";
		const statusEl = document.createElement("div");
		statusEl.className = isError ? "news-status news-status-error" : "news-status";
		statusEl.textContent = text;
		newsList.appendChild(statusEl);
	}

	function formatPublishedDate(publishedOn) {
		if (!Number.isFinite(publishedOn) || publishedOn <= 0) {
			return "Дата неизвестна";
		}

		const publishedDate = new Date(publishedOn * 1000);
		return publishedDate.toLocaleString("ru-RU", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	function renderNewsItems(items) {
		newsList.innerHTML = "";

		if (!items.length) {
			renderStatus("Новостей пока нет.");
			return;
		}

		for (const item of items) {
			const articleEl = document.createElement("article");
			articleEl.className = "news-item";

			const titleEl = document.createElement("h3");
			titleEl.className = "news-item-title";

			const linkEl = document.createElement("a");
			linkEl.href = item.url;
			linkEl.target = "_blank";
			linkEl.rel = "noopener noreferrer";
			linkEl.textContent = item.title;

			titleEl.appendChild(linkEl);

			const metaEl = document.createElement("div");
			metaEl.className = "news-item-meta";
			const sourceEl = document.createElement("span");
			sourceEl.textContent = item.source;
			const dateEl = document.createElement("span");
			dateEl.textContent = formatPublishedDate(item.publishedOn);
			metaEl.appendChild(sourceEl);
			metaEl.appendChild(dateEl);

			articleEl.appendChild(titleEl);
			articleEl.appendChild(metaEl);
			newsList.appendChild(articleEl);
		}
	}

	async function fetchNews({ forceRefresh = false } = {}) {
		if (newsLoading) {
			return;
		}

		const cacheIsFresh = Date.now() - cachedAt < NEWS_CACHE_TTL_MS;
		if (!forceRefresh && cacheIsFresh && cachedNews.length) {
			renderNewsItems(cachedNews);
			return;
		}

		newsLoading = true;
		newsRefreshBtn.disabled = true;
		renderStatus("Загружаю крипто новости...");

		try {
			const response = await fetch(NEWS_API_URL);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const payload = await response.json();
			const rows = Array.isArray(payload?.Data) ? payload.Data : [];

			const news = rows
				.filter(item => item && item.title && item.url)
				.slice(0, 20)
				.map(item => ({
					title: String(item.title),
					url: String(item.url),
					source: item.source_info?.name || item.source || "Источник",
					publishedOn: Number(item.published_on) || 0,
				}));

			cachedNews = news;
			cachedAt = Date.now();
			renderNewsItems(news);
		} catch (error) {
			console.error("NEWS FETCH ERROR:", error);
			renderStatus("Не удалось загрузить новости. Попробуйте позже.", true);
		} finally {
			newsLoading = false;
			newsRefreshBtn.disabled = false;
		}
	}

	newsBtn.addEventListener("click", async () => {
		closeQuickMenuIfOpen();
		openNewsModal();
		await fetchNews();
	});

	newsRefreshBtn.addEventListener("click", async () => {
		await fetchNews({ forceRefresh: true });
	});

	newsCloseBtn.addEventListener("click", closeNewsModal);

	newsModal.addEventListener("click", event => {
		if (event.target === newsModal) {
			closeNewsModal();
		}
	});

	document.addEventListener("keydown", event => {
		if (event.key === "Escape" && !newsModal.classList.contains("hidden")) {
			closeNewsModal();
		}
	});
}
