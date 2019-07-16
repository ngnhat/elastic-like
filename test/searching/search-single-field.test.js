/**
 * Created by ngnhat on Sat May 25 2019
 */
const Store = require('../../src');

describe('single field:', () => {
  it('single doc - single term', () => {
    const store = new Store({
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    });
    store.add(1, { Id: 1, Code: 'aaa', Name: 'quick brown fox' });

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'fox', field: 'Code' } },
          { match: { query: 'fox', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });

  it('single doc - multiple term', () => {
    const store = new Store({
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    });
    store.add(1, { Id: 1, Code: 'aaa', Name: 'quick brown fox' });

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'quick fox', field: 'Code' } },
          { match: { query: 'quick fox', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });

  it('multiple doc - single term', () => {
    const store = new Store({
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    });
    store.add(1, { Id: 1, Code: '1', Name: 'The quick brown fox' });
    store.add(2, { Id: 2, Code: '2', Name: 'The quick brown fox jumps over the lazy dog' });
    store.add(3, { Id: 3, Code: '3', Name: 'The quick brown fox jumps hahaha over the quick dog' });
    store.add(4, { Id: 4, Code: '4', Name: 'Brown fox hahaha brown dog' });

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'hahaha', field: 'Code' } },
          { match: { query: 'hahaha', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });
});
