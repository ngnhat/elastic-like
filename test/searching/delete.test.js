/**
 * Created by ngnhat on Sat May 25 2019
 */
const Store = require('../../index');

describe('delete a document:', () => {
  it('single doc - single term', () => {
    const store = new Store({
      docKey: 'Id',
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    });

    store.add({ Id: 1, Code: 'aaa', Name: 'quick brown fox' });
    store.delete(1);

    expect(store.search({
      bool: {
        should: [
          { match: { query: 'fox', field: 'Code' } },
          { match: { query: 'fox', field: 'Name' } },
        ],
      },
    })).toEqual([]);
  });

  it('multiple doc - single term', () => {
    const store1 = new Store({
      docKey: 'Id',
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    });
    const store2 = new Store({
      docKey: 'Id',
      mapping: {
        Code: { type: 'text', analyzer: 'standard' },
        Name: { type: 'text', analyzer: 'standard' },
      },
    });

    store1.add({ Id: 1, Code: '1', Name: 'The quick brown fox' });
    store1.add({ Id: 2, Code: '2', Name: 'The quick brown fox jumps over the lazy dog' });
    store1.add({ Id: 4, Code: '4', Name: 'Brown fox hahaha brown dog' });

    store2.add({ Id: 1, Code: '1', Name: 'The quick brown fox' });
    store2.add({ Id: 2, Code: '2', Name: 'The quick brown fox jumps over the lazy dog' });
    store2.add({ Id: 3, Code: '3', Name: 'The quick brown fox jumps hahaha over the quick dog' });
    store2.add({ Id: 4, Code: '4', Name: 'Brown fox hahaha brown dog' });
    store2.delete(3);

    expect(store1.search({
      bool: {
        should: [
          { match: { query: 'hahaha', field: 'Code' } },
          { match: { query: 'hahaha', field: 'Name' } },
        ],
      },
    })).toEqual(store2.search({
      bool: {
        should: [
          { match: { query: 'hahaha', field: 'Code' } },
          { match: { query: 'hahaha', field: 'Name' } },
        ],
      },
    }));

    expect(store2.search({
      bool: {
        should: [
          { match: { query: 'hahaha', field: 'Code' } },
          { match: { query: 'hahaha', field: 'Name' } },
        ],
      },
    })).toMatchSnapshot();
  });
});
