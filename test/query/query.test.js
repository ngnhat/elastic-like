const queryParsing = require('../../src/query');

describe('query:', () => {
  it('empty', () => {
    try {
      queryParsing();
    } catch (err) {
      expect(err).toEqual(new Error('[Parsing Exception]'));
    }
  });

  it('match query', () => {
    const query = queryParsing({
      match: { query: 'query1', field: 'Field1' },
    });

    expect(query).toEqual({
      match: { field: 'Field1', query: 'query1', boost: 1 },
    });
  });

  it('bool query', () => {
    const query = queryParsing({
      bool: {
        must: [
          { match: { query: 'query1', field: 'Field1' } },
          { match: { query: 'query2', field: 'Field2' } },
        ],
        mustNot: [
          { match: { query: 'query3', field: 'Field3' } },
        ],
        should: [
          { match: { query: 'query4', field: 'Field4' } },
        ],
      },
    });

    expect(query).toEqual({
      bool: {
        must: [
          { match: { field: 'Field1', query: 'query1', boost: 1 } },
          { match: { field: 'Field2', query: 'query2', boost: 1 } },
        ],
        mustNot: [
          { match: { field: 'Field3', query: 'query3', boost: 1 } },
        ],
        should: [
          { match: { field: 'Field4', query: 'query4', boost: 1 } },
        ],
      },
    });
  });

  it('function score', () => {
    const query = queryParsing({
      functionScore: {
        query: {
          match: { field: 'Field1', query: 'query1' },
        },
        scriptScore: (score) => (2 - 1 / (score + 1)),
      },
    });

    expect(query.functionScore.query).toMatchObject({
      match: { field: 'Field1', query: 'query1', boost: 1 },
    });
  });
});
