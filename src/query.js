/**
 * Created by ngnhat on Sat May 25 2019
 */
const matchQueryParsing = (match) => {
  if (!(match instanceof Object)) {
    throw new Error('Parsing Exception: match must be Object Type');
  }

  const { boost, field, query } = match;

  if (!(field && typeof field === 'string')) {
    throw new Error('Parsing Exception: field is not exists');
  }

  return {
    field,
    query: query || '',
    boost: Number(boost) || 1,
  };
};

const queryParsing = (query) => {
  if (!(query instanceof Object)) {
    throw new Error('Parsing Exception');
  }

  const { bool, match, nested, functionScore } = query;

  if (match instanceof Object) {
    return {
      match: matchQueryParsing(match),
    };
  }

  if (bool instanceof Object) {
    const { must = [], mustNot = [], should = [] } = bool;

    return {
      bool: {
        must: must.map(queryParsing),
        should: should.map(queryParsing),
        mustNot: mustNot.map(queryParsing),
      },
    };
  }

  if (nested instanceof Object) {
    const { path, query: nestedQuery } = nested;

    return {
      nested: {
        path,
        query: queryParsing(nestedQuery),
      },
    };
  }

  if (functionScore instanceof Object) {
    const { scriptScore, query: functionScoreQuery } = functionScore;

    if (!scriptScore) {
      throw new Error('Parsing Exception: scriptScore is not exists');
    }

    return {
      functionScore: {
        scriptScore,
        query: queryParsing(functionScoreQuery),
      },
    };
  }

  throw new Error('Parsing Exception');
};

module.exports = queryParsing;
