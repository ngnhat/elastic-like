/**
 * Created by ngnhat on Sat May 25 2019
 */
const Store = require('../../index');

describe('update a document:', () => {
  it('non exists', () => {
    const store = new Store({
      docKey: 'Id',
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    });
    store.update(1, { Id: 1, Code: 'aaa', Name: 'quick brown fox' });

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'fox', field: 'Code' } },
          { match: { query: 'fox', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });

  it('exists', () => {
    const store = new Store({
      docKey: 'Id',
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    });

    store.add(1, { Id: 1, Code: 'aaa', Name: 'quick brown fox' });
    store.update(1, { Id: 1, Code: 'abc', Name: 'quick fox updated.' });

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'aaa', field: 'Code' } },
          { match: { query: 'aaa', field: 'Name' } },
        ],
      },
    })).toEqual([]);
    expect(store.search({
      bool: {
        should: [
          { match: { query: 'brown', field: 'Code' } },
          { match: { query: 'brown', field: 'Name' } },
        ],
      },
    })).toEqual([]);

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'updated', field: 'Code' } },
          { match: { query: 'updated', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });
});
