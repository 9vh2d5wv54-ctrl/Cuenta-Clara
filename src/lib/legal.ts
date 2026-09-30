// Privacy policy and terms of use, in plain language, English and Spanish.
// Written from what the app actually does (see README). DRAFT: have a lawyer or
// a law school clinic review before growing, adding bank connections or running
// ads. When the app changes what it collects or who it shares with, update this.

export const LEGAL_UPDATED = "2026-09-30";
export { CONTACT_EMAIL } from "./brand";
import { CONTACT_EMAIL, SITE_HOST } from "./brand";

export type LegalSection = { h: string; p?: string[]; list?: string[] };
export type LegalDoc = { title: string; lead: string; sections: LegalSection[] };

export const PRIVACY: Record<"es" | "en", LegalDoc> = {
  en: {
    title: "Privacy policy",
    lead: "Pocket Recon helps you plan your money. This page explains, in plain words, what we collect, why, who helps us run the app, and what you can do about it. The short version: we only keep what you type into the app, we never ask for your bank password, and we never sell your data.",
    sections: [
      {
        h: "Who we are",
        p: [
          `Pocket Recon (${SITE_HOST}) is a budgeting app operated by its founder, Manny Abreu. When this policy says "we" or "us," it means Pocket Recon.`,
        ],
      },
      {
        h: "What we collect",
        list: [
          "Your account: your email, language, timezone, and the country you send money to.",
          "The numbers you type: monthly income, bills, family sends (the name and country you enter for each person), savings goals, debts, the bank balance and payday you enter for Safe to Spend, and the expenses and payments you log, with any notes.",
          "Your questions to Clara and her answers, and your monthly money checkups.",
          "Plus: your plan and billing status (active, trial, canceled). Payments are handled by Whop; we never see your card number.",
          "WhatsApp, only if you connect it: your phone number and the messages you send the assistant.",
          "Feedback you send from the app: your message, the kind of feedback, the screen you were on and your email, so we can write back. It arrives by email and isn't kept in the app.",
          "Basic, anonymous visit counts (see \"Measurement\" below).",
        ],
      },
      {
        h: "What we don't collect",
        list: [
          "Your bank password or bank login. We don't connect to your bank; you type your own numbers.",
          "Your Social Security number or card numbers.",
          "Receipt and pay stub photos: they're read once to fill in the numbers and aren't saved.",
          "Voice: when you log by voice, your phone or browser turns speech into text (using its own speech service, such as Apple's or Google's). We only receive the text.",
          "The numbers you enter in the VA disability estimate and the GI Bill planner aren't saved. Your veteran benefits checklist and your \"Are you a veteran?\" answer are saved only on your device.",
        ],
      },
      {
        h: "How we use it",
        list: [
          "To run the app: work out what's left this month, Safe to Spend, forecasts, goals and debt plans.",
          "To send the emails you choose: weekly summary and payday plan, bill reminders, checkups, and notices about your Plus trial.",
          "To answer your questions to Clara and write your checkups.",
          "To handle Plus billing, keep the app secure and fix problems.",
        ],
        p: [
          "We never sell your personal information, and we don't share it with anyone for their own advertising.",
        ],
      },
      {
        h: "Clara and AI",
        p: [
          "Clara, the money checkups and the photo reading use Claude, an AI service from Anthropic. To answer you, we send Anthropic your question and the numbers needed to answer it (for example, what's left this month or your bills before payday), or the photo you chose to snap. Anthropic's business terms don't allow it to use this data to train its AI models; it may keep it for a limited time for safety and abuse monitoring. Clara can make mistakes, so check anything important.",
        ],
      },
      {
        h: "Who helps us run the app",
        p: ["These companies process data for us, only to provide their service:"],
        list: [
          "Supabase: our database and sign-in.",
          "Vercel: hosts the app.",
          "Resend: sends our emails.",
          "Anthropic: powers Clara, checkups and photo reading.",
          "Whop: handles Plus payments.",
          "Meta (WhatsApp): only if you connect the WhatsApp assistant.",
          "Plausible: anonymous visit counts, no cookies.",
          "Meta Pixel: if we run ads, measures sign-ups from them on our public pages only (never on your money screens).",
          "ExchangeRate-API: exchange rates. It receives no personal information.",
        ],
      },
      {
        h: "Measurement",
        p: [
          "We count visits with Plausible, which uses no cookies and collects no personal data. If we run ads on Facebook or Instagram, the Meta Pixel may load on our public pages (the home page, sign-up and the Plus page) to tell us whether an ad led to a sign-up or a trial. It never loads on the screens with your money. We use a small cookie to remember your language, and sign-in cookies to keep you signed in.",
        ],
      },
      {
        h: "Your choices",
        list: [
          "See and change your numbers anytime in the app.",
          "Delete any Clara conversation from its history.",
          "Turn emails on or off in Settings, or tap \"Unsubscribe\" in any email.",
          "Disconnect WhatsApp in Settings.",
          "Delete your account in Settings. This erases your account and everything in it from our database right away. Copies in our providers' backups expire on their own within a short time.",
          `Ask us what we have about you, or to correct or delete it: write to ${CONTACT_EMAIL}. We answer within 30 days.`,
        ],
      },
      {
        h: "California and other state rights",
        p: [
          "Depending on where you live, you may have the right to know what personal information we collect, to get a copy, to correct it, to delete it, and to opt out of its sale or sharing for targeted advertising. We don't sell or share personal information for targeted advertising. To use any of these rights, email us; we won't treat you differently for asking.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          "We keep your data while your account is open, so the app keeps working. When you delete your account, we delete it. If you don't use your account for 3 years, we may delete it after emailing you first.",
        ],
      },
      {
        h: "Security",
        p: [
          "Your data travels encrypted (HTTPS), is stored with our database provider, and each person can only reach their own data. Only the founder can access the systems, and only to run and fix the app. No system is perfectly secure; if we learn of a breach that affects you, we'll tell you as the law requires.",
        ],
      },
      {
        h: "Children",
        p: ["Pocket Recon is for adults. It isn't meant for children under 13, and we don't knowingly collect their information. If you think a child gave us information, write to us and we'll delete it."],
      },
      {
        h: "Where your data is",
        p: ["Our providers store data in the United States. If you use the app from another country, your data is sent to and stored in the United States."],
      },
      {
        h: "Changes",
        p: ["If we change this policy, we'll update the date at the top. If a change is important, we'll email you before it takes effect."],
      },
      {
        h: "Contact",
        p: [`Questions or requests: ${CONTACT_EMAIL}.`],
      },
    ],
  },
  es: {
    title: "Política de privacidad",
    lead: "Pocket Recon te ayuda a planear tu dinero. Esta página explica, en palabras sencillas, qué guardamos, para qué, quién nos ayuda a manejar la app y qué puedes hacer tú. En corto: solo guardamos lo que escribes en la app, nunca te pedimos la contraseña de tu banco y nunca vendemos tus datos.",
    sections: [
      {
        h: "Quiénes somos",
        p: [
          `Pocket Recon (${SITE_HOST}) es una app de presupuesto manejada por su fundador, Manny Abreu. Cuando esta política dice "nosotros", se refiere a Pocket Recon.`,
        ],
      },
      {
        h: "Qué guardamos",
        list: [
          "Tu cuenta: tu correo, idioma, zona horaria y el país al que mandas dinero.",
          "Los números que escribes: ingreso mensual, cuentas, envíos a tu familia (el nombre y el país que pones de cada persona), metas de ahorro, deudas, el saldo del banco y el día de pago que pones en Seguro para gastar, y los gastos y pagos que anotas, con sus notas.",
          "Tus preguntas a Clara y sus respuestas, y tus chequeos de dinero de cada mes.",
          "Plus: tu plan y el estado de tu pago (activo, en prueba, cancelado). Los pagos los maneja Whop; nunca vemos el número de tu tarjeta.",
          "WhatsApp, solo si lo conectas: tu número y los mensajes que le mandas al asistente.",
          "Los comentarios que envías desde la app: tu mensaje, el tipo de comentario, la pantalla donde estabas y tu correo, para poder responderte. Llegan por correo y no se guardan en la app.",
          "Conteos básicos y anónimos de visitas (mira \"Medición\" abajo).",
        ],
      },
      {
        h: "Qué no guardamos",
        list: [
          "La contraseña o el usuario de tu banco. No nos conectamos a tu banco; tú escribes tus propios números.",
          "Tu número de Seguro Social ni números de tarjetas.",
          "Las fotos de recibos y talones de pago: se leen una vez para llenar los números y no se guardan.",
          "La voz: cuando anotas con la voz, tu teléfono o navegador convierte lo que dices en texto (con su propio servicio, como el de Apple o Google). Nosotros solo recibimos el texto.",
          "Los números que pones en la calculadora de discapacidad del VA y en el planificador del GI Bill no se guardan. Tu lista de beneficios para veteranos y tu respuesta a \"¿Eres veterano(a)?\" se guardan solo en tu dispositivo.",
        ],
      },
      {
        h: "Para qué lo usamos",
        list: [
          "Para que la app funcione: calcular lo que te queda este mes, Seguro para gastar, pronósticos, metas y planes de deudas.",
          "Para mandarte los correos que eliges: resumen semanal y plan del día de pago, recordatorios de cuentas, chequeos y avisos de tu prueba de Plus.",
          "Para responder tus preguntas a Clara y escribir tus chequeos.",
          "Para cobrar Plus, mantener la app segura y arreglar problemas.",
        ],
        p: ["Nunca vendemos tu información personal ni la compartimos con nadie para su propia publicidad."],
      },
      {
        h: "Clara y la inteligencia artificial",
        p: [
          "Clara, los chequeos de dinero y la lectura de fotos usan Claude, un servicio de inteligencia artificial de Anthropic. Para responderte, le mandamos a Anthropic tu pregunta y los números que hacen falta para contestarla (por ejemplo, lo que te queda este mes o tus cuentas antes del día de pago), o la foto que decidiste tomar. Los términos comerciales de Anthropic no le permiten usar estos datos para entrenar sus modelos; puede guardarlos por un tiempo limitado para seguridad y para prevenir abusos. Clara puede equivocarse, así que revisa lo importante.",
        ],
      },
      {
        h: "Quién nos ayuda a manejar la app",
        p: ["Estas compañías procesan datos por nosotros, solo para dar su servicio:"],
        list: [
          "Supabase: nuestra base de datos y el inicio de sesión.",
          "Vercel: donde vive la app.",
          "Resend: manda nuestros correos.",
          "Anthropic: hace funcionar a Clara, los chequeos y la lectura de fotos.",
          "Whop: maneja los pagos de Plus.",
          "Meta (WhatsApp): solo si conectas el asistente de WhatsApp.",
          "Plausible: conteo anónimo de visitas, sin cookies.",
          "Píxel de Meta: si hacemos anuncios, mide los registros que vienen de ellos, solo en nuestras páginas públicas (nunca en las pantallas con tu dinero).",
          "ExchangeRate-API: tipos de cambio. No recibe información personal.",
        ],
      },
      {
        h: "Medición",
        p: [
          "Contamos visitas con Plausible, que no usa cookies ni guarda datos personales. Si hacemos anuncios en Facebook o Instagram, el Píxel de Meta puede cargar en nuestras páginas públicas (la página principal, el registro y la página de Plus) para saber si un anuncio llevó a un registro o a una prueba. Nunca carga en las pantallas con tu dinero. Usamos una cookie pequeña para recordar tu idioma, y cookies de inicio de sesión para que no tengas que entrar cada vez.",
        ],
      },
      {
        h: "Lo que puedes hacer",
        list: [
          "Ver y cambiar tus números cuando quieras en la app.",
          "Borrar cualquier conversación con Clara de tu historial.",
          "Prender o apagar los correos en Ajustes, o tocar \"Dejar de recibir estos correos\" en cualquier correo.",
          "Desconectar WhatsApp en Ajustes.",
          "Borrar tu cuenta en Ajustes. Esto borra tu cuenta y todo lo que tiene de nuestra base de datos en ese momento. Las copias de respaldo de nuestros proveedores se borran solas en poco tiempo.",
          `Pedirnos qué tenemos sobre ti, o que lo corrijamos o lo borremos: escríbenos a ${CONTACT_EMAIL}. Te respondemos en 30 días o menos.`,
        ],
      },
      {
        h: "Derechos en California y otros estados",
        p: [
          "Según donde vivas, puedes tener derecho a saber qué información personal guardamos, a recibir una copia, a corregirla, a borrarla y a pedir que no se venda ni se comparta para publicidad dirigida. No vendemos ni compartimos información personal para publicidad dirigida. Para usar cualquiera de estos derechos, escríbenos; no te trataremos diferente por pedirlo.",
        ],
      },
      {
        h: "Cuánto tiempo lo guardamos",
        p: [
          "Guardamos tus datos mientras tu cuenta esté abierta, para que la app siga funcionando. Cuando borras tu cuenta, los borramos. Si no usas tu cuenta en 3 años, podemos borrarla después de avisarte por correo.",
        ],
      },
      {
        h: "Seguridad",
        p: [
          "Tus datos viajan cifrados (HTTPS), se guardan con nuestro proveedor de base de datos, y cada persona solo puede ver sus propios datos. Solo el fundador tiene acceso a los sistemas, y solo para manejar y arreglar la app. Ningún sistema es perfecto; si nos enteramos de un problema de seguridad que te afecte, te avisaremos como lo pide la ley.",
        ],
      },
      {
        h: "Menores de edad",
        p: ["Pocket Recon es para adultos. No es para menores de 13 años y no guardamos a propósito información de ellos. Si crees que un menor nos dio información, escríbenos y la borramos."],
      },
      {
        h: "Dónde están tus datos",
        p: ["Nuestros proveedores guardan los datos en Estados Unidos. Si usas la app desde otro país, tus datos se mandan y se guardan en Estados Unidos."],
      },
      {
        h: "Cambios",
        p: ["Si cambiamos esta política, actualizaremos la fecha de arriba. Si el cambio es importante, te mandaremos un correo antes de que empiece."],
      },
      {
        h: "Contacto",
        p: [`Preguntas o pedidos: ${CONTACT_EMAIL}.`],
      },
    ],
  },
};

export const TERMS: Record<"es" | "en", LegalDoc> = {
  en: {
    title: "Terms of use",
    lead: "These terms are the agreement between you and Pocket Recon when you use the app. By creating an account or using the app, you agree to them. We wrote them in plain words; please read them.",
    sections: [
      {
        h: "Who can use Pocket Recon",
        p: ["You must be at least 18 years old (or the age of adulthood where you live) and able to agree to these terms. The app is made for people in the United States."],
      },
      {
        h: "What Pocket Recon is, and isn't",
        list: [
          "A tool to plan your money with the numbers you type. The results are only as accurate as those numbers.",
          "Not a bank, lender or money transmitter. We don't hold, move or invest your money.",
          "General information and education, not financial, tax, legal or investment advice. For decisions that matter, talk to a qualified professional.",
          "The VA disability estimate and GI Bill planner give estimates from VA's published tables. Pocket Recon is not affiliated with the U.S. Department of Veterans Affairs or any government agency; VA decides your benefits.",
          "Exchange rates, tax set-aside amounts and forecasts are estimates.",
        ],
        p: ["You are responsible for your own money decisions."],
      },
      {
        h: "Clara, the AI copilot",
        p: [
          "Clara uses artificial intelligence to explain your numbers. The app does the math, but Clara can still make mistakes or misunderstand you, so check anything important before you act on it. Clara is not a counselor or an emergency service. If you are in crisis, call or text 988 (veterans: dial 988 and press 1), or call 911 in an emergency.",
        ],
      },
      {
        h: "Your account",
        list: [
          "Give a real email you can access, since we use it to sign you in and to reach you.",
          "Keep access to your email safe; anyone who can open it may be able to sign in.",
          "One account per person. Tell us if you think someone else used your account.",
        ],
      },
      {
        h: "Plus",
        list: [
          "Plus costs $4.99 a month or $39.99 a year, plus any tax. Prices are shown before you pay.",
          "New members can get one 7-day free trial. We email you 2 days before it ends. If you don't cancel before the trial ends, your plan starts and is charged.",
          "Plus renews automatically each month or year until you cancel. Cancel anytime in Settings; you keep Plus until the end of the period you paid for, and you won't be charged again.",
          "We don't give refunds for partial periods, except where the law requires it. If something went wrong with a charge, write to us and we'll make it right.",
          "Payments are processed by Whop under its own terms.",
          "If we change the price, we'll email you at least 30 days before, and the new price applies from your next renewal.",
          "The basics of Pocket Recon stay free.",
        ],
      },
      {
        h: "Using the app fairly",
        p: ["Please don't:"],
        list: [
          "Break the law or use the app to harm anyone.",
          "Try to get into other people's accounts or our systems, or get around limits like Clara's question limits.",
          "Copy, scrape or resell the app or its content, or use bots to overload it.",
          "Use the app to send spam, including through WhatsApp.",
        ],
      },
      {
        h: "Your information and our content",
        p: [
          "What you type is yours. You let us store and process it only to run the app for you, as described in our privacy policy.",
          "The app, its design, lessons, dictionary, quiz and name belong to Pocket Recon. You may use them for your own personal use.",
        ],
      },
      {
        h: "Links to other sites",
        p: ["We link to official sites like VA.gov, the SBA and the IRS. We don't control them and aren't responsible for their content."],
      },
      {
        h: "Changes and availability",
        p: [
          "We're a small team and keep improving the app, so features can change or be removed. We try to keep it working all the time but can't promise it will never be down.",
          "We may change these terms. We'll update the date at the top, and email you before important changes take effect. If you keep using the app after that, you accept the new terms.",
        ],
      },
      {
        h: "Ending your use",
        p: [
          "You can stop using the app and delete your account anytime in Settings. We may suspend or close an account that breaks these terms, after warning you when we reasonably can.",
        ],
      },
      {
        h: "Disclaimers",
        p: [
          "The app is provided \"as is.\" To the extent the law allows, we don't promise that it will be error-free or that its estimates will be exact, and we disclaim implied warranties.",
        ],
      },
      {
        h: "Limit of liability",
        p: [
          "To the extent the law allows, Pocket Recon isn't responsible for indirect or consequential losses, and our total responsibility for any claim is limited to the greater of what you paid us in the 12 months before the claim or $50. Some places don't allow these limits, so they may not apply to you.",
        ],
      },
      {
        h: "Law and disputes",
        p: [
          "These terms are governed by the laws of the State of New Jersey and of the United States. If there's a problem, please write to us first; most things can be solved quickly. If we can't solve it, either of us may bring a claim in small claims court or in the courts of New Jersey.",
        ],
      },
      {
        h: "Contact",
        p: [`Questions: ${CONTACT_EMAIL}.`],
      },
    ],
  },
  es: {
    title: "Términos de uso",
    lead: "Estos términos son el acuerdo entre tú y Pocket Recon cuando usas la app. Al crear una cuenta o usar la app, los aceptas. Los escribimos en palabras sencillas; por favor léelos.",
    sections: [
      {
        h: "Quién puede usar Pocket Recon",
        p: ["Debes tener al menos 18 años (o la mayoría de edad donde vives) y poder aceptar estos términos. La app está hecha para personas en Estados Unidos."],
      },
      {
        h: "Qué es Pocket Recon, y qué no es",
        list: [
          "Una herramienta para planear tu dinero con los números que tú escribes. Los resultados son tan exactos como esos números.",
          "No es un banco, prestamista ni servicio de envío de dinero. No guardamos, movemos ni invertimos tu dinero.",
          "Información general y educación, no asesoría financiera, de impuestos, legal ni de inversiones. Para decisiones importantes, habla con un profesional.",
          "La calculadora de discapacidad del VA y el planificador del GI Bill dan estimados con las tablas publicadas del VA. Pocket Recon no está afiliado al Departamento de Asuntos de Veteranos de EE. UU. ni a ninguna agencia del gobierno; el VA decide tus beneficios.",
          "Los tipos de cambio, lo que apartas para impuestos y los pronósticos son estimados.",
        ],
        p: ["Tú eres responsable de tus decisiones con tu dinero."],
      },
      {
        h: "Clara, la copiloto con inteligencia artificial",
        p: [
          "Clara usa inteligencia artificial para explicar tus números. La app hace las cuentas, pero Clara igual puede equivocarse o no entenderte bien, así que revisa lo importante antes de actuar. Clara no es consejera ni un servicio de emergencias. Si estás en crisis, llama o manda un texto al 988 (veteranos: marca 988 y presiona 1), o llama al 911 en una emergencia.",
        ],
      },
      {
        h: "Tu cuenta",
        list: [
          "Usa un correo real al que tengas acceso, porque lo usamos para que entres y para contactarte.",
          "Cuida el acceso a tu correo; quien pueda abrirlo podría entrar a tu cuenta.",
          "Una cuenta por persona. Avísanos si crees que alguien más usó tu cuenta.",
        ],
      },
      {
        h: "Plus",
        list: [
          "Plus cuesta $4.99 al mes o $39.99 al año, más impuestos si aplican. Los precios se muestran antes de pagar.",
          "Los miembros nuevos pueden tener una prueba gratis de 7 días. Te mandamos un correo 2 días antes de que termine. Si no cancelas antes de que termine la prueba, tu plan empieza y se cobra.",
          "Plus se renueva solo cada mes o cada año hasta que canceles. Cancela cuando quieras en Ajustes; sigues con Plus hasta el final del periodo que pagaste y no se te vuelve a cobrar.",
          "No devolvemos dinero por partes de un periodo, salvo cuando la ley lo pide. Si algo salió mal con un cobro, escríbenos y lo arreglamos.",
          "Los pagos los procesa Whop con sus propios términos.",
          "Si cambiamos el precio, te avisamos por correo al menos 30 días antes, y el precio nuevo empieza en tu siguiente renovación.",
          "Lo básico de Pocket Recon sigue gratis.",
        ],
      },
      {
        h: "Usar la app de forma justa",
        p: ["Por favor no:"],
        list: [
          "Rompas la ley ni uses la app para hacerle daño a nadie.",
          "Intentes entrar a cuentas de otras personas o a nuestros sistemas, ni saltarte límites como el de preguntas a Clara.",
          "Copies, extraigas o revendas la app o su contenido, ni uses bots para sobrecargarla.",
          "Uses la app para mandar spam, incluso por WhatsApp.",
        ],
      },
      {
        h: "Tu información y nuestro contenido",
        p: [
          "Lo que escribes es tuyo. Nos das permiso de guardarlo y procesarlo solo para que la app funcione para ti, como explica nuestra política de privacidad.",
          "La app, su diseño, las lecciones, el diccionario, el quiz y el nombre son de Pocket Recon. Puedes usarlos para tu uso personal.",
        ],
      },
      {
        h: "Enlaces a otros sitios",
        p: ["Tenemos enlaces a sitios oficiales como VA.gov, la SBA y el IRS. No los controlamos y no somos responsables de su contenido."],
      },
      {
        h: "Cambios y disponibilidad",
        p: [
          "Somos un equipo pequeño y seguimos mejorando la app, así que algunas funciones pueden cambiar o quitarse. Hacemos lo posible para que funcione siempre, pero no podemos prometer que nunca falle.",
          "Podemos cambiar estos términos. Actualizaremos la fecha de arriba y te mandaremos un correo antes de cambios importantes. Si sigues usando la app después, aceptas los términos nuevos.",
        ],
      },
      {
        h: "Dejar de usar la app",
        p: [
          "Puedes dejar de usar la app y borrar tu cuenta cuando quieras en Ajustes. Podemos suspender o cerrar una cuenta que rompa estos términos, avisándote antes cuando sea razonable.",
        ],
      },
      {
        h: "Aclaraciones",
        p: [
          "La app se ofrece \"tal como está\". Hasta donde la ley lo permite, no prometemos que no tenga errores ni que sus estimados sean exactos, y no damos garantías implícitas.",
        ],
      },
      {
        h: "Límite de responsabilidad",
        p: [
          "Hasta donde la ley lo permite, Pocket Recon no es responsable de pérdidas indirectas, y nuestra responsabilidad total por cualquier reclamo se limita a lo que sea mayor entre lo que nos pagaste en los 12 meses antes del reclamo o $50. En algunos lugares la ley no permite estos límites, así que puede que no apliquen para ti.",
        ],
      },
      {
        h: "Ley y desacuerdos",
        p: [
          "Estos términos se rigen por las leyes del estado de Nueva Jersey y de Estados Unidos. Si hay un problema, escríbenos primero; casi todo se puede resolver rápido. Si no lo resolvemos, cualquiera de los dos puede presentar un reclamo en la corte de reclamos menores o en las cortes de Nueva Jersey.",
        ],
      },
      {
        h: "Contacto",
        p: [`Preguntas: ${CONTACT_EMAIL}.`],
      },
    ],
  },
};
