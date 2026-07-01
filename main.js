 // ─── Supabase ───
    const SUPABASE_URL = 'https://ayeobjoaxxcvlccpzxic.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2nvoZ7z1G9hePh5NJse5uA_9oBQoBcf';
    const { createClient } = window.supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    let currentUser = null;

    // ─── DOM refs ───
    const authModalEl = document.getElementById('authModal');
    const authModal = new bootstrap.Modal(authModalEl);
    const authForm = document.getElementById('authForm');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authModeText = document.getElementById('authModeText');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const authError = document.getElementById('authError');
    const authButtonsDiv = document.getElementById('authButtons');
    const userInfoDiv = document.getElementById('userInfo');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    let isLoginMode = true;

    // ─── Toast ───
    function showToast(msg) {
        const el = document.getElementById('liveToast');
        document.getElementById('toastMsg').innerText = msg;
        el.classList.add('show');
        clearTimeout(el._timer);
        el._timer = setTimeout(() => el.classList.remove('show'), 3000);
    }

    // ─── UI update ───
    function updateUI(user) {
        currentUser = user;
        if (user) {
            authButtonsDiv.classList.add('d-none');
            userInfoDiv.classList.remove('d-none');
            userEmailDisplay.innerText = user.email.split('@')[0];
        } else {
            authButtonsDiv.classList.remove('d-none');
            userInfoDiv.classList.add('d-none');
        }
    }

    // ─── Password strength ───
    function checkStrength(pw) {
        if (!pw || isLoginMode) {
            strengthBar.style.width = '0%';
            strengthText.innerText = '';
            return;
        }
        let s = 0;
        if (pw.length >= 6) s += 25;
        if (/[A-Z]/.test(pw)) s += 25;
        if (/[0-9]/.test(pw)) s += 25;
        if (/[^A-Za-z0-9]/.test(pw)) s += 25;
        strengthBar.style.width = s + '%';
        strengthBar.style.background = s < 30 ? '#ff4d6d' : s < 70 ? '#ffb347' : '#00ffb3';
        strengthText.innerText = s < 30 ? 'Weak' : s < 70 ? 'Medium' : 'Strong';
    }

    authPassword.addEventListener('input', (e) => checkStrength(e.target.value));

    // ─── Toggle auth mode ───
    toggleAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authModeText.innerText = isLoginMode ? 'Login' : 'Sign Up';
        authSubmitBtn.innerText = isLoginMode ? 'Login' : 'Sign Up';
        toggleAuthMode.innerText = isLoginMode ? 'Need an account? Sign up' : 'Already have an account? Login';
        authError.innerText = '';
        if (!isLoginMode) checkStrength(authPassword.value);
        else { strengthBar.style.width = '0%';
            strengthText.innerText = ''; }
    });

    // ─── Login / Signup ───
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmail.value.trim();
        const password = authPassword.value;
        if (!email || !password) {
            authError.innerText = 'Email and password are required.';
            return;
        }
        authError.innerText = '';
        authSubmitBtn.disabled = true;
        authSubmitBtn.innerText = isLoginMode ? 'Logging in...' : 'Creating...';
        try {
            let result;
            if (isLoginMode) {
                result = await supabaseClient.auth.signInWithPassword({ email, password });
            } else {
                result = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: window.location.origin }
                });
            }
            if (result.error) throw result.error;
            if (!isLoginMode && result.data.user && !result.data.session) {
                authError.innerText = 'Signup successful! Confirm your email then log in.';
                isLoginMode = true;
                authModeText.innerText = 'Login';
                authSubmitBtn.innerText = 'Login';
                toggleAuthMode.innerText = 'Need an account? Sign up';
                authPassword.value = '';
                strengthBar.style.width = '0%';
            } else if (result.data.user || result.data.session?.user) {
                authModal.hide();
                authForm.reset();
                updateUI(result.data.user || result.data.session.user);
                showToast(`Welcome ${email.split('@')[0]} 🚀`);
            }
        } catch (err) {
            authError.innerText = err.message;
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.innerText = isLoginMode ? 'Login' : 'Sign Up';
        }
    });

    // ─── Logout ───
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        updateUI(null);
        showToast('Logged out');
    });

    // ─── Session check ───
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) updateUI(session.user);
    });
    supabaseClient.auth.onAuthStateChange((_, session) => {
        updateUI(session?.user || null);
    });

    // ─── Interactive handlers ───
    document.querySelectorAll('.subscribe-demo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentUser) {
                showToast('🔐 Please login to subscribe');
                authModal.show();
                return;
            }
            const plan = btn.getAttribute('data-plan');
            let msg = '';
            if (plan === 'competition') {
                msg = `✅ ${currentUser.email} — Competition Offer (K250) applied!`;
            } else if (plan === 'elite') {
                msg = `✅ ${currentUser.email} — Pro Elite plan → payment gateway`;
            } else {
                msg = `✅ ${currentUser.email} — Starter plan → payment gateway`;
            }
            showToast(msg);
        });
    });

    document.querySelectorAll('.affiliate-join-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentUser) {
                showToast('Login required for affiliate');
                authModal.show();
                return;
            }
            showToast('🚀 Affiliate dashboard ready — share your link!');
        });
    });

    document.querySelector('.join-community-demo')?.addEventListener('click', () => {
        if (!currentUser) {
            showToast('Join community after login');
            authModal.show();
            return;
        }
        showToast('🌐 Welcome to our Discord hub!');
    });

    // ─── Smooth scroll ───
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const id = this.getAttribute('href');
            if (id === '#') return;
            const target = document.querySelector(id);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ─── Navbar scroll effect ───
    window.addEventListener('scroll', () => {
        document.getElementById('mainNavbar').classList.toggle('scrolled', window.scrollY > 20);
    });

    // ─── REAL-TIME TICKER with WebSocket + REST fallback ───
    // Define symbols
    const tickerSymbols = [
        { display: 'BTC/USD', symbol: 'BTCUSDT', price: 0, change: '0.00%' },
        { display: 'ETH/USD', symbol: 'ETHUSDT', price: 0, change: '0.00%' },
        { display: 'SOL/USD', symbol: 'SOLUSDT', price: 0, change: '0.00%' },
        { display: 'DOGE/USD', symbol: 'DOGEUSDT', price: 0, change: '0.00%' },
        // Static fallback for non-crypto
        { display: 'ES_F', price: 5125, change: '-0.3%' },
        { display: 'XAU/USD', price: 2390, change: '+0.7%' },
        { display: 'EUR/USD', price: 1.0892, change: '+0.15%' },
        { display: 'SPY', price: 523.4, change: '-0.2%' }
    ];

    // Map for quick updates
    const symbolMap = {};
    tickerSymbols.forEach((s, idx) => {
        if (s.symbol) symbolMap[s.symbol] = idx;
    });

    // DOM elements
    const tickerContainer = document.getElementById('marketTicker');
    const liveIndicator = document.getElementById('liveIndicator');
    const liveStatus = document.getElementById('liveStatus');

    // Build ticker
    function buildTicker() {
        let html = '';
        for (let rep = 0; rep < 3; rep++) {
            tickerSymbols.forEach(s => {
                const up = s.change.startsWith('+') || (s.change !== '0.00%' && !s.change.startsWith('-'));
                let priceStr = '';
                if (typeof s.price === 'number') {
                    priceStr = s.price.toFixed(s.price < 1 ? 6 : 2);
                } else {
                    priceStr = s.price;
                }
                html += `<div class="ticker-item">
                            <span class="fw-bold">${s.display}</span>
                            <span class="${up ? 'price-up' : 'price-down'}">${priceStr}</span>
                            <small>${s.change}</small>
                        </div>`;
            });
        }
        tickerContainer.innerHTML = html;
    }

    // Fetch from Binance REST API (fallback)
    async function fetchBinanceREST() {
        const symbols = Object.keys(symbolMap);
        if (symbols.length === 0) return;
        try {
            // Use 24hr ticker endpoint for all symbols at once
            const url = 'https://api.binance.com/api/v3/ticker/24hr?symbols=' + JSON.stringify(symbols);
            const response = await fetch(url);
            if (!response.ok) throw new Error('REST API error');
            const data = await response.json();
            data.forEach(item => {
                const idx = symbolMap[item.symbol];
                if (idx !== undefined) {
                    const price = parseFloat(item.lastPrice);
                    const change = parseFloat(item.priceChangePercent);
                    tickerSymbols[idx].price = price;
                    tickerSymbols[idx].change = (change > 0 ? '+' : '') + change.toFixed(2) + '%';
                }
            });
            buildTicker();
            liveIndicator.className = 'live-indicator on';
            liveStatus.textContent = 'Live (REST)';
        } catch (e) {
            console.warn('REST fallback failed:', e);
            liveIndicator.className = 'live-indicator';
            liveStatus.textContent = 'Offline';
        }
    }

    // WebSocket
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnect = 5;
    let restInterval = null;
    let wsReady = false;

    function connectWebSocket() {
        const streams = Object.keys(symbolMap).map(s => s.toLowerCase() + '@ticker');
        const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Binance WebSocket connected');
            reconnectAttempts = 0;
            wsReady = true;
            liveIndicator.className = 'live-indicator on';
            liveStatus.textContent = 'Live (WS)';
            // If we had REST fallback, clear it
            if (restInterval) {
                clearInterval(restInterval);
                restInterval = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.data && data.stream) {
                    const streamName = data.stream;
                    const symbol = streamName.split('@')[0].toUpperCase();
                    const idx = symbolMap[symbol];
                    if (idx !== undefined) {
                        const ticker = data.data;
                        const price = parseFloat(ticker.c);
                        const change = parseFloat(ticker.P);
                        tickerSymbols[idx].price = price;
                        tickerSymbols[idx].change = (change > 0 ? '+' : '') + change.toFixed(2) + '%';
                        buildTicker();
                    }
                }
            } catch (e) {
                console.warn('WS parse error', e);
            }
        };

        ws.onerror = (err) => {
            console.warn('WebSocket error', err);
            wsReady = false;
            liveIndicator.className = 'live-indicator';
            liveStatus.textContent = 'Connecting...';
        };

        ws.onclose = () => {
            console.log('WebSocket closed');
            wsReady = false;
            liveIndicator.className = 'live-indicator';
            liveStatus.textContent = 'Reconnecting...';
            // Start REST fallback if not already
            if (!restInterval) {
                restInterval = setInterval(fetchBinanceREST, 10000);
                fetchBinanceREST(); // immediate
            }
            if (reconnectAttempts < maxReconnect) {
                reconnectAttempts++;
                setTimeout(connectWebSocket, 3000);
            } else {
                liveStatus.textContent = 'REST fallback';
            }
        };
    }

    // Initial data fetch via REST, then start WebSocket
    async function initTicker() {
        // First try REST to get initial data
        await fetchBinanceREST();
        // Then attempt WebSocket
        connectWebSocket();
        // Also set a REST interval as safety (will be cleared if WS connects)
        if (!restInterval) {
            restInterval = setInterval(fetchBinanceREST, 15000);
        }
    }

    initTicker();

    // ─── Countdown Timer ───
    function updateCountdown() {
        const end = new Date('2026-09-30T23:59:59').getTime();
        const now = Date.now();
        let diff = end - now;
        if (diff < 0) diff = 0;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        document.getElementById('countdownDays').textContent = String(days).padStart(2, '0');
        document.getElementById('countdownHours').textContent = String(hours).padStart(2, '0');
        document.getElementById('countdownMinutes').textContent = String(mins).padStart(2, '0');
        document.getElementById('countdownSeconds').textContent = String(secs).padStart(2, '0');
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // ─── Navbar login/signup button handlers ───
    document.getElementById('loginNavBtn')?.addEventListener('click', () => {
        if (!isLoginMode) {
            isLoginMode = true;
            authModeText.innerText = 'Login';
            authSubmitBtn.innerText = 'Login';
            toggleAuthMode.innerText = 'Need an account? Sign up';
        }
        authError.innerText = '';
    });

    document.getElementById('signupNavBtn')?.addEventListener('click', () => {
        if (isLoginMode) {
            isLoginMode = false;
            authModeText.innerText = 'Sign Up';
            authSubmitBtn.innerText = 'Sign Up';
            toggleAuthMode.innerText = 'Already have an account? Login';
        }
        authError.innerText = '';
    });