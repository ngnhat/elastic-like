const buildQuery = require('../../src/query');

describe('query:', () => {
  it('empty', () => {
    try {
      buildQuery();
    } catch (err) {
      expect(err).toEqual(new Error('parsing exception'));
    }
  });

  it('match query', () => {
    const query = buildQuery({
      match: { query: 'query1', field: 'Field1' },
    });

    expect(query).toEqual({
      match: { field: 'Field1', query: 'query1', boost: 1 },
    });
  });

  it('bool query', () => {
    const query = buildQuery({
      bool: {
        must: [
          { match: { query: 'query1', field: 'Field1' } },
          { match: { query: 'query2', field: 'Field2' } },
        ],
        must_not: [
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
        must_not: [
          { match: { field: 'Field3', query: 'query3', boost: 1 } },
        ],
        should: [
          { match: { field: 'Field4', query: 'query4', boost: 1 } },
        ],
      },
    });
  });

  it('function score', () => {
    const query = buildQuery({
      functionScore: {
        query: {
          match: { field: 'Field1', query: 'query1' },
        },
        scriptScore: score => (2 - 1 / (score + 1)),
      },
    });

    expect(query.functionScore.query).toMatchObject({
      match: { field: 'Field1', query: 'query1', boost: 1 },
    });
  });
});
