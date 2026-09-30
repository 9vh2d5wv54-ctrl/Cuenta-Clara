// Pocket Recon Academy: short bilingual lessons, public (no account needed).
// General information, not financial, tax or legal advice. Numbers in examples
// are hypothetical and rounded; rules that change (tax rates, VA amounts) are
// described, not quoted, except where they're long-standing (FICA rates, FLSA
// overtime, IRS estimated-tax dates).

export type Block = { p: string } | { list: string[] } | { example: string };

type LessonText = { title: string; summary: string; blocks: Block[]; tryLabel: string };

export type Lesson = { slug: string; minutes: number; tryHref: string; es: LessonText; en: LessonText };

export const LESSONS: Lesson[] = [
  {
    slug: "presupuesto",
    minutes: 2,
    tryHref: "/app",
    es: {
      title: "Tu presupuesto en 3 pasos",
      summary: "Saber lo que te queda empieza con restar lo que ya está comprometido.",
      blocks: [
        { p: "Un presupuesto no es una cárcel. Es decidir antes de gastar a dónde va tu dinero, para que no tengas que preguntarte a fin de mes a dónde se fue." },
        {
          list: [
            "Anota lo que entra en un mes normal, después de impuestos.",
            "Resta lo fijo: renta, luz, teléfono, carro, y lo que mandas a tu familia.",
            "Aparta algo para ahorrar, aunque sea poco. Lo que queda es lo que puedes gastar en el día a día.",
          ],
        },
        { example: "Ganas $3,000. Fijo: $1,600. Envíos: $300. Ahorro: $150. Te quedan $950 para comida, gasolina y todo lo demás, unos $31 al día." },
        { p: "Revisa ese número cada semana. Si un mes gastas de más, no te castigues: ajusta la semana siguiente." },
      ],
      tryLabel: "Mira lo que te queda en tu Inicio",
    },
    en: {
      title: "Your budget in 3 steps",
      summary: "Knowing what's left starts with taking out what's already spoken for.",
      blocks: [
        { p: "A budget isn't a cage. It's deciding where your money goes before you spend it, so you don't have to wonder where it went at the end of the month." },
        {
          list: [
            "Write down what comes in during a normal month, after taxes.",
            "Take out the fixed things: rent, power, phone, car, and what you send to family.",
            "Set a little aside for savings, even a small amount. What's left is what you can spend day to day.",
          ],
        },
        { example: "You earn $3,000. Fixed: $1,600. Sends: $300. Savings: $150. That leaves $950 for food, gas and everything else, about $31 a day." },
        { p: "Check that number every week. If you overspend one month, don't beat yourself up: adjust the next week." },
      ],
      tryLabel: "See what's left on your Home screen",
    },
  },
  {
    slug: "fondo-de-emergencia",
    minutes: 2,
    tryHref: "/app/metas",
    es: {
      title: "El fondo de emergencia",
      summary: "Un colchón para lo inesperado, para que una llanta ponchada no se vuelva una deuda.",
      blocks: [
        { p: "Un fondo de emergencia es dinero guardado solo para imprevistos: el carro, el dentista, una semana sin trabajo. No es para vacaciones ni para rebajas." },
        {
          list: [
            "Primera meta: $500 a $1,000. Cubre la mayoría de los sustos pequeños.",
            "Meta grande: de 3 a 6 meses de tus gastos fijos.",
            "Guárdalo aparte de tu cuenta del día a día, donde no lo veas todos los días.",
          ],
        },
        { example: "Si guardas $25 cada semana, en 10 meses tienes unos $1,000. Si usas parte, empiezas a llenarlo otra vez." },
      ],
      tryLabel: "Crea una meta de fondo de emergencia",
    },
    en: {
      title: "The emergency fund",
      summary: "A cushion for surprises, so a flat tire doesn't turn into debt.",
      blocks: [
        { p: "An emergency fund is money saved only for the unexpected: the car, the dentist, a week without work. It's not for vacations or sales." },
        {
          list: [
            "First goal: $500 to $1,000. It covers most small surprises.",
            "Big goal: 3 to 6 months of your fixed costs.",
            "Keep it apart from your everyday account, where you don't see it every day.",
          ],
        },
        { example: "Save $25 a week and in 10 months you have about $1,000. If you use some, start filling it again." },
      ],
      tryLabel: "Create an emergency fund goal",
    },
  },
  {
    slug: "apr",
    minutes: 2,
    tryHref: "/app/deudas",
    es: {
      title: "Qué es el APR (y cuánto te cuesta)",
      summary: "El APR es el precio de pedir prestado, contado por año.",
      blocks: [
        { p: "APR quiere decir tasa de porcentaje anual. En una tarjeta de crédito, es lo que te cobran por el saldo que no pagas completo. Cada mes te cobran más o menos el APR dividido entre 12." },
        { example: "Debes $1,000 en una tarjeta con 24% APR. Eso es cerca de 2% al mes: unos $20 de interés, aunque no compres nada nuevo." },
        {
          list: [
            "Si pagas el saldo completo del estado de cuenta cada mes, normalmente no pagas interés en tus compras.",
            "Pagar solo el mínimo hace que la deuda dure años y cueste mucho más.",
            "Las tarjetas de tienda y los préstamos rápidos suelen tener el APR más alto.",
          ],
        },
      ],
      tryLabel: "Mira cuánto interés pagas en tu plan de deudas",
    },
    en: {
      title: "What APR is (and what it costs you)",
      summary: "APR is the price of borrowing, counted per year.",
      blocks: [
        { p: "APR means annual percentage rate. On a credit card, it's what you're charged on the balance you don't pay in full. Each month you're charged about the APR divided by 12." },
        { example: "You owe $1,000 on a card with a 24% APR. That's about 2% a month: around $20 in interest, even if you buy nothing new." },
        {
          list: [
            "If you pay the full statement balance every month, you usually pay no interest on purchases.",
            "Paying only the minimum makes the debt last years and cost much more.",
            "Store cards and quick loans usually have the highest APR.",
          ],
        },
      ],
      tryLabel: "See how much interest you pay in your debt plan",
    },
  },
  {
    slug: "interes-compuesto",
    minutes: 2,
    tryHref: "/app/metas",
    es: {
      title: "El interés compuesto: tu amigo o tu enemigo",
      summary: "Interés que gana interés. En tu ahorro te ayuda; en tu deuda te hunde.",
      blocks: [
        { p: "Interés compuesto quiere decir que el interés se suma a lo que tienes y el mes siguiente también gana interés. Con el tiempo, crece cada vez más rápido." },
        { example: "Si guardas $100 al mes ganando 5% al año, en 10 años pusiste $12,000 y tienes unos $15,500. Los $3,500 extra son interés compuesto trabajando para ti." },
        { p: "Con una deuda pasa lo mismo al revés: el interés que no pagas se suma al saldo y te cobran interés sobre ese interés. Por eso conviene empezar a ahorrar temprano y pagar primero la deuda más cara." },
      ],
      tryLabel: "Crea una meta de ahorro",
    },
    en: {
      title: "Compound interest: friend or enemy",
      summary: "Interest that earns interest. On savings it helps you; on debt it sinks you.",
      blocks: [
        { p: "Compound interest means interest gets added to what you have, and next month it earns interest too. Over time, it grows faster and faster." },
        { example: "Save $100 a month earning 5% a year, and in 10 years you've put in $12,000 and have about $15,500. The extra $3,500 is compound interest working for you." },
        { p: "Debt works the same way in reverse: unpaid interest is added to the balance and you're charged interest on that interest. That's why it pays to start saving early and pay off the most expensive debt first." },
      ],
      tryLabel: "Create a savings goal",
    },
  },
  {
    slug: "credito",
    minutes: 3,
    tryHref: "/app/deudas",
    es: {
      title: "Tu puntaje de crédito, explicado",
      summary: "Qué lo sube, qué lo baja y cómo empezar si no tienes historial.",
      blocks: [
        { p: "Tu puntaje de crédito es un número que usan los bancos, los dueños de apartamentos y hasta algunos empleos para ver si pagas a tiempo. Los puntajes FICO van de 300 a 850." },
        {
          list: [
            "Pagar a tiempo es lo que más pesa. Un pago tarde de 30 días o más puede bajarlo por años.",
            "Cuánto usas de tu límite: trata de usar menos del 30% (y menos es mejor).",
            "Qué tan viejo es tu historial, cuántas solicitudes nuevas haces y qué tipos de crédito tienes también cuentan.",
          ],
        },
        { p: "Puedes ver tus reportes de crédito gratis en AnnualCreditReport.com, el sitio oficial. Revisa que no haya errores." },
        { p: "Si no tienes historial, una tarjeta asegurada (pones un depósito) o una cuenta que reporte tus pagos puede ayudarte a empezar. Algunos bancos aceptan ITIN." },
      ],
      tryLabel: "Organiza tus deudas",
    },
    en: {
      title: "Your credit score, explained",
      summary: "What raises it, what lowers it, and how to start with no history.",
      blocks: [
        { p: "Your credit score is a number banks, landlords and even some employers use to see if you pay on time. FICO scores run from 300 to 850." },
        {
          list: [
            "Paying on time matters most. A payment 30 or more days late can lower it for years.",
            "How much of your limit you use: try to stay under 30% (lower is better).",
            "How old your history is, how many new applications you make, and the kinds of credit you have also count.",
          ],
        },
        { p: "You can see your credit reports free at AnnualCreditReport.com, the official site. Check them for mistakes." },
        { p: "With no history, a secured card (you put down a deposit) or an account that reports your payments can help you start. Some banks accept an ITIN." },
      ],
      tryLabel: "Organize your debts",
    },
  },
  {
    slug: "enviar-dinero",
    minutes: 2,
    tryHref: "/app/envios",
    es: {
      title: "Cómo mandar dinero a casa pagando menos",
      summary: "El costo real no es solo la comisión: también es el tipo de cambio.",
      blocks: [
        { p: "Cuando mandas dinero, pagas de dos formas: la comisión que te cobran y la diferencia entre el tipo de cambio que te dan y el tipo de cambio real del mercado." },
        { example: "Mandas $200. Servicio A cobra $0 de comisión pero da 17.20 pesos por dólar. Servicio B cobra $3 pero da 17.60. Con A llegan 3,440 pesos; con B, 3,467. El que dice \"sin comisión\" sale más caro." },
        {
          list: [
            "Compara cuánto recibe tu familia al final, no solo la comisión.",
            "Mandar una vez al mes en vez de cada semana puede ahorrarte comisiones.",
            "Si el tipo de cambio mejora, conviene mandar ese día.",
          ],
        },
      ],
      tryLabel: "Revisa tus envíos",
    },
    en: {
      title: "How to send money home for less",
      summary: "The real cost isn't just the fee: it's also the exchange rate.",
      blocks: [
        { p: "When you send money, you pay two ways: the fee they charge, and the gap between the exchange rate they give you and the real market rate." },
        { example: "You send $200. Service A charges $0 but gives 17.20 pesos per dollar. Service B charges $3 but gives 17.60. With A, 3,440 pesos arrive; with B, 3,467. The \"no fee\" one costs more." },
        {
          list: [
            "Compare how much your family receives in the end, not just the fee.",
            "Sending once a month instead of every week can save fees.",
            "When the exchange rate improves, that's a good day to send.",
          ],
        },
      ],
      tryLabel: "Check your sends",
    },
  },
  {
    slug: "impuestos-1099",
    minutes: 3,
    tryHref: "/app/ajustes",
    es: {
      title: "Impuestos si te pagan 1099 o en efectivo",
      summary: "Si nadie te descuenta impuestos, te toca apartarlos a ti.",
      blocks: [
        { p: "Si trabajas por tu cuenta (1099, efectivo, apps de entregas), nadie te descuenta impuestos del pago. Además del impuesto sobre la renta, pagas impuesto de trabajo por cuenta propia para el Seguro Social y Medicare: 15.3% sobre la mayor parte de tu ganancia." },
        {
          list: [
            "El IRS espera pagos estimados cuatro veces al año: 15 de abril, 15 de junio, 15 de septiembre y 15 de enero.",
            "Muchas personas apartan entre 25% y 30% de lo que cobran. Tu número puede ser distinto.",
            "Guarda recibos de gastos del trabajo (herramientas, millas, teléfono): pueden bajar lo que debes.",
          ],
        },
        { p: "Esto es información general, no asesoría de impuestos. Un preparador de impuestos te puede decir cuánto te toca. Hay ayuda gratis del programa VITA del IRS si ganas por debajo de cierto límite." },
      ],
      tryLabel: "Activa apartar para impuestos en Ajustes",
    },
    en: {
      title: "Taxes when you're paid 1099 or cash",
      summary: "If no one takes taxes out, setting them aside is up to you.",
      blocks: [
        { p: "If you work for yourself (1099, cash, delivery apps), no one takes taxes out of your pay. On top of income tax, you pay self-employment tax for Social Security and Medicare: 15.3% on most of your profit." },
        {
          list: [
            "The IRS expects estimated payments four times a year: April 15, June 15, September 15 and January 15.",
            "Many people set aside 25% to 30% of what they're paid. Your number may be different.",
            "Keep receipts for work costs (tools, mileage, phone): they can lower what you owe.",
          ],
        },
        { p: "This is general information, not tax advice. A tax preparer can tell you what you owe. The IRS VITA program offers free help if you earn under a certain limit." },
      ],
      tryLabel: "Turn on tax set-aside in Settings",
    },
  },
  {
    slug: "bola-de-nieve-avalancha",
    minutes: 2,
    tryHref: "/app/deudas",
    es: {
      title: "Bola de nieve o avalancha: cómo salir de deudas",
      summary: "Dos formas de ordenar tus deudas. Las dos funcionan si no te rindes.",
      blocks: [
        { p: "Las dos empiezan igual: pagas el mínimo en todas, pones lo que puedas de más en una sola, y cuando la terminas, pasas ese pago a la siguiente." },
        {
          list: [
            "Avalancha: primero la de interés más alto. Normalmente pagas menos interés en total.",
            "Bola de nieve: primero la de saldo más chico. Terminas una rápido y eso da ánimo para seguir.",
          ],
        },
        { example: "Tienes una tarjeta de tienda de $800 al 30% y una Visa de $3,000 al 25%. Con las dos formas, la tarjeta de tienda va primero: es la más chica y la más cara." },
        { p: "La mejor es la que vas a seguir. Unos dólares extra cada mes cambian mucho la fecha en que terminas." },
      ],
      tryLabel: "Compara las dos en tu plan de deudas",
    },
    en: {
      title: "Snowball or avalanche: getting out of debt",
      summary: "Two ways to order your debts. Both work if you stick with it.",
      blocks: [
        { p: "Both start the same: pay the minimum on everything, put whatever extra you can on one debt, and when it's paid off, roll that payment into the next." },
        {
          list: [
            "Avalanche: highest interest first. Usually the least interest overall.",
            "Snowball: smallest balance first. You finish one fast, and that keeps you going.",
          ],
        },
        { example: "You have an $800 store card at 30% and a $3,000 Visa at 25%. Either way, the store card goes first: it's both the smallest and the most expensive." },
        { p: "The best one is the one you'll stick with. A few extra dollars a month changes your payoff date a lot." },
      ],
      tryLabel: "Compare both in your debt plan",
    },
  },
  {
    slug: "talon-de-pago",
    minutes: 3,
    tryHref: "/app/pago",
    es: {
      title: "Cómo leer tu talón de pago",
      summary: "Bruto, neto, descuentos y horas extra, línea por línea.",
      blocks: [
        {
          list: [
            "Pago bruto: todo lo que ganaste antes de descuentos (horas × tarifa, más horas extra).",
            "Impuesto federal y estatal: lo que se descuenta para tus impuestos sobre la renta.",
            "FICA: Seguro Social (6.2%) y Medicare (1.45%).",
            "Otros descuentos: seguro médico, retiro 401(k) y similares.",
            "Pago neto: lo que llega a tu cuenta.",
            "YTD: lo acumulado en el año hasta ahora.",
          ],
        },
        { p: "La regla federal de horas extra: si ganas por hora, las horas después de 40 en una semana se pagan a tiempo y medio. Algunos estados pagan más." },
        { example: "Tarifa $18. Trabajaste 46 horas: 40 × $18 = $720, más 6 × $27 = $162. Tu pago bruto debería ser $882." },
      ],
      tryLabel: "Revisa tu pago",
    },
    en: {
      title: "How to read your pay stub",
      summary: "Gross, net, deductions and overtime, line by line.",
      blocks: [
        {
          list: [
            "Gross pay: everything you earned before deductions (hours × rate, plus overtime).",
            "Federal and state tax: what's held back for your income taxes.",
            "FICA: Social Security (6.2%) and Medicare (1.45%).",
            "Other deductions: health insurance, 401(k) retirement and similar.",
            "Net pay: what lands in your account.",
            "YTD: the total for the year so far.",
          ],
        },
        { p: "The federal overtime rule: if you're paid by the hour, hours over 40 in a week are paid at time and a half. Some states pay more." },
        { example: "Rate $18. You worked 46 hours: 40 × $18 = $720, plus 6 × $27 = $162. Your gross pay should be $882." },
      ],
      tryLabel: "Check your pay",
    },
  },
  {
    slug: "beneficios-va",
    minutes: 3,
    tryHref: "/app/veteranos",
    es: {
      title: "Beneficios del VA: lo básico para veteranos",
      summary: "Cómo funciona la compensación por discapacidad y dónde pedir ayuda gratis.",
      blocks: [
        { p: "La compensación por discapacidad del VA es un pago mensual, libre de impuestos, para veteranos con condiciones causadas o empeoradas por el servicio." },
        {
          list: [
            "El VA no suma tus calificaciones: las combina. Un 50% y un 30% dan 65%, que se redondea a 70%.",
            "Desde 30%, el VA paga más si tienes cónyuge, hijos o padres que dependen de ti.",
            "Las tarifas suben cada 1 de diciembre.",
            "Un representante acreditado (VSO) te ayuda a presentar tu reclamo gratis.",
          ],
        },
        { p: "Si estás pasando por un momento difícil, llama a la Línea de Crisis para Veteranos: marca 988 y oprime 1. Es gratis, confidencial y 24/7." },
      ],
      tryLabel: "Calcula tu calificación combinada",
    },
    en: {
      title: "VA benefits: the basics for veterans",
      summary: "How disability compensation works and where to get free help.",
      blocks: [
        { p: "VA disability compensation is a tax-free monthly payment for veterans with conditions caused or made worse by their service." },
        {
          list: [
            "VA doesn't add your ratings: it combines them. A 50% and a 30% make 65%, which rounds to 70%.",
            "At 30% and up, VA pays more if you have a spouse, children or parents who depend on you.",
            "Rates go up every December 1.",
            "An accredited representative (VSO) helps you file your claim for free.",
          ],
        },
        { p: "If you're going through a hard time, call the Veterans Crisis Line: dial 988 and press 1. It's free, confidential and 24/7." },
      ],
      tryLabel: "Figure out your combined rating",
    },
  },
];

export function lessonBySlug(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}
