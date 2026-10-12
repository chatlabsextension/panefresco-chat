/* Panefresco – inställningar för Smartsvar-chatten (kräver widget.js v4.1 eller senare).
   Looken kommer från Panefrescos meny: koboltblå majolikaram, krämvitt menypapper, citronglöd,
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
  opening: 'Fråga mig om menyn, öppettider, bordsbokning eller allergier. I answer in English too.',
  suggestions: ['Boka bord', 'Vad finns på lunch?', 'Har ni glutenfritt?'],
  placeholder: 'Skriv er fråga…',
  launcherText: 'Fråga oss',
  teaser: 'Benvenuti! Undrar ni något om menyn, eller vill ni boka bord?',
  texts: { ai: 'Digital assistent', input: 'Skriv er fråga' },

  thinking: 'oven',

  // Detaljerna från menyn: krämvitt papper, citronglöd, blå dubbelram och citat i kursiv orange.
  css: [
    '.w{--base:#FBF6EA!important;--glow1:#FBEBB0!important;--glow1-0:rgba(251,235,176,0)!important;--glow2:#E6EDFA!important;--glow2-0:rgba(230,237,250,0)!important;',
    '--paper2:#F1E9D8!important;--line:#E5DAC4!important;--muted:#6E6A62!important}',
    '.panel{box-shadow:0 0 0 2px #2747A0,0 2px 4px rgba(0,0,0,.05),0 32px 72px -26px rgba(20,35,90,.38)!important}',
    '.panel::after{content:"";position:absolute;z-index:6;inset:5px;border:1px solid rgba(39,71,160,.42);border-radius:calc(var(--r1) - 4px);pointer-events:none}',
    '.w[data-m=mobile] .panel::after{bottom:-2px;border-radius:calc(var(--r1) - 4px) calc(var(--r1) - 4px) 0 0}',
    '.name{letter-spacing:.07em;color:#2747A0}',
    '.hl{color:#2747A0;letter-spacing:.03em}',
    '.tg{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:600;font-size:20px;line-height:1.25;color:#E0782F;max-width:290px}',
    '.chips button{background:#fff;color:#2747A0;box-shadow:inset 0 0 0 1px rgba(39,71,160,.3)}',
    '.chips button:hover{background:#EEF2FB}',
    '.card .cbtn{background:#fff;box-shadow:inset 0 0 0 1px rgba(39,71,160,.3)}',
    '.teaser{background:#FBF6EA;box-shadow:0 0 0 1.5px #2747A0,0 28px 60px -22px rgba(20,35,90,.38)}',
    '.teaser .chips button{background:#fff}',
    '.shim{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:17px;font-weight:600}'
  ].join('')
};
