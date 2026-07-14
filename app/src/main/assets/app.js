(() => {
    "use strict";

    const MANIFEST_URL = "https://raw.githubusercontent.com/saveliyshap22-crypto/WalletGPT/main/tonconnect-manifest.json";
    const SANDBOX_KEY = "walletgpt.sandbox.v1";
    function newId() {
        if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    const defaultAssets = [
        { id: newId(), symbol: "TON", name: "Toncoin", amount: 1240, price: 5.42, color: "#2ba4ff" },
        { id: newId(), symbol: "USDT", name: "Tether USD", amount: 8500, price: 1, color: "#20c997" },
        { id: newId(), symbol: "BTC", name: "Bitcoin", amount: 0.14, price: 108420, color: "#ffb020" }
    ];

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => [...document.querySelectorAll(selector)];
    const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
    const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 6 });
    let selectedColor = "#7667ff";
    let sandboxAssets = loadSandbox();
    let tonConnectUI = null;
    let connectedWallet = null;
    let toastTimer = null;

    function loadSandbox() {
        try {
            const saved = JSON.parse(localStorage.getItem(SANDBOX_KEY));
            return Array.isArray(saved) ? saved : defaultAssets;
        } catch (_) {
            return defaultAssets;
        }
    }

    function saveSandbox() {
        localStorage.setItem(SANDBOX_KEY, JSON.stringify(sandboxAssets));
    }

    function showToast(message) {
        const toast = $("#toast");
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
    }

    function coinWord(count) {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) return "монета";
        if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "монеты";
        return "монет";
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, (char) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
        })[char]);
    }

    function initials(symbol) {
        return escapeHtml(String(symbol).trim().slice(0, 3).toUpperCase());
    }

    function switchMode(mode) {
        $$(".mode").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
        $(".mode-switch").classList.toggle("sandbox", mode === "sandbox");
        $("#realScreen").classList.toggle("active", mode === "real");
        $("#sandboxScreen").classList.toggle("active", mode === "sandbox");
    }

    function renderSandbox() {
        const total = sandboxAssets.reduce((sum, asset) => sum + (Number(asset.amount) || 0) * (Number(asset.price) || 0), 0);
        $("#sandboxTotal").textContent = money.format(total);
        $("#sandboxCount").textContent = `${sandboxAssets.length} ${coinWord(sandboxAssets.length)}`;
        $("#sandboxAssets").innerHTML = sandboxAssets.length ? sandboxAssets.map((asset) => {
            const value = Number(asset.amount) * Number(asset.price);
            return `<article class="asset">
                <div class="asset-icon" style="--asset-color:${escapeHtml(asset.color)}">${initials(asset.symbol)}</div>
                <div class="asset-info"><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.symbol)} · DEMO</span></div>
                <div class="asset-value"><strong>${money.format(value)}</strong><span>${number.format(asset.amount)} ${escapeHtml(asset.symbol)}</span></div>
                <button class="asset-remove" data-remove="${escapeHtml(asset.id)}" aria-label="Удалить">×</button>
            </article>`;
        }).join("") : `<div class="empty-state"><div class="empty-icon">＋</div><strong>Портфель пуст</strong><p>Добавь любую валюту и укажи произвольную виртуальную сумму.</p></div>`;
    }

    function openSheet() {
        $("#assetForm").reset();
        selectedColor = "#7667ff";
        $$(".color").forEach((item) => item.classList.toggle("selected", item.dataset.color === selectedColor));
        $("#sheetBackdrop").hidden = false;
        setTimeout(() => $("#assetSymbol").focus(), 300);
    }

    function closeSheet() {
        $("#sheetBackdrop").hidden = true;
    }

    async function initializeTonConnect() {
        if (!window.TON_CONNECT_UI) {
            $("#connectionSubtitle").textContent = "Нет доступа к TON Connect";
            showToast("Не удалось загрузить TON Connect. Проверь интернет.");
            return;
        }
        try {
            tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
                manifestUrl: MANIFEST_URL,
                language: "ru",
                restoreConnection: true,
                uiPreferences: {
                    theme: window.TON_CONNECT_UI.THEME.DARK,
                    borderRadius: "m"
                },
                actionsConfiguration: {
                    returnStrategy: "walletgpt://tonconnect"
                }
            });
            tonConnectUI.onStatusChange(handleWalletStatus, (error) => {
                console.error(error);
                showToast("Tonkeeper вернул ошибку подключения");
            });
            if (tonConnectUI.wallet) handleWalletStatus(tonConnectUI.wallet);
        } catch (error) {
            console.error(error);
            $("#connectionSubtitle").textContent = "Ошибка инициализации";
            showToast("TON Connect пока недоступен");
        }
    }

    async function connectTonkeeper() {
        if (!tonConnectUI) {
            showToast("TON Connect ещё загружается");
            return;
        }
        if (connectedWallet) {
            try {
                await tonConnectUI.disconnect();
            } catch (_) {
                showToast("Не удалось отключить кошелёк");
            }
            return;
        }
        try {
            await tonConnectUI.openSingleWalletModal("tonkeeper");
        } catch (_) {
            await tonConnectUI.openModal();
        }
    }

    async function handleWalletStatus(wallet) {
        connectedWallet = wallet || null;
        const button = $("#connectButton");
        if (!wallet) {
            $("#connectionTitle").textContent = "Tonkeeper";
            $("#connectionSubtitle").textContent = "Без доступа к seed-фразе";
            button.textContent = "Подключить";
            $("#realBalance").textContent = "—";
            $("#realCaption").textContent = "Подключи Tonkeeper, чтобы увидеть активы";
            $("#assetCount").textContent = "0 монет";
            $("#realAssets").innerHTML = `<div class="empty-state"><div class="empty-icon">↗</div><strong>Кошелёк не подключён</strong><p>WalletGPT получит только публичный адрес. Подтверждение происходит в Tonkeeper.</p></div>`;
            return;
        }
        const address = wallet.account.address;
        $("#connectionTitle").textContent = "Tonkeeper подключён";
        $("#connectionSubtitle").textContent = `${address.slice(0, 7)}…${address.slice(-6)}`;
        button.textContent = "Отключить";
        await loadRealAssets(address);
    }

    async function fetchJson(url) {
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    async function loadRealAssets(address) {
        $("#realBalance").textContent = "…";
        $("#realCaption").textContent = "Читаю публичные данные блокчейна";
        try {
            const [account, jettons, rates] = await Promise.all([
                fetchJson(`https://tonapi.io/v2/accounts/${encodeURIComponent(address)}`),
                fetchJson(`https://tonapi.io/v2/accounts/${encodeURIComponent(address)}/jettons?currencies=usd`),
                fetchJson("https://tonapi.io/v2/rates?tokens=ton&currencies=usd").catch(() => null)
            ]);
            const tonAmount = Number(account.balance || 0) / 1e9;
            const tonRate = Number(rates?.rates?.TON?.prices?.USD || rates?.rates?.ton?.prices?.USD || 0);
            const assets = [{ symbol: "TON", name: "Toncoin", amount: tonAmount, price: tonRate, color: "#2ba4ff" }];

            for (const item of (jettons.balances || [])) {
                const decimals = Number(item.jetton?.decimals ?? 9);
                const amount = Number(item.balance || 0) / Math.pow(10, decimals);
                if (!Number.isFinite(amount) || amount === 0) continue;
                const symbol = item.jetton?.symbol || "JETTON";
                assets.push({
                    symbol,
                    name: item.jetton?.name || symbol,
                    amount,
                    price: Number(item.price?.prices?.USD || 0),
                    color: "#7667ff"
                });
            }

            const knownValue = assets.reduce((sum, asset) => sum + asset.amount * asset.price, 0);
            $("#realBalance").textContent = knownValue > 0 ? money.format(knownValue) : `${number.format(tonAmount)} TON`;
            $("#realCaption").textContent = knownValue > 0 ? "Оценка по текущим публичным ценам" : "Публичный on-chain баланс";
            $("#assetCount").textContent = `${assets.length} ${coinWord(assets.length)}`;
            $("#realAssets").innerHTML = assets.map((asset) => `<article class="asset">
                <div class="asset-icon" style="--asset-color:${asset.color}">${initials(asset.symbol)}</div>
                <div class="asset-info"><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.symbol)}</span></div>
                <div class="asset-value"><strong>${asset.price > 0 ? money.format(asset.amount * asset.price) : "—"}</strong><span>${number.format(asset.amount)} ${escapeHtml(asset.symbol)}</span></div>
            </article>`).join("");
        } catch (error) {
            console.error(error);
            $("#realBalance").textContent = "—";
            $("#realCaption").textContent = "Не удалось получить баланс";
            $("#realAssets").innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><strong>Сеть не ответила</strong><p>Подключение сохранено. Нажми обновить через несколько секунд.</p></div>`;
            showToast("Ошибка чтения TON API");
        }
    }

    $$(".mode").forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
    $("#addAssetButton").addEventListener("click", openSheet);
    $("#closeSheet").addEventListener("click", closeSheet);
    $("#sheetBackdrop").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeSheet(); });
    $("#connectButton").addEventListener("click", connectTonkeeper);
    $("#refreshButton").addEventListener("click", () => connectedWallet ? loadRealAssets(connectedWallet.account.address) : showToast("Сначала подключи Tonkeeper"));
    $("#resetSandboxButton").addEventListener("click", () => {
        sandboxAssets = defaultAssets.map((asset) => ({ ...asset, id: newId() }));
        saveSandbox();
        renderSandbox();
        showToast("Sandbox сброшен");
    });
    $("#sandboxAssets").addEventListener("click", (event) => {
        const id = event.target.closest("[data-remove]")?.dataset.remove;
        if (!id) return;
        sandboxAssets = sandboxAssets.filter((asset) => asset.id !== id);
        saveSandbox();
        renderSandbox();
    });
    $$(".color").forEach((button) => button.addEventListener("click", () => {
        selectedColor = button.dataset.color;
        $$(".color").forEach((item) => item.classList.toggle("selected", item === button));
    }));
    $("#assetForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const symbol = $("#assetSymbol").value.trim().toUpperCase();
        const name = $("#assetName").value.trim();
        const amount = Number($("#assetAmount").value);
        const price = Number($("#assetPrice").value);
        if (!symbol || !name || !Number.isFinite(amount) || !Number.isFinite(price) || amount < 0 || price < 0) {
            showToast("Проверь введённые значения");
            return;
        }
        sandboxAssets.unshift({ id: newId(), symbol, name, amount, price, color: selectedColor });
        saveSandbox();
        renderSandbox();
        closeSheet();
        showToast(`${symbol} добавлен только в Sandbox`);
    });

    renderSandbox();
    window.addEventListener("load", initializeTonConnect, { once: true });
})();
