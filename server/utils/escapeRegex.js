// Escapes regex metacharacters so user-supplied search text is matched
// literally. Without this, a search string is fed straight into
// MongoDB's $regex operator — letting anyone craft a pattern that causes
// catastrophic backtracking (ReDoS) on the DB, or unintentionally/
// intentionally matches far more than a literal substring search should.
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { escapeRegex };
