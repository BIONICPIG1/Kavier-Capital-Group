// ============================================================
// KAVIER CAPITAL GROUP — APP LOGIC V2
// Existing index.html layout preserved
// ============================================================

// ─── Supabase ───
const SUPABASE_URL = 'https://ayeobjoaxxcvlccpzxic.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2nvoZ7z1G9hePh5NJse5uA_9oBQoBcf';
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
window.supabaseClient = supabaseClient;

// ─── Application state ───
let currentUser = null;
let currentProfile = null;
let currentSubscription = null;
let currentPlan = null;
let hasPremiumAccess = false;
let isLoginMode = true;
let authRefreshCounter = 0;

// ─── Payment state ───
let activePaymentReference = null;
let paymentPollTimer = null;
let paymentPollAttempts = 0;

// ─── DOM refs ───
const authModalEl = document.getElementById('authModal');
const authModal = authModalEl ? new bootstrap.Modal(authModalEl) : null;
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
const signalFeed = document.getElementById('signalFeed');

// ─── Payment modal refs ───
const paymentModalEl = document.getElementById('paymentModal');
const paymentModal = paymentModalEl ? bootstrap.Modal.getOrCreateInstance(paymentModalEl) : null;
const paymentForm = document.getElementById('paymentForm');
const paymentPhone = document.getElementById('paymentPhone');
const paymentStatus = document.getElementById('paymentStatus');
const paymentSubmitBtn = document.getElementById('paymentSubmitBtn');
const paymentCheckBtn = document.getElementById('paymentCheckBtn');
const paymentPlanSummary = document.getElementById('paymentPlanSummary');

// Existing pricing-card elements. No HTML restructuring required.
const eliteCard = document.querySelector('#signals .single-offer-card');
const elitePriceEl = eliteCard?.querySelector('.price-current');
const eliteButton = eliteCard?.querySelector('.subscribe-demo[data-plan="elite"]');
const eliteNote = eliteCard?.querySelector('p.text-center.text-secondary.small');

// ─── Helpers ───
function showToast(msg) {
    const el = document.getElementById('liveToast');
    const msgEl = document.getElementById('toastMsg');
    if (!el || !msgEl) return;

    msgEl.innerText = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3200);
}

function escapeHTML(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatPrice(value) {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (!Number.isFinite(n)) return escapeHTML(value);

    return n.toLocaleString(undefined, {
        minimumFractionDigits: n < 1 ? 2 : 0,
        maximumFractionDigits: 8
    });
}

function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ─── Password strength ───
function checkStrength(pw) {
    if (!strengthBar || !strengthText) return;

    if (!pw || isLoginMode) {
        strengthBar.style.width = '0%';
        strengthText.innerText = '';
        return;
    }

    let score = 0;
    if (pw.length >= 8) score += 25;
    if (/[A-Z]/.test(pw)) score += 25;
    if (/[0-9]/.test(pw)) score += 25;
    if (/[^A-Za-z0-9]/.test(pw)) score += 25;

    strengthBar.style.width = score + '%';
    strengthBar.style.background = score < 50 ? '#ff4d6d' : score < 75 ? '#ffb347' : '#00ffb3';
    strengthText.innerText = score < 50 ? 'Weak' : score < 75 ? 'Medium' : 'Strong';
}

authPassword?.addEventListener('input', (e) => checkStrength(e.target.value));

// ─── Auth mode ───
function setAuthMode(loginMode) {
    isLoginMode = loginMode;

    if (authModeText) authModeText.innerText = loginMode ? 'Login' : 'Sign Up';
    if (authSubmitBtn) authSubmitBtn.innerText = loginMode ? 'Login' : 'Sign Up';
    if (toggleAuthMode) {
        toggleAuthMode.innerText = loginMode
            ? 'Need an account? Sign up'
            : 'Already have an account? Login';
    }
    if (authError) authError.innerText = '';
    checkStrength(authPassword?.value || '');
}

toggleAuthMode?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode(!isLoginMode);
});

document.getElementById('loginNavBtn')?.addEventListener('click', () => setAuthMode(true));
document.getElementById('signupNavBtn')?.addEventListener('click', () => setAuthMode(false));

// ─── Load plan from database ───
async function loadPlan() {
    const { data, error } = await supabaseClient
        .from('plans')
        .select('id, code, name, price, currency, billing_period_months, description, active')
        .eq('code', 'pro_elite_monthly')
        .eq('active', true)
        .maybeSingle();

    if (error) {
        console.error('Plan load error:', error);
        return;
    }

    currentPlan = data;
    if (!currentPlan) return;

    // Keep the existing card and styling; update only its live price.
    if (elitePriceEl) {
        const amount = Number(currentPlan.price).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
        const period = Number(currentPlan.billing_period_months) === 1
            ? '/mo'
            : `/${currentPlan.billing_period_months}mo`;

        elitePriceEl.innerHTML = `K${amount} <small>${period}</small>`;
    }
}

// ─── Load current profile ───
async function loadProfile() {
    currentProfile = null;
    if (!currentUser) return;

    const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, display_name, phone_e164, role')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (error) {
        console.error('Profile load error:', error);
        return;
    }

    currentProfile = data;
}

// ─── Load subscription ───
async function loadSubscription() {
    currentSubscription = null;
    hasPremiumAccess = false;

    if (!currentUser) {
        updateSubscriptionButton();
        return;
    }

    const { data, error } = await supabaseClient
        .from('subscriptions')
        .select('id, plan_id, status, current_period_start, current_period_end, auto_renew')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (error) {
        console.error('Subscription load error:', error);
    }

    currentSubscription = data;

    const expiry = data?.current_period_end ? new Date(data.current_period_end) : null;
    const activeSubscription = Boolean(
        data &&
        data.status === 'active' &&
        expiry &&
        expiry.getTime() > Date.now()
    );

    const adminAccess = currentProfile?.role === 'admin';
    hasPremiumAccess = activeSubscription || adminAccess;

    updateSubscriptionButton();
}

function updateSubscriptionButton() {
    if (!eliteButton) return;

    if (!currentUser) {
        eliteButton.innerHTML = '<i class="fas fa-gem me-2"></i> Claim 60% Offer Now';
        if (eliteNote) eliteNote.innerText = 'Login to subscribe · Monthly access';
        return;
    }

    if (currentProfile?.role === 'admin') {
        eliteButton.innerHTML = '<i class="fas fa-shield-halved me-2"></i> Admin Access Active';
        if (eliteNote) eliteNote.innerText = 'Administrator account · Premium access enabled';
        return;
    }

    if (hasPremiumAccess) {
        eliteButton.innerHTML = '<i class="fas fa-circle-check me-2"></i> Pro Elite Active';
        const expiryText = formatDate(currentSubscription?.current_period_end);
        if (eliteNote) eliteNote.innerText = expiryText
            ? `Premium access active until ${expiryText}`
            : 'Premium access active';
        return;
    }

    eliteButton.innerHTML = '<i class="fas fa-gem me-2"></i> Claim 60% Offer Now';
    if (eliteNote) eliteNote.innerText = 'Monthly subscription · Secure mobile money payment via Lipila';
}

// ─── Navbar user state ───
function updateUI(user) {
    currentUser = user;

    if (user) {
        authButtonsDiv?.classList.add('d-none');
        userInfoDiv?.classList.remove('d-none');

        const label = currentProfile?.display_name || user.email?.split('@')[0] || 'Member';
        if (userEmailDisplay) userEmailDisplay.innerText = label;
    } else {
        authButtonsDiv?.classList.remove('d-none');
        userInfoDiv?.classList.add('d-none');
        if (userEmailDisplay) userEmailDisplay.innerText = '';
    }
}

// ─── Signals ───
async function loadSignals() {
    if (!signalFeed) return;

    signalFeed.innerHTML = `
        <div class="text-center py-4 text-secondary">
            <div class="spinner-border spinner-border-sm text-info me-2" role="status"></div>
            Loading signal alerts...
        </div>
    `;

    const { data, error } = await supabaseClient
        .from('signals')
        .select(`
            id,
            market,
            symbol,
            direction,
            entry_price,
            stop_loss,
            status,
            analysis,
            visibility,
            published_at,
            signal_targets (
                target_number,
                target_price,
                hit_at
            )
        `)
        .order('published_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Signal load error:', error);
        signalFeed.innerHTML = `
            <div class="text-center py-4 text-danger">
                <i class="fas fa-triangle-exclamation me-2"></i>
                Unable to load signals right now.
            </div>
        `;
        return;
    }

    renderSignals(data || []);
}

function renderSignals(signals) {
    if (!signalFeed) return;

    if (!signals.length) {
        const message = currentUser
            ? 'No signal alerts are available for your account yet.'
            : 'No public signal alerts are available right now. Login to access member features.';

        signalFeed.innerHTML = `
            <div class="text-center py-4 text-secondary">
                <i class="fas fa-satellite-dish text-info fa-2x mb-3"></i>
                <div>${escapeHTML(message)}</div>
            </div>
        `;
        return;
    }

    signalFeed.innerHTML = signals.map((signal) => {
        const isLong = signal.direction === 'LONG';
        const directionIcon = isLong ? 'fa-arrow-up text-success' : 'fa-arrow-down text-danger';
        const borderColor = isLong ? '#00ffb3' : '#ff4d6d';

        const targets = [...(signal.signal_targets || [])]
            .sort((a, b) => a.target_number - b.target_number);

        const tpText = targets.length
            ? targets.map((target) => `TP${target.target_number}: ${formatPrice(target.target_price)}`).join(' · ')
            : 'TP: —';

        const slText = signal.stop_loss !== null
            ? `SL: ${formatPrice(signal.stop_loss)}`
            : 'SL: —';

        const visibility = signal.visibility === 'PREMIUM'
            ? '<span class="badge bg-warning text-dark ms-2">Premium</span>'
            : '<span class="badge bg-secondary ms-2">Public</span>';

        const published = signal.published_at
            ? new Date(signal.published_at).toLocaleString()
            : '';

        return `
            <div class="p-3 rounded-3 mb-2"
                 style="background:rgba(0,255,255,0.04);border-left:3px solid ${borderColor};">
                <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                    <span class="fw-semibold">
                        <i class="fas ${directionIcon} me-1"></i>
                        ${escapeHTML(signal.symbol)} ${escapeHTML(signal.direction)}
                        ${visibility}
                    </span>

                    <span>
                        Entry: ${formatPrice(signal.entry_price)} |
                        ${slText} |
                        ${tpText}
                    </span>

                    <span class="text-info small">${escapeHTML(published)}</span>
                </div>

                ${signal.analysis ? `
                    <div class="small text-secondary mt-2">
                        ${escapeHTML(signal.analysis)}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ─── Refresh account-dependent state ───
async function refreshAccountState(user = currentUser) {
    const refreshId = ++authRefreshCounter;
    currentUser = user || null;

    if (!currentUser) {
        currentProfile = null;
        currentSubscription = null;
        hasPremiumAccess = false;
        updateUI(null);
        updateSubscriptionButton();
        await loadSignals();
        return;
    }

    await loadProfile();
    if (refreshId !== authRefreshCounter) return;

    updateUI(currentUser);

    await loadSubscription();
    if (refreshId !== authRefreshCounter) return;

    await loadSignals();
}

// ─── Login / Signup ───
authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = authEmail?.value.trim() || '';
    const password = authPassword?.value || '';

    if (!email || !password) {
        if (authError) authError.innerText = 'Email and password are required.';
        return;
    }

    if (authError) authError.innerText = '';
    if (authSubmitBtn) {
        authSubmitBtn.disabled = true;
        authSubmitBtn.innerText = isLoginMode ? 'Logging in...' : 'Creating...';
    }

    try {
        let result;

        if (isLoginMode) {
            result = await supabaseClient.auth.signInWithPassword({ email, password });
        } else {
            result = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
        }

        if (result.error) throw result.error;

        if (!isLoginMode && result.data.user && !result.data.session) {
            if (authError) {
                authError.innerText = 'Signup successful. Confirm your email, then log in.';
            }
            setAuthMode(true);
            if (authPassword) authPassword.value = '';
            return;
        }

        const user = result.data.user || result.data.session?.user || null;

        if (user) {
            authModal?.hide();
            authForm.reset();
            await refreshAccountState(user);
            showToast(`Welcome ${user.email?.split('@')[0] || 'member'} 🚀`);
        }
    } catch (err) {
        console.error(err);
        if (authError) authError.innerText = err?.message || 'Authentication failed.';
    } finally {
        if (authSubmitBtn) {
            authSubmitBtn.disabled = false;
            authSubmitBtn.innerText = isLoginMode ? 'Login' : 'Sign Up';
        }
    }
});

// ─── Logout ───
document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();

    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error(error);
        showToast('Unable to log out. Please try again.');
        return;
    }

    await refreshAccountState(null);
    showToast('Logged out');
});

// ============================================================
// LIPILA PAYMENT UI
// ============================================================

function setPaymentStatus(message, type = 'secondary') {
    if (!paymentStatus) return;

    paymentStatus.classList.remove(
        'text-secondary',
        'text-info',
        'text-success',
        'text-danger',
        'text-warning'
    );

    paymentStatus.classList.add(`text-${type}`);
    paymentStatus.innerText = message || '';
}

async function getFunctionErrorMessage(error, fallback = 'Something went wrong.') {
    if (!error) return fallback;

    const response = error.context || error.response;

    if (response instanceof Response) {
        try {
            const data = await response.clone().json();
            return data?.error || data?.message || fallback;
        } catch {
            try {
                const text = await response.clone().text();
                if (text) return text;
            } catch {
                // Ignore response parsing errors.
            }
        }
    }

    return error.message || fallback;
}

function stopPaymentPolling() {
    if (paymentPollTimer) {
        clearTimeout(paymentPollTimer);
        paymentPollTimer = null;
    }

    paymentPollAttempts = 0;
}

async function getExistingPendingPayment() {
    if (!currentUser) return null;

    const { data, error } = await supabaseClient
        .from('payments')
        .select(`
            id,
            merchant_reference,
            status,
            amount,
            currency,
            created_at
        `)
        .eq('user_id', currentUser.id)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Pending payment lookup error:', error);
        return null;
    }

    return data || null;
}


// ============================================================
// PREMIUM DISCORD ACCESS
// ============================================================

async function openPremiumDiscord() {
    if (!currentUser) {
        showToast('🔐 Please login to access Pro Elite Discord');
        return false;
    }

    try {
        const { data, error } = await supabaseClient.functions.invoke(
            'get-discord-invite',
            {
                body: {}
            }
        );

        if (error) {
            const message = await getFunctionErrorMessage(
                error,
                'Discord access could not be opened.'
            );

            console.error('Discord access error:', error);
            showToast(message);
            return false;
        }

        if (!data?.inviteUrl) {
            showToast('Discord invite is unavailable.');
            return false;
        }

        window.location.href = data.inviteUrl;
        return true;
    } catch (error) {
        console.error('Unexpected Discord access error:', error);
        showToast('Discord access could not be opened.');
        return false;
    }
}

async function checkLipilaPayment(reference, { silent = false } = {}) {
    if (!currentUser) return true;

    if (!reference) {
        if (!silent) {
            setPaymentStatus('No payment reference is available.', 'danger');
        }
        return true;
    }

    if (!silent && paymentCheckBtn) {
        paymentCheckBtn.disabled = true;
        paymentCheckBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            Checking...
        `;
    }

    try {
        const { data, error } = await supabaseClient.functions.invoke(
            'check-lipila-payment',
            {
                body: { reference }
            }
        );

        if (error) {
            const message = await getFunctionErrorMessage(
                error,
                'Unable to check payment status.'
            );

            console.error('Payment status error:', error);

            if (!silent) {
                setPaymentStatus(message, 'danger');
            }

            return false;
        }

        console.log('Lipila payment status:', data);

        const paymentState = String(data?.paymentStatus || '')
            .trim()
            .toLowerCase();

        const gatewayState = String(data?.gatewayStatus || '')
            .trim()
            .toLowerCase();

        if (paymentState === 'completed' || gatewayState === 'successful') {
            stopPaymentPolling();
            activePaymentReference = null;

            setPaymentStatus(
                'Payment successful. Pro Elite is now active.',
                'success'
            );

            paymentCheckBtn?.classList.add('d-none');

            await refreshAccountState(currentUser);

            showToast('✅ Payment successful — opening Pro Elite Discord');

            setTimeout(async () => {
                paymentModal?.hide();
                await openPremiumDiscord();
            }, 1500);

            return true;
        }

        if (paymentState === 'failed' || gatewayState === 'failed') {
            stopPaymentPolling();
            activePaymentReference = null;

            setPaymentStatus(
                data?.message || 'The payment failed. You can try again.',
                'danger'
            );

            if (paymentSubmitBtn) {
                paymentSubmitBtn.disabled = false;
                paymentSubmitBtn.innerHTML = `
                    <i class="fas fa-rotate me-2"></i>
                    Try Again
                `;
            }

            paymentCheckBtn?.classList.add('d-none');
            return true;
        }

        if (
            paymentState === 'cancelled' ||
            gatewayState === 'cancelled' ||
            gatewayState === 'canceled'
        ) {
            stopPaymentPolling();
            activePaymentReference = null;

            setPaymentStatus(
                'The payment was cancelled. You can start a new payment.',
                'warning'
            );

            if (paymentSubmitBtn) {
                paymentSubmitBtn.disabled = false;
                paymentSubmitBtn.innerHTML = `
                    <i class="fas fa-mobile-screen-button me-2"></i>
                    Try Again
                `;
            }

            paymentCheckBtn?.classList.add('d-none');
            return true;
        }

        setPaymentStatus(
            data?.message ||
            'Payment is still pending. Please approve the request on your phone.',
            'info'
        );

        paymentCheckBtn?.classList.remove('d-none');
        return false;
    } catch (error) {
        console.error('Unexpected payment check error:', error);

        if (!silent) {
            setPaymentStatus(
                'Unable to check payment status right now.',
                'danger'
            );
        }

        return false;
    } finally {
        if (!silent && paymentCheckBtn) {
            paymentCheckBtn.disabled = false;
            paymentCheckBtn.innerHTML = `
                <i class="fas fa-rotate me-2"></i>
                Check Payment Status
            `;
        }
    }
}

function startPaymentPolling(reference) {
    stopPaymentPolling();

    activePaymentReference = reference;
    paymentPollAttempts = 0;

    const poll = async () => {
        if (activePaymentReference !== reference) return;

        paymentPollAttempts += 1;

        const finished = await checkLipilaPayment(reference, { silent: true });
        if (finished) return;

        // 24 checks x 5 seconds ≈ 2 minutes.
        if (paymentPollAttempts >= 24) {
            stopPaymentPolling();

            setPaymentStatus(
                'Payment is still pending. Use "Check Payment Status" after approving the request.',
                'info'
            );

            paymentCheckBtn?.classList.remove('d-none');
            return;
        }

        paymentPollTimer = setTimeout(poll, 5000);
    };

    paymentPollTimer = setTimeout(poll, 5000);
}

async function openPaymentFlow() {
    if (!currentUser) {
        showToast('🔐 Please login to subscribe');
        setAuthMode(true);
        authModal?.show();
        return;
    }

    if (currentProfile?.role === 'admin') {
        showToast('🛡️ Admin premium access is active');
        return;
    }

    if (hasPremiumAccess) {
        const expiry = formatDate(currentSubscription?.current_period_end);
        showToast(
            expiry
                ? `✅ Pro Elite active until ${expiry}`
                : '✅ Pro Elite is active'
        );
        return;
    }

    stopPaymentPolling();
    activePaymentReference = null;

    setPaymentStatus('', 'secondary');

    if (paymentSubmitBtn) {
        paymentSubmitBtn.disabled = false;
        paymentSubmitBtn.innerHTML = `
            <i class="fas fa-lock me-2"></i>
            Continue to Payment
        `;
    }

    paymentCheckBtn?.classList.add('d-none');

    if (paymentPhone && currentProfile?.phone_e164) {
        const storedPhone = String(currentProfile.phone_e164);
        paymentPhone.value = storedPhone.startsWith('+')
            ? storedPhone
            : `+${storedPhone}`;
    }

    if (paymentPlanSummary && currentPlan) {
        const amount = Number(currentPlan.price).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

        paymentPlanSummary.innerText =
            `${currentPlan.name} · K${amount} ${currentPlan.currency} / month`;
    }

    paymentModal?.show();

    setPaymentStatus(
        'Checking for an existing payment...',
        'secondary'
    );

    const existingPayment = await getExistingPendingPayment();

    if (existingPayment?.merchant_reference) {
        activePaymentReference = existingPayment.merchant_reference;

        if (paymentSubmitBtn) {
            paymentSubmitBtn.disabled = true;
            paymentSubmitBtn.innerHTML = `
                <i class="fas fa-hourglass-half me-2"></i>
                Payment Pending
            `;
        }

        paymentCheckBtn?.classList.remove('d-none');

        setPaymentStatus(
            'You already have a payment in progress. Checking it now...',
            'info'
        );

        const finished = await checkLipilaPayment(activePaymentReference);

        if (!finished && activePaymentReference) {
            startPaymentPolling(activePaymentReference);
        }

        return;
    }

    setPaymentStatus(
        'Enter your mobile money number to continue.',
        'secondary'
    );
}

paymentForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentUser) {
        paymentModal?.hide();
        setAuthMode(true);
        authModal?.show();
        return;
    }

    if (activePaymentReference) {
        setPaymentStatus(
            'A payment is already in progress. Please check its status.',
            'warning'
        );
        return;
    }

    const phone = paymentPhone?.value.trim();

    if (!phone) {
        setPaymentStatus('Enter your mobile money number.', 'danger');
        paymentPhone?.focus();
        return;
    }

    if (paymentSubmitBtn) {
        paymentSubmitBtn.disabled = true;
        paymentSubmitBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            Sending payment request...
        `;
    }

    setPaymentStatus('Connecting securely to Lipila...', 'info');

    try {
        const { data, error } = await supabaseClient.functions.invoke(
            'create-lipila-payment',
            {
                body: { phone }
            }
        );

        if (error) {
            const message = await getFunctionErrorMessage(
                error,
                'Unable to start the payment.'
            );
            throw new Error(message);
        }

        console.log('Lipila payment created:', data);

        if (!data?.reference) {
            throw new Error('Lipila did not return a payment reference.');
        }

        activePaymentReference = data.reference;

        setPaymentStatus(
            'Payment request sent. Check your phone and approve the mobile money prompt.',
            'info'
        );

        if (paymentSubmitBtn) {
            paymentSubmitBtn.disabled = true;
            paymentSubmitBtn.innerHTML = `
                <i class="fas fa-mobile-screen-button me-2"></i>
                Waiting for Payment
            `;
        }

        paymentCheckBtn?.classList.remove('d-none');

        showToast('📱 Payment request sent — check your phone');
        startPaymentPolling(activePaymentReference);
    } catch (error) {
        console.error('Payment initiation error:', error);

        setPaymentStatus(
            error?.message || 'Unable to start payment.',
            'danger'
        );

        if (paymentSubmitBtn) {
            paymentSubmitBtn.disabled = false;
            paymentSubmitBtn.innerHTML = `
                <i class="fas fa-rotate me-2"></i>
                Try Again
            `;
        }
    }
});

paymentCheckBtn?.addEventListener('click', async () => {
    if (!activePaymentReference) {
        setPaymentStatus('No active payment was found.', 'warning');
        return;
    }

    const finished = await checkLipilaPayment(activePaymentReference);

    if (!finished && activePaymentReference) {
        startPaymentPolling(activePaymentReference);
    }
});

paymentModalEl?.addEventListener('hidden.bs.modal', () => {
    // Closing the modal only stops browser polling. It does not cancel Lipila.
    stopPaymentPolling();
});

// ─── Pro Elite subscribe button ───
document
    .querySelectorAll('.subscribe-demo[data-plan="elite"]')
    .forEach((btn) => {
        btn.addEventListener('click', async (event) => {
            event.preventDefault();
            await openPaymentFlow();
        });
    });

// ─── Affiliate / community handlers ───
document.querySelectorAll('.affiliate-join-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        if (!currentUser) {
            showToast('Login required for affiliate access');
            setAuthMode(true);
            authModal?.show();
            return;
        }
        showToast('🚀 Affiliate access coming soon');
    });
});

document.querySelector('.join-community-demo')?.addEventListener('click', () => {
    if (!currentUser) {
        showToast('Login before joining the community');
        setAuthMode(true);
        authModal?.show();
        return;
    }
    showToast('🌐 Community access coming soon');
});

// ─── Initial application load ───
async function initializeApplication() {
    await loadPlan();

    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) console.error('Session error:', error);

    await refreshAccountState(session?.user || null);
}

// Keep UI synced with login/logout/token state.
supabaseClient.auth.onAuthStateChange((_event, session) => {
    // Run after the auth callback returns to avoid doing long async work inside it.
    setTimeout(() => {
        refreshAccountState(session?.user || null).catch(console.error);
    }, 0);
});

initializeApplication().catch(console.error);

// ─── Smooth scroll ───
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
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
    document.getElementById('mainNavbar')?.classList.toggle('scrolled', window.scrollY > 20);
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
    if (tickerContainer) tickerContainer.innerHTML = html;
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
        if (liveIndicator) liveIndicator.className = 'live-indicator on';
        if (liveStatus) liveStatus.textContent = 'Live (REST)';
    } catch (e) {
        console.warn('REST fallback failed:', e);
        if (liveIndicator) liveIndicator.className = 'live-indicator';
        if (liveStatus) liveStatus.textContent = 'Offline';
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
        if (liveIndicator) liveIndicator.className = 'live-indicator on';
        if (liveStatus) liveStatus.textContent = 'Live (WS)';
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
        if (liveIndicator) liveIndicator.className = 'live-indicator';
        if (liveStatus) liveStatus.textContent = 'Connecting...';
    };

    ws.onclose = () => {
        console.log('WebSocket closed');
        wsReady = false;
        if (liveIndicator) liveIndicator.className = 'live-indicator';
        if (liveStatus) liveStatus.textContent = 'Reconnecting...';
        // Start REST fallback if not already
        if (!restInterval) {
            restInterval = setInterval(fetchBinanceREST, 10000);
            fetchBinanceREST(); // immediate
        }
        if (reconnectAttempts < maxReconnect) {
            reconnectAttempts++;
            setTimeout(connectWebSocket, 3000);
        } else {
            if (liveStatus) liveStatus.textContent = 'REST fallback';
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
    const countdownDays = document.getElementById('countdownDays');
    const countdownHours = document.getElementById('countdownHours');
    const countdownMinutes = document.getElementById('countdownMinutes');
    const countdownSeconds = document.getElementById('countdownSeconds');

    if (countdownDays) countdownDays.textContent = String(days).padStart(2, '0');
    if (countdownHours) countdownHours.textContent = String(hours).padStart(2, '0');
    if (countdownMinutes) countdownMinutes.textContent = String(mins).padStart(2, '0');
    if (countdownSeconds) countdownSeconds.textContent = String(secs).padStart(2, '0');
}
updateCountdown();
setInterval(updateCountdown, 1000);
