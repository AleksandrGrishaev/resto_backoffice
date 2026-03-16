// src/composables/usePhoneCodes.ts - Phone country codes for forms

export interface PhoneCode {
  title: string
  value: string
  country: string
  flag: string
}

const PHONE_CODES: PhoneCode[] = [
  { title: '+62 ID', value: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { title: '+7 RU', value: '+7', country: 'Russia', flag: '🇷🇺' },
  { title: '+1 US', value: '+1', country: 'USA', flag: '🇺🇸' },
  { title: '+44 UK', value: '+44', country: 'UK', flag: '🇬🇧' },
  { title: '+61 AU', value: '+61', country: 'Australia', flag: '🇦🇺' },
  { title: '+65 SG', value: '+65', country: 'Singapore', flag: '🇸🇬' },
  { title: '+60 MY', value: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { title: '+66 TH', value: '+66', country: 'Thailand', flag: '🇹🇭' },
  { title: '+81 JP', value: '+81', country: 'Japan', flag: '🇯🇵' },
  { title: '+82 KR', value: '+82', country: 'South Korea', flag: '🇰🇷' },
  { title: '+86 CN', value: '+86', country: 'China', flag: '🇨🇳' },
  { title: '+91 IN', value: '+91', country: 'India', flag: '🇮🇳' },
  { title: '+49 DE', value: '+49', country: 'Germany', flag: '🇩🇪' },
  { title: '+33 FR', value: '+33', country: 'France', flag: '🇫🇷' }
]

const DEFAULT_PHONE_CODE = '+62'

/**
 * Build full phone number from code + local number.
 * Strips leading zeros from the local part.
 */
export function buildFullPhone(code: string, localNumber: string): string | undefined {
  const cleaned = localNumber.trim()
  if (!cleaned) return undefined
  return `${code}${cleaned.replace(/^0+/, '')}`
}

export function usePhoneCodes() {
  return {
    phoneCodes: PHONE_CODES,
    defaultPhoneCode: DEFAULT_PHONE_CODE,
    buildFullPhone
  }
}
