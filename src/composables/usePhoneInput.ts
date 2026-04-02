// src/composables/usePhoneInput.ts - Phone input with country code selector (libphonenumber-js)

import { ref, computed, watch } from 'vue'
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
  getExampleNumber,
  type CountryCode as LibCountryCode
} from 'libphonenumber-js'
import examples from 'libphonenumber-js/mobile/examples'

export interface CountryOption {
  code: string // ISO 3166-1 alpha-2 (e.g. 'ID', 'US')
  dial: string // e.g. '+62'
  name: string // English name
  flag: string // emoji flag
  format: string // placeholder hint from example number
}

// Emoji flag from ISO country code
function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('')
}

// Country names in English via Intl API
const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })

// Prioritized countries shown at the top of the list
const PRIORITY_CODES = [
  'ID',
  'RU',
  'US',
  'GB',
  'AU',
  'FR',
  'DE',
  'JP',
  'KR',
  'IN',
  'CN',
  'TH',
  'MY',
  'SG',
  'PH',
  'VN'
]

function buildCountryList(): CountryOption[] {
  const allCodes = getCountries()
  const options: CountryOption[] = allCodes.map(cc => {
    const callingCode = getCountryCallingCode(cc)
    const example = getExampleNumber(cc, examples)
    const national = example?.formatNational() ?? ''
    const format = national.replace(/\d/g, 'x')

    return {
      code: cc,
      dial: `+${callingCode}`,
      name: displayNames.of(cc) ?? cc,
      flag: countryFlag(cc),
      format
    }
  })

  const prioritySet = new Set(PRIORITY_CODES)
  const priority = PRIORITY_CODES.map(c => options.find(o => o.code === c)).filter(
    Boolean
  ) as CountryOption[]
  const rest = options
    .filter(o => !prioritySet.has(o.code))
    .sort((a, b) => {
      const numA = parseInt(a.dial.replace('+', ''))
      const numB = parseInt(b.dial.replace('+', ''))
      return numA - numB
    })

  return [...priority, ...rest]
}

// Build once, reuse across all instances
let _countries: CountryOption[] | null = null
function getCountryOptions(): CountryOption[] {
  if (!_countries) _countries = buildCountryList()
  return _countries
}

export function usePhoneInput(initialValue?: string | null) {
  const countries = getCountryOptions()
  const selectedCountry = ref<CountryOption>(countries[0]) // ID by default
  const localNumber = ref('')

  // Parse initial value like "+62812345678" into country + local
  if (initialValue) {
    try {
      const parsed = parsePhoneNumber(initialValue)
      if (parsed?.country) {
        const match = countries.find(c => c.code === parsed.country)
        if (match) {
          selectedCountry.value = match
          localNumber.value = parsed.nationalNumber
        }
      }
    } catch {
      const match = countries.find(c => initialValue!.startsWith(c.dial))
      if (match) {
        selectedCountry.value = match
        localNumber.value = initialValue.slice(match.dial.length)
      } else {
        localNumber.value = initialValue.replace(/^\+/, '')
      }
    }
  }

  const fullPhone = computed(() => {
    const digits = localNumber.value.replace(/\D/g, '')
    if (!digits) return ''
    return `${selectedCountry.value.dial}${digits}`
  })

  const isValid = computed(() => {
    const digits = localNumber.value.replace(/\D/g, '')
    if (!digits) return true
    try {
      const phone = parsePhoneNumber(fullPhone.value)
      return phone?.isValid() ?? false
    } catch {
      return false
    }
  })

  function setCountry(code: string) {
    const country = countries.find(c => c.code === code)
    if (country) selectedCountry.value = country
  }

  return {
    countries,
    selectedCountry,
    localNumber,
    fullPhone,
    isValid,
    setCountry
  }
}
