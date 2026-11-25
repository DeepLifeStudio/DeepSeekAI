const LANG_TO_COUNTRY = {
  zh: 'cn',
  en: 'us',
  hi: 'in',
  es: 'es',
  fr: 'fr',
  ar: 'sa',
  bn: 'bd',
  ru: 'ru',
  pt: 'br',
  ur: 'pk',
  de: 'de',
  ja: 'jp',
  ko: 'kr',
  it: 'it',
  nl: 'nl',
  pl: 'pl',
  pa: 'in',
  mr: 'in',
  te: 'in',
  tr: 'tr',
  ta: 'in',
  vi: 'vn',
  th: 'th',
  id: 'id',
};

const GLOBE_SVG =
  '<svg viewBox="0 0 16 16" width="15" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;flex-shrink:0;opacity:0.8"><circle cx="8" cy="8" r="5.5"/><path d="M2.5 8h11M8 2.5a8.5 8.5 0 0 1 2.2 5.5A8.5 8.5 0 0 1 8 13.5a8.5 8.5 0 0 1-2.2-5.5A8.5 8.5 0 0 1 8 2.5z"/></svg>';

export function getLanguageFlagHtml(code) {
  const country = LANG_TO_COUNTRY[code];
  if (!country || code === 'auto') {
    return GLOBE_SVG;
  }
  const url = chrome.runtime.getURL(`flags/${country}.svg`);
  return `<img src="${url}" width="16" height="12" alt="" aria-hidden="true" style="display:block;width:16px;height:12px;object-fit:cover;border-radius:2px;box-shadow:0 0 0 0.5px rgba(128,128,128,0.28);flex-shrink:0;" />`;
}
