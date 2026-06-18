import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { pl } from '@/i18n/pl'

void i18n.use(initReactI18next).init({
  resources: {
    pl: {
      translation: pl,
    },
  },
  lng: 'pl',
  fallbackLng: 'pl',
  interpolation: {
    escapeValue: false,
  },
})

document.documentElement.lang = i18n.language
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

export default i18n
