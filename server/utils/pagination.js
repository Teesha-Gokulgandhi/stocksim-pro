/**
 * parsePagination — shared helper that normalises page/limit/skip from
 * either req.validatedQuery (when the route uses validate(..., "query"))
 * or req.query directly.
 *
 * @param {object} query - req.validatedQuery || req.query
 * @param {number} [defaultLimit=20]
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePagination(query, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * buildPaginationMeta — builds the standard pagination object included in
 * API responses so the client can render page controls without computing
 * anything itself.
 *
 * @param {object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {number} params.total  - total documents matching the query
 * @returns {{ page, limit, total, totalPages, hasNextPage, hasPrevPage }}
 */
function buildPaginationMeta({ page, limit, total }) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = { parsePagination, buildPaginationMeta };
