# Cuenta Clara on the iPhone App Store

Everything needed to put Cuenta Clara in the App Store, in the order to do it.
Screenshots are in `docs/app-store/` (English and Spanish, 1290 × 2796, the size
Apple asks for from the biggest iPhones; Apple shrinks them for smaller phones).

## 1. What you need first

| What | Cost | Notes |
| --- | --- | --- |
| Apple Developer Program | $99 a year | developer.apple.com/programs/enroll. Enroll as an **individual** (your name shows as the seller). An organization needs an LLC and a free D-U-N-S number, which takes 1–2 weeks. |
| A way to build the app | $0–$30 a month | Building for iPhone needs Xcode on a Mac. If your MacBook Pro can't install a recent macOS, use a cloud Mac service instead (Codemagic has a free tier). |
| An iPhone to test on | you have one | Apple's TestFlight app installs test builds on your phone before anyone else sees them. |

## 2. The big decision: how people pay for Plus on iPhone

Apple's rule (App Review Guideline 3.1.1): digital subscriptions sold **inside** an
iPhone app must use Apple's In-App Purchase, and Apple keeps 15% (small businesses).
Whop checkout can't be shown inside the iPhone app.

Three ways to handle it:

1. **Free app first, Plus on the website (recommended to start).** The iPhone app has
   every free feature. Plus users sign in and get Plus, because they bought it on the
   website. Since 2025, apps on the **U.S.** App Store may also show a button that opens
   your website to buy (confirm this is still true when you submit; it changed by
   court order and could change again).
2. **Apple In-App Purchase for iPhone, Whop for the web.** Most money, most work. A
   service like RevenueCat keeps both in sync so Plus works everywhere.
3. **Hide Plus on iPhone entirely.** Simplest, but iPhone users never hear about Plus.

## 3. Making it feel like a real app (Guideline 4.2)

Apple rejects apps that are "just a website in a box". Cuenta Clara is wrapped with
**Capacitor** (the same app code, inside a native shell). To pass review, add:

- Face ID / passcode lock when the app opens (money apps are expected to have it).
- Push notifications for bill reminders and payday (instead of only email).
- A friendly "you're offline" screen.
- Haptic taps when you log something.

Already done and required by Apple: account deletion inside the app (Settings →
Delete my account), a privacy policy, and sign-in by email (no Google/Facebook login,
so "Sign in with Apple" isn't required).

## 4. App Store listing (copy and paste)

**Name** (30 max): `Cuenta Clara`

**Subtitle** (30 max)
- English: `Bilingual budget & money coach` (30)
- Spanish: `Presupuesto bilingüe con Clara` (30)

**Category:** Finance. Secondary: Education.

**Keywords** (100 max, commas, no spaces after commas)
- English: `budget,spanish,remittance,paycheck,veteran,gi bill,savings,debt,family,money coach` (82)
- Spanish: `presupuesto,remesas,envios,ahorro,deudas,quincena,familia,veteranos,dinero,finanzas,cuentas` (91)

**Promotional text** (170 max, can change anytime)
- English: `Know what's safe to spend until payday, in Spanish, English or both. Plan family sends, reach your goals, and ask Clara anything about your money.`
- Spanish: `Sabe cuánto puedes gastar hasta tu día de pago, en español, inglés o los dos. Planea tus envíos, cumple tus metas y pregúntale a Clara sobre tu dinero.`

**Description (English)**

Cuenta Clara is a budgeting app for working families, immigrants, veterans and military families, in Spanish, English, or both.

SEE WHAT'S SAFE TO SPEND
Type your balance and payday, and Cuenta Clara shows what you can spend until your next check, after bills, family sends and savings.

YOUR FAMILY, PLANNED
Plan what you send home each month, see it in their currency, and know it's covered.

GOALS YOU CAN SEE GROW
Emergency fund, a trip home, a house: progress bars and a clear monthly amount for each one.

CLARA, YOUR MONEY COACH
Ask "Can I afford this?" or "What is APR?" Clara answers with your own numbers, in plain words. The app does the math; Clara explains it.

GET OUT OF DEBT FASTER
See when you'll be debt-free, and how much interest snowball or avalanche saves you.

FOR VETERANS
Estimate your combined VA disability rating, plan your GI Bill, and check off benefits many veterans miss. Estimates only; Cuenta Clara is not affiliated with the VA.

FREE, AND PRIVATE
The basics are free forever. We never connect to your bank and never sell your data.

Cuenta Clara gives general information, not financial, tax or legal advice.

**Description (Spanish)**

Cuenta Clara es una app de presupuesto para familias trabajadoras, inmigrantes, veteranos y familias militares, en español, inglés o los dos.

MIRA CUÁNTO PUEDES GASTAR
Escribe tu saldo y tu día de pago, y Cuenta Clara te dice cuánto puedes gastar hasta tu próximo cheque, después de cuentas, envíos y ahorro.

TU FAMILIA, PLANEADA
Planea lo que mandas cada mes, míralo en su moneda y sabe que está cubierto.

METAS QUE VES CRECER
Fondo de emergencia, un viaje a casa, una casa: barras de progreso y cuánto apartar cada mes.

CLARA, TU COACH DE DINERO
Pregunta "¿Me alcanza?" o "¿Qué es el APR?". Clara responde con tus propios números y en palabras claras. La app hace las cuentas; Clara las explica.

SAL DE DEUDAS MÁS RÁPIDO
Mira cuándo terminas de pagar y cuánto interés te ahorras con bola de nieve o avalancha.

PARA VETERANOS
Calcula tu calificación combinada de discapacidad del VA, planea tu GI Bill y marca los beneficios que muchos veteranos no usan. Solo estimados; Cuenta Clara no está afiliada con el VA.

GRATIS Y PRIVADA
Lo básico es gratis para siempre. Nunca nos conectamos a tu banco ni vendemos tus datos.

Cuenta Clara da información general, no asesoría financiera, de impuestos ni legal.

**URLs**
- Privacy policy: `https://micuentaclara.app/privacidad`
- Terms: `https://micuentaclara.app/terminos`
- Support: `https://micuentaclara.app` (Apple needs a page with a way to contact you; the landing page footer and the privacy page list hola@micuentaclara.app)
- Marketing: `https://micuentaclara.app`

**Age rating:** answer Apple's questionnaire honestly (no gambling, no mature content,
an AI chat limited to money topics). Our terms are for adults, so choose the 18+
option if the questionnaire offers it; otherwise the lowest rating it gives.

## 5. App Privacy answers ("nutrition label")

Apple asks what the app collects. For the iPhone app (which opens straight to `/app`,
where the Meta Pixel never loads):

| Data type | Collected | Linked to the person | Used for tracking | Why |
| --- | --- | --- | --- | --- |
| Contact info → Email address | Yes | Yes | No | Account, emails they turned on |
| Financial info → Other financial info | Yes | Yes | No | The numbers they type: income, bills, balance, goals, debts |
| User content → Other user content | Yes | Yes | No | Questions to Clara, feedback messages, notes |
| Identifiers → User ID | Yes | Yes | No | Keeping their data in their account |
| Purchases → Purchase history | Yes (if Plus) | Yes | No | Plus status |
| Location, contacts, photos, health, browsing | No | | | Pay stub and receipt photos are read once and not stored |

Tracking: **No** (no data is shared with data brokers or used for ads inside the app).

## 6. Screenshots

In `docs/app-store/`: 6 per language, 1290 × 2796.

1. Safe to Spend on Home: "Know what's safe to spend until payday"
2. Clara: "Ask Clara anything about your money"
3. Goals: "Watch your goals grow"
4. Sends: "Support the people you love"
5. Debts: "See when you'll be debt-free"
6. Veterans: "Free tools for veterans"

They're made from the demo with sample data (no real person's information).

## 7. Steps, in order

1. Enroll in the Apple Developer Program.
2. Decide how Plus works on iPhone (section 2).
3. I add Capacitor and the native extras (section 3) to the project.
4. Build in Xcode or a cloud Mac, then install on your phone with TestFlight.
5. Fill in App Store Connect with section 4 and 5, upload the screenshots.
6. Submit for review. First reviews usually take 1–3 days; a first rejection with
   fixes to make is common and not a problem.
