const buildMatchQuery = (match) => {
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

const queryFormatting = (query) => {
  if (!(query instanceof Object)) {
    throw new Error('parsing exception');
  }

  const { bool, match, nested, functionScore } = query;

  if (match instanceof Object) {
    return {
      match: buildMatchQuery(match),
    };
  }

  if (bool instanceof Object) {
    const { must = [], must_not = [], should = [] } = bool;

    return {
      bool: {
        must: must.map(queryFormatting),
        should: should.map(queryFormatting),
        must_not: must_not.map(queryFormatting),
      },
    };
  }

  if (nested instanceof Object) {
    const { path, query: nestedQuery } = nested;

    return {
      nested: {
        path,
        query: queryFormatting(nestedQuery),
      },
    };
  }

  if (functionScore instanceof Object) {
    const { scriptScore, query: functionScoreQuery } = functionScore;

    if (!scriptScore) {
      throw new Error('parsing exception');
    }

    return {
      functionScore: {
        scriptScore,
        query: queryFormatting(functionScoreQuery),
      },
    };
  }

  throw new Error('parsing exception');
};

module.exports = queryFormatting;
