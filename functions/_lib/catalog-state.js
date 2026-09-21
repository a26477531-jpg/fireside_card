// Only an uninitialized catalog can use legacy assets. Network/SQL errors and
// a catalog containing only archived cards must never resurrect old listings.
export function missingCatalog(error) {
  return /no such table:\s*(?:main\.)?catalog_(?:cards|products)\b/i.test(String(error?.message || error));
}
