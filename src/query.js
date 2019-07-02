const buildMatchQuery = (match = {}) => {
  if (!(match instanceof Object)) {
    throw new Error('match must be Object Type');
  }

  const { boost, field, query } = match;

  if (!(field && typeof field === 'string')) {
    throw new Error('field is not exists');
  }

  return {
    field,
    query: query || '',
    boost: Number(boost) || 1,
  };
};

const queryFormatting = (query = {}) => {
  if (
    !(query instanceof Object)
    || (query.bool instanceof Object && query.match instanceof Object)
    || (!(query.bool instanceof Object) && !(query.match instanceof Object))
  ) {
    throw new Error('parsing exception');
  }

  if (query.match instanceof Object) {
    return {
      match: buildMatchQuery(query.match),
    };
  }

  const { must = [], must_not = [], should = [] } = query.bool;

  return {
    bool: {
      must: must.map(queryFormatting),
      should: should.map(queryFormatting),
      must_not: must_not.map(queryFormatting),
    },
  };
};

module.exports = queryFormatting;
