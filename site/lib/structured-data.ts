import { SITE } from './constants'

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
  }
}

export function generateSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Byte AI',
    applicationCategory: 'BusinessApplication',
    description:
      'AI-powered email assistant that provides intelligent responses to any question via email. No app, no login — just email.',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: SITE.author,
      url: SITE.authorUrl,
    },
  }
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Byte AI',
    url: SITE.url,
    contactPoint: {
      '@type': 'ContactPoint',
      email: SITE.email,
      contactType: 'Customer Service',
    },
  }
}
