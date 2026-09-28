// Money words dictionary (free, public): plain-language definitions in English
// and Spanish, each with a short example and, where it fits, a lesson or tool.
// General information, not financial, tax or legal advice. Examples use round,
// hypothetical numbers; rules that change every year are described, not quoted.

type WordText = { term: string; def: string; example?: string };

export type Word = { id: string; href?: string; en: WordText; es: WordText };

export const WORDS: Word[] = [
  {
    id: "apr",
    href: "/aprende/apr",
    en: {
      term: "APR (annual percentage rate)",
      def: "The yearly cost of borrowing money, shown as a percentage. It includes interest and some fees, so it's the best number to compare loans and cards.",
      example: "A $1,000 card balance at 24% APR costs about $20 a month in interest (24% ÷ 12 = 2%).",
    },
    es: {
      term: "APR (tasa de porcentaje anual)",
      def: "Lo que cuesta pedir dinero prestado en un año, como porcentaje. Incluye el interés y algunos cargos, por eso es el mejor número para comparar préstamos y tarjetas.",
      example: "Un saldo de $1,000 en una tarjeta con 24% de APR cuesta unos $20 al mes en intereses (24% ÷ 12 = 2%).",
    },
  },
  {
    id: "interest",
    en: {
      term: "Interest",
      def: "The price of using someone else's money. You pay it when you borrow; you earn it when you save in an account that pays interest.",
    },
    es: {
      term: "Interés",
      def: "El precio de usar dinero ajeno. Lo pagas cuando pides prestado y lo ganas cuando ahorras en una cuenta que paga interés.",
    },
  },
  {
    id: "compound-interest",
    href: "/aprende/interes-compuesto",
    en: {
      term: "Compound interest",
      def: "Interest that also earns interest. Over years, your money grows faster and faster. It works against you the same way on debt.",
      example: "$100 at 10% a year becomes $110, then $121, then $133.10: each year's interest is bigger.",
    },
    es: {
      term: "Interés compuesto",
      def: "Interés que también gana interés. Con los años, tu dinero crece cada vez más rápido. Con las deudas funciona igual, pero en tu contra.",
      example: "$100 al 10% al año se vuelven $110, luego $121, luego $133.10: cada año el interés es mayor.",
    },
  },
  {
    id: "principal",
    en: {
      term: "Principal",
      def: "The amount you borrowed, not counting interest. Paying extra toward principal lowers your debt faster and cuts the interest you'll pay.",
    },
    es: {
      term: "Capital (principal)",
      def: "La cantidad que pediste prestada, sin contar el interés. Pagar de más al capital baja tu deuda más rápido y reduce el interés que pagarás.",
    },
  },
  {
    id: "minimum-payment",
    href: "/app/deudas",
    en: {
      term: "Minimum payment",
      def: "The smallest amount you must pay on a card or loan each month to stay in good standing. Paying only the minimum keeps you in debt much longer.",
    },
    es: {
      term: "Pago mínimo",
      def: "Lo menos que debes pagar cada mes en una tarjeta o préstamo para estar al día. Pagar solo el mínimo te mantiene endeudado mucho más tiempo.",
    },
  },
  {
    id: "snowball-avalanche",
    href: "/aprende/bola-de-nieve-avalancha",
    en: {
      term: "Debt snowball and avalanche",
      def: "Two ways to pay off debts. Snowball: pay the smallest balance first for quick wins. Avalanche: pay the highest APR first to save the most interest.",
    },
    es: {
      term: "Bola de nieve y avalancha",
      def: "Dos formas de pagar deudas. Bola de nieve: primero el saldo más pequeño, para ganar ánimo rápido. Avalancha: primero el APR más alto, para ahorrar más en intereses.",
    },
  },
  {
    id: "credit-score",
    href: "/aprende/credito",
    en: {
      term: "Credit score",
      def: "A number, usually from 300 to 850, that tells lenders how likely you are to pay back. Paying on time is the biggest part of it.",
    },
    es: {
      term: "Puntaje de crédito",
      def: "Un número, normalmente de 300 a 850, que les dice a los prestamistas qué tan probable es que pagues. Pagar a tiempo es la parte más grande.",
    },
  },
  {
    id: "credit-report",
    href: "/aprende/credito",
    en: {
      term: "Credit report",
      def: "The record of your loans, cards and payments that your score is built from. You can check yours for free at AnnualCreditReport.com.",
    },
    es: {
      term: "Reporte de crédito",
      def: "El historial de tus préstamos, tarjetas y pagos con el que se calcula tu puntaje. Puedes revisarlo gratis en AnnualCreditReport.com.",
    },
  },
  {
    id: "credit-utilization",
    href: "/aprende/credito",
    en: {
      term: "Credit utilization",
      def: "How much of your card limits you're using. Lower is better for your score; a common guide is to stay under 30%.",
      example: "A $300 balance on a $1,000 limit is 30% utilization.",
    },
    es: {
      term: "Uso del crédito",
      def: "Cuánto usas del límite de tus tarjetas. Mientras más bajo, mejor para tu puntaje; una guía común es quedarte por debajo del 30%.",
      example: "Un saldo de $300 en un límite de $1,000 es 30% de uso.",
    },
  },
  {
    id: "collections",
    en: {
      term: "Collections",
      def: "When an unpaid bill is sent to a company that tries to collect it. It can hurt your credit for up to 7 years, so call early if you can't pay.",
    },
    es: {
      term: "Cobranza (colecciones)",
      def: "Cuando una cuenta sin pagar pasa a una compañía que intenta cobrarla. Puede afectar tu crédito hasta por 7 años, así que llama temprano si no puedes pagar.",
    },
  },
  {
    id: "balance",
    en: {
      term: "Balance",
      def: "How much money is in an account, or how much you still owe on a card or loan.",
    },
    es: {
      term: "Saldo",
      def: "Cuánto dinero hay en una cuenta, o cuánto todavía debes en una tarjeta o préstamo.",
    },
  },
  {
    id: "overdraft",
    en: {
      term: "Overdraft",
      def: "When you spend more than what's in your bank account. Many banks charge a fee each time, so it's worth turning overdraft off or getting alerts.",
    },
    es: {
      term: "Sobregiro",
      def: "Cuando gastas más de lo que hay en tu cuenta del banco. Muchos bancos cobran un cargo cada vez, así que conviene apagar el sobregiro o activar alertas.",
    },
  },
  {
    id: "budget",
    href: "/aprende/presupuesto",
    en: {
      term: "Budget",
      def: "A plan for your money: what comes in, what goes out, and what's left. It's not about cutting everything, it's about deciding first.",
    },
    es: {
      term: "Presupuesto",
      def: "Un plan para tu dinero: lo que entra, lo que sale y lo que queda. No se trata de recortar todo, sino de decidir primero.",
    },
  },
  {
    id: "emergency-fund",
    href: "/aprende/fondo-de-emergencia",
    en: {
      term: "Emergency fund",
      def: "Money saved only for surprises, like a car repair or losing work. A common goal is 3 months of bills.",
    },
    es: {
      term: "Fondo de emergencia",
      def: "Dinero guardado solo para sorpresas, como arreglar el carro o quedarte sin trabajo. Una meta común es 3 meses de gastos.",
    },
  },
  {
    id: "net-worth",
    en: {
      term: "Net worth",
      def: "Everything you own minus everything you owe. It can be negative when you're starting out, and that's okay: what matters is that it goes up.",
      example: "$5,000 saved + a $10,000 car − $12,000 in loans = $3,000 net worth.",
    },
    es: {
      term: "Patrimonio neto",
      def: "Todo lo que tienes menos todo lo que debes. Puede ser negativo al empezar, y está bien: lo importante es que suba.",
      example: "$5,000 ahorrados + un carro de $10,000 − $12,000 en préstamos = $3,000 de patrimonio.",
    },
  },
  {
    id: "gross-pay",
    href: "/aprende/talon-de-pago",
    en: {
      term: "Gross pay",
      def: "Your pay before taxes and deductions. It's the number in a job offer, not what lands in your bank.",
    },
    es: {
      term: "Salario bruto",
      def: "Tu pago antes de impuestos y descuentos. Es el número de la oferta de trabajo, no lo que llega a tu banco.",
    },
  },
  {
    id: "net-pay",
    href: "/aprende/talon-de-pago",
    en: {
      term: "Net pay (take-home pay)",
      def: "What you actually get after taxes and deductions. Budget with this number.",
    },
    es: {
      term: "Salario neto",
      def: "Lo que de verdad recibes después de impuestos y descuentos. Haz tu presupuesto con este número.",
    },
  },
  {
    id: "withholding",
    href: "/aprende/talon-de-pago",
    en: {
      term: "Withholding",
      def: "Taxes your employer takes out of each paycheck and sends to the government for you. Your W-4 form sets how much.",
    },
    es: {
      term: "Retención de impuestos",
      def: "Los impuestos que tu empleador saca de cada cheque y envía al gobierno por ti. Tu formulario W-4 decide cuánto.",
    },
  },
  {
    id: "w-2",
    href: "/aprende/impuestos-1099",
    en: {
      term: "W-2",
      def: "The tax form you get from an employer each year. It shows what you earned and the taxes already taken out.",
    },
    es: {
      term: "W-2",
      def: "El formulario de impuestos que te da tu empleador cada año. Muestra lo que ganaste y los impuestos que ya te quitaron.",
    },
  },
  {
    id: "1099",
    href: "/aprende/impuestos-1099",
    en: {
      term: "1099",
      def: "The tax form for independent work, like gig apps or contract jobs. No taxes are taken out, so you have to set money aside yourself.",
    },
    es: {
      term: "1099",
      def: "El formulario de impuestos para trabajo independiente, como apps de entregas o contratos. No te quitan impuestos, así que tienes que apartar dinero tú mismo.",
    },
  },
  {
    id: "estimated-taxes",
    href: "/aprende/impuestos-1099",
    en: {
      term: "Estimated taxes",
      def: "Tax payments self-employed people send the IRS during the year, usually in April, June, September and January.",
    },
    es: {
      term: "Impuestos estimados",
      def: "Pagos de impuestos que los trabajadores independientes envían al IRS durante el año, normalmente en abril, junio, septiembre y enero.",
    },
  },
  {
    id: "tax-refund",
    en: {
      term: "Tax refund",
      def: "Money the government gives back when more tax was taken out than you owed. It's your own money coming back, not a bonus.",
    },
    es: {
      term: "Reembolso de impuestos",
      def: "Dinero que el gobierno te devuelve cuando te quitaron más impuestos de lo que debías. Es tu propio dinero que regresa, no un bono.",
    },
  },
  {
    id: "premium",
    en: {
      term: "Premium",
      def: "What you pay to keep an insurance policy, usually every month.",
    },
    es: {
      term: "Prima",
      def: "Lo que pagas para mantener un seguro, normalmente cada mes.",
    },
  },
  {
    id: "deductible",
    en: {
      term: "Deductible",
      def: "What you pay yourself before insurance starts paying. A higher deductible usually means a lower premium.",
      example: "With a $500 deductible and a $2,000 repair, you pay $500 and insurance pays $1,500.",
    },
    es: {
      term: "Deducible",
      def: "Lo que pagas tú antes de que el seguro empiece a pagar. Un deducible más alto normalmente significa una prima más baja.",
      example: "Con un deducible de $500 y un arreglo de $2,000, tú pagas $500 y el seguro $1,500.",
    },
  },
  {
    id: "copay",
    en: {
      term: "Copay",
      def: "A set amount you pay for a doctor visit or prescription; your health insurance pays the rest.",
    },
    es: {
      term: "Copago",
      def: "Una cantidad fija que pagas por una cita médica o una receta; tu seguro de salud paga el resto.",
    },
  },
  {
    id: "mortgage",
    href: "/app/metas/plan/home",
    en: {
      term: "Mortgage",
      def: "A loan to buy a home. The home is the guarantee: if payments stop, the lender can take it.",
    },
    es: {
      term: "Hipoteca",
      def: "Un préstamo para comprar casa. La casa es la garantía: si dejas de pagar, el prestamista puede quedársela.",
    },
  },
  {
    id: "down-payment",
    href: "/app/metas/plan/home",
    en: {
      term: "Down payment",
      def: "The part of a home or car price you pay up front. Many VA loans need none; FHA loans can need as little as 3.5%.",
    },
    es: {
      term: "Pago inicial (enganche)",
      def: "La parte del precio de una casa o carro que pagas al principio. Muchos préstamos del VA no piden nada; los FHA pueden pedir desde 3.5%.",
    },
  },
  {
    id: "closing-costs",
    href: "/app/metas/plan/home",
    en: {
      term: "Closing costs",
      def: "Fees to finish buying a home, like the appraisal and title. They're often about 2% to 5% of the price, on top of the down payment.",
    },
    es: {
      term: "Costos de cierre",
      def: "Cargos para terminar la compra de una casa, como el avalúo y el título. Suelen ser de 2% a 5% del precio, además del pago inicial.",
    },
  },
  {
    id: "escrow",
    en: {
      term: "Escrow",
      def: "An account your mortgage lender uses to pay your property taxes and home insurance. Part of each monthly payment goes into it.",
    },
    es: {
      term: "Escrow (cuenta de depósito)",
      def: "Una cuenta que usa tu prestamista para pagar tus impuestos de propiedad y el seguro de la casa. Parte de cada pago mensual va ahí.",
    },
  },
  {
    id: "high-yield-savings",
    en: {
      term: "High-yield savings account",
      def: "A savings account that pays much more interest than a regular one, often at online banks. Look for FDIC insurance, which usually covers up to $250,000.",
    },
    es: {
      term: "Cuenta de ahorro de alto rendimiento",
      def: "Una cuenta de ahorro que paga mucho más interés que una normal, muchas veces en bancos en línea. Busca que tenga seguro FDIC, que normalmente cubre hasta $250,000.",
    },
  },
  {
    id: "401k",
    href: "/aprende/interes-compuesto",
    en: {
      term: "401(k)",
      def: "A retirement account through your job. Money goes in from your paycheck, often before taxes. If your employer matches, that's free money: try to get all of it.",
    },
    es: {
      term: "401(k)",
      def: "Una cuenta de retiro a través de tu trabajo. El dinero sale de tu cheque, muchas veces antes de impuestos. Si tu empleador pone una parte igual (match), es dinero gratis: trata de recibirlo completo.",
    },
  },
  {
    id: "ira",
    href: "/aprende/interes-compuesto",
    en: {
      term: "IRA and Roth IRA",
      def: "Retirement accounts you open on your own. Traditional IRA: you may pay less tax now. Roth IRA: you pay tax now, and qualified withdrawals in retirement are tax-free.",
    },
    es: {
      term: "IRA y Roth IRA",
      def: "Cuentas de retiro que abres por tu cuenta. IRA tradicional: puedes pagar menos impuestos ahora. Roth IRA: pagas impuestos ahora, y los retiros que califican en la jubilación son libres de impuestos.",
    },
  },
  {
    id: "tsp",
    en: {
      term: "TSP (Thrift Savings Plan)",
      def: "The retirement savings plan for federal employees and service members, much like a 401(k). Your account stays yours after you leave the service.",
    },
    es: {
      term: "TSP (Thrift Savings Plan)",
      def: "El plan de ahorro para el retiro de empleados federales y miembros del servicio, parecido a un 401(k). Tu cuenta sigue siendo tuya al salir del servicio.",
    },
  },
  {
    id: "les",
    en: {
      term: "LES (Leave and Earnings Statement)",
      def: "The military pay stub. It shows your pay, allowances like BAH, deductions and leave balance each month.",
    },
    es: {
      term: "LES (Leave and Earnings Statement)",
      def: "El talón de pago militar. Muestra cada mes tu pago, asignaciones como el BAH, descuentos y días de licencia.",
    },
  },
  {
    id: "bah",
    href: "/app/veteranos/gi-bill",
    en: {
      term: "BAH (Basic Allowance for Housing)",
      def: "Military money for housing, based on location, rank and dependents. The GI Bill's monthly housing uses the E-5 with-dependents rate for the school's ZIP code.",
    },
    es: {
      term: "BAH (asignación para vivienda)",
      def: "Dinero militar para vivienda, según el lugar, el rango y los dependientes. La vivienda mensual del GI Bill usa la tarifa E-5 con dependientes del código postal de la escuela.",
    },
  },
  {
    id: "exchange-rate",
    href: "/aprende/enviar-dinero",
    en: {
      term: "Exchange rate",
      def: "How much of another currency one dollar buys. Services often give a worse rate than the real one and keep the difference, a hidden fee.",
      example: "If the real rate is 60 and a service gives you 58, you lose 2 for every dollar sent.",
    },
    es: {
      term: "Tipo de cambio",
      def: "Cuánto de otra moneda compra un dólar. Muchos servicios dan una tasa peor que la real y se quedan con la diferencia: un cargo escondido.",
      example: "Si la tasa real es 60 y el servicio te da 58, pierdes 2 por cada dólar que envías.",
    },
  },
  {
    id: "remittance",
    href: "/aprende/enviar-dinero",
    en: {
      term: "Remittance",
      def: "Money sent to family or friends in another country. The total cost is the fee plus the exchange rate difference, so compare both.",
    },
    es: {
      term: "Remesa",
      def: "Dinero que envías a familia o amigos en otro país. El costo total es la comisión más la diferencia en el tipo de cambio, así que compara las dos.",
    },
  },
];

export function sortedWords(locale: "en" | "es"): Word[] {
  return [...WORDS].sort((a, b) => a[locale].term.localeCompare(b[locale].term, locale));
}
