/**
 * DealMatcher - Utility for matching deals to shopping list items
 *
 * This module implements the matching algorithm from SHOPPING_LIST_UX_DESIGN.md
 * to intelligently match deals from weekly flyers to user shopping list items.
 */

/**
 * Match deals to a shopping list item
 *
 * @param {object} listItem - User shopping list item
 * @param {string} listItem.itemName - Base item name (e.g., "Milk", "Chicken")
 * @param {string} listItem.itemVariant - Optional variant (e.g., "organic", "breast")
 * @param {Array} deals - Array of Deal objects from database
 * @returns {Array} Array of matched deals with scores and reasons
 */
function matchDealsToListItem(listItem, deals) {
  const matches = [];

  for (const deal of deals) {
    const score = calculateMatchScore(deal, listItem);

    if (score > 0) {
      matches.push({
        deal,
        score,
        matchReason: generateMatchReason(deal, listItem, score)
      });
    }
  }

  // Sort by score descending (best matches first)
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Calculate match score between a deal and a list item
 *
 * Scoring logic:
 * - 1.0 = Perfect match (item name + variant both match)
 * - 0.5 = Partial match (item name matches, variant doesn't or no variant specified)
 * - 0.0 = No match
 *
 * @param {object} deal - Deal object from database
 * @param {object} listItem - Shopping list item
 * @returns {number} Match score (0-1)
 */
function calculateMatchScore(deal, listItem) {
  const dealText = deal.productName.toLowerCase();
  const itemName = listItem.itemName.toLowerCase();
  const variant = listItem.itemVariant?.toLowerCase();

  // Must contain the base item name
  if (!dealText.includes(itemName)) {
    return 0.0;
  }

  // If variant specified, check if deal contains it
  if (variant) {
    if (dealText.includes(variant)) {
      return 1.0; // Perfect match: name + variant
    } else {
      return 0.0; // Deal doesn't match the specific variant requested
    }
  }

  // No variant specified = accept any match of the base item
  return 0.5; // Partial match: name only
}

/**
 * Generate human-readable match reason
 *
 * @param {object} deal - Deal object
 * @param {object} listItem - Shopping list item
 * @param {number} score - Match score
 * @returns {string} Match reason description
 */
function generateMatchReason(deal, listItem, score) {
  const itemName = listItem.itemName;
  const variant = listItem.itemVariant;

  if (score === 1.0 && variant) {
    return `Matches "${itemName}" + "${variant}"`;
  } else if (score === 0.5) {
    if (variant) {
      return `Matches "${itemName}" (but not "${variant}")`;
    } else {
      return `Matches "${itemName}"`;
    }
  }

  return 'Match found';
}

/**
 * Filter deals by store proximity (if store data is available)
 *
 * @param {Array} deals - Array of Deal objects
 * @param {object} user - User object with location
 * @param {number} radiusMiles - Maximum distance in miles
 * @returns {Array} Filtered array of deals within radius
 */
function filterDealsByProximity(deals, user, radiusMiles = 10) {
  // TODO: Implement proximity filtering when store location data is added to deals
  // For now, just return all deals (they're already filtered by ZIP code)
  return deals;
}

/**
 * Group matched deals by store
 *
 * @param {Array} matches - Array of deal matches
 * @returns {object} Deals grouped by store name
 */
function groupMatchesByStore(matches) {
  const groupedByStore = {};

  for (const match of matches) {
    const storeName = match.deal.storeName;

    if (!groupedByStore[storeName]) {
      groupedByStore[storeName] = [];
    }

    groupedByStore[storeName].push(match);
  }

  return groupedByStore;
}

/**
 * Get best deal for a list item (lowest price)
 *
 * @param {Array} matches - Array of deal matches for an item
 * @returns {object|null} Best match or null if no matches
 */
function getBestDeal(matches) {
  if (matches.length === 0) return null;

  // Sort by price ascending (lowest first)
  const sortedByPrice = matches.sort((a, b) => a.deal.salePrice - b.deal.salePrice);

  return sortedByPrice[0];
}

module.exports = {
  matchDealsToListItem,
  calculateMatchScore,
  generateMatchReason,
  filterDealsByProximity,
  groupMatchesByStore,
  getBestDeal
};
