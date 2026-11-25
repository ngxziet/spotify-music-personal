export function creativeCommonsLicense(href: unknown, allowNonCommercialAndNoDerivatives = false) {
  if (typeof href !== 'string') return;
  const match = /^https?:\/\/creativecommons\.org\/(licenses\/(by|by-sa|by-nd|by-nc|by-nc-sa|by-nc-nd)|publicdomain\/(zero|mark))\/(\d\.\d)(?:\/([a-z]{2}))?(?:\/deed\.[a-z-]+)?\/?$/.exec(href.toLowerCase());
  if (!match) return;
  const [, path, license, publicDomain, version, jurisdiction] = match;
  if (license && license !== 'by' && license !== 'by-sa' && !allowNonCommercialAndNoDerivatives) return;

  return {
    licenseUrl: `https://creativecommons.org/${path}/${version}/${jurisdiction ? `${jurisdiction}/` : ''}`,
    licenseName: license ? `CC ${license.toUpperCase()}` : publicDomain === 'zero' ? 'CC0' : 'Public Domain Mark',
  };
}
