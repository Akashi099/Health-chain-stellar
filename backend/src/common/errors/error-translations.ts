const ERROR_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    'errors.validation_failed': 'The submitted data is invalid.',
    'errors.blockchain_failed': 'Blockchain processing failed.',
    'errors.inventory_insufficient': 'Not enough inventory is available.',
    'errors.inventory_reservation_failed': 'Inventory reservation could not be completed.',
    'errors.internal_server_error': 'An unexpected server error occurred.',
  },
  fr: {
    'errors.validation_failed': 'Les donnees soumises sont invalides.',
    'errors.blockchain_failed': 'Le traitement blockchain a echoue.',
    'errors.inventory_insufficient': 'Le stock disponible est insuffisant.',
    'errors.inventory_reservation_failed': 'La reservation du stock a echoue.',
    'errors.internal_server_error': 'Une erreur interne inattendue est survenue.',
  },
};

export function translateError(
  translationKey: string | undefined,
  localeHeader: string | string[] | undefined,
  fallbackMessage: string,
): string {
  if (!translationKey) {
    return fallbackMessage;
  }

  const header = Array.isArray(localeHeader) ? localeHeader[0] : localeHeader;
  const locale = header?.split(',')[0]?.trim().slice(0, 2).toLowerCase() ?? 'en';

  return ERROR_TRANSLATIONS[locale]?.[translationKey] ??
    ERROR_TRANSLATIONS.en[translationKey] ??
    fallbackMessage;
}