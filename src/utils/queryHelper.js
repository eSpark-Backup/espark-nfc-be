/**
 * Apply pagination, searching, and sorting to Mongoose queries.
 * @param {Object} model - Mongoose model for countDocuments
 * @param {Object} query - Mongoose query object
 * @param {Object} queryParams - Express req.query object
 * @param {Array} searchableFields - Fields to search by
 * @param {Array} sortableFields - Optional: restrict sort_by to allowed fields
 * @returns {Promise<{ results: any[], pagination: object }>} formatted results and meta
 */
const applyQueryOptions = async (
  model,
  query,
  queryParams = {},
  searchableFields = [],
  sortableFields = []
) => {
  const page = Math.max(parseInt(queryParams.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(queryParams.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  // Search
  if (queryParams.search && searchableFields.length > 0) {
    const keyword = queryParams.search.trim();
    if (keyword.length > 0) {
      const regex = new RegExp(keyword, 'i');
      const searchConditions = searchableFields.map((field) => ({ [field]: regex }));
      query.find({ $or: searchConditions });
    }
  }

  // Sorting
  if (queryParams.sort_by) {
    const sortBy = queryParams.sort_by;
    const sortOrder = queryParams.sort_order === 'desc' ? -1 : 1;
    if (sortableFields.length === 0 || sortableFields.includes(sortBy)) {
      query.sort({ [sortBy]: sortOrder });
    }
  }

  // Pagination
  query.skip(skip).limit(limit);

  const [results, totalCount] = await Promise.all([
    query,
    model.countDocuments(query.getQuery()),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    results,
    pagination: {
      total_count: totalCount,
      current_page: page,
      total_pages: totalPages,
      per_page: limit,
    },
  };
};

export default applyQueryOptions;
