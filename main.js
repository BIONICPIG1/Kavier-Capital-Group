// ============================================================
// KAVIER CAPITAL GROUP
// MAIN.JS V2
// Existing index.html layout preserved
// ============================================================


// ============================================================
// SUPABASE
// ============================================================

const SUPABASE_URL =
    'https://ayeobjoaxxcvlccpzxic.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable_2nvoZ7z1G9hePh5NJse5uA_9oBQoBcf';

const { createClient } = window.supabase;

const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// ============================================================
// APP STATE
// ============================================================

let currentUser = null;
let currentProfile = null;
let currentSubscription = null;
let currentPlan = null;

let hasPremiumAccess = false;
let isLoginMode = true;

let authRefreshCounter = 0;


// ============================================================
// DOM ELEMENTS
// ============================================================

const authModalEl =
    document.getElementById('authModal');

const authModal =
    authModalEl
        ? new bootstrap.Modal(authModalEl)
        : null;


const authForm =
    document.getElementById('authForm');

const authEmail =
    document.getElementById('authEmail');

const authPassword =
    document.getElementById('authPassword');

const authSubmitBtn =
    document.getElementById('authSubmitBtn');

const authModeText =
    document.getElementById('authModeText');

const toggleAuthMode =
    document.getElementById('toggleAuthMode');

const authError =
    document.getElementById('authError');

const authButtonsDiv =
    document.getElementById('authButtons');

const userInfoDiv =
    document.getElementById('userInfo');

const userEmailDisplay =
    document.getElementById('userEmailDisplay');

const strengthBar =
    document.getElementById('strengthBar');

const strengthText =
    document.getElementById('strengthText');

const signalFeed =
    document.getElementById('signalFeed');


// Existing pricing card
const eliteCard =
    document.querySelector(
        '#signals .single-offer-card'
    );

const elitePriceEl =
    eliteCard?.querySelector(
        '.price-current'
    );

const eliteButton =
    eliteCard?.querySelector(
        '.subscribe-demo[data-plan="elite"]'
    );

const eliteNote =
    eliteCard?.querySelector(
        'p.text-center.text-secondary.small'
    );


// ============================================================
// TOAST
// ============================================================

function showToast(message) {

    const toast =
        document.getElementById('liveToast');

    const toastMessage =
        document.getElementById('toastMsg');


    if (
        !toast ||
        !toastMessage
    ) {
        return;
    }


    toastMessage.innerText =
        message;


    toast.classList.add('show');


    clearTimeout(
        toast._timer
    );


    toast._timer =
        setTimeout(() => {

            toast.classList.remove('show');

        }, 3200);

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(value) {

    return String(
        value ?? ''
    )

        .replaceAll(
            '&',
            '&amp;'
        )

        .replaceAll(
            '<',
            '&lt;'
        )

        .replaceAll(
            '>',
            '&gt;'
        )

        .replaceAll(
            '"',
            '&quot;'
        )

        .replaceAll(
            "'",
            '&#039;'
        );

}


// ============================================================
// FORMAT PRICE
// ============================================================

function formatPrice(value) {

    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {

        return '—';

    }


    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return escapeHTML(value);

    }


    return number.toLocaleString(
        undefined,
        {
            minimumFractionDigits:
                number < 1
                    ? 2
                    : 0,

            maximumFractionDigits: 8
        }
    );

}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {

    if (!value) {
        return '';
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return '';

    }


    return date.toLocaleDateString(
        undefined,
        {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }
    );

}


// ============================================================
// PASSWORD STRENGTH
// ============================================================

function checkStrength(password) {

    if (
        !strengthBar ||
        !strengthText
    ) {

        return;

    }


    if (
        !password ||
        isLoginMode
    ) {

        strengthBar.style.width =
            '0%';

        strengthText.innerText =
            '';

        return;

    }


    let score = 0;


    if (
        password.length >= 8
    ) {

        score += 25;

    }


    if (
        /[A-Z]/.test(password)
    ) {

        score += 25;

    }


    if (
        /[0-9]/.test(password)
    ) {

        score += 25;

    }


    if (
        /[^A-Za-z0-9]/.test(password)
    ) {

        score += 25;

    }


    strengthBar.style.width =
        score + '%';


    if (score < 50) {

        strengthBar.style.background =
            '#ff4d6d';

        strengthText.innerText =
            'Weak';

    }

    else if (score < 75) {

        strengthBar.style.background =
            '#ffb347';

        strengthText.innerText =
            'Medium';

    }

    else {

        strengthBar.style.background =
            '#00ffb3';

        strengthText.innerText =
            'Strong';

    }

}


authPassword?.addEventListener(
    'input',

    event => {

        checkStrength(
            event.target.value
        );

    }
);


// ============================================================
// AUTH MODE
// ============================================================

function setAuthMode(loginMode) {

    isLoginMode =
        loginMode;


    if (authModeText) {

        authModeText.innerText =
            loginMode
                ? 'Login'
                : 'Sign Up';

    }


    if (authSubmitBtn) {

        authSubmitBtn.innerText =
            loginMode
                ? 'Login'
                : 'Sign Up';

    }


    if (toggleAuthMode) {

        toggleAuthMode.innerText =
            loginMode

                ? 'Need an account? Sign up'

                : 'Already have an account? Login';

    }


    if (authError) {

        authError.innerText =
            '';

    }


    checkStrength(
        authPassword?.value || ''
    );

}


toggleAuthMode?.addEventListener(
    'click',

    event => {

        event.preventDefault();

        setAuthMode(
            !isLoginMode
        );

    }
);


document
    .getElementById('loginNavBtn')
    ?.addEventListener(
        'click',

        () => {

            setAuthMode(true);

        }
    );


document
    .getElementById('signupNavBtn')
    ?.addEventListener(
        'click',

        () => {

            setAuthMode(false);

        }
    );


// ============================================================
// LOAD SUBSCRIPTION PLAN
// ============================================================

async function loadPlan() {

    const {
        data,
        error
    } =
        await supabaseClient

            .from('plans')

            .select(`
                id,
                code,
                name,
                price,
                currency,
                billing_period_months,
                description,
                active
            `)

            .eq(
                'code',
                'pro_elite_monthly'
            )

            .eq(
                'active',
                true
            )

            .maybeSingle();


    if (error) {

        console.error(
            'Plan load error:',
            error
        );

        return;

    }


    currentPlan =
        data;


    if (!currentPlan) {

        console.warn(
            'Pro Elite plan not found.'
        );

        return;

    }


    // Update only the price.
    // Existing HTML layout stays untouched.

    if (elitePriceEl) {

        const amount =
            Number(
                currentPlan.price
            )
                .toLocaleString(
                    undefined,
                    {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                    }
                );


        const months =
            Number(
                currentPlan
                    .billing_period_months
            );


        const period =
            months === 1

                ? '/mo'

                : `/${months}mo`;


        elitePriceEl.innerHTML =
            `K${amount} <small>${period}</small>`;

    }

}


// ============================================================
// LOAD USER PROFILE
// ============================================================

async function loadProfile() {

    currentProfile =
        null;


    if (!currentUser) {

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient

            .from('profiles')

            .select(`
                id,
                display_name,
                phone_e164,
                role
            `)

            .eq(
                'id',
                currentUser.id
            )

            .maybeSingle();


    if (error) {

        console.error(
            'Profile load error:',
            error
        );

        return;

    }


    currentProfile =
        data;

}


// ============================================================
// LOAD SUBSCRIPTION
// ============================================================

async function loadSubscription() {

    currentSubscription =
        null;

    hasPremiumAccess =
        false;


    if (!currentUser) {

        updateSubscriptionButton();

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient

            .from('subscriptions')

            .select(`
                id,
                plan_id,
                status,
                current_period_start,
                current_period_end,
                auto_renew
            `)

            .eq(
                'user_id',
                currentUser.id
            )

            .maybeSingle();


    if (error) {

        console.error(
            'Subscription load error:',
            error
        );

    }


    currentSubscription =
        data;


    const expiry =
        data?.current_period_end

            ? new Date(
                data.current_period_end
            )

            : null;


    const subscriptionActive =
        Boolean(

            data

            &&

            data.status ===
                'active'

            &&

            expiry

            &&

            expiry.getTime() >
                Date.now()

        );


    const adminAccess =
        currentProfile?.role ===
        'admin';


    hasPremiumAccess =
        subscriptionActive ||
        adminAccess;


    updateSubscriptionButton();

}


// ============================================================
// UPDATE SUBSCRIPTION BUTTON
// ============================================================

function updateSubscriptionButton() {

    if (!eliteButton) {

        return;

    }


    // Logged out
    if (!currentUser) {

        eliteButton.innerHTML =
            `
            <i class="fas fa-gem me-2"></i>
            Claim 60% Offer Now
            `;


        if (eliteNote) {

            eliteNote.innerText =
                'Login to subscribe · Monthly access';

        }


        return;

    }


    // Admin
    if (
        currentProfile?.role ===
        'admin'
    ) {

        eliteButton.innerHTML =
            `
            <i class="fas fa-shield-halved me-2"></i>
            Admin Access Active
            `;


        if (eliteNote) {

            eliteNote.innerText =
                'Administrator account · Premium access enabled';

        }


        return;

    }


    // Active paid subscription
    if (hasPremiumAccess) {

        eliteButton.innerHTML =
            `
            <i class="fas fa-circle-check me-2"></i>
            Pro Elite Active
            `;


        const expiryText =
            formatDate(
                currentSubscription
                    ?.current_period_end
            );


        if (eliteNote) {

            eliteNote.innerText =
                expiryText

                    ? `Premium access active until ${expiryText}`

                    : 'Premium access active';

        }


        return;

    }


    // Logged in but unpaid
    eliteButton.innerHTML =
        `
        <i class="fas fa-gem me-2"></i>
        Claim 60% Offer Now
        `;


    if (eliteNote) {

        eliteNote.innerText =
            'Monthly subscription · Payment connection comes next';

    }

}


// ============================================================
// NAVBAR USER UI
// ============================================================

function updateUI(user) {

    currentUser =
        user;


    if (user) {

        authButtonsDiv
            ?.classList
            .add('d-none');


        userInfoDiv
            ?.classList
            .remove('d-none');


        const label =
            currentProfile?.display_name

            ||

            user.email
                ?.split('@')[0]

            ||

            'Member';


        if (userEmailDisplay) {

            userEmailDisplay.innerText =
                label;

        }

    }

    else {

        authButtonsDiv
            ?.classList
            .remove('d-none');


        userInfoDiv
            ?.classList
            .add('d-none');


        if (userEmailDisplay) {

            userEmailDisplay.innerText =
                '';

        }

    }

}


// ============================================================
// LOAD SIGNALS
// ============================================================

async function loadSignals() {

    if (!signalFeed) {

        return;

    }


    signalFeed.innerHTML =
        `
        <div class="text-center py-4 text-secondary">

            <div
                class="
                    spinner-border
                    spinner-border-sm
                    text-info
                    me-2
                "
                role="status">
            </div>

            Loading signal alerts...

        </div>
        `;


    const {
        data,
        error
    } =
        await supabaseClient

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

            .order(
                'published_at',
                {
                    ascending: false
                }
            )

            .limit(20);


    if (error) {

        console.error(
            'Signal load error:',
            error
        );


        signalFeed.innerHTML =
            `
            <div
                class="
                    text-center
                    py-4
                    text-danger
                "
            >

                <i
                    class="
                        fas
                        fa-triangle-exclamation
                        me-2
                    "
                ></i>

                Unable to load signals right now.

            </div>
            `;


        return;

    }


    renderSignals(
        data || []
    );

}


// ============================================================
// RENDER SIGNALS
// ============================================================

function renderSignals(signals) {

    if (!signalFeed) {

        return;

    }


    if (!signals.length) {

        const message =
            currentUser

                ? 'No signal alerts are available for your account yet.'

                : 'No public signal alerts are available right now. Login to access member features.';


        signalFeed.innerHTML =
            `
            <div
                class="
                    text-center
                    py-4
                    text-secondary
                "
            >

                <i
                    class="
                        fas
                        fa-satellite-dish
                        text-info
                        fa-2x
                        mb-3
                    "
                ></i>

                <div>
                    ${escapeHTML(message)}
                </div>

            </div>
            `;


        return;

    }


    signalFeed.innerHTML =
        signals

            .map(
                signal => {

                    const isLong =
                        signal.direction ===
                        'LONG';


                    const directionIcon =
                        isLong

                            ? 'fa-arrow-up text-success'

                            : 'fa-arrow-down text-danger';


                    const borderColor =
                        isLong

                            ? '#00ffb3'

                            : '#ff4d6d';


                    const targets =
                        [
                            ...(
                                signal
                                    .signal_targets
                                || []
                            )
                        ]

                            .sort(
                                (a, b) =>
                                    a.target_number -
                                    b.target_number
                            );


                    const tpText =
                        targets.length

                            ? targets
                                .map(
                                    target =>
                                        `TP${target.target_number}: ${formatPrice(target.target_price)}`
                                )
                                .join(' · ')

                            : 'TP: —';


                    const slText =
                        signal.stop_loss !==
                        null

                            ? `SL: ${formatPrice(signal.stop_loss)}`

                            : 'SL: —';


                    const visibility =
                        signal.visibility ===
                        'PREMIUM'

                            ? `
                                <span
                                    class="
                                        badge
                                        bg-warning
                                        text-dark
                                        ms-2
                                    "
                                >
                                    Premium
                                </span>
                              `

                            : `
                                <span
                                    class="
                                        badge
                                        bg-secondary
                                        ms-2
                                    "
                                >
                                    Public
                                </span>
                              `;


                    const published =
                        signal.published_at

                            ? new Date(
                                signal.published_at
                            )
                                .toLocaleString()

                            : '';


                    return `
                        <div
                            class="
                                p-3
                                rounded-3
                                mb-2
                            "

                            style="
                                background:
                                rgba(0,255,255,0.04);

                                border-left:
                                3px solid ${borderColor};
                            "
                        >

                            <div
                                class="
                                    d-flex
                                    justify-content-between
                                    align-items-center
                                    gap-3
                                    flex-wrap
                                "
                            >

                                <span class="fw-semibold">

                                    <i
                                        class="
                                            fas
                                            ${directionIcon}
                                            me-1
                                        "
                                    ></i>

                                    ${escapeHTML(signal.symbol)}

                                    ${escapeHTML(signal.direction)}

                                    ${visibility}

                                </span>


                                <span>

                                    Entry:
                                    ${formatPrice(signal.entry_price)}

                                    |

                                    ${slText}

                                    |

                                    ${tpText}

                                </span>


                                <span
                                    class="
                                        text-info
                                        small
                                    "
                                >

                                    ${escapeHTML(published)}

                                </span>

                            </div>


                            ${
                                signal.analysis

                                    ? `
                                    <div
                                        class="
                                            small
                                            text-secondary
                                            mt-2
                                        "
                                    >

                                        ${escapeHTML(signal.analysis)}

                                    </div>
                                    `

                                    : ''
                            }

                        </div>
                    `;

                }
            )

            .join('');

}


// ============================================================
// REFRESH USER STATE
// ============================================================

async function refreshAccountState(
    user = currentUser
) {

    const refreshId =
        ++authRefreshCounter;


    currentUser =
        user || null;


    // Logged out
    if (!currentUser) {

        currentProfile =
            null;

        currentSubscription =
            null;

        hasPremiumAccess =
            false;


        updateUI(null);

        updateSubscriptionButton();

        await loadSignals();

        return;

    }


    // Load profile
    await loadProfile();


    if (
        refreshId !==
        authRefreshCounter
    ) {

        return;

    }


    updateUI(
        currentUser
    );


    // Load subscription
    await loadSubscription();


    if (
        refreshId !==
        authRefreshCounter
    ) {

        return;

    }


    // Load signals
    await loadSignals();

}


// ============================================================
// LOGIN / SIGNUP
// ============================================================

authForm?.addEventListener(
    'submit',

    async event => {

        event.preventDefault();


        const email =
            authEmail
                ?.value
                .trim()
            || '';


        const password =
            authPassword
                ?.value
            || '';


        if (
            !email ||
            !password
        ) {

            if (authError) {

                authError.innerText =
                    'Email and password are required.';

            }

            return;

        }


        if (authError) {

            authError.innerText =
                '';

        }


        if (authSubmitBtn) {

            authSubmitBtn.disabled =
                true;


            authSubmitBtn.innerText =
                isLoginMode

                    ? 'Logging in...'

                    : 'Creating...';

        }


        try {

            let result;


            // LOGIN
            if (isLoginMode) {

                result =
                    await supabaseClient
                        .auth
                        .signInWithPassword(
                            {
                                email,
                                password
                            }
                        );

            }


            // SIGNUP
            else {

                result =
                    await supabaseClient
                        .auth
                        .signUp(
                            {
                                email,

                                password,

                                options: {

                                    emailRedirectTo:
                                        window.location.origin

                                }
                            }
                        );

            }


            if (result.error) {

                throw result.error;

            }


            // Email confirmation required
            if (
                !isLoginMode

                &&

                result.data.user

                &&

                !result.data.session
            ) {

                if (authError) {

                    authError.innerText =
                        'Signup successful. Confirm your email, then log in.';

                }


                setAuthMode(true);


                if (authPassword) {

                    authPassword.value =
                        '';

                }


                return;

            }


            const user =
                result.data.user

                ||

                result.data.session
                    ?.user

                ||

                null;


            if (user) {

                authModal?.hide();


                authForm.reset();


                await refreshAccountState(
                    user
                );


                showToast(
                    `Welcome ${user.email?.split('@')[0] || 'member'} 🚀`
                );

            }

        }

        catch (error) {

            console.error(
                error
            );


            if (authError) {

                authError.innerText =
                    error?.message

                    ||

                    'Authentication failed.';

            }

        }

        finally {

            if (authSubmitBtn) {

                authSubmitBtn.disabled =
                    false;


                authSubmitBtn.innerText =
                    isLoginMode

                        ? 'Login'

                        : 'Sign Up';

            }

        }

    }
);


// ============================================================
// LOGOUT
// ============================================================

document
    .getElementById('logoutBtn')
    ?.addEventListener(
        'click',

        async event => {

            event.preventDefault();


            const {
                error
            } =
                await supabaseClient
                    .auth
                    .signOut();


            if (error) {

                console.error(
                    error
                );


                showToast(
                    'Unable to log out. Please try again.'
                );


                return;

            }


            await refreshAccountState(
                null
            );


            showToast(
                'Logged out'
            );

        }
    );


// ============================================================
// SUBSCRIPTION BUTTON
// ============================================================

document
    .querySelectorAll(
        '.subscribe-demo'
    )
    .forEach(
        button => {

            button.addEventListener(
                'click',

                event => {

                    event.preventDefault();


                    // Must login first
                    if (!currentUser) {

                        showToast(
                            '🔐 Please login to subscribe'
                        );


                        setAuthMode(
                            true
                        );


                        authModal?.show();


                        return;

                    }


                    // Admin
                    if (
                        currentProfile?.role ===
                        'admin'
                    ) {

                        showToast(
                            '🛡️ Admin premium access is active'
                        );


                        return;

                    }


                    // Already subscribed
                    if (hasPremiumAccess) {

                        const expiry =
                            formatDate(
                                currentSubscription
                                    ?.current_period_end
                            );


                        showToast(

                            expiry

                                ? `✅ Pro Elite active until ${expiry}`

                                : '✅ Pro Elite is active'

                        );


                        return;

                    }


                    // ==================================================
                    // LIPILA WILL BE CONNECTED HERE NEXT
                    // ==================================================

                    showToast(
                        '💳 Your account is ready — Lipila payment is the next step'
                    );

                }
            );

        }
    );


// ============================================================
// AFFILIATE BUTTON
// ============================================================

document
    .querySelectorAll(
        '.affiliate-join-btn'
    )
    .forEach(
        button => {

            button.addEventListener(
                'click',

                () => {

                    if (!currentUser) {

                        showToast(
                            'Login required for affiliate access'
                        );


                        setAuthMode(
                            true
                        );


                        authModal?.show();


                        return;

                    }


                    showToast(
                        '🚀 Affiliate access coming soon'
                    );

                }
            );

        }
    );


// ============================================================
// COMMUNITY BUTTON
// ============================================================

document
    .querySelector(
        '.join-community-demo'
    )
    ?.addEventListener(
        'click',

        () => {

            if (!currentUser) {

                showToast(
                    'Login before joining the community'
                );


                setAuthMode(
                    true
                );


                authModal?.show();


                return;

            }


            showToast(
                '🌐 Community access coming soon'
            );

        }
    );


// ============================================================
// INITIALIZE APP
// ============================================================

async function initializeApplication() {

    // Load price / plan
    await loadPlan();


    // Check existing login session
    const {
        data: {
            session
        },
        error
    } =
        await supabaseClient
            .auth
            .getSession();


    if (error) {

        console.error(
            'Session error:',
            error
        );

    }


    await refreshAccountState(
        session?.user || null
    );

}


// ============================================================
// WATCH AUTH CHANGES
// ============================================================

supabaseClient
    .auth
    .onAuthStateChange(
        (
            event,
            session
        ) => {

            console.log(
                'Auth event:',
                event
            );


            // Avoid running long async work directly
            // inside Supabase auth callback.

            setTimeout(
                () => {

                    refreshAccountState(
                        session?.user || null
                    )
                        .catch(
                            console.error
                        );

                },
                0
            );

        }
    );


// Start app
initializeApplication()
    .catch(
        console.error
    );


// ============================================================
// SMOOTH SCROLL
// ============================================================

document
    .querySelectorAll(
        'a[href^="#"]'
    )
    .forEach(
        anchor => {

            anchor.addEventListener(
                'click',

                function (
                    event
                ) {

                    const id =
                        this.getAttribute(
                            'href'
                        );


                    if (
                        !id ||
                        id === '#'
                    ) {

                        return;

                    }


                    const target =
                        document.querySelector(
                            id
                        );


                    if (target) {

                        event.preventDefault();


                        target.scrollIntoView(
                            {
                                behavior:
                                    'smooth',

                                block:
                                    'start'
                            }
                        );

                    }

                }
            );

        }
    );


// ============================================================
// NAVBAR SCROLL EFFECT
// ============================================================

window.addEventListener(
    'scroll',

    () => {

        const navbar =
            document.getElementById(
                'mainNavbar'
            );


        navbar?.classList.toggle(
            'scrolled',
            window.scrollY > 20
        );

    }
);


// ============================================================
// MARKET TICKER
// BINANCE REAL-TIME DATA
// ============================================================

const tickerSymbols = [

    {
        display:
            'BTC/USD',

        symbol:
            'BTCUSDT',

        price: 0,

        change:
            '0.00%'
    },

    {
        display:
            'ETH/USD',

        symbol:
            'ETHUSDT',

        price: 0,

        change:
            '0.00%'
    },

    {
        display:
            'SOL/USD',

        symbol:
            'SOLUSDT',

        price: 0,

        change:
            '0.00%'
    },

    {
        display:
            'DOGE/USD',

        symbol:
            'DOGEUSDT',

        price: 0,

        change:
            '0.00%'
    },


    // Static display values for non-Binance markets

    {
        display:
            'ES_F',

        price: 5125,

        change:
            '-0.3%'
    },

    {
        display:
            'XAU/USD',

        price: 2390,

        change:
            '+0.7%'
    },

    {
        display:
            'EUR/USD',

        price: 1.0892,

        change:
            '+0.15%'
    },

    {
        display:
            'SPY',

        price: 523.4,

        change:
            '-0.2%'
    }

];


// ============================================================
// TICKER SYMBOL MAP
// ============================================================

const symbolMap =
    {};


tickerSymbols.forEach(
    (
        ticker,
        index
    ) => {

        if (
            ticker.symbol
        ) {

            symbolMap[
                ticker.symbol
            ] =
                index;

        }

    }
);


// ============================================================
// TICKER DOM
// ============================================================

const tickerContainer =
    document.getElementById(
        'marketTicker'
    );

const liveIndicator =
    document.getElementById(
        'liveIndicator'
    );

const liveStatus =
    document.getElementById(
        'liveStatus'
    );


// ============================================================
// BUILD TICKER HTML
// ============================================================

function buildTicker() {

    if (!tickerContainer) {

        return;

    }


    let html =
        '';


    // Repeat items so ticker animation appears continuous
    for (
        let repeat = 0;
        repeat < 3;
        repeat++
    ) {

        tickerSymbols.forEach(
            ticker => {

                const change =
                    String(
                        ticker.change
                    );


                const up =
                    change.startsWith('+')

                    ||

                    (
                        change !== '0.00%'

                        &&

                        !change.startsWith('-')
                    );


                let priceText =
                    ticker.price;


                if (
                    typeof ticker.price ===
                    'number'
                ) {

                    priceText =
                        ticker.price
                            .toFixed(
                                ticker.price < 1
                                    ? 6
                                    : 2
                            );

                }


                html +=
                    `
                    <div class="ticker-item">

                        <span class="fw-bold">

                            ${escapeHTML(ticker.display)}

                        </span>


                        <span
                            class="
                                ${
                                    up

                                        ? 'price-up'

                                        : 'price-down'
                                }
                            "
                        >

                            ${escapeHTML(priceText)}

                        </span>


                        <small>

                            ${escapeHTML(change)}

                        </small>

                    </div>
                    `;

            }
        );

    }


    tickerContainer.innerHTML =
        html;

}


// ============================================================
// BINANCE REST FALLBACK
// ============================================================

async function fetchBinanceREST() {

    const symbols =
        Object.keys(
            symbolMap
        );


    if (
        symbols.length === 0
    ) {

        return;

    }


    try {

        const url =

            'https://api.binance.com/api/v3/ticker/24hr?symbols='

            +

            encodeURIComponent(
                JSON.stringify(symbols)
            );


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                `Binance REST error ${response.status}`
            );

        }


        const data =
            await response.json();


        data.forEach(
            item => {

                const index =
                    symbolMap[
                        item.symbol
                    ];


                if (
                    index ===
                    undefined
                ) {

                    return;

                }


                const price =
                    parseFloat(
                        item.lastPrice
                    );


                const change =
                    parseFloat(
                        item.priceChangePercent
                    );


                tickerSymbols[
                    index
                ].price =
                    price;


                tickerSymbols[
                    index
                ].change =

                    (
                        change > 0
                            ? '+'
                            : ''
                    )

                    +

                    change.toFixed(2)

                    +

                    '%';

            }
        );


        buildTicker();


        if (liveIndicator) {

            liveIndicator.className =
                'live-indicator on';

        }


        if (liveStatus) {

            liveStatus.textContent =
                'Live';

        }

    }

    catch (error) {

        console.warn(
            'Binance REST fallback failed:',
            error
        );


        if (liveIndicator) {

            liveIndicator.className =
                'live-indicator';

        }


        if (liveStatus) {

            liveStatus.textContent =
                'Offline';

        }

    }

}


// ============================================================
// BINANCE WEBSOCKET
// ============================================================

let ws =
    null;

let reconnectAttempts =
    0;

const maxReconnect =
    5;

let restInterval =
    null;


// ============================================================
// CONNECT WEBSOCKET
// ============================================================

function connectWebSocket() {

    const streams =
        Object.keys(
            symbolMap
        )
            .map(
                symbol =>
                    symbol
                        .toLowerCase()

                    +

                    '@ticker'
            );


    if (
        streams.length === 0
    ) {

        return;

    }


    const wsUrl =
        `
        wss://stream.binance.com:9443/stream?streams=${streams.join('/')}
        `
            .trim();


    try {

        ws =
            new WebSocket(
                wsUrl
            );

    }

    catch (error) {

        console.error(
            'WebSocket creation error:',
            error
        );


        startRESTFallback();


        return;

    }


    // Connected
    ws.onopen =
        () => {

            console.log(
                'Binance WebSocket connected'
            );


            reconnectAttempts =
                0;


            if (liveIndicator) {

                liveIndicator.className =
                    'live-indicator on';

            }


            if (liveStatus) {

                liveStatus.textContent =
                    'Live';

            }


            if (restInterval) {

                clearInterval(
                    restInterval
                );


                restInterval =
                    null;

            }

        };


    // Message received
    ws.onmessage =
        event => {

            try {

                const message =
                    JSON.parse(
                        event.data
                    );


                if (
                    !message.data ||
                    !message.stream
                ) {

                    return;

                }


                const symbol =
                    message
                        .stream
                        .split('@')[0]
                        .toUpperCase();


                const index =
                    symbolMap[
                        symbol
                    ];


                if (
                    index ===
                    undefined
                ) {

                    return;

                }


                const ticker =
                    message.data;


                const price =
                    parseFloat(
                        ticker.c
                    );


                const change =
                    parseFloat(
                        ticker.P
                    );


                tickerSymbols[
                    index
                ].price =
                    price;


                tickerSymbols[
                    index
                ].change =

                    (
                        change > 0
                            ? '+'
                            : ''
                    )

                    +

                    change.toFixed(2)

                    +

                    '%';


                buildTicker();

            }

            catch (error) {

                console.warn(
                    'Ticker WebSocket parsing error:',
                    error
                );

            }

        };


    // Error
    ws.onerror =
        error => {

            console.warn(
                'Binance WebSocket error:',
                error
            );


            if (liveIndicator) {

                liveIndicator.className =
                    'live-indicator';

            }


            if (liveStatus) {

                liveStatus.textContent =
                    'Connecting...';

            }

        };


    // Disconnected
    ws.onclose =
        () => {

            console.log(
                'Binance WebSocket disconnected'
            );


            if (liveIndicator) {

                liveIndicator.className =
                    'live-indicator';

            }


            if (liveStatus) {

                liveStatus.textContent =
                    'Reconnecting...';

            }


            startRESTFallback();


            if (
                reconnectAttempts <
                maxReconnect
            ) {

                reconnectAttempts++;


                setTimeout(
                    connectWebSocket,
                    3000
                );

            }

            else {

                if (liveStatus) {

                    liveStatus.textContent =
                        'Live';

                }

            }

        };

}


// ============================================================
// START REST FALLBACK
// ============================================================

function startRESTFallback() {

    if (restInterval) {

        return;

    }


    fetchBinanceREST();


    restInterval =
        setInterval(
            fetchBinanceREST,
            15000
        );

}


// ============================================================
// INITIALIZE TICKER
// ============================================================

async function initTicker() {

    buildTicker();


    // Get initial crypto prices
    await fetchBinanceREST();


    // Then upgrade to WebSocket
    connectWebSocket();


    // REST safety fallback
    if (!restInterval) {

        restInterval =
            setInterval(
                fetchBinanceREST,
                15000
            );

    }

}


// Start ticker
initTicker()
    .catch(
        console.error
    );
