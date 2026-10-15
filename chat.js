/* Panefresco – inställningar för Smartsvar-chatten (kräver widget.js v4.1 eller senare).
   Looken kommer från Panefrescos meny: koboltblått, krämvitt menypapper, citronglöd,
   Cinzel i rubrikerna och citat i kursiv Cormorant Garamond i orange.
   Medan chatten tänker gräddas en napolitansk pizza i ugnen (thinking: 'oven'). */
(function () {
  // Citattypsnittet i rubriken under "Benvenuti!" laddas i sidan, eftersom typsnitt inte kan laddas inne i chattens slutna ruta.
  if (document.querySelector('link[data-pf-font]')) return;
  var f = document.createElement('link');
  f.rel = 'stylesheet';
  f.setAttribute('data-pf-font', '1');
  f.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500;1,600&display=swap';
  document.head.appendChild(f);
})();

window.SMARTSVAR = {
  name: 'Panefresco',
  voiceflow: { projectID: '6ac5f9e6c5932bcb42d6fa30', versionID: 'production' },
  language: 'sv',
  phone: '076-593 83 31',

  colors: { primary: '#2747A0', accent: '#2747A0' },
  fonts: { display: 'Cinzel', body: 'Montserrat', weight: 700 },
  shape: 'soft',

  // Symbolen i headern och popupen: en liten napolitansk pizza.
  symbol: 'icon',
  iconSvg: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#E3A85E"/><circle cx="16" cy="16" r="14" fill="none" stroke="#B5743A" stroke-width="1"/>' +
    '<circle cx="9" cy="8.6" r="1.4" fill="#5A2A10"/><circle cx="26.4" cy="13" r="1.2" fill="#5A2A10"/><circle cx="12" cy="27.6" r="1.3" fill="#5A2A10"/><circle cx="25" cy="23.8" r="1" fill="#5A2A10"/>' +
    '<circle cx="16" cy="16" r="10.8" fill="#C4381F"/>' +
    '<circle cx="11.8" cy="13" r="3.1" fill="#FFF7E4"/><circle cx="20.6" cy="13.6" r="2.7" fill="#FFF7E4"/><circle cx="15.4" cy="20.4" r="3" fill="#FFF7E4"/><circle cx="21.6" cy="20.6" r="2" fill="#FFF7E4"/>' +
    '<path d="M16.4 10.6c2.2-2.9 6-2.8 7.3 0-1.3 2.8-5.1 2.9-7.3 0z" fill="#2F8B3B"/><path d="M8.6 18.6c1.4-3.3 5.1-3.9 6.8-1.6-1.9 2.4-5.4 2.6-6.8 1.6z" fill="#2F8B3B"/></svg>',

  headline: 'Benvenuti!',
  tagline: '»Pasta först. Viktiga beslut sen.«',
  opening: 'Jag är Panefrescos AI-assistent. Fråga mig om menyn, öppettider, bordsbokning eller allergier. I answer in English too.',
  // Öppningen ovan visas alltid. Voiceflows egen öppning (som AI-agenten skriver ny varje gång) visas aldrig.
  vfOpening: false,

  // Knappar som visas under ett svar när svaret nämner frasen. Agenten skriver bara orden, aldrig adressen,
  // så att rösten inte läser upp länken.
  actions: [
    { label: 'Book a table', url: 'https://widget.thefork.com/en/187d6cbd-f941-4c0f-b100-8563b1ef905a?step=date&utm_source=panefresco.se',
      when: ['book a table', 'reserve a table', 'tisch reservieren', 'prenota un tavolo', 'prenotare un tavolo', 'reservar una mesa', 'réserver une table'] },
    { label: 'Boka bord', url: 'https://widget.thefork.com/sv/187d6cbd-f941-4c0f-b100-8563b1ef905a?utm_source=panefresco.se',
      when: ['boka bord', 'bokar bord', 'boka ett bord', 'bordsbokning'] }
  ],
  suggestions: ['Boka bord', 'Vad finns på lunch?', 'Har ni glutenfritt?'],
  placeholder: 'Skriv er fråga…',
  launcherText: 'Fråga oss',
  launcherSub: 'AI-assistent · skriv eller prata',
  launcherMark: true,

  // EU:s AI-förordning: besökaren ska veta att hen pratar med en AI. Står under namnet och i foten.
  status: 'AI-assistent · svarar direkt',
  aiNotice: 'Ni chattar med en AI, som kan ha fel.',

  // Röstinmatning: en stor Prata-knapp i skrivfältet och ett tips i starten.
  voice: true,
  teaser: 'Benvenuti! Undrar ni något om menyn, eller vill ni boka bord?',
  texts: { ai: 'AI-assistent', input: 'Skriv er fråga' },

  thinking: 'oven',

  // Detaljerna från menyn: krämvitt papper, citronglöd och citat i kursiv orange.
  css: [
    '.w{--base:#FBF6EA!important;--glow1:#F9DF8C!important;--glow1-0:rgba(249,223,140,0)!important;--glow2:#D9E4F9!important;--glow2-0:rgba(217,228,249,0)!important;',
    '--paper2:#F1E9D8!important;--line:#E5DAC4!important;--muted:#6E6A62!important}',
    // Lite bredare panel på datorn och en större, mjukare toning överst
    '.w[data-m=desktop] .panel{width:min(440px,calc(var(--vw) - 32px))}',
    '.panel::before{height:560px;opacity:max(var(--glow,1),.6)}',
    // Lite större text
    '.tx,.op{font-size:16px}',
    '.me{font-size:16px}',
    'textarea{font-size:16px}',
    '.chips button{font-size:14.5px}',
    '.name{letter-spacing:.07em;color:#2747A0}',
    '.hl{color:#2747A0;letter-spacing:.03em}',
    '.tg{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:600;font-size:20px;line-height:1.25;color:#E0782F;max-width:290px}',
    '.chips button{background:#fff;color:#2747A0;box-shadow:inset 0 0 0 1px rgba(39,71,160,.3)}',
    '.chips button:hover{background:#EEF2FB}',
    '.card .cbtn{background:#fff;box-shadow:inset 0 0 0 1px rgba(39,71,160,.3)}',
    '.teaser{background:#FBF6EA}',
    // Chattknappen: pizzan på ett krämvitt fat i den blå knappen, med en tunn citronring
    '.launch{height:60px;padding:0 24px 0 11px;gap:12px}',
    '.launch .av{width:42px!important;height:42px!important;margin-left:0!important;background:#FBF6EA!important;box-shadow:0 0 0 2px #F4C430,0 2px 6px rgba(0,0,0,.18)!important}',
    '.launch .lt1{font-family:"Cinzel",Georgia,serif;font-weight:700;font-size:16px;letter-spacing:.04em}',
    '.w[data-m=mobile] .launch{width:64px;height:64px;padding:0}',
    '.w[data-m=mobile] .launch .av{width:50px!important;height:50px!important}',
    '.foot{font-size:11.5px}',
    '.teaser .chips button{background:#fff}',
    '.shim{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:17px;font-weight:600}'
  ].join('')
};
